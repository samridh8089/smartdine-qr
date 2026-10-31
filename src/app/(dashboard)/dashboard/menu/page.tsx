'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db, Category, MenuItem } from '@/lib/db';
import { useRestaurant } from '../../layout';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { getActiveUser, getClientAuthHeaders } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit2, Trash2, Check, X, Tag, ListFilter, Search,
  HelpCircle, Eye, EyeOff, AlertTriangle, AlertCircle, Coffee, Sparkles, Camera, CheckCircle2, Upload, UtensilsCrossed, ArrowRight
} from 'lucide-react';

import ResourceUsageCard from '@/components/shared/ResourceUsageCard';
import { dashboardStore } from '@/lib/dashboardStore';

interface MenuItemCardProps {
  item: MenuItem;
  onToggleAvailability: (id: string, current: boolean) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

function MenuItemCard({ item, onToggleAvailability, onEdit, onDelete }: MenuItemCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={`border border-slate-200/80 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-sm ${!item.is_available ? 'opacity-75 bg-slate-50/50 dark:bg-slate-950/50' : ''}`}>
      {/* Fixed aspect-ratio image container (Priority 2: no CLS, no stretch, no clipping) */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800/60 shrink-0 border-b border-slate-100 dark:border-slate-800">
        {item.image_url && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />
            )}
            <img 
              src={item.image_url} 
              alt={item.name} 
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-850 p-4 text-center select-none">
            <div className="h-10 w-10 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-1.5">
              <UtensilsCrossed className="h-5 w-5 stroke-[1.5]" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
            </span>
          </div>
        )}

        {/* Dietary Pill Indicator */}
        <span className="absolute top-2.5 left-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-700/70 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span>{item.is_veg ? 'Veg' : 'Non-Veg'}</span>
        </span>

        {/* Stock Status Indicator */}
        {!item.is_available && (
          <span className="absolute top-2.5 right-2.5 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
            Out of Stock
          </span>
        )}
      </div>

      {/* Card Details (Priority 5 & 6: Unified Typography & Inventory Style) */}
      <CardContent className="flex-1 flex flex-col justify-between p-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-white text-[15px] line-clamp-1" title={item.name}>
              {item.name}
            </h4>
            <span className="font-semibold font-mono text-slate-950 dark:text-white text-[15px] shrink-0">
              {formatPrice(item.price)}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {item.description || 'No description provided.'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant={item.is_veg ? 'veg' : 'non-veg'}>
              {item.is_veg ? 'Veg' : 'Non-Veg'}
            </Badge>
            <Badge variant={item.is_available ? 'success' : 'error'}>
              {item.is_available ? 'In Stock' : 'Out of Stock'}
            </Badge>
            <Link href="/dashboard/inventory">
              <span className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200/80 dark:border-slate-700/80 transition-colors cursor-pointer">
                Recipe: Configurable →
              </span>
            </Link>
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
          <button 
            type="button"
            onClick={() => onToggleAvailability(item.id, item.is_available)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              item.is_available 
                ? 'border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-50 dark:bg-slate-800/60' 
                : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
            }`}
          >
            {item.is_available ? (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Mark Out of Stock
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Mark In Stock
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Edit dish"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
              title="Delete dish"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </div>
  );
}

export default function MenuManagementPage() {
  const router = useRouter();
  const { restaurant, activeRole, planSpec, profile } = useRestaurant();
  const restId = restaurant?.id || profile?.restaurant_id;
  const initialCachedMenu = (() => {
    if (!restId) return null;
    const memory = dashboardStore.getCachedMenu(restId);
    if (memory) return memory;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`smartdine_menu_${restId}`);
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return null;
  })();
  const [restaurantId, setRestaurantId] = useState(restId || '');
  const [categories, setCategories] = useState<Category[]>(() => initialCachedMenu?.categories || []);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => initialCachedMenu?.menuItems || []);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlan, setActivePlan] = useState<'starter' | 'pro' | 'premium' | 'trial_3_days' | 'trial' | string>(restaurant?.subscription_plan || 'starter');
  const [loading, setLoading] = useState(() => !initialCachedMenu);
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'ai'>('catalog');

  // AI Scanner Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiStep, setAiStep] = useState<'scan' | 'extracting' | 'review' | 'publishing'>('scan');
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [extractedItems, setExtractedItems] = useState<Array<{
    id: string;
    category_name: string;
    name: string;
    description: string;
    price: number;
    is_veg: boolean;
    image_url?: string;
  }>>([]);
  const [aiBase64, setAiBase64] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemHasVariants, setItemHasVariants] = useState(false);
  const [itemVariants, setItemVariants] = useState<Array<{ id?: string; name: string; price: number }>>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const targetRestId = restaurant?.id || profile?.restaurant_id;
        if (!targetRestId) {
          setLoading(false);
          return;
        }
        setRestaurantId(targetRestId);

        // Immediate hydrate from cache if available to prevent UI freezing
        const mem = dashboardStore.getCachedMenu(targetRestId);
        if (mem && mem.categories.length > 0) {
          setCategories(mem.categories);
          setMenuItems(mem.menuItems);
          setLoading(false);
        } else if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem(`smartdine_menu_${targetRestId}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.categories) {
                setCategories(parsed.categories);
                setMenuItems(parsed.menuItems);
                setLoading(false);
              }
            }
          } catch (_) {}
        }

        if (restaurant) {
          setActivePlan(restaurant.subscription_plan);
        } else {
          const rest = await db.getRestaurantById(targetRestId);
          if (rest) setActivePlan(rest.subscription_plan);
        }

        const [cats, items] = await Promise.all([
          db.getCategories(targetRestId),
          db.getMenuItems(targetRestId)
        ]);
        setCategories(cats);
        setMenuItems(items);
        dashboardStore.setCachedMenu(targetRestId, { categories: cats, menuItems: items });
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`smartdine_menu_${targetRestId}`, JSON.stringify({ categories: cats, menuItems: items }));
          } catch (_) {}
        }
      } catch (err) {
        console.error('[MenuManagement] loadMenu error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, [restaurant?.id, profile?.restaurant_id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'ai') {
        router.replace('/dashboard/ai-menu');
      }
    }
  }, [router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setAiError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawBase64 = event.target?.result as string;
        // Optimize image with HTML5 canvas to max 1600px for instant upload (<300KB)
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            setAiBase64(optimizedBase64);
            setAiImagePreview(optimizedBase64);
          } else {
            setAiBase64(rawBase64);
            setAiImagePreview(rawBase64);
          }
        };
        img.onerror = () => {
          setAiBase64(rawBase64);
          setAiImagePreview(rawBase64);
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAiScanner = () => {
    setAiStep('scan');
    setAiImagePreview(null);
    setAiBase64('');
    setUploadedFileName('');
    setAiError(null);
    setExtractedItems([]);
    setAiModalOpen(true);
  };

  const handleStartAiExtraction = async () => {
    if (!aiBase64) {
      setAiError('Please select or upload a menu photo first.');
      return;
    }
    const targetRestId = restaurantId || restaurant?.id || profile?.restaurant_id;
    if (!targetRestId) {
      setAiError('Restaurant ID not found. Please reload the page.');
      return;
    }

    setAiStep('extracting');
    setAiError(null);

    try {
      const authHeaders = await getClientAuthHeaders();
      const res = await fetch('/api/ai-menu/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          restaurantId: targetRestId,
          images: [
            {
              base64: aiBase64,
              name: uploadedFileName || 'menu_photo.jpg',
              type: 'image/jpeg'
            }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.categories || data.categories.length === 0) {
        throw new Error(data.error || data.message || 'AI menu analysis failed. Please try a clearer photo or text import.');
      }

      // Flatten extracted categories into items list for review
      const itemsList: Array<{
        id: string;
        category_name: string;
        name: string;
        description: string;
        price: number;
        is_veg: boolean;
        image_url?: string;
      }> = [];

      for (const cat of data.categories) {
        for (const item of (cat.items || [])) {
          itemsList.push({
            id: item.id || `ext_${Math.random().toString(36).substr(2, 9)}`,
            category_name: cat.name || 'Main Menu',
            name: item.name || 'Unnamed Dish',
            description: item.description || '',
            price: Number(item.price || 0),
            is_veg: Boolean(item.is_veg),
            image_url: item.selectedImageUrl || item.sourceCropUrl || undefined
          });
        }
      }

      if (itemsList.length === 0) {
        throw new Error('No menu items could be detected from this image. Please upload a clearer photo.');
      }

      setExtractedItems(itemsList);
      setAiStep('review');
    } catch (err: any) {
      console.error('[AI Menu Extraction] Error:', err);
      setAiError(err.message || 'Failed to extract menu items. Please try again.');
      setAiStep('scan');
    }
  };

  const handlePublishExtractedMenu = async () => {
    if (!restaurantId || extractedItems.length === 0) return;
    setIsPublishing(true);
    try {
      const existingCats = await db.getCategories(restaurantId);
      const catMap: Record<string, string> = {};
      
      existingCats.forEach(c => {
        catMap[c.name.toLowerCase().trim()] = c.id;
      });

      // Find missing categories and create in parallel
      const missingCatNames = Array.from(new Set(
        extractedItems
          .map(i => i.category_name.trim())
          .filter(name => !catMap[name.toLowerCase()])
      ));

      if (missingCatNames.length > 0) {
        const createdCats = await Promise.all(
          missingCatNames.map(name => db.createCategory(restaurantId, name))
        );
        createdCats.forEach(c => {
          catMap[c.name.toLowerCase().trim()] = c.id;
        });
      }

      // Fast parallel batch creation for all items (<300ms)
      await Promise.all(
        extractedItems.map(item => {
          const catId = catMap[item.category_name.trim().toLowerCase()];
          if (!catId) return Promise.resolve();
          return db.createMenuItem(restaurantId, {
            category_id: catId,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            is_veg: item.is_veg,
            is_available: true,
            image_url: item.image_url
          });
        })
      );

      setAiModalOpen(false);
      await refreshMenu();
    } catch (err: any) {
      alert(`Failed to publish extracted menu: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const refreshMenu = async () => {
    if (!restaurantId) return;
    const cats = await db.getCategories(restaurantId);
    const items = await db.getMenuItems(restaurantId);
    setCategories(cats);
    setMenuItems(items);
    dashboardStore.setCachedMenu(restaurantId, { categories: cats, menuItems: items });
  };

  // --- Category Handlers ---
  const handleOpenCatModal = (cat: Category | null = null) => {
    setEditingCategory(cat);
    setCategoryName(cat ? cat.name : '');
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategory) {
        await db.updateCategory(editingCategory.id, categoryName);
      } else {
        await db.createCategory(restaurantId, categoryName);
      }
      
      setCatModalOpen(false);
      await refreshMenu();
    } catch (err: any) {
      alert(`Failed to save category: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure? Deleting this category will delete all items under it.')) {
      try {
        await db.deleteCategory(id);
        if (selectedCategoryId === id) setSelectedCategoryId('all');
        await refreshMenu();
      } catch (err: any) {
        alert(`Failed to delete category: ${err.message}`);
      }
    }
  };

  // --- Item Handlers ---
  const handleOpenItemModal = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setErrorMsg('');

    if (item) {
      setItemName(item.name);
      setItemDescription(item.description);
      setItemPrice(item.price.toString());
      setItemImageUrl(item.image_url || '');
      setItemIsVeg(item.is_veg);
      setItemIsAvailable(item.is_available);
      setItemCategoryId(item.category_id);
      setItemHasVariants(Boolean(item.has_variants || (item.variants && item.variants.length > 0)));
      setItemVariants(item.variants || []);
    } else {
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemImageUrl('');
      setItemIsVeg(true);
      setItemIsAvailable(true);
      setItemCategoryId(categories[0]?.id || '');
      setItemHasVariants(false);
      setItemVariants([]);
    }
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsedPrice = parseFloat(itemPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Price must be a valid number greater than or equal to 0');
      return;
    }

    let catId = itemCategoryId;
    if (!catId && categories.length > 0) {
      catId = categories[0].id;
    }

    if (!catId) {
      setErrorMsg('Please select or create a category first.');
      return;
    }

    const payload = {
      category_id: catId,
      name: itemName,
      description: itemDescription,
      price: parsedPrice,
      image_url: itemImageUrl && itemImageUrl.trim() ? itemImageUrl.trim() : null,
      is_available: itemIsAvailable,
      is_veg: itemIsVeg,
      has_variants: itemHasVariants,
      variants: itemHasVariants ? itemVariants : []
    };

    try {
      if (editingItem) {
        await db.updateMenuItem(editingItem.id, payload);
      } else {
        await db.createMenuItem(restaurantId, payload);
      }
      setItemModalOpen(false);
      await refreshMenu();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      try {
        await db.deleteMenuItem(id);
        await refreshMenu();
      } catch (err: any) {
        alert(`Failed to delete menu item: ${err.message}`);
      }
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await db.updateMenuItem(id, { is_available: !currentStatus });
      await refreshMenu();
    } catch (err: any) {
      alert(`Failed to toggle availability: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-10 w-32 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="col-span-3 h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const maxItemsLimit = planSpec.limits.menu_items;
  const itemsUsed = menuItems.length;

  return (
    <div className="space-y-8">
      {/* Title Bar with Action Buttons & Usage Counter Shifted to Top */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Smart Menu by Clever Ops</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => handleOpenCatModal()}>
            <Plus className="h-4 w-4 mr-1" /> Category
          </Button>
          <Button size="sm" onClick={() => handleOpenItemModal()}>
            <Plus className="h-4 w-4 mr-1" /> Menu Item
          </Button>
          <div className="w-full sm:w-64">
            <ResourceUsageCard
              title="Menu Items"
              used={itemsUsed}
              limit={maxItemsLimit}
              unitLabel="used"
            />
          </div>
        </div>
      </div>

      {/* Smart Menu Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <Link
          href="/dashboard/menu"
          className="pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer flex items-center border-emerald-600 text-emerald-600 dark:text-emerald-400"
        >
          Menu Catalog
        </Link>
        <Link
          href="/dashboard/ai-menu"
          className="pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer flex items-center border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          AI Menu
        </Link>
      </div>

      {activeSubTab === 'catalog' ? (
        <>
          {/* Subscription limits banner */}
          {maxItemsLimit !== null && itemsUsed >= maxItemsLimit * 0.8 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong>Plan usage alert:</strong> You have created {itemsUsed}/{maxItemsLimit} menu items. 
                Upgrade to a higher plan under <Link href="/dashboard/billing" className="font-bold underline">Billing</Link> to lift limits.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Categories Sidebar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Categories</h3>
                <span className="text-xs font-semibold text-slate-500">{categories.length} total</span>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setSelectedCategoryId('all')}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors ${
                    selectedCategoryId === 'all' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  <span>All Items</span>
                  <Badge variant="neutral" className={selectedCategoryId === 'all' ? 'bg-slate-800 border-slate-700 text-slate-300' : ''}>
                    {menuItems.length}
                  </Badge>
                </button>

                {categories.map((cat) => {
                  const catCount = menuItems.filter(item => item.category_id === cat.id).length;
                  return (
                    <div key={cat.id} className="group relative flex items-center">
                      <button
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors truncate ${
                          selectedCategoryId === cat.id 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
                        }`}
                      >
                        <span className="truncate pr-24 lg:pr-8">{cat.name}</span>
                        <Badge 
                          variant="neutral" 
                          className={selectedCategoryId === cat.id ? 'bg-emerald-700 border-emerald-500 text-emerald-100' : ''}
                        >
                          {catCount}
                        </Badge>
                      </button>
                      <div className="absolute right-10 flex lg:hidden lg:group-hover:flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenCatModal(cat); }}
                          className={`p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm`}
                          title="Edit category"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                          className={`p-1.5 rounded bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 shadow-sm`}
                          title="Delete category"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    {selectedCategoryId === 'all' ? 'All Dishes' : categories.find(c => c.id === selectedCategoryId)?.name}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">{filteredItems.length} items listed</span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                  <Coffee className="h-10 w-10 text-slate-300" />
                  <span>
                    {searchQuery ? `No dishes found matching "${searchQuery}".` : 'No dishes found in this category. Click "Menu Item" above to add some delicious food!'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onToggleAvailability={toggleAvailability}
                      onEdit={handleOpenItemModal}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        <div className="p-12 text-center text-slate-500 font-semibold animate-pulse">
          Opening AI Menu Studio...
        </div>
      )}

      {/* --- Category Modal --- */}
      <Dialog
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save Category</Button>
          </>
        }
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g. Appetizers, Mains, Drinks"
            required
            autoFocus
          />
        </form>
      </Dialog>

      {/* --- Menu Item Modal --- */}
      <Dialog
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save Menu Item</Button>
          </>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dish Name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Garlic Bread, Pasta Carbonara"
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price (₹)"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="e.g. 299"
              type="text"
              required
            />

            <ImageUpload
              label="Item Image"
              value={itemImageUrl}
              onChange={(url) => setItemImageUrl(url)}
              restaurantId={restaurantId}
              pathPrefix={editingItem?.id ? `menu_items/${editingItem.id}` : `menu_items/new_${Date.now()}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white min-h-[80px]"
              placeholder="Describe the dish ingredients, preparation, allergens..."
            />
          </div>

          <div className="flex gap-8 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVeg"
                checked={itemIsVeg}
                onChange={(e) => setItemIsVeg(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isVeg" className="text-sm font-semibold text-slate-700">
                Vegetarian
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={itemIsAvailable}
                onChange={(e) => setItemIsAvailable(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isAvailable" className="text-sm font-semibold text-slate-700">
                In Stock (Available for ordering)
              </label>
            </div>
          </div>

          {/* Portion / Variant Management */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={itemHasVariants}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setItemHasVariants(checked);
                    if (checked && itemVariants.length === 0) {
                      setItemVariants([
                        { name: 'Half', price: parseFloat(itemPrice) || 100 },
                        { name: 'Full', price: Math.round((parseFloat(itemPrice) || 100) * 1.8) }
                      ]);
                    }
                  }}
                  className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="hasVariants" className="text-sm font-bold text-slate-800 cursor-pointer">
                  Portion / Size Options (e.g. Half, Full, Small, Large)
                </label>
              </div>
            </div>

            {itemHasVariants && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                {itemVariants.map((v, vIdx) => (
                  <div key={vIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Portion Name (e.g. Half)"
                      value={v.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const copy = [...itemVariants];
                        copy[vIdx] = { ...copy[vIdx], name: val };
                        setItemVariants(copy);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white font-medium text-slate-900"
                    />
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2.5 top-1.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={v.price ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const copy = [...itemVariants];
                          copy[vIdx] = { ...copy[vIdx], price: val };
                          setItemVariants(copy);
                        }}
                        className="w-full pl-6 pr-2 py-1.5 text-sm font-bold border border-slate-200 rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = itemVariants.filter((_, idx) => idx !== vIdx);
                        setItemVariants(copy);
                        if (copy.length === 0) setItemHasVariants(false);
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setItemVariants([...itemVariants, { name: 'Full', price: Math.round((parseFloat(itemPrice) || 100) * 1.5) }]);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                >
                  + Add Portion Option
                </button>
              </div>
            )}
          </div>
        </form>
      </Dialog>

      {/* AI Menu Scanner Modal */}
      {aiModalOpen && (
        <Dialog isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title="AI Smart Menu Scanner & Builder">
          <div className="space-y-6 p-1">
            {/* Step indicator */}
            <div className="flex items-center justify-between text-xs font-bold border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className={aiStep === 'scan' ? 'text-gray-950 dark:text-white font-extrabold' : 'text-gray-400'}>1. SCAN MENU</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className={aiStep === 'extracting' ? 'text-gray-950 dark:text-white font-extrabold animate-pulse' : 'text-gray-400'}>2. EXTRACT</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className={aiStep === 'review' ? 'text-gray-950 dark:text-white font-extrabold' : 'text-gray-400'}>3. REVIEW & EDIT</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className={aiStep === 'publishing' ? 'text-gray-950 dark:text-white font-extrabold' : 'text-gray-400'}>4. CONFIRM & PUBLISH</span>
            </div>

            {aiStep === 'scan' && (
              <div className="space-y-4 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 bg-gray-50/70 dark:bg-gray-900/50 rounded-3xl p-6 sm:p-8 space-y-3 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-purple-50/20"
                >
                  {aiImagePreview ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="relative w-40 h-28 rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 shadow-sm">
                        <img src={aiImagePreview} alt="Uploaded Menu" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {uploadedFileName || 'Menu Photo Selected'}
                        </p>
                        <p className="text-[11px] text-purple-600 font-semibold hover:underline mt-0.5">
                          Click to choose a different photo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Camera className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Upload Physical Restaurant Menu Photo</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Take a photo of your paper menu or upload an image/PDF. AI will extract categories, dishes, prices, and veg indicators automatically.</p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs">
                        <Upload className="h-3.5 w-3.5 text-purple-600" />
                        Browse / Take Photo
                      </div>
                    </>
                  )}
                </div>

                {aiError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 text-left">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setAiModalOpen(false)}>Cancel</Button>
                  <Button 
                    className="bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 text-white font-bold px-6 cursor-pointer" 
                    onClick={handleStartAiExtraction}
                    disabled={!aiBase64}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" /> Start AI Extraction
                  </Button>
                </div>
              </div>
            )}

            {aiStep === 'extracting' && (
              <div className="py-10 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-spin">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">AI Parsing Menu Content...</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Extracting categories, dishes, prices, descriptions, and veg status using Gemini AI.</p>
                </div>
                <div className="max-w-xs mx-auto pt-2">
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full animate-pulse w-3/4" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 block">
                    Fast scanning in progress (usually 2–5 seconds)...
                  </span>
                </div>
              </div>
            )}

            {aiStep === 'review' && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-xs text-gray-900 dark:text-gray-100 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-700 dark:text-gray-300 shrink-0" />
                  <span>Review and edit the extracted items below before confirming and publishing to live menu.</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {extractedItems.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={item.category_name}
                          onChange={(e) => {
                            const updated = [...extractedItems];
                            updated[idx].category_name = e.target.value;
                            setExtractedItems(updated);
                          }}
                          className="col-span-3 font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 px-2 py-1 border rounded"
                          placeholder="Category"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...extractedItems];
                            updated[idx].name = e.target.value;
                            setExtractedItems(updated);
                          }}
                          className="col-span-4 font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-950 px-2 py-1 border rounded"
                          placeholder="Dish Title"
                        />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const updated = [...extractedItems];
                            updated[idx].price = Number(e.target.value);
                            setExtractedItems(updated);
                          }}
                          className="col-span-2 font-black text-emerald-600 bg-white dark:bg-slate-950 px-2 py-1 border rounded"
                          placeholder="Price"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...extractedItems];
                            updated[idx].is_veg = !updated[idx].is_veg;
                            setExtractedItems(updated);
                          }}
                          className={`col-span-3 py-1 font-bold text-[10px] uppercase rounded border ${item.is_veg ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}
                        >
                          {item.is_veg ? 'VEG' : 'NON-VEG'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold">{extractedItems.length} items extracted</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setAiModalOpen(false)}>Discard</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6" isLoading={isPublishing} disabled={isPublishing} onClick={handlePublishExtractedMenu}>
                      Confirm & Publish Menu
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
