import { QRFoodCategory } from './types';

export interface FoodBackgroundItem {
  id: string;
  name: string;
  category: QRFoodCategory;
  imageUrl: string;
  overlayColor: string;
  overlayOpacity: number;
  textColor: string;
  tag: string;
}

export const FOOD_BACKGROUND_GALLERY: FoodBackgroundItem[] = [
  // ================= 1. FAST FOOD (7 items) =================
  {
    id: 'fast_burger_smash',
    name: 'Gourmet Smash Burger',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#000000',
    overlayOpacity: 55,
    textColor: '#FEF08A', // Yellow-200
    tag: 'Smash Burger'
  },
  {
    id: 'fast_crispy_fries',
    name: 'Golden Crispy Fries',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#0F172A',
    overlayOpacity: 60,
    textColor: '#FDE047',
    tag: 'Fries'
  },
  {
    id: 'fast_pepperoni_pizza',
    name: 'Cheesy Pepperoni Pizza',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 55,
    textColor: '#FCA5A5',
    tag: 'Pizza Slice'
  },
  {
    id: 'fast_golden_nuggets',
    name: 'Crispy Fried Nuggets',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1C1917',
    overlayOpacity: 60,
    textColor: '#FDBA74',
    tag: 'Nuggets'
  },
  {
    id: 'fast_mexican_tacos',
    name: 'Street Style Street Tacos',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#000000',
    overlayOpacity: 50,
    textColor: '#86EFAC',
    tag: 'Tacos'
  },
  {
    id: 'fast_loaded_hotdog',
    name: 'Classic Loaded Hot Dog',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1E1B4B',
    overlayOpacity: 65,
    textColor: '#FDE047',
    tag: 'Hot Dog'
  },
  {
    id: 'fast_spicy_wings',
    name: 'Glazed Buffalo Wings',
    category: 'fast_food',
    imageUrl: 'https://images.unsplash.com/photo-1527477378675-d3c333529346?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#450A0A',
    overlayOpacity: 60,
    textColor: '#FECACA',
    tag: 'Wings'
  },

  // ================= 2. CAFE & BAKERY (7 items) =================
  {
    id: 'cafe_latte_art',
    name: 'Velvet Latte Art',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1C1917',
    overlayOpacity: 50,
    textColor: '#FEF3C7',
    tag: 'Coffee'
  },
  {
    id: 'cafe_butter_croissant',
    name: 'Flaky French Croissant',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#292524',
    overlayOpacity: 55,
    textColor: '#FDE68A',
    tag: 'Croissant'
  },
  {
    id: 'cafe_iced_cold_brew',
    name: 'Iced Vanilla Cold Brew',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#09090B',
    overlayOpacity: 50,
    textColor: '#E2E8F0',
    tag: 'Cold Brew'
  },
  {
    id: 'cafe_matcha_latte',
    name: 'Ceremonial Matcha Latte',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#064E3B',
    overlayOpacity: 55,
    textColor: '#D1FAE5',
    tag: 'Matcha'
  },
  {
    id: 'cafe_berry_cheesecake',
    name: 'New York Cheesecake',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 60,
    textColor: '#FBCFE8',
    tag: 'Cake'
  },
  {
    id: 'cafe_cinnamon_roll',
    name: 'Glazed Cinnamon Brioche',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#2D1500',
    overlayOpacity: 60,
    textColor: '#FEF08A',
    tag: 'Pastry'
  },
  {
    id: 'cafe_espresso_shot',
    name: 'Crema Espresso Shot',
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#0A0A0A',
    overlayOpacity: 55,
    textColor: '#FBBF24',
    tag: 'Espresso'
  },

  // ================= 3. INDIAN CUISINE (7 items) =================
  {
    id: 'indian_butter_chicken',
    name: 'Rich Butter Chicken',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#431407',
    overlayOpacity: 55,
    textColor: '#FEF08A',
    tag: 'Butter Chicken'
  },
  {
    id: 'indian_paneer_tikka',
    name: 'Tandoori Paneer Tikka',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1C1917',
    overlayOpacity: 50,
    textColor: '#FED7AA',
    tag: 'Paneer'
  },
  {
    id: 'indian_dum_biryani',
    name: 'Royal Hyderabadi Biryani',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 60,
    textColor: '#FDE68A',
    tag: 'Biryani'
  },
  {
    id: 'indian_masala_dosa',
    name: 'Golden Crisp Masala Dosa',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#0F172A',
    overlayOpacity: 55,
    textColor: '#86EFAC',
    tag: 'Dosa'
  },
  {
    id: 'indian_dal_makhani',
    name: 'Slow Cooked Dal Makhani',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1E1B4B',
    overlayOpacity: 65,
    textColor: '#FDE047',
    tag: 'Dal Makhani'
  },
  {
    id: 'indian_garlic_naan',
    name: 'Charred Butter Garlic Naan',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#171717',
    overlayOpacity: 50,
    textColor: '#FEF3C7',
    tag: 'Naan'
  },
  {
    id: 'indian_samosa_chaat',
    name: 'Crisp Punjabi Samosa',
    category: 'indian',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#2D0A00',
    overlayOpacity: 60,
    textColor: '#FCA5A5',
    tag: 'Samosa'
  },

  // ================= 4. ASIAN CUISINE (7 items) =================
  {
    id: 'asian_sushi_platter',
    name: 'Artisan Sushi & Nigiri Platter',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#09090B',
    overlayOpacity: 50,
    textColor: '#FED7AA',
    tag: 'Sushi'
  },
  {
    id: 'asian_tonkotsu_ramen',
    name: 'Steaming Tonkotsu Ramen',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 55,
    textColor: '#FEF08A',
    tag: 'Ramen'
  },
  {
    id: 'asian_wok_noodles',
    name: 'Fiery Wok Hakka Noodles',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1C1917',
    overlayOpacity: 55,
    textColor: '#FDBA74',
    tag: 'Noodles'
  },
  {
    id: 'asian_steamed_dimsum',
    name: 'Bamboo Steamed Dim Sum',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#0A0A0A',
    overlayOpacity: 50,
    textColor: '#86EFAC',
    tag: 'Dim Sum'
  },
  {
    id: 'asian_thai_pad_thai',
    name: 'Bangkok Street Pad Thai',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#172554',
    overlayOpacity: 60,
    textColor: '#FDE68A',
    tag: 'Pad Thai'
  },
  {
    id: 'asian_fluffy_bao',
    name: 'Braised Pork Bao Buns',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#111827',
    overlayOpacity: 55,
    textColor: '#E2E8F0',
    tag: 'Bao Buns'
  },
  {
    id: 'asian_japanese_gyoza',
    name: 'Pan-Fried Crispy Gyoza',
    category: 'asian',
    imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#261204',
    overlayOpacity: 60,
    textColor: '#FDE047',
    tag: 'Gyoza'
  },

  // ================= 5. DESSERTS (6 items) =================
  {
    id: 'dessert_belgian_waffle',
    name: 'Berry Belgian Waffle',
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 55,
    textColor: '#FBCFE8',
    tag: 'Waffles'
  },
  {
    id: 'dessert_glazed_donuts',
    name: 'Pastel Glazed Donuts',
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#2E1065',
    overlayOpacity: 60,
    textColor: '#F472B6',
    tag: 'Donuts'
  },
  {
    id: 'dessert_artisan_gelato',
    name: 'Strawberry Pistachio Gelato',
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1F2937',
    overlayOpacity: 50,
    textColor: '#BAE6FD',
    tag: 'Ice Cream'
  },
  {
    id: 'dessert_molten_lava',
    name: 'Molten Chocolate Lava Cake',
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#09090B',
    overlayOpacity: 60,
    textColor: '#FEF08A',
    tag: 'Lava Cake'
  },
  {
    id: 'dessert_brown_sugar_boba',
    name: 'Brown Sugar Tiger Boba',
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b371f31ca704?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1E1B4B',
    overlayOpacity: 55,
    textColor: '#FDE68A',
    tag: 'Boba'
  },
  {
    id: 'dessert_berry_pancakes',
    name: 'Fluffy Souffle Pancakes',
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 50,
    textColor: '#FED7AA',
    tag: 'Pancakes'
  },

  // ================= 6. PREMIUM LUXURY & FINE DINING (8 items) =================
  {
    id: 'lux_wagyu_steak',
    name: 'Prime Wagyu Ribeye Steak',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#000000',
    overlayOpacity: 60,
    textColor: '#D4AF37', // Gold
    tag: 'Steak'
  },
  {
    id: 'lux_gourmet_plating',
    name: 'Michelin Star Chef Plating',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#09090B',
    overlayOpacity: 55,
    textColor: '#F59E0B',
    tag: 'Fine Dining'
  },
  {
    id: 'lux_truffle_pasta',
    name: 'Handmade Black Truffle Tagliatelle',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#1C1917',
    overlayOpacity: 55,
    textColor: '#FEF3C7',
    tag: 'Truffle Pasta'
  },
  {
    id: 'lux_pan_seared_salmon',
    name: 'Crispy Skin Atlantic Salmon',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#022C22',
    overlayOpacity: 60,
    textColor: '#34D399',
    tag: 'Gourmet Salmon'
  },
  {
    id: 'lux_charcuterie_board',
    name: 'Artisan Fromage & Charcuterie',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#18181B',
    overlayOpacity: 55,
    textColor: '#FBBF24',
    tag: 'Charcuterie'
  },
  {
    id: 'lux_seared_scallops',
    name: 'Pan-Seared Hokkaido Scallops',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#0F172A',
    overlayOpacity: 55,
    textColor: '#F8FAFC',
    tag: 'Scallops'
  },
  {
    id: 'lux_wine_cellar',
    name: 'Sommelier Wine Reserve',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#2E0854',
    overlayOpacity: 65,
    textColor: '#E9D5FF',
    tag: 'Wine & Lounge'
  },
  {
    id: 'lux_cocktail_craft',
    name: 'Craft Smoked Old Fashioned',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
    overlayColor: '#000000',
    overlayOpacity: 55,
    textColor: '#F59E0B',
    tag: 'Cocktails'
  }
];

export const FOOD_CATEGORIES = [
  { id: 'fast_food', label: 'Fast Food', count: 7, icon: '🍔' },
  { id: 'cafe', label: 'Cafe & Bakery', count: 7, icon: '☕' },
  { id: 'indian', label: 'Indian Cuisine', count: 7, icon: '🍛' },
  { id: 'asian', label: 'Asian & Sushi', count: 7, icon: '🍣' },
  { id: 'dessert', label: 'Desserts & Sweets', count: 6, icon: '🍦' },
  { id: 'luxury', label: 'Premium Luxury', count: 8, icon: '🥩' }
];
