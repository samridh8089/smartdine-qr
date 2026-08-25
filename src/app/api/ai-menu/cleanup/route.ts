import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { restaurantId } = await req.json();
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    const { data: items } = await supabaseAdmin.from('menu_items').select('*').eq('restaurant_id', restaurantId);
    const { data: categories } = await supabaseAdmin.from('categories').select('*').eq('restaurant_id', restaurantId);

    const existingItems = items || [];
    const existingCats = categories || [];

    const suggestions: Array<{
      id: string;
      menu_item_id: string;
      originalName: string;
      suggestedName: string;
      originalDescription: string;
      suggestedDescription: string;
      originalPrice: number;
      suggestedPrice: number;
      issuesFound: string[];
      approved: boolean;
    }> = [];

    const insights: string[] = [];

    // Analyze menu health
    const missingDescCount = existingItems.filter(i => !i.description || i.description.trim().length < 5).length;
    if (missingDescCount > 0) {
      insights.push(`${missingDescCount} item(s) have missing or brief descriptions.`);
    }

    const duplicatesMap: Record<string, number> = {};
    existingItems.forEach(i => {
      const clean = i.name.trim().toLowerCase();
      duplicatesMap[clean] = (duplicatesMap[clean] || 0) + 1;
    });

    const duplicateNames = Object.keys(duplicatesMap).filter(k => duplicatesMap[k] > 1);
    if (duplicateNames.length > 0) {
      insights.push(`${duplicateNames.length} potential duplicate item name(s) identified in menu.`);
    }

    existingItems.forEach(item => {
      const issues: string[] = [];
      let sugName = item.name;
      let sugDesc = item.description || '';
      let sugPrice = item.price;

      // Fix obvious typos or formatting issues
      if (item.name.toLowerCase().includes('caf') && !item.name.includes('Café')) {
        sugName = item.name.replace(/caf/i, 'Café');
        issues.push('Spelling & Accent Correction');
      }

      if (!item.description || item.description.trim().length < 5) {
        sugDesc = `Chef special freshly prepared ${item.name} with premium culinary ingredients.`;
        issues.push('Missing Description Added');
      }

      if (duplicatesMap[item.name.trim().toLowerCase()] > 1) {
        issues.push('Potential Duplicate Item');
      }

      if (issues.length > 0) {
        suggestions.push({
          id: `sug_${Math.random().toString(36).substr(2, 9)}`,
          menu_item_id: item.id,
          originalName: item.name,
          suggestedName: sugName,
          originalDescription: item.description || '',
          suggestedDescription: sugDesc,
          originalPrice: item.price,
          suggestedPrice: sugPrice,
          issuesFound: issues,
          approved: false
        });
      }
    });

    return NextResponse.json({
      success: true,
      totalMenuItems: existingItems.length,
      insights,
      suggestions
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Menu cleanup analysis failed: ${err.message}` }, { status: 500 });
  }
}
