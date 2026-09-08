// Realistic Seeded Dataset for CleverOps Phase-18.17A Preview Mode
// Activated only where real localhost database data is absent.
// Does NOT touch or mutate production or remote database tables.

export interface DemoDish {
  id: string;
  name: string;
  category: 'Starters' | 'Main Course' | 'Drinks' | 'Desserts';
  price: number;
  prepTimeMinutes: number;
  gstPercentage: number;
  isVeg: boolean;
  description: string;
  inventoryMapping: Array<{ ingredient: string; quantity: number; unit: string }>;
}

export const DEMO_MENU_ITEMS: DemoDish[] = [
  // Starters
  {
    id: 'dish-paneer-tikka',
    name: 'Tandoori Paneer Tikka',
    category: 'Starters',
    price: 280,
    prepTimeMinutes: 12,
    gstPercentage: 5,
    isVeg: true,
    description: 'Charred cottage cheese cubes marinated in spiced hung curd, bell peppers, and royal cumin.',
    inventoryMapping: [{ ingredient: 'Paneer', quantity: 200, unit: 'gram' }, { ingredient: 'Butter', quantity: 20, unit: 'gram' }]
  },
  {
    id: 'dish-crispy-corn',
    name: 'Pepper Garlic Crispy Corn',
    category: 'Starters',
    price: 210,
    prepTimeMinutes: 10,
    gstPercentage: 5,
    isVeg: true,
    description: 'Golden sweet corn wok-tossed with crushed black pepper, spring onion, and crispy garlic.',
    inventoryMapping: [{ ingredient: 'Cooking Oil', quantity: 30, unit: 'ml' }]
  },
  {
    id: 'dish-hara-bhara',
    name: 'Hara Bhara Kebab (6 pcs)',
    category: 'Starters',
    price: 230,
    prepTimeMinutes: 10,
    gstPercentage: 5,
    isVeg: true,
    description: 'Pan-seared spinach, green pea, and roasted gram patties filled with spiced cottage cheese core.',
    inventoryMapping: [{ ingredient: 'Paneer', quantity: 80, unit: 'gram' }, { ingredient: 'Cooking Oil', quantity: 20, unit: 'ml' }]
  },
  {
    id: 'dish-dahi-kebab',
    name: 'Awadhi Dahi Ke Kebab',
    category: 'Starters',
    price: 250,
    prepTimeMinutes: 12,
    gstPercentage: 5,
    isVeg: true,
    description: 'Melt-in-mouth spiced hung yoghurt croquettes seasoned with green cardamom and coriander.',
    inventoryMapping: [{ ingredient: 'Cooking Oil', quantity: 25, unit: 'ml' }]
  },
  {
    id: 'dish-soya-chaap',
    name: 'Malai Tandoori Soya Chaap',
    category: 'Starters',
    price: 260,
    prepTimeMinutes: 14,
    gstPercentage: 5,
    isVeg: true,
    description: 'Juicy soya chaap glazed in cashew cream, white pepper, and melted farm butter in clay oven.',
    inventoryMapping: [{ ingredient: 'Cream', quantity: 40, unit: 'ml' }, { ingredient: 'Butter', quantity: 25, unit: 'gram' }]
  },
  {
    id: 'dish-spring-rolls',
    name: 'Crunchy Veg Spring Rolls',
    category: 'Starters',
    price: 190,
    prepTimeMinutes: 8,
    gstPercentage: 5,
    isVeg: true,
    description: 'Crispy rolled thin wrappers stuffed with julienned vegetables and mild soy ginger sauce.',
    inventoryMapping: [{ ingredient: 'Cooking Oil', quantity: 30, unit: 'ml' }]
  },

  // Main Course
  {
    id: 'dish-paneer-butter-masala',
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 340,
    prepTimeMinutes: 15,
    gstPercentage: 5,
    isVeg: true,
    description: 'Fresh diced malai paneer simmered in a velvety slow-cooked plum tomato and cashew gravy.',
    inventoryMapping: [{ ingredient: 'Paneer', quantity: 220, unit: 'gram' }, { ingredient: 'Tomato', quantity: 180, unit: 'gram' }, { ingredient: 'Butter', quantity: 35, unit: 'gram' }]
  },
  {
    id: 'dish-dal-makhani',
    name: 'Overnight Dal Makhani',
    category: 'Main Course',
    price: 310,
    prepTimeMinutes: 18,
    gstPercentage: 5,
    isVeg: true,
    description: 'Black urad lentils slow-simmered for 16 hours over charcoal embers with organic butter and cream.',
    inventoryMapping: [{ ingredient: 'Butter', quantity: 40, unit: 'gram' }, { ingredient: 'Cream', quantity: 30, unit: 'ml' }, { ingredient: 'Tomato', quantity: 100, unit: 'gram' }]
  },
  {
    id: 'dish-kadhai-paneer',
    name: 'Handi Kadhai Paneer',
    category: 'Main Course',
    price: 350,
    prepTimeMinutes: 16,
    gstPercentage: 5,
    isVeg: true,
    description: 'Cottage cheese and charred bell peppers tossed in aromatic house-ground coriander and dry red chilli.',
    inventoryMapping: [{ ingredient: 'Paneer', quantity: 200, unit: 'gram' }, { ingredient: 'Tomato', quantity: 120, unit: 'gram' }, { ingredient: 'Onions', quantity: 100, unit: 'gram' }]
  },
  {
    id: 'dish-veg-biryani',
    name: 'Nawabi Veg Dum Biryani',
    category: 'Main Course',
    price: 320,
    prepTimeMinutes: 20,
    gstPercentage: 5,
    isVeg: true,
    description: 'Aged long-grain basmati rice layered with seasonal vegetables, saffron milk, and fried onions.',
    inventoryMapping: [{ ingredient: 'Rice (Basmati)', quantity: 250, unit: 'gram' }, { ingredient: 'Onions', quantity: 80, unit: 'gram' }, { ingredient: 'Butter', quantity: 20, unit: 'gram' }]
  },
  {
    id: 'dish-malai-kofta',
    name: 'Shahi Malai Kofta',
    category: 'Main Course',
    price: 360,
    prepTimeMinutes: 18,
    gstPercentage: 5,
    isVeg: true,
    description: 'Potato and paneer dumplings filled with dried fruit, finished in an ivory cashew korma gravy.',
    inventoryMapping: [{ ingredient: 'Paneer', quantity: 150, unit: 'gram' }, { ingredient: 'Cream', quantity: 40, unit: 'ml' }]
  },
  {
    id: 'dish-butter-naan',
    name: 'Amritsari Butter Naan',
    category: 'Main Course',
    price: 60,
    prepTimeMinutes: 5,
    gstPercentage: 5,
    isVeg: true,
    description: 'Traditional refined wheat tandoor flatbread brushed with golden salted farm butter.',
    inventoryMapping: [{ ingredient: 'Butter', quantity: 15, unit: 'gram' }]
  },
  {
    id: 'dish-garlic-roti',
    name: 'Tandoori Garlic Roti',
    category: 'Main Course',
    price: 45,
    prepTimeMinutes: 5,
    gstPercentage: 5,
    isVeg: true,
    description: 'Stone-ground whole wheat flatbread baked on clay walls with roasted minced garlic and coriander.',
    inventoryMapping: [{ ingredient: 'Butter', quantity: 10, unit: 'gram' }]
  },

  // Drinks
  {
    id: 'dish-fresh-lime-soda',
    name: 'Fresh Lime Soda (Sweet & Salt)',
    category: 'Drinks',
    price: 90,
    prepTimeMinutes: 4,
    gstPercentage: 5,
    isVeg: true,
    description: 'Hand-squeezed Kagzi lime juice with sparkling club soda, rock salt, and light cane syrup.',
    inventoryMapping: []
  },
  {
    id: 'dish-virgin-mojito',
    name: 'Classic Virgin Mojito',
    category: 'Drinks',
    price: 160,
    prepTimeMinutes: 5,
    gstPercentage: 5,
    isVeg: true,
    description: 'Muddled fresh garden mint, lime wedges, organic demerara sugar, and chilled carbonated water.',
    inventoryMapping: []
  },
  {
    id: 'dish-mango-lassi',
    name: 'Alphonso Mango Lassi',
    category: 'Drinks',
    price: 130,
    prepTimeMinutes: 4,
    gstPercentage: 5,
    isVeg: true,
    description: 'Thick churned farm curd infused with pure Ratnagiri Alphonso mango pulp and saffron.',
    inventoryMapping: []
  },
  {
    id: 'dish-masala-chai',
    name: 'Cutting Masala Chai Pot',
    category: 'Drinks',
    price: 60,
    prepTimeMinutes: 6,
    gstPercentage: 5,
    isVeg: true,
    description: 'CTC tea decoction slow-brewed with fresh whole milk, ginger, crushed cardamom, and cinnamon.',
    inventoryMapping: [{ ingredient: 'Cream', quantity: 10, unit: 'ml' }]
  },
  {
    id: 'dish-cold-coffee',
    name: 'Artisan Cold Coffee with Ice Cream',
    category: 'Drinks',
    price: 150,
    prepTimeMinutes: 5,
    gstPercentage: 5,
    isVeg: true,
    description: 'Double shot espresso shaken with chilled creamy milk and topped with rich vanilla bean gelato.',
    inventoryMapping: []
  },

  // Desserts
  {
    id: 'dish-gulab-jamun',
    name: 'Hot Gulab Jamun (2 Pcs)',
    category: 'Desserts',
    price: 110,
    prepTimeMinutes: 3,
    gstPercentage: 5,
    isVeg: true,
    description: 'Warm fried milk dumplings soaked in green cardamom and rose petal infused sugar syrup.',
    inventoryMapping: []
  },
  {
    id: 'dish-rasmalai',
    name: 'Kesar Pista Rasmalai (2 Pcs)',
    category: 'Desserts',
    price: 140,
    prepTimeMinutes: 3,
    gstPercentage: 5,
    isVeg: true,
    description: 'Poached chenna medallions immersed in chilled saffron-almond milk garnished with Iranian pistachios.',
    inventoryMapping: []
  },
  {
    id: 'dish-sizzling-brownie',
    name: 'Sizzling Brownie with Vanilla Gelato',
    category: 'Desserts',
    price: 220,
    prepTimeMinutes: 8,
    gstPercentage: 5,
    isVeg: true,
    description: 'Warm Belgian dark chocolate walnut fudge served on a cast-iron skillet with hot chocolate ganache.',
    inventoryMapping: [{ ingredient: 'Butter', quantity: 20, unit: 'gram' }]
  },
  {
    id: 'dish-kesar-kulfi',
    name: 'Matka Kesar Pista Kulfi',
    category: 'Desserts',
    price: 120,
    prepTimeMinutes: 3,
    gstPercentage: 5,
    isVeg: true,
    description: 'Traditional slow-reduced dense clotted milk ice cream scented with saffron strands and almonds.',
    inventoryMapping: []
  }
];

