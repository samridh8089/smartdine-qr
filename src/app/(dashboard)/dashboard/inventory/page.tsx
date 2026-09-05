'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import { supabase } from '@/lib/supabase';
import { 
  convertUnit, 
  formatQuantityWithUnit, 
  formatReservedStockDisplay,
  areUnitsCompatible, 
  STANDARD_UNIT_GROUPS, 
  normalizeUnit,
  UNIT_MAP
} from '@/lib/inventoryUnits';
import { 
  syncInventoryMenuAvailability, 
  getHourlyInventoryImpactReport 
} from '@/lib/inventoryEngine';
import { checkResourceLimitForRestaurant } from '@/lib/entitlements';
import { 
  Boxes, Plus, Search, Filter, AlertTriangle, Sparkles, 
  BookOpen, History, ShoppingCart, Trash2, TrendingUp, 
  CheckCircle2, XCircle, ChevronRight, Edit3, ArrowUpRight, 
  ArrowDownRight, RefreshCw, AlertCircle, PieChart, Layers,
  FileSpreadsheet, Upload, Download, Check, AlertOctagon,
  Clock, DollarSign, X, UtensilsCrossed
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ResourceUsageCard from '@/components/shared/ResourceUsageCard';
import LockedFeatureView from '@/components/shared/LockedFeatureView';

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function getCompatibleUnits(unit: string) {
  const norm = normalizeUnit(unit);
  const mapping = UNIT_MAP[norm];
  if (!mapping) return [{ value: unit, label: unit }];

  if (mapping.category === 'mass') {
    return [
      { value: 'kg', label: 'kg (kilogram)' },
      { value: 'gram', label: 'gram (g)' },
      { value: 'mg', label: 'mg (milligram)' }
    ];
  }
  if (mapping.category === 'volume') {
    return [
      { value: 'litre', label: 'litre (L)' },
      { value: 'ml', label: 'millilitre (ml)' },
      { value: 'tbsp', label: 'tbsp (~15ml)' },
      { value: 'tsp', label: 'tsp (~5ml)' }
    ];
  }
  if (mapping.category === 'count') {
    return [
      { value: 'piece', label: 'piece (pcs)' },
      { value: 'dozen', label: 'dozen (12 pcs)' },
      { value: 'box', label: 'box' },
      { value: 'packet', label: 'packet' }
    ];
  }
  return [{ value: unit, label: unit }];
}

export default function InventoryDashboardPage() {
  const { restaurant, activeRole, planSpec } = useRestaurant();
  const restaurantId = restaurant?.id || '';
  const [aiRecipeUsage, setAiRecipeUsage] = useState<{ used: number; limit: number | null; remaining: number | null }>({
    used: 0,
    limit: planSpec?.ai_limits?.ai_recipe_generation ?? null,
    remaining: planSpec?.ai_limits?.ai_recipe_generation ?? null
  });

  if (planSpec?.features?.inventory === false) {
    return (
      <LockedFeatureView
        featureName="Inventory Management & Recipes"
        featureDescription="Inventory Management & Recipe Costing is not available on your current plan."
        planName={planSpec.name}
      />
    );
  }

  const [activeTab, setActiveTab] = useState<'items' | 'recipes' | 'dispositions' | 'transactions' | 'purchases' | 'waste' | 'alerts' | 'analytics'>('items');
  const [loading, setLoading] = useState(true);

  // Data States
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [wasteLogs, setWasteLogs] = useState<any[]>([]);
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [hourlyImpact, setHourlyImpact] = useState<any>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');

  // Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemUnitType, setItemUnitType] = useState<string>('gram');
  const [customUnitName, setCustomUnitName] = useState<string>('');

  // Recipe Modal
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedMenuItemForRecipe, setSelectedMenuItemForRecipe] = useState<any | null>(null);
  const [selectedRecipeVariantId, setSelectedRecipeVariantId] = useState<string | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [recipeSteps, setRecipeSteps] = useState('');
  const [recipeServingSize, setRecipeServingSize] = useState('1 Portion');
  const [focusedDishId, setFocusedDishId] = useState<string | null>(null);

  // AI Recipe Draft Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDishInput, setAiDishInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDraftRecipe, setAiDraftRecipe] = useState<any | null>(null);

  // Quick Raw Item Creation from Recipe Modal
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);
  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemUnit, setQuickItemUnit] = useState('gram');
  const [quickItemCost, setQuickItemCost] = useState('1');
  const [targetIngredientIndex, setTargetIngredientIndex] = useState<number | null>(null);

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);

  // Purchase Modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_name: '',
    invoice_number: '',
    inventory_item_id: '',
    quantity: '',
    unit: 'kg',
    unit_cost: '',
    cost_unit: 'kg',
    notes: ''
  });

  // Waste Modal
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteForm, setWasteForm] = useState({
    inventory_item_id: '',
    quantity: '',
    unit: 'gram',
    waste_reason: 'Spoiled',
    notes: ''
  });

  // Analytics Filter
  const [analyticsSelectedItemId, setAnalyticsSelectedItemId] = useState<string>('all');

  // Prevent background page shift when Recipe Modal is open
  useEffect(() => {
    if (showRecipeModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showRecipeModal]);

  // Load Inventory Data
  const loadData = async () => {
    if (!restaurantId) return;
    setLoading(true);

    try {
      // 1. Load Items, Categories, Recipes, Menu Items with Variants, Transactions & Dispositions
      const [itemsRes, catsRes, recipesRes, menuRes, variantsRes, txRes, purchRes, wasteRes, alertsRes, dispRes] = await Promise.all([
        supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('inventory_categories').select('*').eq('restaurant_id', restaurantId).order('name', { ascending: true }),
        supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restaurantId),
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId),
        supabase.from('menu_item_variants').select('*'),
        supabase.from('inventory_transactions').select('*, inventory_items(name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(200),
        supabase.from('inventory_purchases').select('*, inventory_purchase_items(*, inventory_items(name))').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(50),
        supabase.from('inventory_waste').select('*, inventory_items(name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(50),
        supabase.from('inventory_alerts').select('*, inventory_items(name)').eq('restaurant_id', restaurantId).eq('is_acknowledged', false).order('created_at', { ascending: false }),
        supabase.from('prepared_food_dispositions').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(100)
      ]);

      const allVariants = variantsRes.data || [];
      const formattedMenuItems = (menuRes.data || []).map(m => ({
        ...m,
        variants: allVariants.filter(v => v.menu_item_id === m.id)
      }));

      setItems(itemsRes.data || []);
      setCategories(catsRes.data || []);
      setRecipes(recipesRes.data || []);
      setMenuItems(formattedMenuItems);
      setTransactions(txRes.data || []);
      setPurchases(purchRes.data || []);
      setWasteLogs(wasteRes.data || []);
      setDispositions(dispRes.data || []);
      setAlerts(alertsRes.data || []);

      // 2. Load Hourly Impact Report
      const impact = await getHourlyInventoryImpactReport(restaurantId, 1);
      setHourlyImpact(impact);

      // 3. Load AI Recipe Credit Usage
      try {
        const usageRes = await fetch(`/api/ai-usage/check?restaurantId=${restaurantId}&featureKey=ai_recipe_generation`);
        if (usageRes.ok) {
          const uData = await usageRes.json();
          setAiRecipeUsage({ used: uData.used, limit: uData.limit, remaining: uData.remaining });
        }
      } catch (e) {}

      // 4. Sync Menu Availability with Inventory
      await syncInventoryMenuAvailability(restaurantId);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  // Realtime Subscriptions for Inventory Ledger
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`inventory_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `restaurant_id=eq.${restaurantId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_transactions', filter: `restaurant_id=eq.${restaurantId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_alerts', filter: `restaurant_id=eq.${restaurantId}` }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  // Calculated Summary Metrics
  const totalItemsCount = items.length;
  const totalStockValue = items.reduce((sum, item) => sum + (Number(item.current_stock || 0) * Number(item.cost_per_unit || 0)), 0);
  const lowStockCount = items.filter(i => i.current_stock > 0 && i.current_stock <= i.minimum_stock).length;
  const outOfStockCount = items.filter(i => i.current_stock <= 0).length;

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayIso = todayStart.toISOString();

  const todayConsumptionTxs = transactions.filter(t => t.transaction_type === 'ORDER_CONSUMPTION' && t.created_at >= todayIso);
  const todayConsumptionValue = todayConsumptionTxs.reduce((sum, t) => {
    const item = items.find(i => i.id === t.inventory_item_id);
    const cost = item ? Number(item.cost_per_unit || 0) : 0;
    return sum + (Math.abs(Number(t.quantity || 0)) * cost);
  }, 0);

  const todayWasteValue = wasteLogs.filter(w => w.created_at >= todayIso).reduce((sum, w) => sum + Number(w.cost_impact || 0), 0);
  const todayPurchaseValue = purchases.filter(p => p.created_at >= todayIso).reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  // Purchase Modal Calculation & Live Preview
  const selectedPurchaseItem = items.find(i => i.id === purchaseForm.inventory_item_id);
  const purchaseCompatibleUnits = selectedPurchaseItem
    ? getCompatibleUnits(selectedPurchaseItem.unit)
    : [
        { value: 'kg', label: 'kg (kilogram)' },
        { value: 'gram', label: 'gram (g)' },
        { value: 'litre', label: 'litre (L)' },
        { value: 'ml', label: 'millilitre (ml)' },
        { value: 'piece', label: 'piece (pcs)' }
      ];

  const previewQty = Number(purchaseForm.quantity) || 0;
  const previewRate = Number(purchaseForm.unit_cost) || 0;
  let previewQtyInItemUnit = previewQty;
  let previewQtyInRateUnit = previewQty;
  let previewTotalAmount = 0;
  let previewCostInItemUnit = 0;

  if (selectedPurchaseItem && previewQty > 0) {
    const pUnit = purchaseForm.unit || selectedPurchaseItem.unit;
    const pRateUnit = purchaseForm.cost_unit || pUnit;

    if (normalizeUnit(pUnit) !== normalizeUnit(selectedPurchaseItem.unit) && areUnitsCompatible(pUnit, selectedPurchaseItem.unit)) {
      try {
        previewQtyInItemUnit = convertUnit(previewQty, pUnit, selectedPurchaseItem.unit);
      } catch {
        previewQtyInItemUnit = previewQty;
      }
    }

    if (normalizeUnit(pUnit) !== normalizeUnit(pRateUnit) && areUnitsCompatible(pUnit, pRateUnit)) {
      try {
        previewQtyInRateUnit = convertUnit(previewQty, pUnit, pRateUnit);
      } catch {
        previewQtyInRateUnit = previewQty;
      }
    }

    previewTotalAmount = parseFloat((previewQtyInRateUnit * previewRate).toFixed(2));
    previewCostInItemUnit = previewQtyInItemUnit > 0 ? parseFloat((previewTotalAmount / previewQtyInItemUnit).toFixed(6)) : 0;
  }

  // Recipe Costing Helper
  const calculateRecipeMetrics = (menuItem: any) => {
    const recipe = recipes.find(r => r.menu_item_id === menuItem.id);
    if (!recipe || !recipe.inventory_recipe_ingredients || recipe.inventory_recipe_ingredients.length === 0) {
      return { isConfigured: false, recipeCost: 0, sellingPrice: menuItem.price, grossMargin: 0, marginPercentage: 0, ingredientsCount: 0 };
    }

    let totalCost = 0;
    recipe.inventory_recipe_ingredients.forEach((ing: any) => {
      const item = items.find(i => i.id === ing.inventory_item_id);
      if (item) {
        let ingQtyInItemUnit = Number(ing.quantity || 0);
        if (normalizeUnit(ing.unit) !== normalizeUnit(item.unit) && areUnitsCompatible(ing.unit, item.unit)) {
          ingQtyInItemUnit = convertUnit(ingQtyInItemUnit, ing.unit, item.unit);
        }
        totalCost += ingQtyInItemUnit * Number(item.cost_per_unit || 0);
      }
    });

    const sellingPrice = Number(menuItem.price || 0);
    const grossMargin = sellingPrice - totalCost;
    const marginPercentage = sellingPrice > 0 ? ((grossMargin / sellingPrice) * 100) : 0;

    return {
      isConfigured: true,
      recipeCost: parseFloat(totalCost.toFixed(2)),
      sellingPrice,
      grossMargin: parseFloat(grossMargin.toFixed(2)),
      marginPercentage: parseFloat(marginPercentage.toFixed(1)),
      ingredientsCount: recipe.inventory_recipe_ingredients.length
    };
  };

  // Item Save Handler
  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    let unit = itemUnitType === 'custom' ? customUnitName.trim() : itemUnitType;
    const current_stock = Number(formData.get('current_stock') || 0);
    const minimum_stock = Number(formData.get('minimum_stock') || 0);
    const cost_per_unit = Number(formData.get('cost_per_unit') || 0);
    const supplier = formData.get('supplier') as string;
    const sku = formData.get('sku') as string;

    if (!name || !unit) return alert('Please fill in Item Name and Unit');

    try {
      if (editingItem) {
        const beforeStock = Number(editingItem.current_stock || 0);
        await supabase
          .from('inventory_items')
          .update({ name, category, unit, current_stock, minimum_stock, cost_per_unit, supplier, sku, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id);

        if (beforeStock !== current_stock) {
          const diff = current_stock - beforeStock;
          await supabase.from('inventory_transactions').insert({
            restaurant_id: restaurantId,
            inventory_item_id: editingItem.id,
            quantity: diff,
            unit,
            before_stock: beforeStock,
            after_stock: current_stock,
            transaction_type: 'MANUAL_ADJUSTMENT',
            user_name: activeRole === 'owner' ? 'Owner' : 'Manager',
            notes: `Manual stock adjustment from ${beforeStock} to ${current_stock}`
          });
        }
      } else {
        const limitCheck = await checkResourceLimitForRestaurant(restaurantId, 'inventory_items', items.length);
        if (!limitCheck.allowed) {
          return alert(limitCheck.message || 'Inventory items limit reached for your plan.');
        }

        const { data: newIns } = await supabase.from('inventory_items').insert({
          restaurant_id: restaurantId,
          name,
          category,
          unit,
          current_stock,
          minimum_stock,
          opening_stock: current_stock,
          cost_per_unit,
          supplier,
          sku,
          is_active: true
        }).select();

        if (newIns && newIns.length > 0) {
          await supabase.from('inventory_transactions').insert({
            restaurant_id: restaurantId,
            inventory_item_id: newIns[0].id,
            quantity: current_stock,
            unit,
            before_stock: 0,
            after_stock: current_stock,
            transaction_type: 'OPENING_STOCK',
            user_name: activeRole === 'owner' ? 'Owner' : 'Manager',
            notes: `Opening stock recorded`
          });
        }
      }

      setShowItemModal(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving item');
    }
  };

  // Quick Raw Item Creator from Recipe Editor
  const handleCreateQuickItem = async () => {
    if (!quickItemName.trim()) return alert('Please enter item name');
    try {
      const { data: created, error } = await supabase.from('inventory_items').insert({
        restaurant_id: restaurantId,
        name: quickItemName.trim(),
        category: 'General',
        unit: quickItemUnit,
        current_stock: 1000,
        minimum_stock: 100,
        opening_stock: 1000,
        cost_per_unit: Number(quickItemCost || 1),
        is_active: true
      }).select();

      if (error || !created || created.length === 0) throw new Error(error?.message || 'Failed to create item');

      const newItem = created[0];
      
      // Auto-assign to recipe ingredient row if specified
      if (targetIngredientIndex !== null && recipeIngredients[targetIngredientIndex]) {
        const updated = [...recipeIngredients];
        updated[targetIngredientIndex] = {
          ...updated[targetIngredientIndex],
          inventory_item_id: newItem.id,
          ingredientName: newItem.name,
          unit: newItem.unit,
          isMatched: true
        };
        setRecipeIngredients(updated);
      }

      setShowQuickItemModal(false);
      setQuickItemName('');
      setTargetIngredientIndex(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating item');
    }
  };

  // CSV Parser & Validator
  const handleParseCsv = (text: string) => {
    setCsvRawText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    // Detect delimiter
    const headerLine = lines[0];
    const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    const nameIdx = headers.findIndex(h => h.includes('item') || h.includes('name') || h.includes('material'));
    const catIdx = headers.findIndex(h => h.includes('cat'));
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
    const unitIdx = headers.findIndex(h => h.includes('unit'));
    const minIdx = headers.findIndex(h => h.includes('min') || h.includes('reorder'));
    const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('price') || h.includes('rate'));

    const rows: any[] = [];
    const seenNames = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/['"]/g, ''));
      if (cols.length === 0 || !cols.some(Boolean)) continue;

      const rawName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : cols[0] || '';
      const rawCategory = catIdx >= 0 && cols[catIdx] ? cols[catIdx] : 'General';
      const rawStock = stockIdx >= 0 && cols[stockIdx] ? parseFloat(cols[stockIdx]) : 100;
      const rawUnit = unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : 'gram';
      const rawMin = minIdx >= 0 && cols[minIdx] ? parseFloat(cols[minIdx]) : 10;
      const rawCost = costIdx >= 0 && cols[costIdx] ? parseFloat(cols[costIdx]) : 1;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!rawName) errors.push('Missing item name');
      if (isNaN(rawStock) || rawStock < 0) errors.push('Invalid stock quantity');
      if (isNaN(rawCost) || rawCost < 0) errors.push('Invalid cost per unit');
      
      const lowerName = rawName.toLowerCase();
      if (seenNames.has(lowerName)) {
        warnings.push('Duplicate item name in CSV');
      } else {
        seenNames.add(lowerName);
      }

      const existingDb = items.find(it => it.name.toLowerCase() === lowerName);
      if (existingDb) {
        warnings.push(`Existing item in DB (will update stock/cost)`);
      }

      rows.push({
        rowNum: i,
        name: rawName,
        category: rawCategory,
        current_stock: isNaN(rawStock) ? 0 : rawStock,
        unit: rawUnit || 'gram',
        minimum_stock: isNaN(rawMin) ? 10 : rawMin,
        cost_per_unit: isNaN(rawCost) ? 0 : rawCost,
        status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
        errors,
        warnings
      });
    }

    setParsedRows(rows);
  };

  // CSV Import Confirmation
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.status !== 'error');
    if (validRows.length === 0) return alert('No valid rows to import');

    let importedCount = 0;
    let skippedCount = parsedRows.length - validRows.length;
    const errorList: string[] = [];

    try {
      for (const row of validRows) {
        const existing = items.find(it => it.name.toLowerCase() === row.name.toLowerCase());

        if (existing) {
          await supabase.from('inventory_items').update({
            current_stock: row.current_stock,
            minimum_stock: row.minimum_stock,
            cost_per_unit: row.cost_per_unit,
            unit: row.unit,
            category: row.category || existing.category,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);

          await supabase.from('inventory_transactions').insert({
            restaurant_id: restaurantId,
            inventory_item_id: existing.id,
            quantity: row.current_stock - Number(existing.current_stock || 0),
            unit: row.unit,
            before_stock: Number(existing.current_stock || 0),
            after_stock: row.current_stock,
            transaction_type: 'MANUAL_ADJUSTMENT',
            user_name: activeRole === 'owner' ? 'Owner' : 'Manager',
            notes: `CSV Import update`
          });
          importedCount++;
        } else {
          const { data: newIns } = await supabase.from('inventory_items').insert({
            restaurant_id: restaurantId,
            name: row.name,
            category: row.category,
            unit: row.unit,
            current_stock: row.current_stock,
            minimum_stock: row.minimum_stock,
            opening_stock: row.current_stock,
            cost_per_unit: row.cost_per_unit,
            is_active: true
          }).select();

          if (newIns && newIns.length > 0) {
            await supabase.from('inventory_transactions').insert({
              restaurant_id: restaurantId,
              inventory_item_id: newIns[0].id,
              quantity: row.current_stock,
              unit: row.unit,
              before_stock: 0,
              after_stock: row.current_stock,
              transaction_type: 'OPENING_STOCK',
              user_name: activeRole === 'owner' ? 'Owner' : 'Manager',
              notes: `CSV Import opening stock`
            });
            importedCount++;
          }
        }
      }

      setImportSummary({ success: importedCount, skipped: skippedCount, errors: errorList });
      setShowImportModal(false);
      setParsedRows([]);
      setCsvRawText('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    }
  };

  // Recipe Open Modal Helper (Variant / Portion Aware)
  const openRecipeModalForDish = (dish: any, variantId: string | null = null) => {
    setSelectedMenuItemForRecipe(dish);
    setSelectedRecipeVariantId(variantId);
    setFocusedDishId(dish.id);

    const match = recipes.find(r => 
      r.menu_item_id === dish.id && 
      (variantId ? r.variant_id === variantId : (!r.variant_id || r.variant_id === null))
    );

    const variantObj = (dish.variants || []).find((v: any) => v.id === variantId);

    if (match) {
      setRecipeSteps(match.preparation_steps || '');
      setRecipeServingSize(match.serving_size || (variantObj ? variantObj.name : '1 Portion'));
      setRecipeIngredients(
        (match.inventory_recipe_ingredients || []).map((ing: any) => ({
          inventory_item_id: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit
        }))
      );
    } else {
      setRecipeSteps('');
      setRecipeServingSize(variantObj ? variantObj.name : '1 Portion');
      setRecipeIngredients([{ inventory_item_id: '', quantity: 100, unit: 'gram' }]);
    }
    setShowRecipeModal(true);
  };

  // Recipe Close Modal Helper
  const handleCloseRecipeModal = () => {
    const targetDishId = selectedMenuItemForRecipe?.id || focusedDishId;
    setShowRecipeModal(false);
    if (targetDishId) {
      setTimeout(() => {
        const rowEl = document.getElementById(`recipe-row-${targetDishId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  // Recipe Save Handler (Variant / Portion Aware)
  const handleSaveRecipe = async () => {
    if (!selectedMenuItemForRecipe) return;

    try {
      const isExistingRecipe = recipes.some(r => 
        r.menu_item_id === selectedMenuItemForRecipe.id && 
        (selectedRecipeVariantId ? r.variant_id === selectedRecipeVariantId : (!r.variant_id || r.variant_id === null))
      );

      if (!isExistingRecipe) {
        const limitCheck = await checkResourceLimitForRestaurant(restaurantId, 'recipes', recipes.length);
        if (!limitCheck.allowed) {
          return alert(limitCheck.message || 'Recipes limit reached for your current plan.');
        }
      }

      let targetRecipeId: string | null = null;
      const existingMatch = recipes.find(r => 
        r.menu_item_id === selectedMenuItemForRecipe.id && 
        (selectedRecipeVariantId ? r.variant_id === selectedRecipeVariantId : (!r.variant_id || r.variant_id === null))
      );

      if (existingMatch) {
        targetRecipeId = existingMatch.id;
        const { error: updErr } = await supabase
          .from('inventory_recipes')
          .update({
            preparation_steps: recipeSteps,
            serving_size: recipeServingSize,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMatch.id);
        if (updErr) throw updErr;
      } else {
        const { data: insData, error: insErr } = await supabase
          .from('inventory_recipes')
          .insert({
            restaurant_id: restaurantId,
            menu_item_id: selectedMenuItemForRecipe.id,
            variant_id: selectedRecipeVariantId || null,
            preparation_steps: recipeSteps,
            serving_size: recipeServingSize,
            updated_at: new Date().toISOString()
          })
          .select();

        if (insErr || !insData || insData.length === 0) {
          throw new Error(insErr?.message || 'Failed to save recipe');
        }
        targetRecipeId = insData[0].id;
      }

      // Delete old ingredients and re-insert
      await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', targetRecipeId);

      const validIngredients = recipeIngredients.filter(i => i.inventory_item_id && Number(i.quantity) > 0);
      if (validIngredients.length > 0) {
        await supabase.from('inventory_recipe_ingredients').insert(
          validIngredients.map(ing => ({
            recipe_id: targetRecipeId,
            inventory_item_id: ing.inventory_item_id,
            quantity: Number(ing.quantity),
            unit: ing.unit || 'gram'
          }))
        );
      }

      const targetDishId = selectedMenuItemForRecipe?.id || focusedDishId;
      setShowRecipeModal(false);
      setSelectedMenuItemForRecipe(null);
      setSelectedRecipeVariantId(null);
      await loadData();

      if (targetDishId) {
        setTimeout(() => {
          const rowEl = document.getElementById(`recipe-row-${targetDishId}`);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 80);
      }
    } catch (err: any) {
      alert(err.message || 'Error saving recipe');
    }
  };

  // AI Recipe Generator Call
  const handleGenerateAiRecipe = async () => {
    if (!aiDishInput) return alert('Please enter a dish name');
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai-recipe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: aiDishInput, restaurantId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI recipe');
      if (data.usage) {
        setAiRecipeUsage({ used: data.usage.used, limit: data.usage.limit, remaining: data.usage.remaining });
      }
      setAiDraftRecipe(data);
    } catch (err: any) {
      alert(err.message || 'AI Generation error');
    } finally {
      setAiGenerating(false);
    }
  };

  // Apply AI Draft Recipe to Recipe Editor & Auto-link/Create Inventory Items
  const handleAcceptAiDraft = async () => {
    if (!aiDraftRecipe || !restaurantId) return;

    try {
      // 1. Fetch latest raw inventory items
      const { data: latestItems } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId);

      const existingItems = latestItems || [];
      const updatedItemsList = [...existingItems];
      const mappedIngredients: any[] = [];

      for (const ing of (aiDraftRecipe.ingredients || [])) {
        const rawName = (ing.name || '').trim();
        if (!rawName) continue;

        // Case-insensitive exact name match
        let matched = existingItems.find(i => i.name.trim().toLowerCase() === rawName.toLowerCase());

        if (!matched) {
          // Auto-create missing ingredient in inventory_items with ₹0 price, 0 stock
          const newUnit = ing.suggestedUnit || 'gram';
          const { data: createdItem } = await supabase
            .from('inventory_items')
            .insert({
              restaurant_id: restaurantId,
              name: rawName,
              unit: newUnit,
              current_stock: 0,
              minimum_stock: 0,
              opening_stock: 0,
              cost_per_unit: 0,
              is_active: true
            })
            .select()
            .single();

          if (createdItem) {
            matched = createdItem;
            updatedItemsList.push(createdItem);
          }
        }

        if (matched) {
          mappedIngredients.push({
            inventory_item_id: matched.id,
            ingredientName: matched.name,
            quantity: Number(ing.suggestedQuantity || 100),
            unit: ing.suggestedUnit || matched.unit || 'gram',
            isMatched: true
          });
        }
      }

      setItems(updatedItemsList);
      setRecipeIngredients(mappedIngredients);
      setRecipeServingSize(aiDraftRecipe.servingSize || '1 Portion');
      setRecipeSteps(aiDraftRecipe.preparationSteps || '');

      // Always set the selected menu item to the AI generated dish
      const targetDishName = (aiDraftRecipe.dishName || '').trim().toLowerCase();
      const matchingDish = menuItems.find(m => m.name.trim().toLowerCase() === targetDishName) ||
        menuItems.find(m => targetDishName.includes(m.name.trim().toLowerCase()) || m.name.trim().toLowerCase().includes(targetDishName)) ||
        selectedMenuItemForRecipe ||
        menuItems[0];

      if (matchingDish) {
        setSelectedMenuItemForRecipe(matchingDish);
      }

      setShowAiModal(false);
      setAiDraftRecipe(null);
      setShowRecipeModal(true);
      await loadData();
    } catch (err: any) {
      console.error('Error importing draft into recipe editor:', err);
      alert('Error importing draft: ' + (err.message || 'Failed to import'));
    }
  };


  // Purchase Entry Handler
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const { supplier_name, invoice_number, inventory_item_id, quantity, unit, unit_cost, cost_unit, notes } = purchaseForm;
    const qty = Number(quantity);
    const cost = Number(unit_cost);

    if (!inventory_item_id || qty <= 0 || isNaN(qty)) return alert('Select item and valid quantity');
    if (cost < 0 || isNaN(cost)) return alert('Enter a valid unit cost');

    try {
      const item = items.find(i => i.id === inventory_item_id);
      if (!item) return;

      const purchaseUnit = unit || item.unit;
      const rateUnit = cost_unit || purchaseUnit;

      // 1. Convert purchase quantity into the item's base unit (e.g. 5 kg -> 5000 gram)
      let qtyInItemUnit = qty;
      if (normalizeUnit(purchaseUnit) !== normalizeUnit(item.unit) && areUnitsCompatible(purchaseUnit, item.unit)) {
        qtyInItemUnit = convertUnit(qty, purchaseUnit, item.unit);
      }

      // 2. Convert quantity into the rate unit to calculate total purchase cost (e.g. 500 g @ ₹50/kg -> 0.5 kg * 50 = ₹25)
      let qtyInRateUnit = qty;
      if (normalizeUnit(purchaseUnit) !== normalizeUnit(rateUnit) && areUnitsCompatible(purchaseUnit, rateUnit)) {
        qtyInRateUnit = convertUnit(qty, purchaseUnit, rateUnit);
      }

      const totalAmount = parseFloat((qtyInRateUnit * cost).toFixed(2));

      // 3. Compute cost per item base unit (e.g. ₹200 / 5000 g = ₹0.04/g, ₹25 / 500 g = ₹0.05/g)
      const costInItemUnit = qtyInItemUnit > 0 ? parseFloat((totalAmount / qtyInItemUnit).toFixed(6)) : item.cost_per_unit;

      const { data: purch } = await supabase.from('inventory_purchases').insert({
        restaurant_id: restaurantId,
        supplier_name,
        invoice_number,
        total_amount: totalAmount,
        notes,
        created_by: activeRole === 'owner' ? 'Owner' : 'Manager'
      }).select();

      if (purch && purch.length > 0) {
        await supabase.from('inventory_purchase_items').insert({
          purchase_id: purch[0].id,
          inventory_item_id,
          quantity: qtyInItemUnit,
          unit: item.unit,
          unit_cost: costInItemUnit,
          total_cost: totalAmount
        });

        const beforeStock = Number(item.current_stock || 0);
        const afterStock = beforeStock + qtyInItemUnit;

        await supabase.from('inventory_items').update({
          current_stock: afterStock,
          cost_per_unit: costInItemUnit > 0 ? costInItemUnit : item.cost_per_unit,
          supplier: supplier_name || item.supplier,
          updated_at: new Date().toISOString()
        }).eq('id', inventory_item_id);

        await supabase.from('inventory_transactions').insert({
          restaurant_id: restaurantId,
          inventory_item_id,
          quantity: qtyInItemUnit,
          unit: item.unit,
          before_stock: beforeStock,
          after_stock: afterStock,
          transaction_type: 'PURCHASE',
          reference_type: 'purchase',
          reference_id: purch[0].id,
          user_name: activeRole === 'owner' ? 'Owner' : 'Manager',
          notes: `Stock purchase in: ${qty} ${purchaseUnit} @ ₹${cost}/${rateUnit} (Total ₹${totalAmount}, Effective: ₹${costInItemUnit}/${item.unit})${notes ? ` - ${notes}` : ''}`
        });
      }

      setShowPurchaseModal(false);
      setPurchaseForm({
        supplier_name: '',
        invoice_number: '',
        inventory_item_id: '',
        quantity: '',
        unit: 'kg',
        unit_cost: '',
        cost_unit: 'kg',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Purchase save error');
    }
  };

  // Waste Entry Handler
  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const { inventory_item_id, quantity, unit, waste_reason, notes } = wasteForm;
    const qty = Number(quantity);

    if (!inventory_item_id || qty <= 0) return alert('Select item and valid quantity');

    try {
      const item = items.find(i => i.id === inventory_item_id);
      if (!item) return;

      let qtyInItemUnit = qty;
      if (unit !== item.unit && areUnitsCompatible(unit, item.unit)) {
        qtyInItemUnit = convertUnit(qty, unit, item.unit);
      }

      const costImpact = qtyInItemUnit * Number(item.cost_per_unit || 0);

      await supabase.from('inventory_waste').insert({
        restaurant_id: restaurantId,
        inventory_item_id,
        quantity: qtyInItemUnit,
        unit: item.unit,
        waste_reason,
        cost_impact: costImpact,
        recorded_by: activeRole === 'owner' ? 'Owner' : 'Manager',
        notes
      });

      const beforeStock = Number(item.current_stock || 0);
      const afterStock = Math.max(0, beforeStock - qtyInItemUnit);

      await supabase.from('inventory_items').update({
        current_stock: afterStock,
        updated_at: new Date().toISOString()
      }).eq('id', inventory_item_id);

      await supabase.from('inventory_transactions').insert({
        restaurant_id: restaurantId,
        inventory_item_id,
        quantity: -qtyInItemUnit,
        unit: item.unit,
        before_stock: beforeStock,
        after_stock: afterStock,
        transaction_type: 'WASTE',
        reference_type: 'waste',
        user_name: activeRole === 'owner' ? 'Owner' : 'Manager',
        notes: `Waste logged (${waste_reason}): -${qty} ${unit}`
      });

      setShowWasteModal(false);
      setWasteForm({ inventory_item_id: '', quantity: '', unit: 'gram', waste_reason: 'Spoiled', notes: '' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Waste save error');
    }
  };

  // Filtered Inventory Items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchesStatus = true;
    if (selectedStockStatus === 'low') matchesStatus = item.current_stock > 0 && item.current_stock <= item.minimum_stock;
    if (selectedStockStatus === 'out') matchesStatus = item.current_stock <= 0;
    if (selectedStockStatus === 'in') matchesStatus = item.current_stock > item.minimum_stock;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Inventory & Recipe ERP</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-300">
            Real-time Raw Material Tracking • Idempotent Stock Deduction • AI Recipe Costing
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setCsvRawText('');
              setParsedRows([]);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              setAiDishInput('');
              setAiDraftRecipe(null);
              setShowAiModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <span>Generate AI Recipe</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setItemUnitType('gram');
              setCustomUnitName('');
              setShowItemModal(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Plan Entitlement & Usage Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResourceUsageCard
          title="Inventory Items"
          used={items.length}
          limit={planSpec?.limits?.inventory_items ?? 100}
          unitLabel="used"
        />
        <ResourceUsageCard
          title="Recipes & Costing"
          used={recipes.length}
          limit={planSpec?.limits?.recipes ?? 100}
          unitLabel="used"
        />
        <ResourceUsageCard
          title="AI Recipe Item Credits"
          used={aiRecipeUsage.used}
          limit={aiRecipeUsage.limit}
          unitLabel="credits used"
          isLocked={planSpec?.features?.ai_recipe === false || aiRecipeUsage.limit === 0}
          lockedMessage="Available on PRO and PREMIUM"
          resetNote="1 generated recipe = 1 AI Recipe credit. Resets monthly."
        />
      </div>

      {/* Real-time ERP Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Total Items</p>
          <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">{totalItemsCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Stock Value</p>
          <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">
            ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Low Stock</p>
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">{lowStockCount}</p>
            {lowStockCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Out of Stock</p>
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">{outOfStockCount}</p>
            {outOfStockCount > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Today Consumed</p>
          <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">
            ₹{todayConsumptionValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Today Waste</p>
          <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">
            ₹{todayWasteValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Today Stock In</p>
          <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">
            ₹{todayPurchaseValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-1 min-w-0 flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Unack Alerts</p>
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">{alerts.length}</p>
            {alerts.length > 0 && <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />}
          </div>
        </div>
      </div>

      {/* Hourly Stock Shortage Cancellation Impact Notification Banner */}
      {hourlyImpact && hourlyImpact.affectedOrdersCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                Hourly Inventory Cancellation Impact Report (Last 1 Hour)
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-black">{hourlyImpact.affectedOrdersCount} orders</span> were affected by raw material shortages (Estimated lost order revenue: <span className="font-black">₹{hourlyImpact.estimatedLostRevenue}</span>).
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {hourlyImpact.itemBreakdown.map((b: any, idx: number) => (
                  <span key={idx} className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    {b.itemName}: {b.affectedOrders} affected (₹{b.lostRevenue})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERP Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'items', label: 'Inventory Items', icon: Boxes, badge: items.length },
          { id: 'recipes', label: 'Recipes & Costing', icon: BookOpen, badge: recipes.length },
          { id: 'dispositions', label: 'Food Dispositions', icon: UtensilsCrossed, badge: dispositions.length },
          { id: 'transactions', label: 'Transaction Ledger', icon: History, badge: transactions.length },
          { id: 'purchases', label: 'Purchases (Stock In)', icon: ShoppingCart, badge: purchases.length },
          { id: 'waste', label: 'Waste Management', icon: Trash2, badge: wasteLogs.length },
          { id: 'alerts', label: 'Low Stock Alerts', icon: AlertTriangle, badge: alerts.length },
          { id: 'analytics', label: 'Dish Usage Analytics', icon: PieChart, badge: null }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INVENTORY ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search raw materials, items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <select
                value={selectedStockStatus}
                onChange={e => setSelectedStockStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>

              <button
                onClick={() => {
                  setCsvRawText('');
                  setParsedRows([]);
                  setShowImportModal(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Physical Stock</th>
                    <th className="py-3 px-4">Reserved Stock</th>
                    <th className="py-3 px-4">Available to Sell</th>
                    <th className="py-3 px-4">Min Stock</th>
                    <th className="py-3 px-4">Cost / Unit</th>
                    <th className="py-3 px-4">Stock Value</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No inventory items found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const physical = Number(item.current_stock || 0);
                      const reserved = Number(item.reserved_stock || 0);
                      const availableToSell = Math.max(0, physical - reserved);
                      const isOut = availableToSell <= 0;
                      const isLow = availableToSell > 0 && availableToSell <= item.minimum_stock;
                      const val = physical * Number(item.cost_per_unit || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                            {item.name}
                            {item.supplier && <span className="block text-[10px] text-slate-400 font-normal">Supplier: {item.supplier}</span>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {item.category || 'General'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {formatQuantityWithUnit(physical, item.unit)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                            {formatReservedStockDisplay(reserved, item.unit)}
                          </td>
                          <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                            {formatQuantityWithUnit(availableToSell, item.unit)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {formatQuantityWithUnit(item.minimum_stock, item.unit)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            ₹{Number(item.cost_per_unit || 0) > 0 && Number(item.cost_per_unit || 0) < 0.01
                              ? Number(item.cost_per_unit || 0).toFixed(4)
                              : Number(item.cost_per_unit || 0).toFixed(2)} / {item.unit}
                          </td>
                          <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                            ₹{val.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            {isOut ? (
                              <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setItemUnitType(item.unit || 'gram');
                                setCustomUnitName('');
                                setShowItemModal(true);
                              }}
                              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECIPES & COSTING */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Menu Item Recipe Costing & Portion Costing</h3>
                <p className="text-xs text-slate-500">Configure distinct raw ingredients and quantities for each portion size (Half, Full, Standard)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Menu Dish & Portions</th>
                    <th className="py-3 px-4">Recipe Status</th>
                    <th className="py-3 px-4">Recipe Cost</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Gross Margin ₹</th>
                    <th className="py-3 px-4">Margin %</th>
                    <th className="py-3 px-4 text-right">Configure Portions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {menuItems.map(item => {
                    const metrics = calculateRecipeMetrics(item);
                    const hasVariants = item.has_variants && item.variants && item.variants.length > 0;

                    return (
                      <tr 
                        key={item.id} 
                        id={`recipe-row-${item.id}`}
                        className={`transition-all duration-200 ${
                          focusedDishId === item.id 
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/60' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                          <div className="space-y-1">
                            <div>{item.name}</div>
                            {hasVariants && (
                              <div className="flex flex-wrap gap-1.5">
                                {item.variants.map((v: any) => {
                                  const vRecipe = recipes.find(r => r.menu_item_id === item.id && r.variant_id === v.id);
                                  return (
                                    <span key={v.id} className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                      vRecipe ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 border border-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 border border-slate-300'
                                    }`}>
                                      {v.name} (₹{v.price}) {vRecipe ? '✓' : '•'}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {metrics.isConfigured ? (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                              Configured ({metrics.ingredientsCount} items)
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                              ⚠ Not Configured
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-700 dark:text-slate-300">
                          {metrics.isConfigured ? `₹${metrics.recipeCost}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                          ₹{metrics.sellingPrice}
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                          {metrics.isConfigured ? `₹${metrics.grossMargin}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-black">
                          {metrics.isConfigured ? (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                              metrics.marginPercentage >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {metrics.marginPercentage}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {hasVariants ? (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => openRecipeModalForDish(item, null)}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
                              >
                                Base
                              </button>
                              {item.variants.map((v: any) => (
                                <button
                                  key={v.id}
                                  onClick={() => openRecipeModalForDish(item, v.id)}
                                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-90 cursor-pointer"
                                >
                                  {v.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => openRecipeModalForDish(item, null)}
                              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
                            >
                              {metrics.isConfigured ? 'Edit Recipe' : 'Configure Recipe'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PREPARED FOOD DISPOSITIONS */}
      {activeTab === 'dispositions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Prepared Food Disposition & Safety Audit Log</h3>
              <p className="text-xs text-slate-500">Tracking food cancelled after cooking: reallocations, staff meals, complimentary, owner use, and waste discards</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Dish & Portion</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Disposition Type</th>
                  <th className="py-3 px-4">Served Status</th>
                  <th className="py-3 px-4">Destination / Reason / Notes</th>
                  <th className="py-3 px-4">Handled By</th>
                  <th className="py-3 px-4">Raw Stock Restored</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {dispositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No prepared food dispositions recorded yet.
                    </td>
                  </tr>
                ) : (
                  dispositions.map(disp => (
                    <tr key={disp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(disp.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        {disp.menu_item_name} {disp.variant_name ? `(${disp.variant_name})` : ''}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {disp.quantity}x
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          disp.disposition_type === 'reallocated' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                          disp.disposition_type === 'staff_meal' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          disp.disposition_type === 'complimentary' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                          disp.disposition_type === 'owner_internal' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
                          disp.disposition_type === 'waste' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {disp.disposition_type.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {disp.was_served ? (
                          <span className="text-rose-600 font-black text-[11px]">Was Served</span>
                        ) : (
                          <span className="text-slate-500 font-semibold text-[11px]">Not Served</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                        {disp.destination_order_display_id && <span className="font-bold block text-slate-800 dark:text-slate-200">Dest Order: #{disp.destination_order_display_id}</span>}
                        {disp.waste_reason && <span className="text-rose-600 block">{disp.waste_reason}</span>}
                        {disp.notes && <span className="text-slate-500 block text-[11px]">{disp.notes}</span>}
                        {!disp.destination_order_display_id && !disp.waste_reason && !disp.notes && '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">
                        {disp.handled_by || 'Staff'}
                      </td>
                      <td className="py-3 px-4">
                        {disp.inventory_restored ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Restored</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Consumed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION LEDGER */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Immutable Inventory Transaction Ledger</h3>
            <p className="text-xs text-slate-500">Auditable history of every automatic order consumption, purchase, and cancellation reversal</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Tx Type</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Before → After</th>
                  <th className="py-3 px-4">Ref / Notes</th>
                  <th className="py-3 px-4">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {transactions.map(tx => {
                  const isPositive = Number(tx.quantity) > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(tx.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                        {tx.inventory_items?.name || 'Raw Item'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          tx.transaction_type === 'ORDER_CONSUMPTION' ? 'bg-indigo-100 text-indigo-800' :
                          tx.transaction_type === 'CANCELLATION_REVERSAL' ? 'bg-emerald-100 text-emerald-800' :
                          tx.transaction_type === 'PURCHASE' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}{tx.quantity} {tx.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {tx.before_stock} → {tx.after_stock} {tx.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {tx.notes || tx.idempotency_key || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {tx.user_name || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PURCHASES (STOCK IN) */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Stock Purchase & Inward Entries</h3>
              <p className="text-xs text-slate-500">Record supplier purchases to automatically update inventory stock and unit costs</p>
            </div>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              + Record Purchase
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-black">{p.supplier_name || 'Vendor'}</td>
                      <td className="py-3 px-4 text-slate-600">{p.invoice_number || '—'}</td>
                      <td className="py-3 px-4 font-black text-emerald-600">₹{p.total_amount}</td>
                      <td className="py-3 px-4 text-slate-500">{p.created_by}</td>
                      <td className="py-3 px-4 text-slate-500">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: WASTE MANAGEMENT */}
      {activeTab === 'waste' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Waste & Spoilage Log</h3>
              <p className="text-xs text-slate-500">Record spoiled or expired ingredients with reason and cost impact analysis</p>
            </div>
            <button
              onClick={() => setShowWasteModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              + Log Waste
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Quantity Wasted</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Cost Impact</th>
                    <th className="py-3 px-4">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {wasteLogs.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500">{new Date(w.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-black">{w.inventory_items?.name || 'Raw Item'}</td>
                      <td className="py-3 px-4 font-black text-rose-600">-{w.quantity} {w.unit}</td>
                      <td className="py-3 px-4"><span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold">{w.waste_reason}</span></td>
                      <td className="py-3 px-4 font-black text-rose-600">₹{w.cost_impact}</td>
                      <td className="py-3 px-4 text-slate-500">{w.recorded_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LOW STOCK ALERTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1">Deduplicated Low Stock & Out of Stock Alerts</h3>
            <p className="text-xs text-slate-500 mb-4">Notifications triggered automatically when stock drops below configured minimum thresholds</p>

            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                  🎉 All stock levels are currently healthy! No active alerts.
                </div>
              ) : (
                alerts.map(al => (
                  <div key={al.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${al.alert_type === 'OUT_OF_STOCK' ? 'text-rose-600' : 'text-amber-600'}`} />
                      <div>
                        <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {al.inventory_items?.name || 'Item'} — <span className={al.alert_type === 'OUT_OF_STOCK' ? 'text-rose-600' : 'text-amber-600'}>{al.alert_type.replace('_', ' ')}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Current: {al.current_stock} {al.unit} (Min: {al.minimum_stock} {al.unit})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await supabase.from('inventory_alerts').update({ is_acknowledged: true }).eq('id', al.id);
                        loadData();
                      }}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DISH USAGE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Dish-Wise Real Ingredient Consumption Analytics</h3>
                <p className="text-xs text-slate-500">Trace exact ingredient usage per menu dish derived from actual order batches</p>
              </div>

              <select
                value={analyticsSelectedItemId}
                onChange={e => setAnalyticsSelectedItemId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold cursor-pointer"
              >
                <option value="all">All Raw Ingredients</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items
                .filter(i => analyticsSelectedItemId === 'all' || i.id === analyticsSelectedItemId)
                .map(item => {
                  const itemTxs = transactions.filter(t => t.inventory_item_id === item.id && t.transaction_type === 'ORDER_CONSUMPTION');
                  const totalConsumed = itemTxs.reduce((sum, t) => sum + Math.abs(Number(t.quantity || 0)), 0);

                  return (
                    <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{item.name}</h4>
                        <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2.5 py-0.5 rounded-full text-xs font-black">
                          Total Used: {totalConsumed.toFixed(2)} {item.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Order Batch Deductions Count: {itemTxs.length}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      {showItemModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowItemModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-pop z-10">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Inventory Item' : 'Add Raw Material Item'}
                </h3>
                <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Item Name *</label>
                    <input name="name" defaultValue={editingItem?.name || ''} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                      <input name="category" defaultValue={editingItem?.category || 'Dairy'} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Unit *</label>
                      <select
                        value={itemUnitType}
                        onChange={e => setItemUnitType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold cursor-pointer"
                      >
                        {STANDARD_UNIT_GROUPS.map((grp, gIdx) => (
                          <optgroup key={gIdx} label={grp.group}>
                            {grp.options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt.value}>{opt.label}</option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="custom">Custom Unit...</option>
                      </select>
                    </div>
                  </div>

                  {itemUnitType === 'custom' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Custom Unit Name (e.g. scoop, glass, portion) *</label>
                      <input
                        type="text"
                        placeholder="e.g. scoop, bucket, portion"
                        value={customUnitName}
                        onChange={e => setCustomUnitName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Current Stock</label>
                      <input type="number" step="any" name="current_stock" defaultValue={editingItem?.current_stock ?? 1000} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Level</label>
                      <input type="number" step="any" name="minimum_stock" defaultValue={editingItem?.minimum_stock ?? 200} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cost / Unit ₹</label>
                      <input type="number" step="any" name="cost_per_unit" defaultValue={editingItem?.cost_per_unit ?? 0.35} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier</label>
                      <input name="supplier" defaultValue={editingItem?.supplier || ''} placeholder="Vendor name" className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">SKU / Code</label>
                      <input name="sku" defaultValue={editingItem?.sku || ''} placeholder="SKU code" className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                  <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-500">Save Item</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: RECIPE EDITOR */}
      {showRecipeModal && selectedMenuItemForRecipe && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
              onClick={handleCloseRecipeModal}
            />
            
            {/* Dialog Container */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-pop z-10">
              {/* Header */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Recipe: {selectedMenuItemForRecipe.name}</h3>
                  <p className="text-xs text-slate-500">Selling Price: ₹{selectedMenuItemForRecipe.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAiDishInput(selectedMenuItemForRecipe.name);
                      handleGenerateAiRecipe();
                      setShowAiModal(true);
                    }}
                    className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-600 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate AI Draft
                  </button>
                  <button 
                    onClick={handleCloseRecipeModal}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0 overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Configuring Portion / Variant Recipe</label>
                    {selectedMenuItemForRecipe?.has_variants && selectedMenuItemForRecipe?.variants?.length > 0 ? (
                      <select
                        value={selectedRecipeVariantId || 'base'}
                        onChange={e => {
                          const val = e.target.value === 'base' ? null : e.target.value;
                          setSelectedRecipeVariantId(val);
                          const match = recipes.find(r => 
                            r.menu_item_id === selectedMenuItemForRecipe.id && 
                            (val ? r.variant_id === val : (!r.variant_id || r.variant_id === null))
                          );
                          const variantObj = (selectedMenuItemForRecipe.variants || []).find((v: any) => v.id === val);
                          if (match) {
                            setRecipeSteps(match.preparation_steps || '');
                            setRecipeServingSize(match.serving_size || (variantObj ? variantObj.name : '1 Portion'));
                            setRecipeIngredients(
                              (match.inventory_recipe_ingredients || []).map((ing: any) => ({
                                inventory_item_id: ing.inventory_item_id,
                                quantity: ing.quantity,
                                unit: ing.unit
                              }))
                            );
                          } else {
                            setRecipeSteps('');
                            setRecipeServingSize(variantObj ? variantObj.name : '1 Portion');
                            setRecipeIngredients([{ inventory_item_id: '', quantity: 100, unit: 'gram' }]);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                      >
                        <option value="base">Base Dish (No Variant)</option>
                        {selectedMenuItemForRecipe.variants.map((v: any) => (
                          <option key={v.id} value={v.id}>{v.name} (₹{v.price})</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        Standard Single Portion Dish
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Portion / Serving Size Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard Portion, Full Plate, 500ml Bowl"
                      value={recipeServingSize}
                      onChange={e => setRecipeServingSize(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Recipe Costing Summary Card */}
                {(() => {
                  const modalTotalCost = recipeIngredients.reduce((acc, ing) => {
                    const selItem = items.find(i => i.id === ing.inventory_item_id);
                    if (!selItem) return acc;
                    let qtyInItemUnit = Number(ing.quantity || 0);
                    if (normalizeUnit(ing.unit) !== normalizeUnit(selItem.unit) && areUnitsCompatible(ing.unit, selItem.unit)) {
                      qtyInItemUnit = convertUnit(qtyInItemUnit, ing.unit, selItem.unit);
                    }
                    return acc + (qtyInItemUnit * Number(selItem.cost_per_unit || 0));
                  }, 0);
                  const modalSellingPrice = Number(selectedMenuItemForRecipe?.price || 0);
                  const modalGrossMargin = modalSellingPrice - modalTotalCost;

                  return (
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Total Recipe Cost</span>
                        <span className="text-base font-black text-slate-900 dark:text-white">₹{modalTotalCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Selling Price</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">₹{modalSellingPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">Gross Margin</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{modalGrossMargin.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Ingredients section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-extrabold text-slate-900 dark:text-white">Ingredients List</label>
                    <button
                      onClick={() => setShowQuickItemModal(true)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                    >
                      + Create New Raw Inventory Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recipeIngredients.map((ing, idx) => {
                      const selItem = items.find(i => i.id === ing.inventory_item_id);
                      let ingCost = 0;
                      if (selItem) {
                        let ingQtyInItemUnit = Number(ing.quantity || 0);
                        if (normalizeUnit(ing.unit) !== normalizeUnit(selItem.unit) && areUnitsCompatible(ing.unit, selItem.unit)) {
                          ingQtyInItemUnit = convertUnit(ingQtyInItemUnit, ing.unit, selItem.unit);
                        }
                        ingCost = ingQtyInItemUnit * Number(selItem.cost_per_unit || 0);
                      }

                      return (
                        <div key={idx} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                          <select
                            value={ing.inventory_item_id}
                            onChange={e => {
                              const newIngs = [...recipeIngredients];
                              newIngs[idx].inventory_item_id = e.target.value;
                              const targetItem = items.find(i => i.id === e.target.value);
                              if (targetItem) {
                                newIngs[idx].unit = targetItem.unit;
                              }
                              setRecipeIngredients(newIngs);
                            }}
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                          >
                            <option value="">Select Raw Inventory Item...</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.category}) — {item.current_stock} {item.unit} in stock
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            step="any"
                            placeholder="Qty"
                            value={ing.quantity}
                            onChange={e => {
                              const newIngs = [...recipeIngredients];
                              newIngs[idx].quantity = e.target.value;
                              setRecipeIngredients(newIngs);
                            }}
                            className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                          />

                          <select
                            value={ing.unit}
                            onChange={e => {
                              const newIngs = [...recipeIngredients];
                              newIngs[idx].unit = e.target.value;
                              setRecipeIngredients(newIngs);
                            }}
                            className="w-24 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                          >
                            {selItem ? (
                              STANDARD_UNIT_GROUPS.map((grp, gIdx) => (
                                <optgroup key={gIdx} label={grp.group}>
                                  {grp.options.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt.value}>{opt.label}</option>
                                  ))}
                                </optgroup>
                              ))
                            ) : (
                              <>
                                <option value="gram">gram (g)</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="litre">litre (l)</option>
                                <option value="piece">piece (pcs)</option>
                              </>
                            )}
                          </select>

                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 min-w-[70px] text-right px-1">
                            ₹{ingCost.toFixed(2)}
                          </span>

                          <button
                            onClick={() => {
                              setRecipeIngredients(recipeIngredients.filter((_, iIdx) => iIdx !== idx));
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setRecipeIngredients([
                        ...recipeIngredients,
                        { inventory_item_id: '', quantity: 50, unit: 'gram' }
                      ]);
                    }}
                    className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-2 cursor-pointer"
                  >
                    + Add Ingredient Row
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Preparation Steps</label>
                  <textarea rows={3} value={recipeSteps} onChange={e => setRecipeSteps(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                </div>
              </div>

              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                <button onClick={handleCloseRecipeModal} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={handleSaveRecipe} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-500 shadow-sm whitespace-nowrap">Save Official Recipe</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: QUICK RAW ITEM CREATOR */}
      {showQuickItemModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowQuickItemModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl animate-pop z-10">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Create & Map Raw Material Item</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Item Name *</label>
                  <input value={quickItemName} onChange={e => setQuickItemName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Unit</label>
                    <select value={quickItemUnit} onChange={e => setQuickItemUnit(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold">
                      <option value="gram">gram (g)</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="litre">litre (l)</option>
                      <option value="piece">piece (pcs)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Cost / Unit ₹</label>
                    <input type="number" step="any" value={quickItemCost} onChange={e => setQuickItemCost(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setShowQuickItemModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={handleCreateQuickItem} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer">Create Item</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: CSV IMPORT */}
      {showImportModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowImportModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-pop z-10">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Import Inventory Items (CSV)</h3>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Paste CSV Content or Upload File:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => handleParseCsv(ev.target?.result as string);
                          reader.readAsText(file);
                        }
                      }}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 cursor-pointer"
                    />
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`Item Name, Category, Current Stock, Unit, Minimum Stock, Cost Per Unit\nPaneer, Dairy, 5000, gram, 500, 0.40\nTomato, Produce, 20, kg, 5, 30.00`}
                    value={csvRawText}
                    onChange={e => handleParseCsv(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                  />
                </div>

                {parsedRows.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Parsed Rows Preview ({parsedRows.filter(r => r.status !== 'error').length} Valid / {parsedRows.filter(r => r.status === 'error').length} Invalid)
                      </h4>
                    </div>

                    <div className="max-h-48 overflow-y-auto border rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                            <th className="p-2">Row</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Cat</th>
                            <th className="p-2">Stock</th>
                            <th className="p-2">Unit</th>
                            <th className="p-2">Cost ₹</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-400">#{r.rowNum}</td>
                              <td className="p-2 font-bold">{r.name || '—'}</td>
                              <td className="p-2 text-slate-500">{r.category}</td>
                              <td className="p-2">{r.current_stock}</td>
                              <td className="p-2">{r.unit}</td>
                              <td className="p-2">₹{r.cost_per_unit}</td>
                              <td className="p-2">
                                {r.status === 'valid' && <span className="text-emerald-600 font-bold">✓ Valid</span>}
                                {r.status === 'warning' && <span className="text-amber-600 font-bold">⚠ Update</span>}
                                {r.status === 'error' && <span className="text-rose-600 font-bold">✗ {r.errors.join(', ')}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importSummary && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800">
                    🎉 {importSummary.success} items imported successfully! ({importSummary.skipped} skipped)
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
                <button
                  onClick={handleConfirmImport}
                  disabled={parsedRows.filter(r => r.status !== 'error').length === 0}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 hover:bg-emerald-500"
                >
                  Confirm & Import Valid Rows →
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: AI RECIPE DRAFT PREVIEW */}
      {showAiModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAiModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-pop z-10">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white">AI Recipe Generator (Draft Mode)</h3>
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">UNSAVED DRAFT</span>
              </div>

              <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Dish Name (e.g. Paneer Butter Masala)"
                    value={aiDishInput}
                    onChange={e => setAiDishInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                  <button
                    onClick={handleGenerateAiRecipe}
                    disabled={aiGenerating}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {aiGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Generate'}
                  </button>
                </div>

                {aiDraftRecipe && (
                  <div className="space-y-3 border p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">{aiDraftRecipe.dishName}</p>
                      <p className="text-[11px] text-slate-500">Serving Size: {aiDraftRecipe.servingSize}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-700">AI Suggested Ingredients:</p>
                      {aiDraftRecipe.ingredients.map((ing: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs p-2 bg-white dark:bg-slate-800 rounded-lg border">
                          <span>{ing.name} ({ing.suggestedQuantity} {ing.suggestedUnit})</span>
                          {ing.isMatched ? (
                            <span className="text-emerald-600 font-bold">✓ Matched: {ing.matchedInventoryItemName}</span>
                          ) : (
                            <span className="text-amber-600 font-bold">⚠ Unmapped Inventory Item</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-[11px] font-black text-slate-700">Preparation Steps:</p>
                      <p className="text-xs text-slate-600 whitespace-pre-line">{aiDraftRecipe.preparationSteps}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                <button onClick={() => setShowAiModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
                {aiDraftRecipe && (
                  <button onClick={handleAcceptAiDraft} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-500">
                    Import Draft into Recipe Editor →
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: PURCHASE ENTRY */}
      {showPurchaseModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPurchaseModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-pop z-10">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                <h3 className="font-black text-base text-slate-900 dark:text-white">Record Stock Purchase (Stock In)</h3>
                <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSavePurchase} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 md:p-6 space-y-3 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Supplier Name</label>
                      <input value={purchaseForm.supplier_name} onChange={e => setPurchaseForm({ ...purchaseForm, supplier_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Invoice #</label>
                      <input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Raw Material Item *</label>
                    <select
                      value={purchaseForm.inventory_item_id}
                      onChange={e => {
                        const selId = e.target.value;
                        const sel = items.find(i => i.id === selId);
                        let defaultUnit = 'kg';
                        if (sel) {
                          const norm = normalizeUnit(sel.unit);
                          const mapping = UNIT_MAP[norm];
                          if (mapping?.category === 'mass') {
                            defaultUnit = 'kg';
                          } else if (mapping?.category === 'volume') {
                            defaultUnit = 'litre';
                          } else if (mapping?.category === 'count') {
                            defaultUnit = sel.unit || 'piece';
                          } else {
                            defaultUnit = sel.unit || 'unit';
                          }
                        }
                        setPurchaseForm({
                          ...purchaseForm,
                          inventory_item_id: selId,
                          unit: defaultUnit,
                          cost_unit: defaultUnit
                        });
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="">Select Item...</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.category}) — Current: {i.current_stock} {i.unit}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Quantity Purchased *</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 5"
                          value={purchaseForm.quantity}
                          onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                        />
                        <select
                          value={purchaseForm.unit}
                          onChange={e => {
                            const newUnit = e.target.value;
                            setPurchaseForm({
                              ...purchaseForm,
                              unit: newUnit,
                              cost_unit: newUnit
                            });
                          }}
                          className="w-32 px-2 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold cursor-pointer shrink-0"
                        >
                          {purchaseCompatibleUnits.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Unit Cost ₹ *</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 40"
                          value={purchaseForm.unit_cost}
                          onChange={e => setPurchaseForm({ ...purchaseForm, unit_cost: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                        />
                        <select
                          value={purchaseForm.cost_unit || purchaseForm.unit}
                          onChange={e => setPurchaseForm({ ...purchaseForm, cost_unit: e.target.value })}
                          className="w-32 px-2 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold cursor-pointer shrink-0"
                        >
                          {purchaseCompatibleUnits.map(u => (
                            <option key={u.value} value={u.value}>per {u.value}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {selectedPurchaseItem && previewQty > 0 && previewRate > 0 && (
                    <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-bold text-sky-900 dark:text-sky-300">
                        <span>Total Purchase Amount:</span>
                        <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">₹{previewTotalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                        <span>Stock Added ({selectedPurchaseItem.unit}):</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">+{previewQtyInItemUnit} {selectedPurchaseItem.unit}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                        <span>Effective Cost per {selectedPurchaseItem.unit}:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{previewCostInItemUnit < 0.01 && previewCostInItemUnit > 0 ? previewCostInItemUnit.toFixed(4) : previewCostInItemUnit.toFixed(2)} / {selectedPurchaseItem.unit}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                    <input
                      value={purchaseForm.notes}
                      onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                  <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-sky-500">Submit Purchase</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: WASTE ENTRY */}
      {showWasteModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowWasteModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-pop z-10">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                <h3 className="font-black text-base text-slate-900 dark:text-white">Log Waste / Spoilage</h3>
                <button onClick={() => setShowWasteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveWaste} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 md:p-6 space-y-3 flex-1 overflow-y-auto">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Item Wasted *</label>
                    <select value={wasteForm.inventory_item_id} onChange={e => setWasteForm({ ...wasteForm, inventory_item_id: e.target.value })} required className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold cursor-pointer">
                      <option value="">Select Item...</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} (Current: {i.current_stock} {i.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Quantity Wasted *</label>
                      <input type="number" step="any" value={wasteForm.quantity} onChange={e => setWasteForm({ ...wasteForm, quantity: e.target.value })} required className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Waste Reason</label>
                      <select value={wasteForm.waste_reason} onChange={e => setWasteForm({ ...wasteForm, waste_reason: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold cursor-pointer">
                        <option value="Spoiled">Spoiled</option>
                        <option value="Expired">Expired</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Spilled">Spilled</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Notes</label>
                    <textarea rows={2} value={wasteForm.notes} onChange={e => setWasteForm({ ...wasteForm, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                  <button type="button" onClick={() => setShowWasteModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-rose-500">Log Waste & Deduct Stock</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
