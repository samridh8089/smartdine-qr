export interface StickerDef {
  id: string;
  category: 'food' | 'drinks' | 'chef' | 'fresh' | 'badges' | 'genz' | 'doodles';
  symbol: string;
  label: string;
  keywords: string[];
}

export const STICKER_LIBRARY: StickerDef[] = [
  // ================= 1. FOOD (25 stickers) =================
  { id: 'st_burger', category: 'food', symbol: '🍔', label: 'Smash Burger', keywords: ['burger', 'fast food', 'meat', 'bun'] },
  { id: 'st_fries', category: 'food', symbol: '🍟', label: 'Crispy Fries', keywords: ['fries', 'potato', 'chips', 'fast food'] },
  { id: 'st_pizza', category: 'food', symbol: '🍕', label: 'Pizza Slice', keywords: ['pizza', 'cheese', 'italian', 'slice'] },
  { id: 'st_taco', category: 'food', symbol: '🌮', label: 'Mexican Taco', keywords: ['taco', 'mexican', 'street food'] },
  { id: 'st_hotdog', category: 'food', symbol: '🌭', label: 'Hot Dog', keywords: ['hotdog', 'sausage', 'snack'] },
  { id: 'st_burrito', category: 'food', symbol: '🌯', label: 'Burrito Wrap', keywords: ['wrap', 'roll', 'shawarma'] },
  { id: 'st_croissant', category: 'food', symbol: '🥐', label: 'Butter Croissant', keywords: ['croissant', 'bakery', 'french', 'bread'] },
  { id: 'st_bread', category: 'food', symbol: '🥖', label: 'Baguette', keywords: ['bread', 'bakery', 'toast'] },
  { id: 'st_pretzel', category: 'food', symbol: '🥨', label: 'Pretzel', keywords: ['pretzel', 'bakery', 'snack'] },
  { id: 'st_cheese', category: 'food', symbol: '🧀', label: 'Cheddar Wedge', keywords: ['cheese', 'dairy', 'slice'] },
  { id: 'st_bacon', category: 'food', symbol: '🥓', label: 'Crisp Bacon', keywords: ['bacon', 'breakfast', 'pork'] },
  { id: 'st_steak', category: 'food', symbol: '🥩', label: 'Ribeye Cut', keywords: ['steak', 'meat', 'beef', 'grill'] },
  { id: 'st_chicken', category: 'food', symbol: '🍗', label: 'Fried Drumstick', keywords: ['chicken', 'wings', 'crispy'] },
  { id: 'st_noodles', category: 'food', symbol: '🍜', label: 'Ramen Bowl', keywords: ['ramen', 'noodles', 'soup', 'asian'] },
  { id: 'st_spaghetti', category: 'food', symbol: '🍝', label: 'Spaghetti Pasta', keywords: ['pasta', 'italian', 'noodles'] },
  { id: 'st_curry', category: 'food', symbol: '🍛', label: 'Curry Rice', keywords: ['curry', 'rice', 'indian', 'biryani'] },
  { id: 'st_sushi', category: 'food', symbol: '🍣', label: 'Nigiri Sushi', keywords: ['sushi', 'japanese', 'fish', 'salmon'] },
  { id: 'st_bento', category: 'food', symbol: '🍱', label: 'Bento Box', keywords: ['bento', 'japanese', 'lunch'] },
  { id: 'st_dumpling', category: 'food', symbol: '🥟', label: 'Steamed Dumpling', keywords: ['dumpling', 'dim sum', 'momo', 'asian'] },
  { id: 'st_shrimp', category: 'food', symbol: '🍤', label: 'Tempura Prawn', keywords: ['shrimp', 'prawn', 'seafood'] },
  { id: 'st_riceball', category: 'food', symbol: '🍙', label: 'Onigiri Rice', keywords: ['onigiri', 'rice', 'japanese'] },
  { id: 'st_donut', category: 'food', symbol: '🍩', label: 'Glazed Donut', keywords: ['donut', 'dessert', 'sweet', 'glazed'] },
  { id: 'st_cookie', category: 'food', symbol: '🍪', label: 'Choco Chip Cookie', keywords: ['cookie', 'biscuit', 'sweet'] },
  { id: 'st_cake', category: 'food', symbol: '🍰', label: 'Strawberry Shortcake', keywords: ['cake', 'slice', 'dessert', 'birthday'] },
  { id: 'st_icecream', category: 'food', symbol: '🍦', label: 'Soft Serve Cone', keywords: ['ice cream', 'cone', 'dessert', 'gelato'] },

  // ================= 2. DRINKS & BEVERAGES (15 stickers) =================
  { id: 'st_coffee', category: 'drinks', symbol: '☕', label: 'Hot Coffee', keywords: ['coffee', 'espresso', 'cappuccino', 'tea'] },
  { id: 'st_tea', category: 'drinks', symbol: '🍵', label: 'Matcha Green Tea', keywords: ['matcha', 'tea', 'green tea'] },
  { id: 'st_boba', category: 'drinks', symbol: '🧋', label: 'Boba Bubble Tea', keywords: ['boba', 'bubble tea', 'tapioca', 'milk tea'] },
  { id: 'st_cocktail', category: 'drinks', symbol: '🍸', label: 'Martini Cocktail', keywords: ['martini', 'cocktail', 'bar', 'alcohol'] },
  { id: 'st_tropical', category: 'drinks', symbol: '🍹', label: 'Tropical Drink', keywords: ['tropical', 'juice', 'mocktail', 'cocktail'] },
  { id: 'st_wine', category: 'drinks', symbol: '🍷', label: 'Red Wine Glass', keywords: ['wine', 'red wine', 'grapes', 'bar'] },
  { id: 'st_champagne', category: 'drinks', symbol: '🍾', label: 'Bubbly Champagne', keywords: ['champagne', 'celebration', 'bottle'] },
  { id: 'st_beer', category: 'drinks', symbol: '🍺', label: 'Craft Beer Mug', keywords: ['beer', 'lager', 'ale', 'pub'] },
  { id: 'st_whiskey', category: 'drinks', symbol: '🥃', label: 'Whiskey Tumbler', keywords: ['whiskey', 'scotch', 'bourbon'] },
  { id: 'st_juice', category: 'drinks', symbol: '🥤', label: 'Iced Soda Cup', keywords: ['soda', 'coke', 'cold drink', 'cup'] },
  { id: 'st_coconut', category: 'drinks', symbol: '🥥', label: 'Fresh Coconut Water', keywords: ['coconut', 'tropical', 'drink'] },
  { id: 'st_lemonade', category: 'drinks', symbol: '🍋', label: 'Fresh Lemonade', keywords: ['lemonade', 'citrus', 'lemon'] },
  { id: 'st_milkshake', category: 'drinks', symbol: '🍨', label: 'Sundae Float', keywords: ['sundae', 'float', 'shake'] },
  { id: 'st_cheers', category: 'drinks', symbol: '🥂', label: 'Clinking Glasses', keywords: ['cheers', 'toast', 'celebrate'] },
  { id: 'st_ice', category: 'drinks', symbol: '🧊', label: 'Ice Cube', keywords: ['ice', 'cold', 'chill'] },

  // ================= 3. CHEF & KITCHEN (12 stickers) =================
  { id: 'st_chef_hat', category: 'chef', symbol: '👨‍🍳', label: 'Master Chef', keywords: ['chef', 'cook', 'kitchen', 'hat'] },
  { id: 'st_fork_knife', category: 'chef', symbol: '🍴', label: 'Fork & Knife', keywords: ['fork', 'knife', 'cutlery', 'dining'] },
  { id: 'st_plate', category: 'chef', symbol: '🍽️', label: 'Place Setting', keywords: ['plate', 'dish', 'dining', 'table'] },
  { id: 'st_spoon', category: 'chef', symbol: '🥄', label: 'Soup Spoon', keywords: ['spoon', 'silverware', 'soup'] },
  { id: 'st_knife', category: 'chef', symbol: '🔪', label: 'Chef Kitchen Knife', keywords: ['knife', 'prep', 'sharp', 'blade'] },
  { id: 'st_pan', category: 'chef', symbol: '🍳', label: 'Sizzling Skillet', keywords: ['skillet', 'pan', 'egg', 'breakfast'] },
  { id: 'st_pot', category: 'chef', symbol: '🍲', label: 'Hot Stew Pot', keywords: ['pot', 'stew', 'broth', 'cooking'] },
  { id: 'st_grill', category: 'chef', symbol: '🔥', label: 'Flames Grill', keywords: ['fire', 'flame', 'grill', 'bbq'] },
  { id: 'st_bell', category: 'chef', symbol: '🛎️', label: 'Service Bell', keywords: ['bell', 'service', 'waiter', 'ring'] },
  { id: 'st_saltdisp', category: 'chef', symbol: '🧂', label: 'Salt Shaker', keywords: ['salt', 'pepper', 'seasoning'] },
  { id: 'st_bowl', category: 'chef', symbol: '🥣', label: 'Cereal / Soup Bowl', keywords: ['bowl', 'soup', 'salad'] },
  { id: 'st_chopsticks', category: 'chef', symbol: '🥢', label: 'Chopsticks', keywords: ['chopsticks', 'asian', 'cutlery'] },

  // ================= 4. FRESH INGREDIENTS & GARNISH (15 stickers) =================
  { id: 'st_chili', category: 'fresh', symbol: '🌶️', label: 'Red Hot Chili', keywords: ['chili', 'spicy', 'hot', 'pepper'] },
  { id: 'st_herb', category: 'fresh', symbol: '🌿', label: 'Mint & Basil Sprig', keywords: ['mint', 'basil', 'herb', 'garnish', 'leaf'] },
  { id: 'st_leaf', category: 'fresh', symbol: '🍃', label: 'Fluttering Leaf', keywords: ['leaf', 'organic', 'vegan', 'fresh'] },
  { id: 'st_garlic', category: 'fresh', symbol: '🧄', label: 'Garlic Clove', keywords: ['garlic', 'flavor', 'spice'] },
  { id: 'st_onion', category: 'fresh', symbol: '🧅', label: 'Sweet Red Onion', keywords: ['onion', 'salad', 'fresh'] },
  { id: 'st_tomato', category: 'fresh', symbol: '🍅', label: 'Ripe Tomato', keywords: ['tomato', 'sauce', 'fresh'] },
  { id: 'st_avocado', category: 'fresh', symbol: '🥑', label: 'Creamy Avocado', keywords: ['avocado', 'guacamole', 'healthy'] },
  { id: 'st_lemon', category: 'fresh', symbol: '🍋', label: 'Tart Lemon Wedge', keywords: ['lemon', 'citrus', 'sour'] },
  { id: 'st_mushroom', category: 'fresh', symbol: '🍄', label: 'Wild Mushroom', keywords: ['mushroom', 'truffle', 'fungi'] },
  { id: 'st_corn', category: 'fresh', symbol: '🌽', label: 'Sweet Corn Cob', keywords: ['corn', 'sweet corn', 'vegetable'] },
  { id: 'st_pepper', category: 'fresh', symbol: '🫑', label: 'Bell Pepper', keywords: ['capsicum', 'pepper', 'crunchy'] },
  { id: 'st_cucumber', category: 'fresh', symbol: '🥒', label: 'Crisp Cucumber', keywords: ['cucumber', 'pickle', 'salad'] },
  { id: 'st_strawberry', category: 'fresh', symbol: '🍓', label: 'Fresh Strawberry', keywords: ['strawberry', 'berry', 'fruit'] },
  { id: 'st_cherry', category: 'fresh', symbol: '🍒', label: 'Twin Cherries', keywords: ['cherry', 'sweet', 'fruit'] },
  { id: 'st_olive', category: 'fresh', symbol: '🫒', label: 'Green Olive', keywords: ['olive', 'martini', 'mediterranean'] },

  // ================= 5. FOODIE BADGES & STAMPS (15 stickers) =================
  { id: 'st_badge_chef', category: 'badges', symbol: '⭐ CHEF\'S SPECIAL', label: 'Chef\'s Special Badge', keywords: ['special', 'chef', 'signature', 'badge'] },
  { id: 'st_badge_must', category: 'badges', symbol: '🔥 MUST TRY', label: 'Must Try Badge', keywords: ['must try', 'popular', 'hit', 'badge'] },
  { id: 'st_badge_fresh', category: 'badges', symbol: '🌱 100% ORGANIC', label: '100% Organic Badge', keywords: ['organic', 'vegan', 'fresh', 'farm'] },
  { id: 'st_badge_spicy', category: 'badges', symbol: '🌶️ EXTRA SPICY', label: 'Extra Spicy Badge', keywords: ['spicy', 'fire', 'hot', 'chili'] },
  { id: 'st_badge_top', category: 'badges', symbol: '👑 TOP RATED 4.9★', label: 'Top Rated 4.9★', keywords: ['rating', 'star', 'top rated', 'zomato'] },
  { id: 'st_badge_viral', category: 'badges', symbol: '⚡ INSTA VIRAL', label: 'Insta Viral Badge', keywords: ['viral', 'trending', 'tiktok', 'instagram'] },
  { id: 'st_badge_bestseller', category: 'badges', symbol: '🏆 BEST SELLER', label: 'Best Seller Badge', keywords: ['bestseller', 'favorite', 'number 1'] },
  { id: 'st_badge_crispy', category: 'badges', symbol: '✨ FRESHLY MADE', label: 'Freshly Made Badge', keywords: ['fresh', 'made to order', 'hot'] },
  { id: 'st_badge_secret', category: 'badges', symbol: '🤫 SECRET RECIPE', label: 'Secret Recipe Badge', keywords: ['secret', 'exclusive', 'special'] },
  { id: 'st_badge_artisan', category: 'badges', symbol: '☕ ARTISAN BREWED', label: 'Artisan Brewed Badge', keywords: ['artisan', 'coffee', 'brewed'] },
  { id: 'st_badge_authentic', category: 'badges', symbol: '🇮🇹 AUTHENTIC TASTE', label: 'Authentic Taste', keywords: ['authentic', 'real', 'traditional'] },
  { id: 'st_badge_tandoori', category: 'badges', symbol: '🔥 CLAY OVEN CHARRED', label: 'Clay Oven Charred', keywords: ['tandoor', 'oven', 'indian'] },
  { id: 'st_badge_no1', category: 'badges', symbol: '🥇 #1 FAVORITE', label: '#1 Favorite Badge', keywords: ['number 1', 'gold', 'medal'] },
  { id: 'st_badge_handcraft', category: 'badges', symbol: '❤️ HANDCRAFTED', label: 'Handcrafted With Love', keywords: ['love', 'handmade', 'craft'] },
  { id: 'st_badge_sweet', category: 'badges', symbol: '🍰 SWEET INDULGENCE', label: 'Sweet Indulgence', keywords: ['sweet', 'dessert', 'treat'] },

  // ================= 6. GEN-Z & Y2K DOODLES (20 stickers) =================
  { id: 'st_sparkles', category: 'genz', symbol: '✨', label: 'Golden Sparkles', keywords: ['sparkles', 'magic', 'shine', 'glow'] },
  { id: 'st_star4', category: 'genz', symbol: '✦', label: 'Four-Point Star', keywords: ['star', 'retro', 'y2k', 'aesthetic'] },
  { id: 'st_star8', category: 'genz', symbol: '★', label: 'Solid Gold Star', keywords: ['star', 'favorite', 'rating'] },
  { id: 'st_heart', category: 'genz', symbol: '💖', label: 'Sparkling Heart', keywords: ['heart', 'love', 'pink', 'cute'] },
  { id: 'st_fire', category: 'genz', symbol: '🔥', label: 'Lit Flame', keywords: ['fire', 'lit', 'hype', 'spicy'] },
  { id: 'st_lightning', category: 'genz', symbol: '⚡', label: 'High Voltage', keywords: ['lightning', 'fast', 'energy', 'electric'] },
  { id: 'st_smile', category: 'genz', symbol: '😊', label: 'Cute Smile', keywords: ['happy', 'smile', 'joy', 'cute'] },
  { id: 'st_sunglasses', category: 'genz', symbol: '😎', label: 'Cool Shades', keywords: ['cool', 'shades', 'swagger'] },
  { id: 'st_yum', category: 'genz', symbol: '😋', label: 'Yum Tongue', keywords: ['yum', 'delicious', 'tasty', 'foodie'] },
  { id: 'st_drool', category: 'genz', symbol: '🤤', label: 'Drooling Yummy', keywords: ['crave', 'drool', 'delicious'] },
  { id: 'st_clap', category: 'genz', symbol: '👏', label: 'Clapping Hands', keywords: ['applause', 'praise', 'bravo'] },
  { id: 'st_pin', category: 'genz', symbol: '📍', label: 'Location Pin', keywords: ['location', 'place', 'spot'] },
  { id: 'st_camera', category: 'genz', symbol: '📸', label: 'Camera Flash', keywords: ['camera', 'photo', 'instagram', 'snap'] },
  { id: 'st_bell_ding', category: 'genz', symbol: '🔔', label: 'Notification Ding', keywords: ['notify', 'bell', 'alert'] },
  { id: 'st_hundred', category: 'genz', symbol: '💯', label: '100 Percent', keywords: ['100', 'perfect', 'real'] },
  { id: 'st_sparkle_ring', category: 'genz', symbol: '💫', label: 'Dizzy Sparkle Star', keywords: ['dizzy', 'star', 'swoosh'] },
  { id: 'st_rainbow', category: 'genz', symbol: '🌈', label: 'Rainbow Arc', keywords: ['rainbow', 'pride', 'colorful'] },
  { id: 'st_party', category: 'genz', symbol: '🎉', label: 'Party Popper', keywords: ['party', 'celebrate', 'fun'] },
  { id: 'st_arrow', category: 'genz', symbol: '➔', label: 'Right Direction Arrow', keywords: ['arrow', 'pointer', 'next'] },
  { id: 'st_diamond', category: 'genz', symbol: '💎', label: 'Cut Gem Diamond', keywords: ['diamond', 'gem', 'luxury', 'precious'] }
];

export const STICKER_CATEGORIES = [
  { id: 'food', label: 'Food', count: 25, icon: '🍔' },
  { id: 'drinks', label: 'Drinks', count: 15, icon: '🍹' },
  { id: 'chef', label: 'Chef & Tools', count: 12, icon: '👨‍🍳' },
  { id: 'fresh', label: 'Garnish & Fresh', count: 15, icon: '🌿' },
  { id: 'badges', label: 'Review Badges', count: 15, icon: '⭐' },
  { id: 'genz', label: 'Gen-Z & Doodles', count: 20, icon: '✨' }
];
