import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { generateStructuredGeminiJSON } from '@/lib/gemini';

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export interface ImageCandidate {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  provider: string;
  candidateType: 'WEB_IMAGE' | 'AI_GENERATED';
  confidence: number;
  matchState: 'HIGH_CONFIDENCE' | 'POSSIBLE_MATCH' | 'REJECTED';
  license?: string;
  licenseUrl?: string;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
}

// Crop bounding box helper (for internal source evidence ONLY)
async function cropImageBoundingBox(base64Data: string, box: { x: number; y: number; width: number; height: number }): Promise<string | null> {
  try {
    let cleanBase64 = base64Data;
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }
    if (!cleanBase64) return null;

    const imgBuffer = Buffer.from(cleanBase64, 'base64');
    const metadata = await sharp(imgBuffer).metadata();
    if (!metadata.width || !metadata.height) return null;

    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    const left = Math.max(0, Math.min(imgWidth - 1, Math.round((box.x / 100) * imgWidth)));
    const top = Math.max(0, Math.min(imgHeight - 1, Math.round((box.y / 100) * imgHeight)));
    const width = Math.max(10, Math.min(imgWidth - left, Math.round((box.width / 100) * imgWidth)));
    const height = Math.max(10, Math.min(imgHeight - top, Math.round((box.height / 100) * imgHeight)));

    const croppedBuffer = await sharp(imgBuffer)
      .extract({ left, top, width, height })
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${croppedBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Error cropping image bounding box with Sharp:', err);
    return null;
  }
}

export async function fetchWebFoodImageCandidates(itemName: string, categoryName: string = ''): Promise<ImageCandidate[]> {
  return [];
}

export function getAiGeneratedFoodImageCandidate(itemName: string, categoryName: string = '', description: string = ''): ImageCandidate | null {
  return null;
}

