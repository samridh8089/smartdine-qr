import { NextResponse } from 'next/server';
import { generateStructuredGeminiJSON } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { itemName, categoryName, language = 'english' } = await req.json();

    if (!itemName) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const langKey = (language || 'english').toLowerCase().trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    let description = '';

    if (geminiKey) {
      let systemInstruction = '';
      if (langKey === 'hindi') {
        systemInstruction = `You are an expert restaurant menu copywriter. Generate 1 crisp, highly appetizing sentence in pure Devanagari Hindi (हिंदी) for the menu item. DO NOT use English script. DO NOT include quotes or the item name at start. Return JSON: { "description": "..." }`;
      } else if (langKey === 'hinglish') {
        systemInstruction = `You are an expert culinary copywriter for Indian menus. Generate 1 crisp, highly appetizing sentence in natural Indian Hinglish (Hindi words written in Roman/Latin English script with English food terms). EXAMPLE: "Soft aur creamy paneer cubes ko aromatic spices ke saath marinate karke perfectly grill kiya gaya hai." DO NOT use Devanagari script. Return JSON: { "description": "..." }`;
      } else {
        systemInstruction = `You are an expert culinary copywriter. Generate 1 crisp, highly appetizing sentence in standard English for the menu item. DO NOT include quotes or the item name at start. Return JSON: { "description": "..." }`;
      }

      const prompt = `Item: ${itemName}${categoryName ? ` (Category: ${categoryName})` : ''}`;
      const responseSchema = {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' }
        },
        required: ['description']
      };

      const geminiRes = await generateStructuredGeminiJSON<{ description: string }>({
        prompt,
        systemInstruction,
        responseSchema,
        temperature: 0.7
      });

      if (geminiRes.success && geminiRes.data?.description) {
        description = geminiRes.data.description.trim();
      }
    }

    // Fallback template generators with strict language differentiation
    if (!description) {
      if (langKey === 'hindi') {
        description = `${itemName} एक स्वादिष्ट ताज़ा व्यंजन है जिसे सुगंधित भारतीय मसालों और उच्च गुणवत्ता वाली सामग्री के साथ तैयार किया गया है।`;
      } else if (langKey === 'hinglish') {
        description = `Soft aur flavorful ${itemName}, authentic Indian spices ke saath fresh prepare kiya gaya hai.`;
      } else {
        description = `Freshly prepared ${itemName} crafted with premium culinary spices and authentic restaurant flavors.`;
      }
    }

    // Verify Hinglish does not return pure Devanagari or plain English fallback
    if (langKey === 'hinglish') {
      const hasDevanagari = /[\u0900-\u097F]/.test(description);
      if (hasDevanagari || (!description.toLowerCase().includes('ke') && !description.toLowerCase().includes('aur') && !description.toLowerCase().includes('saath') && !description.toLowerCase().includes('gaya'))) {
        description = `Fresh aur tasty ${itemName}, authentic Indian spices aur rich flavors ke saath perfectly prepare kiya gaya hai.`;
      }
    } else if (langKey === 'hindi') {
      const hasDevanagari = /[\u0900-\u097F]/.test(description);
      if (!hasDevanagari) {
        description = `${itemName} एक स्वादिष्ट ताज़ा व्यंजन है जिसे उत्तम मसालों के साथ पकाया गया है।`;
      }
    }

    return NextResponse.json({ success: true, description, language: langKey });
  } catch (err: any) {
    return NextResponse.json({ error: `Description generation failed: ${err.message}` }, { status: 500 });
  }
}
