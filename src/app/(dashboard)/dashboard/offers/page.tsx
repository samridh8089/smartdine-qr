'use client';

import { useState, useEffect } from 'react';
import { db, Offer } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { 
  Tag, Plus, Edit2, Trash2, Sparkles, Percent, 
  Eye, EyeOff, Gift, Layers, Zap
} from 'lucide-react';

const GRADIENT_PRESETS = [
  { name: 'Royal Plum', value: 'from-slate-950 via-purple-950 to-slate-900' },
  { name: 'Midnight Emerald', value: 'from-slate-950 via-emerald-950 to-slate-900' },
  { name: 'Mocha & Gold', value: 'from-stone-950 via-amber-950 to-stone-900' },
  { name: 'Sapphire Blue', value: 'from-slate-950 via-blue-950 to-slate-900' },
  { name: 'Velvet Rose', value: 'from-slate-950 via-rose-950 to-slate-900' },
];

export default function OffersPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bgGradient, setBgGradient] = useState(GRADIENT_PRESETS[0].value);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const user = await getActiveUser();
    if (!user || !user.restaurant_id) {
      setLoading(false);
      return;
    }
    setRestaurantId(user.restaurant_id);
    const data = await db.getOffers(user.restaurant_id);
    setOffers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setTitle('');
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('20');
    setMinOrderAmount('200');
    setBannerUrl('');
    setBgGradient(GRADIENT_PRESETS[0].value);
    setIsActive(true);
    setStartDate('');
    setEndDate('');
    setFormError('');
    setOfferModalOpen(true);
  };

  const handleOpenEdit = (off: Offer) => {
    setEditingOffer(off);
    setTitle(off.title);
    setCode(off.code);
    setDescription(off.description || '');
    setDiscountType(off.discount_type);
    setDiscountValue(String(off.discount_value));
    setMinOrderAmount(String(off.min_order_amount));
    setBannerUrl(off.banner_url || '');
    setBgGradient(off.bg_gradient || GRADIENT_PRESETS[0].value);
    setIsActive(off.is_active);
    setStartDate(off.start_date || '');
    setEndDate(off.end_date || '');
    setFormError('');
    setOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim() || !discountValue) {
      setFormError('Please enter offer title, promo code, and discount value.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingOffer) {
        await db.updateOffer(editingOffer.id, {
          title,
          code: code.toUpperCase().trim(),
          description,
          discount_type: discountType,
          discount_value: Number(discountValue),
          min_order_amount: Number(minOrderAmount || 0),
          banner_url: bannerUrl,
          bg_gradient: bgGradient,
          is_active: isActive,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
      } else {
        await db.createOffer(restaurantId, {
          title,
          code: code.toUpperCase().trim(),
          description,
          discount_type: discountType,
          discount_value: Number(discountValue),
          min_order_amount: Number(minOrderAmount || 0),
          banner_url: bannerUrl,
          bg_gradient: bgGradient,
          is_active: isActive,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
      }

      setOfferModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (off: Offer) => {
    try {
      const updatedStatus = !off.is_active;
      await db.updateOffer(off.id, { is_active: updatedStatus });
      setOffers(prev => prev.map(o => o.id === off.id ? { ...o, is_active: updatedStatus } : o));
    } catch (err: any) {
      alert('Failed to update offer status: ' + err.message);
    }
  };

  const handleDeleteOffer = async (off: Offer) => {
    if (!confirm(`Are you sure you want to delete the offer "${off.title}" (${off.code})?`)) return;

    try {
      await db.deleteOffer(off.id);
      setOffers(prev => prev.filter(o => o.id !== off.id));
    } catch (err: any) {
      alert('Failed to delete offer: ' + err.message);
    }
  };

  const activeCount = offers.filter(o => o.is_active).length;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Offers & Discounts</h1>
            <Badge variant="success" className="px-2.5 py-0.5 font-bold uppercase text-[10px]">
              Live Carousel Mode
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create promotional discount banners for your customers. Multiple active offers display as an interactive slideshow on your QR digital menu screen!
          </p>
        </div>

        <Button 
          onClick={handleOpenCreate} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0"
        >
          <Plus className="h-5 w-5" />
          <span>Create New Offer</span>
        </Button>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Offers</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{offers.length}</h3>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Banners</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{activeCount} Running</h3>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menu Carousel</p>
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">Multi-Slide Enabled</h3>
          </CardContent>
        </Card>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="h-56 rounded-3xl animate-shimmer" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/30">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Offers Created Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Boost customer orders by offering percentage or flat discounts! Click below to launch your first offer banner.
          </p>
          <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
            Create First Offer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map(off => (
            <div 
              key={off.id}
              className={`rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 border flex flex-col justify-between ${
                off.is_active 
                  ? 'border-transparent text-white' 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400 opacity-75'
              }`}
            >
              {/* Background styling for active cards */}
              {off.is_active && (
                off.banner_url ? (
                  <div className="absolute inset-0 z-0">
                    <img src={off.banner_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                  </div>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-r ${off.bg_gradient || 'from-indigo-600 to-purple-600'} z-0`} />
                )
              )}

              {/* Card Content Container */}
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                      CODE: {off.code}
                    </div>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight drop-shadow-sm pt-2">{off.title}</h3>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex items-center gap-2 bg-slate-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{off.is_active ? 'Active' : 'Disabled'}</span>
                    <button
                      onClick={() => handleToggleActive(off)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        off.is_active ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                      title={off.is_active ? 'Turn Off Offer' : 'Turn On Offer'}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        off.is_active ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <p className="text-xs md:text-sm opacity-90 leading-relaxed font-medium line-clamp-2">
                  {off.description || 'Special promo discount available for digital QR menu ordering.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-amber-300" />
                    <span>
                      {off.discount_type === 'percentage' ? `${off.discount_value}% OFF` : `₹${off.discount_value} OFF`}
                    </span>
                  </div>

                  {off.min_order_amount > 0 && (
                    <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold">
                      Min Order: ₹{off.min_order_amount}
                    </div>
                  )}

                  {(off.start_date || off.end_date) && (
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-400/40 text-[11px] font-bold text-amber-200 flex items-center gap-1">
                      <span>Schedule:</span>
                      <span>{off.start_date ? new Date(off.start_date).toLocaleDateString() : 'Now'} — {off.end_date ? new Date(off.end_date).toLocaleDateString() : 'Ongoing'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="relative z-10 pt-6 mt-4 border-t border-white/20 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(off)}
                  className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteOffer(off)}
                  className="px-3.5 py-1.5 bg-rose-500/80 hover:bg-rose-600 text-white backdrop-blur-md rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Offer Create / Edit Dialog Modal --- */}
      <Dialog
        isOpen={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title={editingOffer ? 'Edit Promo Offer' : 'Create New Promo Offer'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferModalOpen(false)} className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSaveOffer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 text-xs rounded-xl shadow-xs cursor-pointer">
              {saving ? 'Saving...' : editingOffer ? 'Update Offer' : 'Launch Offer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveOffer} className="space-y-4">
          {formError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Offer Title (Headline)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FLAT 20% OFF ON WEEKENDS"
              required
            />

            <Input
              label="Promo Code (UPPERCASE)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FEAST20, FLAT50"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white dark:bg-slate-900"
              >
                <option value="percentage">Percentage (%) Discount</option>
                <option value="flat">Flat Amount (₹) Discount</option>
              </select>
            </div>

            <Input
              label={discountType === 'percentage' ? 'Discount Percentage (%)' : 'Flat Discount Amount (₹)'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? 'e.g. 20' : 'e.g. 50'}
              type="number"
              required
            />

            <Input
              label="Min Order Subtotal (₹)"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="e.g. 200 (0 for no minimum)"
              type="number"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Offer Start Date & Time"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              type="datetime-local"
            />

            <Input
              label="Offer Expiry / End Date & Time"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              type="datetime-local"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Offer Description / Terms
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Valid on all dining items above ₹200. Apply code at checkout!"
              className="w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white dark:bg-slate-900 min-h-[70px]"
            />
          </div>

          {/* Banner Image or Color Theme Picker */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Banner Background Color Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {GRADIENT_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setBgGradient(preset.value)}
                  className={`h-10 rounded-xl bg-gradient-to-r ${preset.value} text-white text-[10px] font-extrabold flex items-center justify-center border-2 transition-all cursor-pointer ${
                    bgGradient === preset.value ? 'border-amber-400 scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <ImageUpload
              label="Optional Banner Image (Overrides Gradient)"
              value={bannerUrl}
              onChange={(url) => setBannerUrl(url)}
              restaurantId={restaurantId}
              pathPrefix="offers/banner"
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isActiveCheck" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              Active Immediately (Show on Customer Menu Carousel)
            </label>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