import { isFeatureEnabledForRestaurant, consumeAICreditForRestaurant } from '@/lib/entitlements';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { images, textContent, restaurantId, requestId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const isEnabled = await isFeatureEnabledForRestaurant(restaurantId, 'ai_menu');
    if (!isEnabled) {
      return NextResponse.json({ error: 'Smart Menu by CleverOps is not included in your current subscription plan. Upgrade your plan to access AI Menu features.' }, { status: 403 });
    }

    const preCheck = await consumeAICreditForRestaurant(restaurantId, 'ai_menu_analysis', 0);
    if (!preCheck.allowed) {
      return NextResponse.json({ error: preCheck.message || 'AI Menu credit limit reached for this billing period.' }, { status: 403 });
    }

    if ((!images || images.length === 0) && !textContent) {
      return NextResponse.json({ error: 'At least one image or text input is required' }, { status: 400 });
    }

    const providerUsed = 'Gemini 2.5 Flash Vision Engine';

    const systemPrompt = `You are an expert restaurant menu digitizer for CleverOps Smart Menu.
Analyze the physical menu image(s) or menu text provided and extract ALL categories and menu items accurately.

CRITICAL PRICE & ORIGINAL PRICE RULES:
1. "price" (Selling Price) is the final numerical price for the dish.
2. "original_price" (MRP / Original Price):
   - If the menu shows a single price (e.g. "Item Name 120"), both "price" and "original_price" MUST be 120.
   - If the menu shows a strikethrough or discount (e.g. "MRP ₹150, Now ₹120"), "original_price" is 150 and "price" is 120.
   - NEVER set "price" or "original_price" to 0 if a price is visible on the menu!

PORTION / SIZE / VARIANT EXTRACTION RULES:
- Check if the menu explicitly lists portion/size choices with separate prices for an item (e.g. "Dal Half ₹80, Full ₹140" or "Pizza Small ₹150, Medium ₹250, Large ₹350").
- If portions exist in the uploaded menu for an item, extract:
  "has_variants": true,
  "variants": [
    { "name": "Half", "price": 80 },
    { "name": "Full", "price": 140 }
  ]
  Set "price" to the price of the first portion (e.g., 80).
- If the menu item has only a single price or NO portion choices are printed on the menu:
  "has_variants": false,
  "variants": []
- CRITICAL: NEVER invent or guess portions (Half/Full/Quarter/Small/Medium/Large) if they are not explicitly present in the source menu!

FOOD IMAGE DETECTION & BOUNDING BOX RULES:
For each menu item, check if there is an explicit real food photograph of that dish in the source menu.
If a real food photograph exists for the item, provide "image_region" with normalized percentage coordinates (0-100):
{ "x": percentage_left, "y": percentage_top, "width": percentage_width, "height": percentage_height }

OUTPUT SCHEMA JSON FORMAT:
{
  "categories": [
    {
      "name": "Category Name (e.g. Starters, Parathas, Beverages)",
      "items": [
        {
          "name": "Item Name",
          "price": 120,
          "original_price": 120,
          "description": "Item description if present",
          "is_veg": true,
          "has_variants": false,
          "variants": [],
          "image_region": { "x": 10, "y": 20, "width": 30, "height": 25 } or null
        }
      ]
    }
  ]
}`;

    const geminiImages: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    let sourceBase64: string | null = null;
    if (images && images.length > 0) {
      for (const img of images) {
        if (img.base64) {
          sourceBase64 = img.base64;
          let mimeType = img.type || 'image/jpeg';
          let cleanData = img.base64;
          if (cleanData.startsWith('data:') && cleanData.includes(';base64,')) {
            const parts = cleanData.split(';base64,');
            const dataPrefix = parts[0];
            cleanData = parts[1] || '';
            const detectedMime = dataPrefix.replace(/^data:/, '').split(';')[0];
            if (detectedMime) mimeType = detectedMime;
          } else if (cleanData.includes('base64,')) {
            cleanData = cleanData.split('base64,')[1];
          }

          if (cleanData) {
            geminiImages.push({
              inlineData: { mimeType, data: cleanData.trim() }
            });
          }
        }
      }
    }

    const geminiRes = await generateStructuredGeminiJSON({
      prompt: `Perform an exhaustive 100% extraction of ALL categories, sections, and EVERY SINGLE menu item printed on the uploaded menu image(s) or text.
Scan multi-column layouts, sidebars, headers, sub-headers, beverage lists, and main courses completely. Do NOT skip any items, truncate output, or stop early! If 50+ or 80+ items exist, extract all items into the categories JSON array. ${textContent ? `\n\nMenu Text:\n${textContent}` : ''}`,
      systemInstruction: systemPrompt,
      images: geminiImages
    });

    let parsedData: any = geminiRes.data;
    if (!parsedData && geminiRes.rawContent) {
      try {
        const cleanJson = geminiRes.rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleanJson);
      } catch (pErr) {
        console.error('Failed to parse Gemini JSON output:', geminiRes.rawContent);
      }
    }

    if (!parsedData && textContent) {
      // Fallback line parser for text menu input
      const lines = textContent.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      const items: any[] = [];
      let currentCatName = 'Main Menu';

      for (const line of lines) {
        if (!line.match(/\d/) && !line.includes('₹') && !line.includes('$')) {
          currentCatName = line.replace(/[:\-]/g, '').trim() || 'Main Menu';
          continue;
        }

        const mrpMatch = line.match(/^(.+?)\s*[₹$]?\s*(\d+(?:\.\d+)?)\s*(?:\(?(?:MRP|WAS|ORIGINAL)\s*[₹$]?\s*(\d+(?:\.\d+)?)\)?)?/i);

        if (mrpMatch) {
          const name = mrpMatch[1].replace(/[-–:]$/, '').trim();
          const sellingPrice = parseFloat(mrpMatch[2]);
          const mrp = mrpMatch[3] ? parseFloat(mrpMatch[3]) : sellingPrice;

          if (name && !isNaN(sellingPrice)) {
            items.push({
              name,
              price: sellingPrice,
              original_price: mrp,
              description: name,
              is_veg: !name.toLowerCase().includes('chicken') && !name.toLowerCase().includes('mutton') && !name.toLowerCase().includes('fish') && !name.toLowerCase().includes('egg')
            });
          }
        }
      }

      parsedData = {
        categories: [
          {
            name: currentCatName,
            items
          }
        ]
      };
    }

    if (!parsedData || !parsedData.categories || !Array.isArray(parsedData.categories) || parsedData.categories.length === 0) {
      // Robust Line Scanner Fallback across raw Gemini text output
      const rawText = geminiRes.rawContent || textContent || '';
      const lines = rawText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      const extractedItems: any[] = [];
      let currentCategory = 'Extracted Menu Items';

      for (const line of lines) {
        if (!line.match(/\d/) && !line.includes('₹') && !line.includes('$') && line.length > 2 && line.length < 35) {
          currentCategory = line.replace(/[:\-]/g, '').trim() || 'Extracted Menu Items';
          continue;
        }

        const mrpMatch = line.match(/^(.+?)\s*[₹$]?\s*(\d+(?:\.\d+)?)/i);
        if (mrpMatch) {
          const name = mrpMatch[1].replace(/[-–:]$/, '').trim();
          const price = parseFloat(mrpMatch[2]);
          if (name.length > 2 && !isNaN(price) && price > 0) {
            extractedItems.push({
              category: currentCategory,
              name,
              price,
              original_price: price,
              description: `${name} - Fresh prepared dish`,
              is_veg: !name.toLowerCase().includes('chicken') && !name.toLowerCase().includes('mutton') && !name.toLowerCase().includes('fish') && !name.toLowerCase().includes('egg'),
              has_variants: false,
              variants: []
            });
          }
        }
      }

      if (extractedItems.length > 0) {
        // Group items by category
        const catMap: Record<string, any[]> = {};
        extractedItems.forEach(itm => {
          const cName = itm.category || 'Extracted Menu Items';
          if (!catMap[cName]) catMap[cName] = [];
          catMap[cName].push(itm);
        });

        parsedData = {
          categories: Object.keys(catMap).map(cName => ({
            name: cName,
            items: catMap[cName]
          }))
        };
      }
    }

    let totalItemsCount = 0;
    const enrichedCategories = await Promise.all(
      (parsedData.categories || []).map(async (cat: any) => {
        const enrichedItems = await Promise.all(
          (cat.items || []).map(async (item: any) => {
            totalItemsCount++;
            const itemPrice = item.price !== undefined && item.price !== null ? Number(item.price) : null;
            const itemOriginalPrice = item.original_price !== undefined && item.original_price !== null 
              ? Number(item.original_price) 
              : (item.originalPrice !== undefined && item.originalPrice !== null ? Number(item.originalPrice) : itemPrice);

            const hasVars = Boolean(item.has_variants || (item.variants && Array.isArray(item.variants) && item.variants.length > 0));
            const rawVariants = Array.isArray(item.variants) ? item.variants : [];
            const cleanedVariants = rawVariants.map((v: any, idx: number) => ({
              id: `var_${Math.random().toString(36).substr(2, 9)}`,
              name: String(v.name || `Portion ${idx + 1}`).trim(),
              price: Number(v.price || 0),
              display_order: idx,
              is_available: true
            }));

            let croppedUrl: string | null = null;
            let foodImageDetected = false;

            if (item.image_region && sourceBase64 && typeof item.image_region === 'object') {
              const reg = item.image_region;
              if (typeof reg.x === 'number' && typeof reg.y === 'number' && typeof reg.width === 'number' && typeof reg.height === 'number') {
                croppedUrl = await cropImageBoundingBox(sourceBase64, {
                  x: reg.x,
                  y: reg.y,
                  width: reg.width,
                  height: reg.height
                });
                if (croppedUrl) {
                  foodImageDetected = true;
                }
              }
            }

            // Every imported item defaults to NO IMAGE (owner controls image selection)
            const selectedImageUrl = '';
            const imageSource = 'none';
            const candidateImages: ImageCandidate[] = [];

            return {
              id: `extracted_${Math.random().toString(36).substr(2, 9)}`,
              name: item.name || 'Unnamed Dish',
              exactMenuName: item.name || 'Unnamed Dish',
              price: hasVars && cleanedVariants.length > 0 ? cleanedVariants[0].price : itemPrice,
              originalPrice: itemOriginalPrice,
              description: item.description || '',
              exactMenuDescription: item.description || '',
              is_veg: item.is_veg !== undefined && item.is_veg !== null ? Boolean(item.is_veg) : true,
              has_variants: hasVars,
              variants: cleanedVariants,
              sourceImageIndex: item.sourceImageIndex || 1,
              sourceImageName: images && images[0] ? images[0].name : 'Menu Image 1',
              sourceText: item.sourceText || `${item.name}${itemPrice !== null ? ` ₹${itemPrice}` : ''}`,
              sourceCropUrl: croppedUrl, // Internal reference ONLY
              foodImageDetected,
              foodImageBoundingBox: item.image_region || null,
              confidence: item.confidence || 0.95,
              needsReview: item.needsReview || false,
              reviewReason: item.reviewReason || null,
              imageSource,
              selectedImageUrl,
              imageCandidates: candidateImages,
              candidateImages: candidateImages
            };
          })
        );

        return {
          id: `cat_${Math.random().toString(36).substr(2, 9)}`,
          name: cat.name || 'General Menu',
          items: enrichedItems
        };
      })
    );

    // Merge categories with the same name across multiple images / pages and deduplicate items
    const mergedCategoriesMap = new Map<string, any>();
    for (const cat of enrichedCategories) {
      const catKey = (cat.name || 'General Menu').trim().toLowerCase();
      if (!mergedCategoriesMap.has(catKey)) {
        mergedCategoriesMap.set(catKey, {
          id: cat.id,
          name: cat.name || 'General Menu',
          items: []
        });
      }
      const targetCat = mergedCategoriesMap.get(catKey);
      const existingItemNames = new Set(targetCat.items.map((i: any) => i.name.trim().toLowerCase()));
      for (const item of cat.items) {
        const itemKey = item.name.trim().toLowerCase();
        if (!existingItemNames.has(itemKey)) {
          existingItemNames.add(itemKey);
          targetCat.items.push(item);
        }
      }
    }
    const finalMergedCategories = Array.from(mergedCategoriesMap.values()).filter(c => c.items.length > 0);
    const finalTotalItemsCount = finalMergedCategories.reduce((acc, c) => acc + c.items.length, 0);

    // Atomically deduct item credits matching the actual number of extracted menu items
    const deduction = await consumeAICreditForRestaurant(restaurantId, 'ai_menu_analysis', finalTotalItemsCount, requestId);
    if (!deduction.allowed) {
      return NextResponse.json({
        error: deduction.message || `Insufficient AI item credits remaining (${deduction.remaining} remaining, but extracted ${finalTotalItemsCount} items).`,
        remaining: deduction.remaining,
        used: deduction.used,
        limit: deduction.limit
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      providerUsed,
      totalCategoriesCount: finalMergedCategories.length,
      totalItemsCount: finalTotalItemsCount,
      creditsConsumed: finalTotalItemsCount,
      usedCredits: deduction.used,
      remainingCredits: deduction.remaining,
      limitCredits: deduction.limit,
      categories: finalMergedCategories
    });
  } catch (err: any) {
    console.error('Error analyzing menu image with Gemini:', err);
    return NextResponse.json({ error: 'AI menu analysis temporarily failed. Please try again or use text import.' }, { status: 500 });
  }
}

export async function getFoodImageCandidates(itemName: string, categoryName: string = ''): Promise<ImageCandidate[]> {
  return [];
}
