'use client';

import { useState, useEffect } from 'react';
import { getActiveUser } from '@/lib/supabase';
import { db } from '@/lib/db';
import AiMenuInput from '@/components/ai-menu/AiMenuInput';
import AiMenuReview, { AiExtractedCategory } from '@/components/ai-menu/AiMenuReview';
import AiMenuCleanupModal from '@/components/ai-menu/AiMenuCleanupModal';
import { Sparkles, Camera, ArrowLeft, AlertCircle, RefreshCw, Wand2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useRestaurant } from '../../layout';
import LockedFeatureView from '@/components/shared/LockedFeatureView';

import ResourceUsageCard from '@/components/shared/ResourceUsageCard';

export default function AiMenuPage() {
  const { restaurant, planSpec } = useRestaurant();
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number | null; remaining: number | null }>({
    used: 0,
    limit: planSpec?.ai_limits?.ai_menu_analysis ?? null,
    remaining: planSpec?.ai_limits?.ai_menu_analysis ?? null
  });

  if (planSpec?.features?.ai_menu === false) {
    return (
      <LockedFeatureView
        featureName="Smart Menu by CleverOps"
        featureDescription="AI Menu Analysis & OCR is not available on your current plan."
        planName={planSpec.name}
      />
    );
  }

  // Workflow steps: 'input' | 'review'
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);

  const [extractedCategories, setExtractedCategories] = useState<AiExtractedCategory[]>([]);
  const [totalFoundItems, setTotalFoundItems] = useState(0);

  const fetchAiUsage = async (restId: string) => {
    try {
      const res = await fetch(`/api/ai-usage/check?restaurantId=${restId}&featureKey=ai_menu_analysis`);
      if (res.ok) {
        const data = await res.json();
        setAiUsage({ used: data.used, limit: data.limit, remaining: data.remaining });
      }
    } catch (e) {}
  };

  useEffect(() => {
    async function initPage() {
      const user = await getActiveUser();
      if (user && user.restaurant_id) {
        setRestaurantId(user.restaurant_id);
        const rest = await db.getRestaurantById(user.restaurant_id);
        if (rest) setRestaurantName(rest.name);
        await fetchAiUsage(user.restaurant_id);
      }
      setLoading(false);
    }
    initPage();
  }, []);

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Array<{ name: string; previewUrl: string }>>([]);

  const handleAnalyze = async (payload: { images: Array<{ base64: string; type: string; name: string }>; textContent: string }) => {
    if (!restaurantId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // Store uploaded image previews for review section
      setUploadedImages(payload.images.map((img, idx) => ({
        name: img.name || `Menu Image ${idx + 1}`,
        previewUrl: img.base64
      })));

      const requestId = `req_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const res = await fetch('/api/ai-menu/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          images: payload.images,
          textContent: payload.textContent,
          requestId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || data.extractionFailed || !data.categories || data.categories.length === 0) {
        const msg = data.message || data.error || "Could not read the uploaded menu. Please try again.";
        setAnalysisError(msg);
        return;
      }

      setExtractedCategories(data.categories || []);
      setTotalFoundItems(data.totalItemsCount || data.totalItemsFound || (data.categories ? data.categories.reduce((acc: number, c: any) => acc + (c.items ? c.items.length : 0), 0) : 0));
      if (data.usedCredits !== undefined) {
        setAiUsage({ used: data.usedCredits, limit: data.limitCredits, remaining: data.remainingCredits });
      } else {
        await fetchAiUsage(restaurantId);
      }
      setStep('review');
    } catch (err: any) {
      setAnalysisError(err.message || "Could not read the uploaded menu. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublishMenu = async (approvedCategories: AiExtractedCategory[]) => {
    if (!restaurantId) return;
    setIsPublishing(true);
    try {
      const existingCats = await db.getCategories(restaurantId);
      const catMap: Record<string, string> = {};

      existingCats.forEach(c => {
        catMap[c.name.toLowerCase().trim()] = c.id;
      });

      let publishedCount = 0;

      for (const cat of approvedCategories) {
        const catNameClean = cat.name.trim();
        const catKey = catNameClean.toLowerCase();

        // Ensure category exists
        if (!catMap[catKey]) {
          const newCat = await db.createCategory(restaurantId, catNameClean);
          catMap[catKey] = newCat.id;
        }

        const categoryId = catMap[catKey];

        for (const item of cat.items) {
          if (!item.approved) continue;

          let finalImageUrl = item.selectedImageUrl || '';

          // If image is an external AI image or base64 crop, upload to permanent Supabase Storage
          if (finalImageUrl && (finalImageUrl.startsWith('http') || finalImageUrl.startsWith('data:image/'))) {
            if (finalImageUrl.includes('pollinations.ai') || item.imageSource === 'ai_suggestion' || finalImageUrl.startsWith('data:image/')) {
              try {
                const uploadRes = await fetch('/api/ai-menu/upload-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    restaurantId,
                    itemId: item.id,
                    imageUrl: finalImageUrl
                  })
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.storageUrl) {
                  finalImageUrl = uploadData.storageUrl;
                } else {
                  throw new Error(uploadData.error || 'AI image could not be saved. Please try again or select another image.');
                }
              } catch (uErr: any) {
                alert(`AI image could not be saved for "${item.name}": ${uErr.message}`);
                setIsPublishing(false);
                return;
              }
            }
          }

          // Duplicate resolution
          if (item.isDuplicate && item.existingItem) {
            if (item.duplicateAction === 'skip') {
              continue; // Skip without overwriting
            } else if (item.duplicateAction === 'replace' || item.duplicateAction === 'merge') {
              const safePrice = item.price !== null && item.price > 0 ? item.price : item.existingItem.price;
              await db.updateMenuItem(item.existingItem.id, {
                description: item.description || item.existingItem.description,
                price: safePrice,
                is_veg: item.is_veg,
                image_url: finalImageUrl || item.existingItem.image_url
              });
              publishedCount++;
              continue;
            }
          }

          // Create new menu item
          await db.createMenuItem(restaurantId, {
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            is_veg: item.is_veg,
            is_available: true,
            image_url: finalImageUrl || ''
          });
          publishedCount++;
        }
      }

      alert(`Successfully published ${publishedCount} menu items to your live CleverOps menu!`);
      setStep('input');
      setExtractedCategories([]);
    } catch (err: any) {
      alert(`Failed to publish menu: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/menu">
              <Button variant="outline" size="sm" className="gap-1 cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Menu
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Smart Menu by CleverOps
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Turn your physical menu photos, price lists, or documents into a ready-to-publish digital menu.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setCleanupModalOpen(true)}
            className="text-xs font-extrabold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            Improve Live Menu
          </Button>
        </div>
      </div>

      {/* AI Usage Counter */}
      <div className="max-w-md">
        <ResourceUsageCard
          title="AI Menu Item Credits"
          used={aiUsage.used}
          limit={aiUsage.limit}
          unitLabel="credits used"
          resetNote="1 extracted menu item = 1 AI Menu credit. Resets monthly."
        />
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <strong>Owner Control Guaranteed:</strong> Smart Menu suggestions will <u>never</u> automatically publish or modify your live menu without your explicit approval.
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 shrink-0">
          Smart Menu Vision Engine
        </span>
      </div>

      {/* Step View */}
      {step === 'input' ? (
        <AiMenuInput
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          errorMsg={analysisError}
          onClearError={() => setAnalysisError(null)}
        />
      ) : (
        <AiMenuReview
          categories={extractedCategories}
          totalFoundItems={totalFoundItems}
          sourceImages={uploadedImages}
          onPublish={handlePublishMenu}
          isPublishing={isPublishing}
          onReset={() => setStep('input')}
        />
      )}

      {/* AI Cleanup Modal */}
      {cleanupModalOpen && (
        <AiMenuCleanupModal
          isOpen={cleanupModalOpen}
          onClose={() => setCleanupModalOpen(false)}
          restaurantId={restaurantId}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