export interface DemoInventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  minThreshold: number;
  costPerUnit: number;
  status: 'healthy' | 'low' | 'critical';
  supplier: string;
  lastPurchaseDate: string;
}

export const DEMO_INVENTORY_ITEMS: DemoInventoryItem[] = [
  {
    id: 'inv-paneer',
    name: 'Paneer (Fresh Cottage Cheese)',
    currentStock: 8.0,
    unit: 'kg',
    minThreshold: 4.0,
    costPerUnit: 320,
    status: 'healthy',
    supplier: 'Fresh Farms Dairy',
    lastPurchaseDate: 'Yesterday, 07:30 AM'
  },
  {
    id: 'inv-tomato',
    name: 'Plum Tomatoes (Grade A)',
    currentStock: 18.0,
    unit: 'kg',
    minThreshold: 10.0,
    costPerUnit: 40,
    status: 'healthy',
    supplier: 'Green Valley Produce',
    lastPurchaseDate: 'Today, 06:15 AM'
  },
  {
    id: 'inv-rice',
    name: 'Basmati Rice (Aged 2 Yrs)',
    currentStock: 40.0,
    unit: 'kg',
    minThreshold: 15.0,
    costPerUnit: 85,
    status: 'healthy',
    supplier: 'Metro Cash & Carry',
    lastPurchaseDate: '04 Sep 2026'
  },
  {
    id: 'inv-butter',
    name: 'Farm Butter (Salted)',
    currentStock: 5.0,
    unit: 'kg',
    minThreshold: 8.0,
    costPerUnit: 520,
    status: 'low',
    supplier: 'Fresh Farms Dairy',
    lastPurchaseDate: '06 Sep 2026'
  },
  {
    id: 'inv-cream',
    name: 'Fresh Dairy Cream (25% Fat)',
    currentStock: 3.5,
    unit: 'L',
    minThreshold: 3.0,
    costPerUnit: 240,
    status: 'healthy',
    supplier: 'Fresh Farms Dairy',
    lastPurchaseDate: 'Yesterday, 07:30 AM'
  },
  {
    id: 'inv-onions',
    name: 'Red Onions (Nashik)',
    currentStock: 25.0,
    unit: 'kg',
    minThreshold: 12.0,
    costPerUnit: 35,
    status: 'healthy',
    supplier: 'Green Valley Produce',
    lastPurchaseDate: '05 Sep 2026'
  },
  {
    id: 'inv-oil',
    name: 'Refined Sunflower Oil',
    currentStock: 15.0,
    unit: 'L',
    minThreshold: 10.0,
    costPerUnit: 145,
    status: 'healthy',
    supplier: 'Metro Cash & Carry',
    lastPurchaseDate: '03 Sep 2026'
  }
];

