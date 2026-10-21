'use client';

import { useState, useEffect } from 'react';
import { db, Offer, Restaurant } from '@/lib/db';
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

export function OffersSettings({ restaurant }: { restaurant: Restaurant }) {
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
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      const data = await db.getOffers(restaurant.id);
      setOffers(data || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurant?.id]);

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
        await db.createOffer(restaurant.id, {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Offers & Promotional Discounts</span>
            <Badge variant="success" className="text-[10px] font-bold">
              {activeCount} Active
            </Badge>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure discount banners and promo codes displayed to customers on your digital menu.
          </p>
        </div>

        <Button 
          onClick={handleOpenCreate}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>New Offer</span>
        </Button>
      </div>

      {/* Offers Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading offers...</div>
      ) : offers.length === 0 ? (
        <Card className="border border-dashed border-slate-200 dark:border-slate-800 text-center p-8">
          <div className="max-w-sm mx-auto space-y-2">
            <Tag className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No active offers or promo codes</p>
            <p className="text-xs text-slate-400">Click &ldquo;New Offer&rdquo; to create percentage or flat discount banners for your menu.</p>
            <Button onClick={handleOpenCreate} size="sm" variant="outline" className="mt-2 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Create First Offer
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map(off => (
            <Card key={off.id} className={`overflow-hidden border transition-all ${off.is_active ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/50 opacity-60'}`}>
              <div className={`p-4 bg-gradient-to-r ${off.bg_gradient || GRADIENT_PRESETS[0].value} text-white flex justify-between items-start`}>
                <div>
                  <span className="inline-block bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                    {off.code}
                  </span>
                  <h4 className="text-base font-black mt-1">{off.title}</h4>
                  <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{off.description || 'Special promo'}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black block">
                    {off.discount_type === 'percentage' ? `${off.discount_value}% OFF` : `₹${off.discount_value} OFF`}
                  </span>
                  {off.min_order_amount > 0 && (
                    <span className="text-[10px] opacity-75">Min: ₹{off.min_order_amount}</span>
                  )}
                </div>
              </div>

              <CardContent className="p-3.5 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Badge variant={off.is_active ? 'success' : 'neutral'}>
                    {off.is_active ? 'Live Banner' : 'Inactive'}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(off)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    {off.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(off)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Offer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOffer(off)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete Offer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT OFFER MODAL */}
      <Dialog
        isOpen={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title={editingOffer ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
      >
        <form onSubmit={handleSaveOffer} className="space-y-4 pt-2">
          {formError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Offer Title"
              placeholder="e.g. 20% Off Weekend Feast"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Promo Code"
              placeholder="e.g. FEAST20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Subtitle</label>
            <input
              type="text"
              placeholder="e.g. Valid on all orders above ₹200"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>

            <Input
              label={discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}
              type="number"
              placeholder="20"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
            />

            <Input
              label="Min Order (₹)"
              type="number"
              placeholder="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Banner Gradient Style</label>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENT_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBgGradient(p.value)}
                  className={`h-8 rounded-lg bg-gradient-to-r ${p.value} border-2 transition-all cursor-pointer ${bgGradient === p.value ? 'border-emerald-500 scale-105' : 'border-transparent'}`}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="offerIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="offerIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Active Banner (Show in customer QR menu)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {editingOffer ? 'Update Offer' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
