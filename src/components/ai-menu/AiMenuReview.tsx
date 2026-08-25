'use client';

import React, { useState, useRef } from 'react';
import { 
  Check, 
  Trash2, 
  Sparkles, 
  Upload, 
  Camera, 
  Eye, 
  RefreshCw,
  ImageIcon,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type ImageSourceType = 'web_search' | 'ai_suggestion' | 'existing_menu' | 'manual_upload' | 'owner_upload' | 'camera' | 'none';

export interface ImageCandidate {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  sourceUrl: string;
  sourceDomain?: string;
  provider: string;
  candidateType: 'WEB_IMAGE' | 'AI_GENERATED';
  confidence: number;
  matchState: 'HIGH_CONFIDENCE' | 'POSSIBLE_MATCH' | 'REJECTED';
  license?: string;
  licenseUrl?: string;
}

export interface ReviewMenuItemVariant {
  id?: string;
  name: string;
  price: number;
}

export interface ReviewMenuItem {
  id: string;
  name: string;
  exactMenuName: string;
  price: number | null;
  originalPrice: number | null;
  description: string;
  exactMenuDescription: string;
  is_veg: boolean;
  has_variants?: boolean;
  variants?: ReviewMenuItemVariant[];
  sourceImageIndex: number;
  sourceImageName: string;
  sourceText: string;
  sourceCropUrl?: string | null;
  foodImageDetected: boolean;
  confidence: number;
  needsReview: boolean;
  reviewReason: string | null;
  imageSource: ImageSourceType;
  selectedImageUrl: string;
  imageCandidates?: ImageCandidate[];
  candidateImages?: ImageCandidate[];
  isDuplicate?: boolean;
  duplicateAction?: 'merge' | 'keep_both' | 'replace' | 'skip';
  existingItem?: {
    id: string;
    image_url?: string;
    price: number;
    original_price?: number;
    description?: string;
  } | null;
  approved?: boolean;
}

export interface ReviewCategory {
  id: string;
  name: string;
  items: ReviewMenuItem[];
}

export type AiExtractedCategory = ReviewCategory;
export type AiExtractedItem = ReviewMenuItem;

export interface AiMenuReviewProps {
  categories: ReviewCategory[];
  setCategories?: React.Dispatch<React.SetStateAction<ReviewCategory[]>>;
  onApproveAll?: () => void;
  onConfirmPublish?: () => void;
  onPublish?: (approvedCategories: ReviewCategory[]) => Promise<void>;
  isPublishing: boolean;
  restaurantSlug?: string;
  totalFoundItems?: number;
  sourceImages?: Array<{ name: string; previewUrl: string }>;
  onReset?: () => void;
}

export default function AiMenuReview({
  categories: initialCategories,
  setCategories: externalSetCategories,
  onApproveAll: externalOnApproveAll,
  onConfirmPublish: externalOnConfirmPublish,
  onPublish,
  isPublishing,
  onReset
}: AiMenuReviewProps) {
  const [internalCategories, setInternalCategories] = useState<ReviewCategory[]>(initialCategories || []);

  const categories = externalSetCategories ? initialCategories : internalCategories;
  const setCategories = externalSetCategories || setInternalCategories;

  React.useEffect(() => {
    setInternalCategories(initialCategories || []);
  }, [initialCategories]);

  const [activePreviewImage, setActivePreviewImage] = useState<{ title: string; url: string } | null>(null);
  const [activeEvidenceCrop, setActiveEvidenceCrop] = useState<{ title: string; url: string } | null>(null);

  // File input refs for uploading or taking photo
  const itemFileInputRef = useRef<HTMLInputElement>(null);
  const itemCameraInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ catIdx: number; itemIdx: number } | null>(null);

  // Item Field Updater
  const handleItemChange = (
    catIndex: number,
    itemIndex: number,
    field: keyof ReviewMenuItem,
    value: any
  ) => {
    setCategories(prev => {
      const copy = [...prev];
      const target = { ...copy[catIndex].items[itemIndex] };

      if (field === 'price' || field === 'originalPrice') {
        const parsed = parseFloat(value);
        (target as any)[field] = isNaN(parsed) ? null : Math.max(0, parsed);
      } else {
        (target as any)[field] = value;
      }

      copy[catIndex].items[itemIndex] = target;
      return copy;
    });
  };

  // Image source updater
  const handleSelectImageSource = (
    catIdx: number,
    itemIdx: number,
    sourceType: ImageSourceType,
    customUrl?: string
  ) => {
    setCategories(prev => {
      const copy = [...prev];
      const item = { ...copy[catIdx].items[itemIdx] };
      item.imageSource = sourceType;

      if (sourceType === 'manual_upload' || sourceType === 'owner_upload' || sourceType === 'camera') {
        if (customUrl) item.selectedImageUrl = customUrl;
      } else if (sourceType === 'none') {
        item.selectedImageUrl = '';
      }

      copy[catIdx].items[itemIdx] = item;
      return copy;
    });
  };

  // Custom Image Upload / Camera Photo
  const handleItemImageUpload = async (files: FileList | null, catIdx: number, itemIdx: number, isCamera = false) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      handleSelectImageSource(catIdx, itemIdx, isCamera ? 'camera' : 'owner_upload', result);
    };
    reader.readAsDataURL(file);
  };

  // Remove Image handler
  const handleRemoveImage = (catIdx: number, itemIdx: number) => {
    setCategories(prev => {
      const copy = [...prev];
      const item = { ...copy[catIdx].items[itemIdx] };
      item.selectedImageUrl = '';
      item.imageSource = 'none';
      copy[catIdx].items[itemIdx] = item;
      return copy;
    });
  };

  const handleApproveAll = () => {
    if (externalOnApproveAll) {
      externalOnApproveAll();
    } else {
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(item => ({ ...item, approved: true }))
      })));
    }
  };

  const handlePublish = () => {
    if (externalOnConfirmPublish) {
      externalOnConfirmPublish();
    } else if (onPublish) {
      onPublish(categories);
    }
  };

  const handleToggleApprove = (catIndex: number, itemIndex: number) => {
    setCategories(prev => {
      const copy = [...prev];
      copy[catIndex].items[itemIndex].approved = !copy[catIndex].items[itemIndex].approved;
      return copy;
    });
  };

  const handleDeleteItem = (catIndex: number, itemIndex: number) => {
    setCategories(prev => {
      const copy = [...prev];
      copy[catIndex].items[itemIndex] = { ...copy[catIndex].items[itemIndex] };
      copy[catIndex].items.splice(itemIndex, 1);
      if (copy[catIndex].items.length === 0) {
        copy.splice(catIndex, 1);
      }
      return copy;
    });
  };

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const approvedItems = categories.reduce(
    (sum, cat) => sum + cat.items.filter(i => i.approved).length,
    0
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Hidden inputs for custom upload/camera */}
      <input
        type="file"
        ref={itemFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (activeUploadTarget) {
            handleItemImageUpload(e.target.files, activeUploadTarget.catIdx, activeUploadTarget.itemIdx, false);
          }
        }}
      />
      <input
        type="file"
        ref={itemCameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (activeUploadTarget) {
            handleItemImageUpload(e.target.files, activeUploadTarget.catIdx, activeUploadTarget.itemIdx, true);
          }
        }}
      />

      {/* TOP ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-20">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Review & Approve Extracted Menu
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {approvedItems} of {totalItems} items approved. Upload or capture photos for menu items.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onReset && (
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100"
            >
              Back to Upload
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleApproveAll}
            className="text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100"
          >
            <Check className="h-4 w-4 mr-1 text-emerald-600" />
            Approve All Items
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || totalItems === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 shadow-md cursor-pointer"
          >
            {isPublishing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Publishing Menu...
              </>
            ) : (
              `Publish Menu (${approvedItems} Approved)`
            )}
          </Button>
        </div>
      </div>

      {/* CATEGORIES & ITEMS */}
      <div className="space-y-8">
        {categories.map((cat, catIdx) => (
          <div key={cat.id || catIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                Category: {cat.name}
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {cat.items.length} items
              </span>
            </div>

            <div className="space-y-6">
              {cat.items.map((item, itemIdx) => {
                return (
                  <div
                    key={item.id || itemIdx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
                      item.approved
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {/* 1. TOP HEADER BAR: Item Name + Category + Approval */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        <h3 className="font-black text-lg text-slate-900 dark:text-white">
                          {item.name}
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleApprove(catIdx, itemIdx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                            item.approved
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {item.approved ? 'Approved' : 'Click to Approve'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(catIdx, itemIdx)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* 2. MENU ITEM IMAGE SECTION — OWNER CONTROLLED */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-purple-600" />
                          MENU ITEM IMAGE
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {item.selectedImageUrl ? '✓ Image Attached' : 'No Image Selected'}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {item.selectedImageUrl ? (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3">
                              {/* Selected Thumbnail Preview */}
                              <div
                                className="h-24 w-24 rounded-xl overflow-hidden border-2 border-emerald-500 relative group cursor-pointer shrink-0 shadow-sm bg-slate-900"
                                onClick={() => setActivePreviewImage({ title: item.name, url: item.selectedImageUrl })}
                              >
                                <img
                                  src={item.selectedImageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                  <Eye className="h-3.5 w-3.5" /> View
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Custom Image Selected</span>
                                <span className="text-[10px] text-slate-400 block">This photo will be displayed on your live customer QR menu.</span>
                              </div>
                            </div>

                            {/* Image Controls: Change Image, Take Photo, Remove Image */}
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveUploadTarget({ catIdx, itemIdx });
                                  itemFileInputRef.current?.click();
                                }}
                                className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                              >
                                <Upload className="h-3.5 w-3.5 text-purple-600" />
                                Change Image
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveUploadTarget({ catIdx, itemIdx });
                                  itemCameraInputRef.current?.click();
                                }}
                                className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                              >
                                <Camera className="h-3.5 w-3.5 text-purple-600" />
                                Take Photo
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveImage(catIdx, itemIdx)}
                                className="text-xs font-bold gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove Image
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3">
                              <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon className="h-6 w-6 opacity-40" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">No image selected</span>
                                <span className="text-[10px] text-slate-400 block">Upload a photo of this dish or take one with your device camera</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveUploadTarget({ catIdx, itemIdx });
                                  itemFileInputRef.current?.click();
                                }}
                                className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer flex-1 sm:flex-none"
                              >
                                <Upload className="h-3.5 w-3.5 text-purple-600" />
                                Upload Image
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveUploadTarget({ catIdx, itemIdx });
                                  itemCameraInputRef.current?.click();
                                }}
                                className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer flex-1 sm:flex-none"
                              >
                                <Camera className="h-3.5 w-3.5 text-purple-600" />
                                Take Photo
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Source Evidence Reference Link (Internal Reference ONLY) */}
                      {item.sourceCropUrl && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
                          <button
                            type="button"
                            onClick={() => setActiveEvidenceCrop({ title: item.name, url: item.sourceCropUrl! })}
                            className="text-[10px] font-bold text-slate-400 hover:text-purple-600 flex items-center gap-1 cursor-pointer"
                          >
                            <Info className="h-3 w-3" /> View Original Menu Crop (Internal Reference Only)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3. ITEM FIELDS: Name + Price + Original Price + Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Item Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(catIdx, itemIdx, 'name', e.target.value)}
                          className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selling Price (₹)</label>
                        <input
                          type="number"
                          value={item.price ?? ''}
                          onChange={(e) => handleItemChange(catIdx, itemIdx, 'price', e.target.value)}
                          className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Original Price (MRP ₹)</label>
                        <input
                          type="number"
                          value={item.originalPrice ?? ''}
                          onChange={(e) => handleItemChange(catIdx, itemIdx, 'originalPrice', e.target.value)}
                          className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* PORTION / SIZE OPTIONS SECTION */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Portion / Size Options
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCategories(prev => {
                              const copy = [...prev];
                              const target = { ...copy[catIdx].items[itemIdx] };
                              const newHasVars = !target.has_variants;
                              target.has_variants = newHasVars;
                              if (newHasVars && (!target.variants || target.variants.length === 0)) {
                                target.variants = [
                                  { name: 'Half', price: target.price || 100 },
                                  { name: 'Full', price: Math.round((target.price || 100) * 1.8) }
                                ];
                              }
                              copy[catIdx].items[itemIdx] = target;
                              return copy;
                            });
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                            item.has_variants
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {item.has_variants ? 'Portions Enabled' : 'No portions / Single Price'}
                        </button>
                      </div>

                      {item.has_variants && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                          {(item.variants || []).map((v, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Portion Name (e.g. Half, Full, Small)"
                                value={v.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCategories(prev => {
                                    const copy = [...prev];
                                    const target = { ...copy[catIdx].items[itemIdx] };
                                    const vCopy = [...(target.variants || [])];
                                    vCopy[vIdx] = { ...vCopy[vIdx], name: val };
                                    target.variants = vCopy;
                                    copy[catIdx].items[itemIdx] = target;
                                    return copy;
                                  });
                                }}
                                className="flex-1 text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <div className="relative w-28 shrink-0">
                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                                <input
                                  type="number"
                                  placeholder="Price"
                                  value={v.price ?? ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCategories(prev => {
                                      const copy = [...prev];
                                      const target = { ...copy[catIdx].items[itemIdx] };
                                      const vCopy = [...(target.variants || [])];
                                      vCopy[vIdx] = { ...vCopy[vIdx], price: val };
                                      target.variants = vCopy;
                                      copy[catIdx].items[itemIdx] = target;
                                      return copy;
                                    });
                                  }}
                                  className="w-full pl-6 pr-2 py-2 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategories(prev => {
                                    const copy = [...prev];
                                    const target = { ...copy[catIdx].items[itemIdx] };
                                    const vCopy = (target.variants || []).filter((_, idx) => idx !== vIdx);
                                    target.variants = vCopy;
                                    if (vCopy.length === 0) target.has_variants = false;
                                    copy[catIdx].items[itemIdx] = target;
                                    return copy;
                                  });
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setCategories(prev => {
                                const copy = [...prev];
                                const target = { ...copy[catIdx].items[itemIdx] };
                                const vCopy = [...(target.variants || []), { name: 'Full', price: Math.round((target.price || 100) * 1.5) }];
                                target.variants = vCopy;
                                copy[catIdx].items[itemIdx] = target;
                                return copy;
                              });
                            }}
                            className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                          >
                            + Add Portion
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FULL PREVIEW MODAL */}
      {activePreviewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base">{activePreviewImage.title}</h3>
              <button
                type="button"
                onClick={() => setActivePreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-[70vh] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              <img src={activePreviewImage.url} alt={activePreviewImage.title} className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE CROP MODAL (INTERNAL REFERENCE ONLY) */}
      {activeEvidenceCrop && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Info className="h-4 w-4 text-purple-600" />
                Original Menu Bounding Box Crop (Internal Reference Only)
              </h3>
              <button
                type="button"
                onClick={() => setActiveEvidenceCrop(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-[50vh] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              <img src={activeEvidenceCrop.url} alt={activeEvidenceCrop.title} className="max-h-[50vh] w-auto object-contain" />
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Note: This crop is extracted from the physical menu photo for reference verification only and is NOT published to your QR menu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