export const DEMO_PURCHASE_HISTORY = [
  { id: 'pur-101', invoiceNo: 'INV-FF-8841', date: '08 Sep 2026', supplier: 'Fresh Farms Dairy', itemsCount: 3, totalAmount: 4850, paymentStatus: 'Paid' },
  { id: 'pur-102', invoiceNo: 'INV-GV-4219', date: '08 Sep 2026', supplier: 'Green Valley Produce', itemsCount: 4, totalAmount: 1820, paymentStatus: 'Paid' },
  { id: 'pur-103', invoiceNo: 'INV-MC-9023', date: '04 Sep 2026', supplier: 'Metro Cash & Carry', itemsCount: 2, totalAmount: 5575, paymentStatus: 'Paid' }
];

export const DEMO_STOCK_MOVEMENTS = [
  { id: 'mov-1', time: '14:22', item: 'Paneer', type: 'Deduction', qty: '-0.44 kg', ref: 'Order #00038 (T-2)', user: 'Kitchen Auto-Deduct' },
  { id: 'mov-2', time: '13:50', item: 'Butter', type: 'Deduction', qty: '-0.12 kg', ref: 'Order #00036 (T-7)', user: 'Kitchen Auto-Deduct' },
  { id: 'mov-3', time: '13:15', item: 'Rice (Basmati)', type: 'Deduction', qty: '-0.50 kg', ref: 'Order #00034 (T-5)', user: 'Kitchen Auto-Deduct' },
  { id: 'mov-4', time: '07:30', item: 'Paneer', type: 'Restock', qty: '+10.0 kg', ref: 'PO-8841 Fresh Farms', user: 'Inventory Mgr' }
];

