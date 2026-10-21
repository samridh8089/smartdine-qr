'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OffersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings?tab=offers');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
        <Tag className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Offers & Discounts Moved</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Promotional offers and discounts are now located in your Settings section. Redirecting you automatically...
        </p>
      </div>
      <Link href="/dashboard/settings?tab=offers">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5">
          <span>Go to Offers & Discounts</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
