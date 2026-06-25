'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getActiveUser, supabase } from '@/lib/supabase';
import { db, Profile, Restaurant } from '@/lib/db';
import MockBanner from '@/components/shared/MockBanner';
import { 
  UtensilsCrossed, LayoutDashboard, Menu as MenuIcon, 
  QrCode, ClipboardList, ChefHat, BarChart3, CreditCard, 
  LogOut, MenuSquare, X, ChevronRight, User
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const user = await getActiveUser();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role === 'super_admin') {
        router.push('/super-admin');
        return;
      }
      setProfile(user);

      // Load restaurant if available
      if (user.restaurant_id) {
        const rest = await db.getRestaurantById(user.restaurant_id);
        if (rest) setRestaurant(rest);
      }
      setLoading(false);
    }
    checkAuth();

    // Listen for storage events (e.g. restaurant updates, logout)
    const handleStorageChange = () => {
      checkAuth();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading SmartDine QR...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Menu Management', href: '/dashboard/menu', icon: MenuSquare },
    { name: 'Tables & QRs', href: '/dashboard/tables', icon: QrCode },
    { name: 'Kitchen Display', href: '/dashboard/kds', icon: ChefHat },
    { name: 'Live Orders', href: '/dashboard/orders', icon: ClipboardList },
    { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Billing & SaaS', href: '/dashboard/billing', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo Section */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">SmartDine QR</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group
                    ${isActive 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Section / Logout */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 mb-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100/10 flex items-center justify-center text-emerald-500">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-slate-200">{profile?.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{profile?.role} • {restaurant?.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Dashboard Header */}
          <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Open sidebar"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-3">
                {restaurant?.logo_url ? (
                  <img 
                    src={restaurant.logo_url} 
                    alt={restaurant.name} 
                    className="h-8 w-8 rounded-lg object-cover border border-slate-100" 
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
                    {restaurant?.name?.charAt(0) || 'R'}
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-semibold text-slate-950 leading-none">{restaurant?.name}</h1>
                  <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live QR Ordering Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {restaurant?.subscription_plan && (
                <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                  {restaurant.subscription_plan} Plan
                </span>
              )}
              <Link 
                href={`/menu/${restaurant?.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-all hover:border-slate-300"
              >
                View Digital Menu
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </header>

          {/* Dashboard Children Pages */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