export interface DemoOrder {
  id: string;
  orderNumber: string;
  tableDisplay: string;
  orderType: 'dine_in' | 'takeaway' | 'reservation';
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled';
  itemsSummary: string;
  itemsCount: number;
  subtotal: number;
  gst: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  createdAtTime: string;
  elapsedMinutes: number;
  reservationTime?: string;
  guestCount?: number;
}

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: 'ord-038',
    orderNumber: '#00038',
    tableDisplay: 'TABLE 2',
    orderType: 'dine_in',
    status: 'preparing',
    itemsSummary: '1x Tandoori Paneer Tikka, 1x Paneer Butter Masala, 2x Amritsari Butter Naan',
    itemsCount: 4,
    subtotal: 740,
    gst: 37,
    total: 777,
    customerNote: 'Mild spice please. Extra crispy naan with light butter.',
    createdAtTime: '14:15',
    elapsedMinutes: 8,
    guestCount: 2
  },
  {
    id: 'ord-037',
    orderNumber: '#00037',
    tableDisplay: 'TABLE 7',
    orderType: 'dine_in',
    status: 'accepted',
    itemsSummary: '2x Nawabi Veg Dum Biryani, 2x Fresh Lime Soda',
    itemsCount: 4,
    subtotal: 820,
    gst: 41,
    total: 861,
    customerNote: 'No onion in raita. Sweet lime soda only.',
    createdAtTime: '14:19',
    elapsedMinutes: 4,
    guestCount: 4
  },
  {
    id: 'ord-036',
    orderNumber: '#00036',
    tableDisplay: 'TABLE 5 + 6',
    orderType: 'dine_in',
    status: 'ready',
    itemsSummary: '2x Overnight Dal Makhani, 2x Handi Kadhai Paneer, 6x Garlic Roti, 2x Rasmalai',
    itemsCount: 12,
    subtotal: 1870,
    gst: 93.5,
    total: 1963.5,
    customerNote: 'Serve dessert together after mains.',
    createdAtTime: '13:52',
    elapsedMinutes: 31,
    guestCount: 8
  },
  {
    id: 'ord-035',
    orderNumber: '#00035',
    tableDisplay: 'TABLE 4',
    orderType: 'dine_in',
    status: 'served',
    itemsSummary: '1x Awadhi Dahi Ke Kebab, 1x Shahi Malai Kofta, 3x Butter Naan',
    itemsCount: 5,
    subtotal: 790,
    gst: 39.5,
    total: 829.5,
    createdAtTime: '13:40',
    elapsedMinutes: 43,
    guestCount: 3
  },
  {
    id: 'ord-034',
    orderNumber: '#00034',
    tableDisplay: 'TAKEAWAY',
    orderType: 'takeaway',
    status: 'ready',
    itemsSummary: '2x Paneer Butter Masala, 4x Amritsari Butter Naan, 1x Veg Dum Biryani',
    itemsCount: 7,
    subtotal: 1240,
    gst: 62,
    total: 1302,
    customerName: 'Vikram Mehta',
    customerPhone: '+91 98201 44512',
    customerNote: 'Pack gravy containers upright. Send cutlery.',
    createdAtTime: '14:05',
    elapsedMinutes: 18
  },
  {
    id: 'ord-033',
    orderNumber: '#00033',
    tableDisplay: 'TAKEAWAY',
    orderType: 'takeaway',
    status: 'preparing',
    itemsSummary: '1x Malai Tandoori Soya Chaap, 1x Overnight Dal Makhani, 2x Garlic Roti',
    itemsCount: 4,
    subtotal: 660,
    gst: 33,
    total: 693,
    customerName: 'Ananya Sharma',
    customerPhone: '+91 99302 11894',
    customerNote: 'Customer arriving in 10 minutes by car.',
    createdAtTime: '14:14',
    elapsedMinutes: 9
  },
  {
    id: 'ord-032',
    orderNumber: '#00032',
    tableDisplay: 'RESERVATION (T-3)',
    orderType: 'reservation',
    status: 'new',
    itemsSummary: 'Table Reserved for 4 Guests — Pre-order Pending',
    itemsCount: 0,
    subtotal: 0,
    gst: 0,
    total: 0,
    customerName: 'Sanjay Kapoor',
    customerPhone: '+91 98110 33481',
    customerNote: 'Anniversary dinner. Please keep quiet corner table.',
    reservationTime: 'Today, 20:00 (In 5h 38m)',
    createdAtTime: '11:30',
    elapsedMinutes: 173,
    guestCount: 4
  },
  {
    id: 'ord-031',
    orderNumber: '#00031',
    tableDisplay: 'RESERVATION (T-8)',
    orderType: 'reservation',
    status: 'accepted',
    itemsSummary: 'Table Reserved for 6 Guests',
    itemsCount: 0,
    subtotal: 0,
    gst: 0,
    total: 0,
    customerName: 'Dr. Ramesh Nair',
    customerPhone: '+91 97401 88921',
    customerNote: 'Family celebration with senior citizens. Easy chair access.',
    reservationTime: 'Today, 19:30 (In 5h 08m)',
    createdAtTime: '10:15',
    elapsedMinutes: 248,
    guestCount: 6
  }
];

