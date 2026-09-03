import { redirect } from 'next/navigation';

export default function DashboardAnalyticsRedirectPage() {
  redirect('/dashboard/reports');
}
