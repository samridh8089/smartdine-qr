'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings?tab=staff');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Redirecting to Staff Management...</p>
      </div>
    </div>
  );
}