export const DEMO_REPORTS_ANALYTICS = {
  todayRevenue: 48920,
  yesterdayRevenue: 42150,
  growthPercentage: '+16.1%',
  totalOrders: 44,
  avgOrderValue: 1111.8,
  cgstCollected: 1164.76,
  sgstCollected: 1164.76,
  totalGst: 2329.52,
  hourlySales: [
    { hour: '11:00', sales: 1800, orders: 2 },
    { hour: '12:00', sales: 6400, orders: 6 },
    { hour: '13:00', sales: 14200, orders: 12 },
    { hour: '14:00', sales: 11800, orders: 10 },
    { hour: '15:00', sales: 3200, orders: 3 },
    { hour: '16:00', sales: 1400, orders: 2 },
    { hour: '17:00', sales: 2100, orders: 2 },
    { hour: '18:00', sales: 4800, orders: 4 },
    { hour: '19:00', sales: 3220, orders: 3 }
  ],
  waiterPerformance: [
    { name: 'Priya Sharma', ordersServed: 16, revenue: 18450, avgTime: '12m', rating: 4.9 },
    { name: 'Rahul Verma', ordersServed: 14, revenue: 16200, avgTime: '14m', rating: 4.8 },
    { name: 'Amit Patel', ordersServed: 10, revenue: 10850, avgTime: '15m', rating: 4.7 },
    { name: 'Sunita Roy', ordersServed: 4, revenue: 3420, avgTime: '11m', rating: 4.9 }
  ],
  kitchenBottlenecks: {
    avgTicketPrepTime: '13.8 min',
    fastestCategory: 'Starters (9.4 min)',
    slowestCategory: 'Main Course (17.2 min)',
    topDelayedDish: 'Shahi Malai Kofta (18 min avg)'
  },
  tableTurnover: {
    avgDwellTimeMinutes: 42,
    peakOccupancyRate: '87.5%',
    totalTurnsToday: 3.2
  }
};

export const DEMO_CATEGORIES = [
  { id: 'cat-starters', name: 'Starters', is_active: true, sort_order: 1 },
  { id: 'cat-mains', name: 'Main Course', is_active: true, sort_order: 2 },
  { id: 'cat-drinks', name: 'Drinks', is_active: true, sort_order: 3 },
  { id: 'cat-desserts', name: 'Desserts', is_active: true, sort_order: 4 },
];

export function generateDemoDbOrders(restaurantId: string): any[] {
  const now = new Date();
  const waiters = ['Priya Sharma', 'Rahul Verma', 'Amit Patel', 'Sunita Roy'];
  const waiterWeights = [16, 14, 10, 4];
  const tables = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'Table 7', 'Table 8', 'Table 9', 'Table 10'];
  const paymentMethods = ['upi', 'upi', 'card', 'cash', 'upi'];

  const orders: any[] = [];
  let orderIndex = 1;

  // Generate 32 orders for today across peak lunch and dinner hours
  const hoursDistribution = [
    { hour: 11, count: 2 },
    { hour: 12, count: 4 },
    { hour: 13, count: 7 },
    { hour: 14, count: 5 },
    { hour: 15, count: 2 },
    { hour: 17, count: 2 },
    { hour: 18, count: 3 },
    { hour: 19, count: 4 },
    { hour: 20, count: 3 }
  ];

  let waiterCounter = 0;
  const getNextWaiter = () => {
    // Distribute according to target weight
    const total = 44;
    const r = waiterCounter % total;
    waiterCounter++;
    if (r < 16) return waiters[0];
    if (r < 30) return waiters[1];
    if (r < 40) return waiters[2];
    return waiters[3];
  };

  hoursDistribution.forEach(({ hour, count }) => {
    for (let c = 0; c < count; c++) {
      const orderDate = new Date(now);
      orderDate.setHours(hour, (c * 13) % 60, 0, 0);
      const createdAtIso = orderDate.toISOString();
      const prepMin = 10 + ((orderIndex * 3) % 15);
      const readyDate = new Date(orderDate.getTime() + prepMin * 60000);
      const servedDate = new Date(readyDate.getTime() + 2 * 60000);
      const completedDate = new Date(servedDate.getTime() + 25 * 60000);

      // Select 2-3 dishes from DEMO_MENU_ITEMS
      const dishA = DEMO_MENU_ITEMS[orderIndex % DEMO_MENU_ITEMS.length];
      const dishB = DEMO_MENU_ITEMS[(orderIndex + 3) % DEMO_MENU_ITEMS.length];
      const dishC = orderIndex % 3 === 0 ? DEMO_MENU_ITEMS[(orderIndex + 7) % DEMO_MENU_ITEMS.length] : null;

      const orderItems = [
        {
          id: `item-${orderIndex}-1`,
          order_id: `ord-demo-${orderIndex}`,
          menu_item_id: dishA.id,
          name: dishA.name,
          category_name: dishA.category,
          price: dishA.price,
          quantity: 1 + (orderIndex % 2),
          subtotal: dishA.price * (1 + (orderIndex % 2)),
          status: 'served'
        },
        {
          id: `item-${orderIndex}-2`,
          order_id: `ord-demo-${orderIndex}`,
          menu_item_id: dishB.id,
          name: dishB.name,
          category_name: dishB.category,
          price: dishB.price,
          quantity: 1,
          subtotal: dishB.price,
          status: 'served'
        }
      ];

      if (dishC) {
        orderItems.push({
          id: `item-${orderIndex}-3`,
          order_id: `ord-demo-${orderIndex}`,
          menu_item_id: dishC.id,
          name: dishC.name,
          category_name: dishC.category,
          price: dishC.price,
          quantity: 1,
          subtotal: dishC.price,
          status: 'served'
        });
      }

      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const gst = parseFloat((subtotal * 0.05).toFixed(2));
      const cgst = parseFloat((gst / 2).toFixed(2));
      const sgst = parseFloat((gst / 2).toFixed(2));
      const total = subtotal + gst;
      const waiter = getNextWaiter();
      const tableName = tables[orderIndex % tables.length];

      orders.push({
        id: `ord-demo-${orderIndex}`,
        restaurant_id: restaurantId,
        table_id: `tbl-${(orderIndex % tables.length) + 1}`,
        table_name: tableName,
        status: 'completed',
        subtotal,
        discount_total: 0,
        cgst_amount: cgst,
        sgst_amount: sgst,
        tax_total: gst,
        grand_total: total,
        gst,
        service_charge: 0,
        total,
        created_at: createdAtIso,
        updated_at: completedDate.toISOString(),
        completed_at: completedDate.toISOString(),
        paid_at: completedDate.toISOString(),
        payment_status: 'paid',
        payment_method: paymentMethods[orderIndex % paymentMethods.length],
        order_type: orderIndex % 6 === 0 ? 'takeaway' : 'dine_in',
        items: orderItems,
        batches: [
          {
            id: `batch-${orderIndex}-1`,
            status: 'served',
            created_at: createdAtIso,
            accepted_at: new Date(orderDate.getTime() + 45000).toISOString(),
            preparing_at: new Date(orderDate.getTime() + 90000).toISOString(),
            ready_at: readyDate.toISOString(),
            served_at: servedDate.toISOString(),
            served_by: waiter,
            tableName: tableName,
            items: orderItems
          }
        ]
      });

      orderIndex++;
    }
  });

  // Generate 8 orders for yesterday
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  for (let y = 0; y < 8; y++) {
    const yDate = new Date(yesterday);
    yDate.setHours(12 + y, 15, 0, 0);
    const createdAtIso = yDate.toISOString();
    const readyDate = new Date(yDate.getTime() + 14 * 60000);
    const servedDate = new Date(readyDate.getTime() + 2 * 60000);
    const completedDate = new Date(servedDate.getTime() + 28 * 60000);

    const dishA = DEMO_MENU_ITEMS[y % DEMO_MENU_ITEMS.length];
    const dishB = DEMO_MENU_ITEMS[(y + 2) % DEMO_MENU_ITEMS.length];
    const orderItems = [
      {
        id: `item-y-${y}-1`,
        order_id: `ord-demo-y-${y}`,
        menu_item_id: dishA.id,
        name: dishA.name,
        category_name: dishA.category,
        price: dishA.price,
        quantity: 1,
        subtotal: dishA.price,
        status: 'served'
      },
      {
        id: `item-y-${y}-2`,
        order_id: `ord-demo-y-${y}`,
        menu_item_id: dishB.id,
        name: dishB.name,
        category_name: dishB.category,
        price: dishB.price,
        quantity: 1,
        subtotal: dishB.price,
        status: 'served'
      }
    ];

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = parseFloat((subtotal * 0.05).toFixed(2));
    const total = subtotal + gst;
    const waiter = getNextWaiter();
    const tableName = tables[y % tables.length];

    orders.push({
      id: `ord-demo-y-${y}`,
      restaurant_id: restaurantId,
      table_id: `tbl-${y + 1}`,
      table_name: tableName,
      status: 'completed',
      subtotal,
      discount_total: 0,
      cgst_amount: parseFloat((gst / 2).toFixed(2)),
      sgst_amount: parseFloat((gst / 2).toFixed(2)),
      tax_total: gst,
      grand_total: total,
      gst,
      service_charge: 0,
      total,
      created_at: createdAtIso,
      updated_at: completedDate.toISOString(),
      completed_at: completedDate.toISOString(),
      paid_at: completedDate.toISOString(),
      payment_status: 'paid',
      payment_method: paymentMethods[y % paymentMethods.length],
      order_type: 'dine_in',
      items: orderItems,
      batches: [
        {
          id: `batch-y-${y}-1`,
          status: 'served',
          created_at: createdAtIso,
          accepted_at: new Date(yDate.getTime() + 45000).toISOString(),
          preparing_at: new Date(yDate.getTime() + 90000).toISOString(),
          ready_at: readyDate.toISOString(),
          served_at: servedDate.toISOString(),
          served_by: waiter,
          tableName: tableName,
          items: orderItems
        }
      ]
    });
  }

  // Generate 4 orders earlier this week
  for (let w = 2; w <= 5; w++) {
    const wDate = new Date(now.getTime() - w * 24 * 3600 * 1000);
    wDate.setHours(13, 30, 0, 0);
    const createdAtIso = wDate.toISOString();
    const readyDate = new Date(wDate.getTime() + 15 * 60000);
    const servedDate = new Date(readyDate.getTime() + 2 * 60000);
    const completedDate = new Date(servedDate.getTime() + 30 * 60000);

    const dishA = DEMO_MENU_ITEMS[w % DEMO_MENU_ITEMS.length];
    const orderItems = [
      {
        id: `item-w-${w}-1`,
        order_id: `ord-demo-w-${w}`,
        menu_item_id: dishA.id,
        name: dishA.name,
        category_name: dishA.category,
        price: dishA.price,
        quantity: 2,
        subtotal: dishA.price * 2,
        status: 'served'
      }
    ];

    const subtotal = dishA.price * 2;
    const gst = parseFloat((subtotal * 0.05).toFixed(2));
    const total = subtotal + gst;
    const waiter = getNextWaiter();
    const tableName = tables[w % tables.length];

    orders.push({
      id: `ord-demo-w-${w}`,
      restaurant_id: restaurantId,
      table_id: `tbl-${w + 1}`,
      table_name: tableName,
      status: 'completed',
      subtotal,
      discount_total: 0,
      cgst_amount: parseFloat((gst / 2).toFixed(2)),
      sgst_amount: parseFloat((gst / 2).toFixed(2)),
      tax_total: gst,
      grand_total: total,
      gst,
      service_charge: 0,
      total,
      created_at: createdAtIso,
      updated_at: completedDate.toISOString(),
      completed_at: completedDate.toISOString(),
      paid_at: completedDate.toISOString(),
      payment_status: 'paid',
      payment_method: 'upi',
      order_type: 'dine_in',
      items: orderItems,
      batches: [
        {
          id: `batch-w-${w}-1`,
          status: 'served',
          created_at: createdAtIso,
          accepted_at: new Date(wDate.getTime() + 45000).toISOString(),
          preparing_at: new Date(wDate.getTime() + 90000).toISOString(),
          ready_at: readyDate.toISOString(),
          served_at: servedDate.toISOString(),
          served_by: waiter,
          tableName: tableName,
          items: orderItems
        }
      ]
    });
  }

  return orders;
}
