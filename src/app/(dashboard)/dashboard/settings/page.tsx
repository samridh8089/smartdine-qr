'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRestaurant } from '../../layout';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { db, Profile, AuditLog, getPlanFeatures } from '@/lib/db';
import { storage, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';
import { 
  Settings, Users, History, Download, Upload, 
  Sparkles, Check, AlertCircle, Plus, Trash2, Eye, DollarSign, CreditCard, Volume2, Copy, RefreshCw,
  Smartphone, Laptop, ShieldCheck, LogOut, CheckCircle2, XCircle, KeyRound, Monitor, Pencil, QrCode,
  Bell, BellOff, Tag, Archive, Printer,
  ArrowLeft, Search, UtensilsCrossed, Percent, Database, ShieldAlert, LayoutGrid, Store, Receipt
} from 'lucide-react';

import ResourceUsageCard from '@/components/shared/ResourceUsageCard';
import { getActiveDevices, removeTrustedDevice, logoutAllDevices } from '@/lib/sessionManager';
import { QRDesignStudio } from '@/components/qr-studio/QRDesignStudio';
import { setGlobalMute, playLoudBell, stopLoudBell } from '@/lib/soundAlert';
import { OffersSettings } from '@/components/dashboard/OffersSettings';
import { downloadAllTablesQRZip, printAllTablesA4Sheet } from '@/components/qr-studio/cardCanvasExport';
import { useQRDesign } from '@/components/qr-studio/storage';
import { getCanonicalTableQRUrl } from '@/lib/qr';
import { saveStaffProfile, getStaffProfiles, StaffProfile } from '@/lib/attendoEngine';

interface HubModuleItem {
  id: 'profile' | 'staff' | 'qr_design' | 'charges' | 'payments' | 'devices' | 'notifications' | 'backup' | 'logs' | 'offers';
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  icon: any;
  iconBg: string;
  tags: string[];
  ownerOnly?: boolean;
}

const HUB_MODULES: HubModuleItem[] = [
  {
    id: 'profile',
    title: 'Restaurant Profile',
    desc: 'Name, logo, address, phone number & operating hours',
    icon: Store,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['restaurant', 'profile', 'name', 'logo', 'contact', 'timings', 'address', 'theme', 'cover']
  },
  {
    id: 'staff',
    title: 'Staff & Permissions',
    desc: 'Managers, supervisors, chefs, waiters & salaries',
    badge: '10 Roles',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700',
    icon: Users,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['staff', 'team', 'managers', 'supervisors', 'chefs', 'waiters', 'salary', 'permissions', 'roles', 'pin', 'wages']
  },
  {
    id: 'qr_design',
    title: 'Tables & QR Design',
    desc: 'Table capacity, custom QR themes & standee PDF downloads',
    icon: QrCode,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['qr', 'tables', 'table layout', 'badges', 'qr codes', 'floor', 'download', 'standees', 'studio']
  },
  {
    id: 'charges',
    title: 'Taxes & Extra Charges',
    desc: 'GST slabs (5%, 12%, 18%), service charge & container fee',
    icon: Percent,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['taxes', 'extra charges', 'gst', 'service charge', 'packaging fee', 'delivery', 'tax']
  },
  {
    id: 'payments',
    title: 'Payment Gateways',
    desc: 'UPI QR codes, cash desk & Razorpay payment gateway',
    icon: CreditCard,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['payment methods', 'upi', 'cash', 'qr', 'razorpay', 'gateway', 'checkout', 'online']
  },
  {
    id: 'devices',
    title: 'Printers & Devices',
    desc: 'Thermal KOT printers, Bluetooth auto-print & soundbox',
    icon: Printer,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['printers', 'hardware', 'bluetooth', 'kot', 'thermal', 'pos', 'receipt', 'kitchen printer', 'devices', 'sessions']
  },
  {
    id: 'notifications',
    title: 'Sound & Notifications',
    desc: 'Kitchen bell audio, floor buzzer & WhatsApp alerts',
    icon: Bell,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['sound', 'alerts', 'bell', 'chime', 'notification', 'whatsapp', 'audio', 'buzzer']
  },
  {
    id: 'backup',
    title: 'Data & Backup',
    desc: 'Export Excel sales, menu templates & database backup',
    icon: Database,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['data', 'backup', 'export', 'csv', 'excel', 'snapshot', 'cloud', 'restore', 'menu import', 'download']
  },
  {
    id: 'logs',
    title: 'Activity Audit Logs',
    desc: 'Track staff updates, price edits, deletes & login history',
    badge: 'Owner Only',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700',
    icon: ShieldCheck,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['audit logs', 'security', 'owner', 'activity trail', 'history', 'who did what', 'audit', 'logs'],
    ownerOnly: true
  },
  {
    id: 'offers',
    title: 'Offers & Discounts',
    desc: 'Promo codes, festive coupons & banner announcements',
    icon: Tag,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    tags: ['offers', 'discounts', 'coupons', 'promo', 'codes', 'marketing']
  }
];

export default function SettingsPage({ initialTab = 'hub' }: { initialTab?: 'hub' | 'profile' | 'qr_design' | 'staff' | 'devices' | 'backup' | 'logs' | 'charges' | 'payments' | 'notifications' | 'offers' } = {}) {
  const { restaurant, profile, planSpec, refresh, activeRole } = useRestaurant();
  const isOwner = profile?.role === 'owner' || activeRole === 'owner';

  const [activeTab, setActiveTab] = useState<'hub' | 'profile' | 'qr_design' | 'staff' | 'devices' | 'backup' | 'logs' | 'charges' | 'payments' | 'notifications' | 'offers'>(() => {
    if (initialTab && initialTab !== 'hub') return initialTab;
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/staff')) return 'staff';
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['hub', 'profile', 'qr_design', 'staff', 'devices', 'backup', 'logs', 'charges', 'payments', 'notifications', 'offers'].includes(tabParam)) {
        return tabParam as any;
      }
    }
    return 'hub';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Staff OTP Verification Modal State
  const [verifyStaffModalOpen, setVerifyStaffModalOpen] = useState(false);
  const [verifyingStaff, setVerifyingStaff] = useState<Profile | null>(null);
  const [staffOtpInput, setStaffOtpInput] = useState('');
  const [staffOtpLoading, setStaffOtpLoading] = useState(false);
  const [staffOtpError, setStaffOtpError] = useState('');
  const [staffOtpDevHint, setStaffOtpDevHint] = useState<string | null>(null);

  // Active Devices State
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Bell/Notification Sound settings state
  const [ownerBellEnabled, setOwnerBellEnabled] = useState<boolean>(restaurant?.settings?.owner_bell_enabled !== false);
  const [kitchenBellType, setKitchenBellType] = useState<string>(restaurant?.settings?.kitchen_bell_type || 'alarm');
  const [waiterBellType, setWaiterBellType] = useState<string>(restaurant?.settings?.waiter_bell_type || 'alarm');
  const [kitchenBellUrl, setKitchenBellUrl] = useState<string>(restaurant?.settings?.kitchen_bell_url || '');
  const [waiterBellUrl, setWaiterBellUrl] = useState<string>(restaurant?.settings?.waiter_bell_url || '');
  const [uploadingKitchen, setUploadingKitchen] = useState(false);
  const [uploadingWaiter, setUploadingWaiter] = useState(false);

  // Payments settings state
  const [paymentEnabled, setPaymentEnabled] = useState(restaurant?.settings?.payment_enabled === true);
  const [upiId, setUpiId] = useState(restaurant?.settings?.upi_id || '');
  const [upiName, setUpiName] = useState(restaurant?.settings?.upi_name || '');
  const [paymentQr, setPaymentQr] = useState(restaurant?.settings?.payment_qr || '');
  const [takeawayEnabled, setTakeawayEnabled] = useState(restaurant?.settings?.takeaway_enabled === true);

  // Profile Settings Form
  const [restName, setRestName] = useState(restaurant?.name || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [gst, setGst] = useState(restaurant?.gst_number || '');
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(restaurant?.cover_image_url || '');
  const [themeColor, setThemeColor] = useState(restaurant?.settings?.theme_color || 'emerald');

  // Taxes & Charges state
  const [gstEnabled, setGstEnabled] = useState(restaurant?.settings?.gst_enabled !== false);
  const [taxMode, setTaxMode] = useState<'cgst_sgst' | 'igst' | 'none'>(restaurant?.settings?.tax_mode || 'cgst_sgst');
  const [cgstPercentage, setCgstPercentage] = useState<number>(restaurant?.settings?.cgst_percentage ?? 2.5);
  const [sgstPercentage, setSgstPercentage] = useState<number>(restaurant?.settings?.sgst_percentage ?? 2.5);
  const [igstPercentage, setIgstPercentage] = useState<number>(restaurant?.settings?.igst_percentage ?? 5.0);
  const [gstPercentage, setGstPercentage] = useState(restaurant?.settings?.gst_percentage ?? 5.0);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(restaurant?.settings?.service_charge_enabled !== false);
  const [serviceChargePercentage, setServiceChargePercentage] = useState(restaurant?.settings?.service_charge_percentage ?? 5.0);
  const [customCharges, setCustomCharges] = useState<{ id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }[]>(restaurant?.settings?.custom_charges || []);
  const [showCustomerDetailsOnBill, setShowCustomerDetailsOnBill] = useState<boolean>(restaurant?.settings?.show_customer_details_on_bill !== false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const { designConfig: qrDesign } = useQRDesign(restaurant);
  
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeType, setNewChargeType] = useState<'fixed' | 'percentage'>('fixed');
  const [newChargeValue, setNewChargeValue] = useState(0);

  // Staff Management State
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<Profile['role']>('waiter');
  const [staffDepartment, setStaffDepartment] = useState<'waiter' | 'kitchen' | 'cashier' | 'service' | 'general'>('waiter');
  const [staffBaseSalary, setStaffBaseSalary] = useState(15000);
  const [staffSalaryType, setStaffSalaryType] = useState<'fixed' | 'per_day'>('fixed');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // Edit Staff Modal State
  const resolveStaffDept = (role: string, dept: string) => {
  if (role === 'supervisor') return dept || 'general';
  if (['head_chef', 'chef', 'kitchen', 'kitchen_helper'].includes(role)) return 'kitchen';
  if (['captain', 'waiter', 'cleaner', 'helper'].includes(role)) return 'waiter';
  if (role === 'cashier') return 'cashier';
  return 'general';
};

  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [editStaffTarget, setEditStaffTarget] = useState<Profile | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<Profile['role']>('waiter');
  const [editStaffDepartment, setEditStaffDepartment] = useState<'waiter' | 'kitchen' | 'cashier' | 'service' | 'general'>('waiter');
  const [editStaffBaseSalary, setEditStaffBaseSalary] = useState(15000);
  const [editStaffSalaryType, setEditStaffSalaryType] = useState<'fixed' | 'per_day'>('fixed');
  const [attendoStaffMap, setAttendoStaffMap] = useState<Record<string, StaffProfile>>({});
  const [editStaffLoading, setEditStaffLoading] = useState(false);
  const [editStaffError, setEditStaffError] = useState('');

  // Table Assignment Modal State
  const [tableAssignTarget, setTableAssignTarget] = useState<Profile | null>(null);
  const [allRestaurantTables, setAllRestaurantTables] = useState<any[]>([]);
  const [assignedTableIdsForTarget, setAssignedTableIdsForTarget] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Import State
  const [importing, setImporting] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Staff Password Reset Modal state
  const [resetPassTarget, setResetPassTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPassVal, setNewPassVal] = useState('');
  const [confirmPassVal, setConfirmPassVal] = useState('');
  const [showPassToggle, setShowPassToggle] = useState(false);
  const [resetPassSubmitting, setResetPassSubmitting] = useState(false);

  // Owner Self-Password Change state
  const [ownerCurrPass, setOwnerCurrPass] = useState('');
  const [ownerNewPass, setOwnerNewPass] = useState('');
  const [ownerConfirmPass, setOwnerConfirmPass] = useState('');
  const [ownerShowPassToggle, setOwnerShowPassToggle] = useState(false);
  const [ownerPassSubmitting, setOwnerPassSubmitting] = useState(false);


  // Filtered Windows 10 Settings Hub Modules
  const filteredHubModules = useMemo(() => {
    if (!searchQuery.trim()) return HUB_MODULES;
    const q = searchQuery.toLowerCase().trim();
    return HUB_MODULES.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  useEffect(() => {
    if (restaurant) {
      setRestName(restaurant.name);
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setGst(restaurant.gst_number || '');
      setLogoUrl(restaurant.logo_url || '');
      setCoverUrl(restaurant.cover_image_url || '');
      setThemeColor(restaurant.settings?.theme_color || 'emerald');
      setGstEnabled(restaurant.settings?.gst_enabled !== false);
      setTaxMode(restaurant.settings?.tax_mode || 'cgst_sgst');
      setCgstPercentage(restaurant.settings?.cgst_percentage ?? 2.5);
      setSgstPercentage(restaurant.settings?.sgst_percentage ?? 2.5);
      setIgstPercentage(restaurant.settings?.igst_percentage ?? 5.0);
      setGstPercentage(restaurant.settings?.gst_percentage ?? 5.0);
      setServiceChargeEnabled(restaurant.settings?.service_charge_enabled !== false);
      setServiceChargePercentage(restaurant.settings?.service_charge_percentage ?? 5.0);
      setCustomCharges(restaurant.settings?.custom_charges || []);
      setShowCustomerDetailsOnBill(restaurant.settings?.show_customer_details_on_bill !== false);
      setPaymentEnabled(restaurant.settings?.payment_enabled === true);
      setUpiId(restaurant.settings?.upi_id || '');
      setUpiName(restaurant.settings?.upi_name || '');
      setPaymentQr(restaurant.settings?.payment_qr || '');
      setTakeawayEnabled(restaurant.settings?.takeaway_enabled === true);
      setOwnerBellEnabled(restaurant.settings?.owner_bell_enabled !== false);
      setKitchenBellType(restaurant.settings?.kitchen_bell_type || 'alarm');
      setWaiterBellType(restaurant.settings?.waiter_bell_type || 'alarm');
      setKitchenBellUrl(restaurant.settings?.kitchen_bell_url || '');
      setWaiterBellUrl(restaurant.settings?.waiter_bell_url || '');
      loadStaffAndLogs();

      // Supabase Realtime subscription on `profiles` table for staff sync
      const channel = supabase
        .channel(`web_staff_realtime_${restaurant.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `restaurant_id=eq.${restaurant.id}`
          },
          () => {
            console.log('[Realtime Web] Staff profile update detected. Auto-reloading staff list...');
            loadStaffAndLogs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [restaurant]);

  // Read URL query parameter for tab deep-linking (e.g. /dashboard/settings?tab=staff)
  useEffect(() => {
    if (initialTab && initialTab !== 'profile') {
      setActiveTab(initialTab);
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/staff')) {
        setActiveTab('staff');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['profile', 'qr_design', 'staff', 'devices', 'backup', 'logs', 'charges', 'payments', 'notifications'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [initialTab]);

  // Lazy-load audit logs only when the logs tab is activated
  useEffect(() => {
    if (activeTab === 'logs' && restaurant?.id && logs.length === 0) {
      db.getAuditLogs(restaurant.id).then(auditLogs => {
        if (auditLogs) setLogs(auditLogs);
      });
    }
  }, [activeTab, restaurant?.id, logs.length]);

  const loadStaffAndLogs = async () => {
    if (!restaurant) return;
    try {
      const promises: Promise<any>[] = [
        db.getStaffProfiles(restaurant.id),
        db.getTables(restaurant.id),
        getStaffProfiles(restaurant.id)
      ];
      if (activeTab === 'logs') {
        promises.push(db.getAuditLogs(restaurant.id));
      }
      const [staff, tables, attendoStaff, auditLogs] = await Promise.all(promises);
      if (staff) setStaffList(staff);
      if (tables) setAllRestaurantTables(tables);
      if (auditLogs) setLogs(auditLogs);
      if (attendoStaff) {
        const map: Record<string, StaffProfile> = {};
        attendoStaff.forEach((s: StaffProfile) => {
          map[s.id] = s;
          if (s.profile_id) map[s.profile_id] = s;
        });
        setAttendoStaffMap(map);
      }
    } catch (e) {
      console.warn('Error loading staff/tables in settings:', e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        name: restName,
        phone,
        address,
        gst_number: gst,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
        settings: {
          ...restaurant.settings,
          theme_color: themeColor
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_settings',
        'Updated restaurant profile details and branding theme'
      );

      await refresh();
      alert('Restaurant settings updated successfully!');
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomCharge = () => {
    if (!newChargeName.trim()) return;
    const newCharge = {
      id: Math.random().toString(36).substr(2, 9),
      name: newChargeName.trim(),
      type: newChargeType,
      value: Number(newChargeValue) || 0,
      enabled: true
    };
    setCustomCharges(prev => [...prev, newCharge]);
    setNewChargeName('');
    setNewChargeValue(0);
  };

  const handleRemoveCustomCharge = (id: string) => {
    setCustomCharges(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleCustomCharge = (id: string) => {
    setCustomCharges(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const handleDownloadAllQRZip = async () => {
    if (!restaurant?.id) return;
    try {
      setIsBulkDownloading(true);
      const tables = await db.getTables(restaurant.id);
      if (!tables.length) {
        alert('No tables found to export.');
        return;
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const items = tables.map(t => ({
        id: t.id,
        name: t.name,
        url: getCanonicalTableQRUrl(origin, restaurant.slug, t.id)
      }));
      await downloadAllTablesQRZip(qrDesign, items, restaurant.slug, (current, total) => {
        setBulkProgress({ current, total });
      });
    } catch (err: any) {
      alert('Failed to download QR zip: ' + (err.message || err));
    } finally {
      setIsBulkDownloading(false);
      setBulkProgress(null);
    }
  };

  const handlePrintAllQRA4 = async () => {
    if (!restaurant?.id) return;
    try {
      const tables = await db.getTables(restaurant.id);
      if (!tables.length) {
        alert('No tables found to print.');
        return;
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const items = tables.map(t => ({
        id: t.id,
        name: t.name,
        url: getCanonicalTableQRUrl(origin, restaurant.slug, t.id)
      }));
      await printAllTablesA4Sheet(qrDesign, items, restaurant?.name || 'Restaurant');
    } catch (err: any) {
      alert('Failed to print QR sheets: ' + (err.message || err));
    }
  };

  const handleSaveCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      const calcGstRate = taxMode === 'igst' ? Number(igstPercentage) : (Number(cgstPercentage) + Number(sgstPercentage));
      await db.updateRestaurant(restaurant.id, {
        settings: {
          ...restaurant.settings,
          gst_enabled: gstEnabled,
          tax_mode: taxMode,
          cgst_percentage: Number(cgstPercentage) || 0,
          sgst_percentage: Number(sgstPercentage) || 0,
          igst_percentage: Number(igstPercentage) || 0,
          gst_percentage: calcGstRate,
          service_charge_enabled: serviceChargeEnabled,
          service_charge_percentage: Number(serviceChargePercentage) || 0,
          custom_charges: customCharges,
          show_customer_details_on_bill: showCustomerDetailsOnBill
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_settings',
        'Updated restaurant tax rates, service charges, and custom billing fees'
      );

      await refresh();
      alert('Taxes and billing charges saved successfully!');
    } catch (err: any) {
      alert('Failed to save taxes and charges: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        settings: {
          ...restaurant.settings,
          payment_enabled: paymentEnabled,
          upi_id: upiId,
          upi_name: upiName,
          payment_qr: paymentQr,
          takeaway_enabled: takeawayEnabled
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_payment_settings',
        `Updated UPI payments settings (Enabled: ${paymentEnabled}, UPI ID: ${upiId})`
      );

      await refresh();
      alert('Payment settings saved successfully!');
    } catch (err: any) {
      alert('Failed to save payment settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        settings: {
          ...restaurant.settings,
          owner_bell_enabled: ownerBellEnabled,
          kitchen_bell_type: kitchenBellType,
          waiter_bell_type: waiterBellType,
          kitchen_bell_url: kitchenBellUrl,
          waiter_bell_url: waiterBellUrl
        }
      });

      setGlobalMute(!ownerBellEnabled);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cleverops_bell_muted', ownerBellEnabled ? 'false' : 'true');
      }

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_notification_settings',
        `Updated notification bell sounds (Kitchen: ${kitchenBellType}, Waiter: ${waiterBellType})`
      );

      await refresh();
      alert('Notification settings saved successfully!');
    } catch (err: any) {
      alert('Failed to save notification settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    if (staffLoading) return;
    setStaffLoading(true);
    setStaffError('');

    // Pre-signup validations
    if (!staffName.trim()) {
      setStaffError('Staff Full Name is required.');
      setStaffLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = staffEmail.trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setStaffError('Please enter a valid email address.');
      setStaffLoading(false);
      return;
    }

    // Block Owner Email
    const ownerEmail = profile?.email?.trim().toLowerCase() || (restaurant?.settings as any)?.owner_email?.trim().toLowerCase();
    if (ownerEmail && cleanEmail === ownerEmail) {
      setStaffError('The restaurant owner email cannot be registered as a staff account.');
      setStaffLoading(false);
      return;
    }

    // Block Duplicate Staff Email
    if (staffList.some(s => s.email?.trim().toLowerCase() === cleanEmail)) {
      setStaffError('A staff account with this email address already exists.');
      setStaffLoading(false);
      return;
    }

    // Validate and Block Duplicate Mobile Number
    const cleanPhone = staffPhone.trim().replace(/\D/g, '');
    if (cleanPhone) {
      if (cleanPhone.length < 10) {
        setStaffError('Please enter a valid 10-digit mobile number.');
        setStaffLoading(false);
        return;
      }
      const isPhoneDuplicate = staffList.some(s => {
        const sPhone = (s.phone || '').replace(/\D/g, '');
        return sPhone && sPhone.slice(-10) === cleanPhone.slice(-10);
      });
      if (isPhoneDuplicate) {
        setStaffError('A staff account with this mobile number already exists.');
        setStaffLoading(false);
        return;
      }
    }

    if (staffPassword.length < 6) {
      setStaffError('Password must be at least 6 characters long.');
      setStaffLoading(false);
      return;
    }
    if (!['manager', 'supervisor', 'waiter', 'kitchen', 'cashier'].includes(staffRole)) {
      setStaffError('Please select a valid staff role.');
      setStaffLoading(false);
      return;
    }

    try {
      const newStaff = await db.createStaffProfile(
        staffEmail,
        staffPassword,
        staffName,
        staffRole,
        restaurant.id,
        resolveStaffDept(staffRole, staffDepartment),
        staffPhone
      );

      // Save baseline salary in attendo settings
      await saveStaffProfile({
        id: newStaff.id,
        profile_id: newStaff.id,
        restaurant_id: restaurant.id,
        name: staffName.trim(),
        role: staffRole,
        phone: staffPhone.trim(),
        base_salary: Number(staffBaseSalary) || 0,
        salary_type: staffSalaryType
      });

      // Dispatch Staff Email OTP
      try {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'staff_creation',
            email: staffEmail.trim().toLowerCase(),
            recipientName: staffName.trim(),
            restaurantName: restaurant.name,
            userId: newStaff.id,
            restaurantId: restaurant.id
          })
        });
      } catch (e) {}

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'create_staff',
        `Created staff account for ${staffName} (${staffRole}${staffRole === 'supervisor' ? ` - ${staffDepartment}` : ''})`
      );

      let alertMsg = `Staff profile created for ${staffName}! Status is set to "Pending Verification". Verification link dispatched to ${newStaff.email}.`;
      if ((newStaff as any).resent) {
        alertMsg = `Verification email resent to ${newStaff.email}.`;
      } else if ((newStaff as any).resumed) {
        alertMsg = `Staff onboarding resumed and profile updated for ${staffName}.`;
      }

      setStaffEmail('');
      setStaffPassword('');
      setStaffName('');
      setStaffPhone('');
      setStaffBaseSalary(15000);
      setStaffSalaryType('fixed');

      // Automatically open OTP Verification modal for staff
      setVerifyingStaff(newStaff);
      setStaffOtpInput('');
      setStaffOtpError('');
      setVerifyStaffModalOpen(true);

      await loadStaffAndLogs();
    } catch (err: any) {
      let msg = err.message || 'Failed to create staff member';
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
      }
      if (msg === '{}' || msg === 'Object' || !msg.trim()) {
        msg = 'Database constraint error: Check if the role is allowed. Please execute the SQL commands in supabase/migrations/20260625000000_schema_updates.sql in your Supabase SQL Editor to allow manager/waiter/kitchen roles in your database.';
      }
      setStaffError(msg);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleOpenStaffVerifyModal = (st: Profile) => {
    setVerifyingStaff(st);
    setStaffOtpInput('');
    setStaffOtpError('');
    setStaffOtpDevHint(null);
    setVerifyStaffModalOpen(true);
  };

  const handleResendWebStaffInvite = async (st: Profile) => {
    try {
      const res = await fetch('/api/staff/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: st.email, userId: st.id })
      }).then(r => r.json());

      if (res.error) throw new Error(res.error);
      alert(res.message || `Verification email resent to ${st.email}.`);
    } catch (err: any) {
      alert(`Failed to resend invite: ${err.message}`);
    }
  };

  const handleVerifyStaffOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingStaff || !restaurant) return;
    setStaffOtpLoading(true);
    setStaffOtpError('');

    const cleanOtp = staffOtpInput.trim().replace(/\D/g, '');
    if (!/^\d{6,8}$/.test(cleanOtp)) {
      setStaffOtpError('Please enter a valid OTP code.');
      setStaffOtpLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/staff/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyingStaff.email,
          otp: cleanOtp,
          staffId: verifyingStaff.id,
          restaurantId: restaurant.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStaffOtpError(data.error || 'Verification failed. Please enter the correct 8-digit OTP.');
        setStaffOtpLoading(false);
        return;
      }

      // Optimistic instant state sync
      setStaffList(prev => prev.map(s => s.id === verifyingStaff.id ? {
        ...s,
        is_active: true,
        is_verified: true,
        verification_status: 'active'
      } : s));

      alert(`Success! Staff account for ${verifyingStaff.full_name || verifyingStaff.email} is now ACTIVE and verified.`);
      setVerifyStaffModalOpen(false);
      await loadStaffAndLogs();
    } catch (err: any) {
      setStaffOtpError(err?.message || 'Failed to verify staff OTP');
    } finally {
      setStaffOtpLoading(false);
    }
  };

  const loadDevices = async () => {
    if (!profile?.id) return;
    setDevicesLoading(true);
    try {
      const devs = await getActiveDevices(profile.id);
      setDevicesList(devs);
    } catch (e) {
      console.warn('Load devices warning:', e);
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'devices') {
      loadDevices();
    }
  }, [activeTab, profile?.id]);

  const handleRemoveTrustedDevice = async (sessionId: string) => {
    if (!profile?.id) return;
    if (!confirm('Are you sure you want to remove this trusted device? The next login from that device will require OTP verification.')) return;
    try {
      await removeTrustedDevice(profile.id, sessionId);
      await loadDevices();
      alert('Trusted device removed successfully.');
    } catch (e: any) {
      alert(`Error removing device: ${e.message}`);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!profile?.id) return;
    if (!confirm('WARNING: Are you sure you want to logout all devices? You will be signed out of all current sessions.')) return;
    try {
      await logoutAllDevices(profile.id);
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (e: any) {
      alert(`Error logging out all devices: ${e.message}`);
    }
  };

  const handleToggleStaffActive = async (st: Profile) => {
    if (!restaurant) return;
    if (st.role === 'owner') {
      alert('The restaurant owner account cannot be deactivated.');
      return;
    }
    const newStatus = st.is_active === false ? true : false;
    try {
      await db.toggleStaffActiveStatus(restaurant.id, st.id, newStatus);
      await db.createAuditLog(
        restaurant.id,
        profile?.id || null,
        profile?.email || 'Owner',
        'toggle_staff_status',
        `Changed active status for staff ${st.full_name || st.email} to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`
      );
      await loadStaffAndLogs();
    } catch (err: any) {
      alert(`Failed to update staff status: ${err.message}`);
    }
  };

  const handleOpenAssignModal = async (st: Profile) => {
    if (!restaurant) return;
    setTableAssignTarget(st);
    const assignedIds = await db.getAssignedTablesForWaiter(restaurant.id, st.id);
    setAssignedTableIdsForTarget(assignedIds);
  };

  const handleSaveTableAssignments = async () => {
    if (!restaurant || !tableAssignTarget) return;
    setAssignSubmitting(true);
    try {
      await db.setTableAssignmentsForWaiter(
        restaurant.id,
        tableAssignTarget.id,
        assignedTableIdsForTarget,
        profile?.full_name || 'Owner'
      );
      alert(`Table assignments saved for ${tableAssignTarget.full_name}!`);
      setTableAssignTarget(null);
      await loadStaffAndLogs();
    } catch (err: any) {
      alert(`Failed to save table assignments: ${err.message}`);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleDeleteStaff = async (st: Profile) => {
    if (!restaurant) return;
    if (st.role === 'owner') {
      alert('Forbidden: Cannot delete the restaurant owner account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete staff member "${st.full_name || st.email}"? They will lose all access.`)) return;
    try {
      setLoading(true);
      await db.deleteStaffProfile(st.id);
      await db.createAuditLog(
        restaurant.id,
        profile?.id || null,
        profile?.email || 'Owner',
        'delete_staff',
        `Deleted staff account ${st.full_name || st.email} (${st.email})`
      );
      await loadStaffAndLogs();
      alert('Staff account deleted successfully.');
    } catch (err: any) {
      alert(`Failed to delete staff: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (st: Profile) => {
    setEditStaffTarget(st);
    setEditStaffName(st.full_name || '');
    setEditStaffPhone(st.phone || '');
    setEditStaffRole((['manager', 'supervisor', 'head_chef', 'chef', 'kitchen', 'kitchen_helper', 'captain', 'waiter', 'cashier', 'cleaner', 'helper', 'staff'].includes(st.role) ? st.role : 'waiter') as any);
    setEditStaffDepartment((st.department || 'waiter') as any);
    const existingAttendo = attendoStaffMap[st.id] || Object.values(attendoStaffMap).find(s => s.profile_id === st.id);
    setEditStaffBaseSalary(Number(existingAttendo?.base_salary) || 15000);
    setEditStaffSalaryType(existingAttendo?.salary_type || 'fixed');
    setEditStaffError('');
    setEditStaffModalOpen(true);
  };

  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !editStaffTarget) return;
    setEditStaffLoading(true);
    setEditStaffError('');

    if (!editStaffName.trim()) {
      setEditStaffError('Staff Full Name is required.');
      setEditStaffLoading(false);
      return;
    }

    try {
      await db.updateStaffProfile(restaurant.id, editStaffTarget.id, {
        fullName: editStaffName.trim(),
        phone: editStaffPhone.trim(),
        role: editStaffRole,
        department: resolveStaffDept(editStaffRole, editStaffDepartment)
      });

      await saveStaffProfile({
        id: editStaffTarget.id,
        profile_id: editStaffTarget.id,
        restaurant_id: restaurant.id,
        name: editStaffName.trim(),
        role: editStaffRole,
        phone: editStaffPhone.trim(),
        base_salary: Number(editStaffBaseSalary) || 0,
        salary_type: editStaffSalaryType
      });

      await db.createAuditLog(
        restaurant.id,
        profile?.id || null,
        profile?.email || 'Owner',
        'update_staff_profile',
        `Updated staff details for ${editStaffName.trim()} (Role: ${editStaffRole}${editStaffRole === 'supervisor' ? ` - ${editStaffDepartment}` : ''})`
      );

      alert(`Staff details updated successfully for ${editStaffName}!`);
      setEditStaffModalOpen(false);
      setEditStaffTarget(null);
      await loadStaffAndLogs();
    } catch (err: any) {
      setEditStaffError(err?.message || 'Failed to update staff member');
    } finally {
      setEditStaffLoading(false);
    }
  };


  const handleOpenResetModal = (st: Profile) => {
    if (st.role === 'owner' || (profile?.role === 'owner' && st.id === profile.id)) {
      alert('Forbidden: The restaurant owner password cannot be reset from staff management.');
      return;
    }
    setResetPassTarget({ id: st.id, name: st.full_name, email: st.email });
    setNewPassVal('');
    setConfirmPassVal('');
    setShowPassToggle(false);
  };

  const handleConfirmResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassTarget) return;

    if (!newPassVal || newPassVal.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (newPassVal !== confirmPassVal) {
      alert('New password and confirmation do not match.');
      return;
    }

    if (!restaurant) return;
    try {
      setResetPassSubmitting(true);
      await db.updateStaffPassword(resetPassTarget.id, newPassVal);
      await db.createAuditLog(
        restaurant.id,
        profile?.id || null,
        profile?.email || 'Owner',
        'reset_staff_password',
        `Reset access password for staff member ${resetPassTarget.name} (${resetPassTarget.email})`
      );
      await loadStaffAndLogs();
      alert(`Password updated successfully for ${resetPassTarget.name}!`);
      setResetPassTarget(null);
      setNewPassVal('');
      setConfirmPassVal('');
    } catch (err: any) {
      alert(`Failed to update password: ${err.message}`);
    } finally {
      setResetPassSubmitting(false);
    }
  };

  const handleChangeOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerCurrPass) {
      alert('Please enter your current password.');
      return;
    }
    if (!ownerNewPass || ownerNewPass.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }
    if (ownerNewPass !== ownerConfirmPass) {
      alert('New password and confirmation do not match.');
      return;
    }

    try {
      setOwnerPassSubmitting(true);
      await db.changeOwnerPassword(ownerCurrPass, ownerNewPass);
      alert('Your password has been changed successfully!');
      setOwnerCurrPass('');
      setOwnerNewPass('');
      setOwnerConfirmPass('');
    } catch (err: any) {
      alert(`Failed to change password: ${err.message}`);
    } finally {
      setOwnerPassSubmitting(false);
    }
  };

  const handleExportMenu = async () => {
    if (!restaurant || !profile) return;
    try {
      const categories = await db.getCategories(restaurant.id);
      const menuItems = await db.getMenuItems(restaurant.id);
      
      const exportData = {
        categories,
        menuItems
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${restaurant.slug}-menu-backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'export_menu',
        'Exported menu categories and items backup file'
      );
    } catch (err: any) {
      alert('Failed to export menu: ' + err.message);
    }
  };

  const handleImportMenu = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant || !profile) return;

    if (!confirm('Importing menu template will append categories and items. Do you wish to continue?')) {
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.categories || !data.menuItems) {
          throw new Error('Invalid JSON schema. Missing categories or menuItems.');
        }

        // Sequential imports
        for (const cat of data.categories) {
          const newCat = await db.createCategory(restaurant.id, cat.name);
          const itemsForCat = data.menuItems.filter((i: any) => i.category_id === cat.id);
          for (const item of itemsForCat) {
            await db.createMenuItem(restaurant.id, {
              category_id: newCat.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              image_url: item.image_url || '',
              is_available: item.is_available ?? true,
              is_veg: item.is_veg ?? true
            });
          }
        }

        await db.createAuditLog(
          restaurant.id,
          profile.id,
          profile.email,
          'import_menu',
          `Imported menu dataset: ${data.categories.length} categories and ${data.menuItems.length} menu items`
        );

        alert('Menu template imported successfully!');
        window.location.reload();
      } catch (err: any) {
        alert('Menu import failed: ' + err.message);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {activeTab === 'hub' ? (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Windows 10 Style Profile Header */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* User Profile Left */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md border-4 border-white dark:border-slate-800">
                  {((profile?.full_name || restaurant?.name || 'CO')[0] || 'O').toUpperCase()}
                </div>
                <span className="absolute bottom-1 right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-xs" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {profile?.full_name || restaurant?.name || 'Restaurant Admin'}
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded-md tracking-wider">
                    {isOwner ? 'Owner' : 'Manager'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {profile?.email || 'admin@cleverops.in'} • {restaurant?.name || 'CleverOps Cloud'}
                </p>
                <Link 
                  href="/dashboard/billing" 
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer pt-0.5"
                >
                  Manage Subscription &amp; SaaS Plans &rarr;
                </Link>
              </div>
            </div>

            {/* Right Side Info Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 max-w-sm w-full">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  {restaurant?.name || 'CleverOps Restaurant'}
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/50 shrink-0">
                  Cloud Sync Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                Configure restaurant hardware, staff roles, menu pricing, and digital QR codes in one place.
              </p>
              <div className="flex items-center gap-2">
                {restaurant?.slug ? (
                  <a
                    href={`/menu/${restaurant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    View Live Menu
                  </a>
                ) : null}
                <span className="text-[11px] text-slate-400 font-medium">Table QR: Active</span>
              </div>
            </div>
          </div>

          {/* Section 2: Center Search Bar (Windows 10 Style "Find a setting") */}
          <div className="max-w-xl mx-auto text-center w-full">
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a setting (e.g. staff, gst, printer, qr)..." 
                className="w-full pl-11 pr-14 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-2">
              Type to search across 10 configuration modules
            </p>
          </div>

          {/* Section 3: Settings Grid Cards (Windows 10 3-Column Hub Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredHubModules.map((mod) => (
              <div
                key={mod.id}
                onClick={() => {
                  if (mod.ownerOnly && !isOwner) {
                    alert('Access Restricted: Activity Audit Logs are strictly reserved for the Restaurant Owner.');
                    return;
                  }
                  setActiveTab(mod.id);
                }}
                className="group bg-white dark:bg-slate-900 px-4 py-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-slate-400 dark:hover:border-slate-600 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${mod.iconBg}`}>
                    <mod.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {mod.title}
                  </h3>
                </div>
                {mod.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>
                )}
              </div>
            ))}

            {filteredHubModules.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No settings found matching "{searchQuery}"</p>
                <p className="text-xs text-slate-400 mt-1">Try searching for 'staff', 'gst', 'qr', 'printer', or 'payments'</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Dedicated Clean Workspace Header */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('hub')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer group"
                title="Return to Settings Hub Grid"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Hub</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'profile' && 'Restaurant Profile'}
                {activeTab === 'qr_design' && 'Tables & QR Design Studio'}
                {activeTab === 'staff' && 'Staff Accounts & Permissions'}
                {activeTab === 'devices' && 'Printers & Hardware Devices'}
                {activeTab === 'charges' && 'Taxes & Extra Charges'}
                {activeTab === 'payments' && 'Payment Gateways & UPI'}
                {activeTab === 'notifications' && 'Sound & Kitchen Notifications'}
                {activeTab === 'backup' && 'Data & Cloud Backup'}
                {activeTab === 'logs' && 'Activity Audit Logs (Owner)'}
                {activeTab === 'offers' && 'Offers & Discounts'}
              </h2>
            </div>
          </div>

          {/* Tab Panels */}
          <div className="space-y-6">
        
        {/* QR DESIGN STUDIO TAB */}
        {activeTab === 'qr_design' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Bulk Export QR Codes</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Download branded table QR cards as a zip bundle or print ready-to-cut A4 sheets.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadAllQRZip}
                  disabled={isBulkDownloading}
                  className="border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  title="Download branded QR cards for all tables in a ZIP"
                >
                  <Archive className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  {isBulkDownloading ? `Zipping (${bulkProgress?.current || 0}/${bulkProgress?.total || 0})...` : 'Download All QR (ZIP)'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintAllQRA4}
                  className="border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  title="Print all table QR cards on A4 sheets"
                >
                  <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  <span>Print All QR (A4)</span>
                </Button>
              </div>
            </div>
            <QRDesignStudio restaurant={restaurant} onSaved={refresh} />
          </div>
        )}

        {/* OFFERS & DISCOUNTS TAB */}
        {activeTab === 'offers' && restaurant && (
          <OffersSettings restaurant={restaurant} />
        )}

        {/* PROFILE BRANDING SETTINGS */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Restaurant Branding Details</h3>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Restaurant Name"
                      value={restName}
                      onChange={(e) => setRestName(e.target.value)}
                      required
                    />
                    <Input
                      label="Contact Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="GST Identification Number (GSTIN)"
                      value={gst}
                      onChange={(e) => setGst(e.target.value)}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Branding Theme Color</label>
                      <select
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                      >
                        <option value="emerald">Emerald Green (Fresh, Organic)</option>
                        <option value="indigo">Indigo Blue (Premium, Modern)</option>
                        <option value="rose">Rose Red (Elegant, Grill)</option>
                        <option value="amber">Amber Gold (Comfort, Bakery)</option>
                        <option value="purple">Royal Purple (Luxury, Lounge)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ImageUpload
                      label="Restaurant Logo"
                      value={logoUrl}
                      onChange={(url) => setLogoUrl(url)}
                      restaurantId={restaurant?.id || ''}
                      pathPrefix="logo"
                    />
                    <ImageUpload
                      label="Cover Hero Image"
                      value={coverUrl}
                      onChange={(url) => setCoverUrl(url)}
                      restaurantId={restaurant?.id || ''}
                      pathPrefix="cover"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" isLoading={loading}>Save Brand Customizations</Button>
              </div>
            </div>

            {/* PREVIEW PANEL */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Live Branding Preview</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mock banner */}
                  <div className="w-full h-24 rounded-xl relative overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5"><Eye className="h-4 w-4" /> Hero Banner</div>
                    )}
                    
                    {/* Floating Logo preview */}
                    <div className="absolute left-4 bottom-2 h-12 w-12 rounded-xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-sm text-slate-400">{restName.charAt(0) || 'R'}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{restName || 'Restaurant Name'}</h4>
                    <p className="text-xs text-slate-400 mt-1">{phone || 'Phone Number'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{address || 'Restaurant Address'}</p>
                    {gst && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-2">GSTIN: {gst}</p>}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Theme Color:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-4.5 w-4.5 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm ${
                        themeColor === 'indigo' ? 'bg-indigo-600' :
                        themeColor === 'rose' ? 'bg-rose-600' :
                        themeColor === 'amber' ? 'bg-amber-500' :
                        themeColor === 'purple' ? 'bg-purple-600' : 'bg-emerald-600'
                      }`} />
                      <span className="text-xs capitalize font-semibold text-slate-600 dark:text-slate-400">{themeColor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        )}

        {/* TAXES & CHARGES SETTINGS */}
        {activeTab === 'charges' && (
          <form onSubmit={handleSaveCharges} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* GST (Goods & Services Tax) */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Goods & Services Tax (GST)</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable GST Charges</p>
                      <p className="text-xs text-slate-400">Add government GST to every order invoice.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={gstEnabled} 
                        onChange={(e) => setGstEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  {gstEnabled && (
                    <div className="pt-2 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tax Mode Configuration</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setTaxMode('cgst_sgst')}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              taxMode === 'cgst_sgst'
                                ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-200'
                                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-extrabold text-xs block">CGST + SGST</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Intrastate tax split equally (e.g. 2.5% + 2.5%)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTaxMode('igst')}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              taxMode === 'igst'
                                ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-200'
                                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-extrabold text-xs block">IGST</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Integrated single tax rate (e.g. 5.0%)</span>
                          </button>
                        </div>
                      </div>

                      {taxMode === 'cgst_sgst' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <Input
                            label="CGST Rate (%)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={cgstPercentage}
                            onChange={(e) => setCgstPercentage(Number(e.target.value))}
                            required
                          />
                          <Input
                            label="SGST Rate (%)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={sgstPercentage}
                            onChange={(e) => setSgstPercentage(Number(e.target.value))}
                            required
                          />
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium col-span-full">
                            Active GST Rate: CGST ({cgstPercentage}%) + SGST ({sgstPercentage}%) = Total {(Number(cgstPercentage) + Number(sgstPercentage)).toFixed(2)}%
                          </p>
                        </div>
                      ) : (
                        <div className="pt-1 space-y-2">
                          <Input
                            label="IGST Rate (%)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={igstPercentage}
                            onChange={(e) => setIgstPercentage(Number(e.target.value))}
                            required
                          />
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                            Active GST Rate: Integrated IGST ({igstPercentage}%)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Charge */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Service Charge</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable Service Charge</p>
                      <p className="text-xs text-slate-400">Apply a dining service charge to final bills.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={serviceChargeEnabled} 
                        onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  {serviceChargeEnabled && (
                    <div className="pt-2">
                      <Input
                        label="Service Charge Rate (Percentage)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceChargePercentage}
                        onChange={(e) => setServiceChargePercentage(Number(e.target.value))}
                        required
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Charges & Fees */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Custom Charges & Fees</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Add New Custom Charge</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <Input
                        label="Charge Name"
                        placeholder="e.g. Packaging Fee"
                        value={newChargeName}
                        onChange={(e) => setNewChargeName(e.target.value)}
                      />
                      <div>
                        <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">Charge Type</label>
                        <select
                          value={newChargeType}
                          onChange={(e) => setNewChargeType(e.target.value as any)}
                          className="block w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                        >
                          <option value="fixed">Fixed Amount (Flat Fee)</option>
                          <option value="percentage">Percentage (Percent of Subtotal)</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            label="Value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newChargeValue === 0 ? '' : newChargeValue}
                            onChange={(e) => setNewChargeValue(Number(e.target.value))}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="primary" 
                          onClick={handleAddCustomCharge}
                          className="shrink-0 mb-0.5"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Charges List</span>
                    {customCharges.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No custom charges added yet. Click above to add packaging fees, delivery fees, dynamic tips, etc.</p>
                    ) : (
                      <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {customCharges.map(charge => (
                          <div key={charge.id} className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                            <div>
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-250">{charge.name}</p>
                              <p className="text-xs text-slate-400 capitalize">
                                {charge.type === 'percentage' ? `${charge.value}% of Subtotal` : `${formatPrice(charge.value, restaurant?.settings?.currency || 'INR')} Flat Fee`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={charge.enabled} 
                                  onChange={() => handleToggleCustomCharge(charge.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-600"></div>
                              </label>
                              <button 
                                type="button"
                                onClick={() => handleRemoveCustomCharge(charge.id)}
                                className="text-rose-500 hover:text-rose-600 dark:text-rose-400 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Receipt & Bill Customer Details Toggle */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Bill & Receipt Preferences</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Show Customer Name & Mobile on Bills</span>
                      <span className="text-xs text-slate-400 mt-0.5 block">When enabled, customer name and phone number fields will be included on printed thermal bills and PDF downloads. Both fields remain optional so bills can still be printed instantly.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input 
                        type="checkbox" 
                        checked={showCustomerDetailsOnBill} 
                        onChange={(e) => setShowCustomerDetailsOnBill(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" isLoading={loading}>Save Taxes & Charges</Button>
              </div>

            </div>
            
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Billing Calculation Mock</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-450 uppercase">Subtotal Mock: {formatPrice(100, restaurant?.settings?.currency || 'INR')}</p>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    {gstEnabled && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>GST ({gstPercentage}%)</span>
                        <span>{formatPrice(100 * (gstPercentage / 100), restaurant?.settings?.currency || 'INR')}</span>
                      </div>
                    )}
                    {serviceChargeEnabled && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Service Charge ({serviceChargePercentage}%)</span>
                        <span>{formatPrice(100 * (serviceChargePercentage / 100), restaurant?.settings?.currency || 'INR')}</span>
                      </div>
                    )}
                    {customCharges.filter(c => c.enabled).map(charge => (
                      <div key={charge.id} className="flex justify-between text-xs text-slate-500">
                        <span>{charge.name}</span>
                        <span>{formatPrice(charge.type === 'percentage' ? 100 * (charge.value / 100) : charge.value, restaurant?.settings?.currency || 'INR')}</span>
                      </div>
                    ))}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    <div className="flex justify-between text-slate-800 dark:text-white font-extrabold text-sm">
                      <span>Total Mock</span>
                      <span>
                        {formatPrice(
                          100 + 
                          (gstEnabled ? 100 * (gstPercentage / 100) : 0) + 
                          (serviceChargeEnabled ? 100 * (serviceChargePercentage / 100) : 0) + 
                          customCharges.filter(c => c.enabled).reduce((sum, c) => sum + (c.type === 'percentage' ? 100 * (c.value / 100) : c.value), 0),
                          restaurant?.settings?.currency || 'INR'
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        )}

        {/* STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="max-w-md">
              {(() => {
                const planStr = (restaurant?.subscription_plan || '') as string;
                const isPlanUnlimited = 
                  planStr === 'premium' || 
                  planStr === 'custom' || 
                  planStr === 'unlimited' ||
                  planSpec?.limits?.staff_accounts === null;
                const staffLimit = isPlanUnlimited ? null : (planSpec?.limits?.staff_accounts ?? (restaurant?.subscription_plan === 'pro' ? 10 : 5));

                return (
                  <ResourceUsageCard
                    title="Staff Logins & Accounts"
                    used={staffList.filter(s => s.role !== 'owner').length}
                    limit={staffLimit}
                    unitLabel="used"
                  />
                );
              })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Staff */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Register Staff Login</h3>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    {staffError && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold">
                        {staffError}
                      </div>
                    )}

                    <Input
                      label="Staff Full Name"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                    />

                    <Input
                      label="Email address"
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="rahul@restaurant.com"
                      required
                    />

                    <Input
                      label="Mobile Number"
                      type="tel"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />

                    <Input
                      label="Access Password"
                      type="password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                    />

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Staff Role Permissions</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as any)}
                        className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                      >
                        <optgroup label="Management">
                          <option value="manager">Manager (Full Ops)</option>
                          <option value="supervisor">Supervisor (Kitchen & Floor Oversight)</option>
                        </optgroup>
                        <optgroup label="Kitchen Wing (KDS & Food Prep)">
                          <option value="head_chef">Head Chef (KDS, Recipes, Menu)</option>
                          <option value="chef">Chef / Cook (KDS & Kitchen Ops)</option>
                          <option value="kitchen_helper">Kitchen Helper (Prep & Assist)</option>
                          <option value="kitchen">Kitchen Staff</option>
                        </optgroup>
                        <optgroup label="Service & Floor Wing">
                          <option value="captain">Captain (Tables, Floor, Orders)</option>
                          <option value="waiter">Waiter (Tables, Orders, Service)</option>
                          <option value="cleaner">Cleaner (Table Busser & Cleanliness)</option>
                          <option value="helper">Floor Helper</option>
                        </optgroup>
                        <optgroup label="Billing & Cashier">
                          <option value="cashier">Cashier (Billing & Checkout)</option>
                        </optgroup>
                      </select>
                    </div>

                    {staffRole === 'supervisor' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Supervisor Department Scope</label>
                        <select
                          value={staffDepartment}
                          onChange={(e) => setStaffDepartment(e.target.value as any)}
                          className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                        >
                          <option value="waiter">Waiter / Service Department</option>
                          <option value="kitchen">Kitchen / KDS Department</option>
                          <option value="cashier">Cashier / Billing Department</option>
                          <option value="general">General Operations</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Monthly Base Salary (₹)</label>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={staffBaseSalary}
                          onChange={(e) => setStaffBaseSalary(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="e.g. 15000"
                          className="w-full text-sm font-bold bg-transparent text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Synchronized with Attendance &amp; Payroll calculation.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Salary Calculation Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStaffSalaryType('fixed')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center border cursor-pointer transition ${
                            staffSalaryType === 'fixed'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Fixed Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffSalaryType('per_day')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center border cursor-pointer transition ${
                            staffSalaryType === 'per_day'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Per-Day
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full mt-2" isLoading={staffLoading} disabled={staffLoading}>
                      <Plus className="h-4 w-4 mr-1" /> Create Staff Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Staff list */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Registered Staff Profiles</h3>
                </CardHeader>
                <CardContent className="p-0">
                  {staffList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No staff accounts created yet. Use the registration panel to create waiter and kitchen logins.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th scope="col" className="px-5 py-3 text-left">Staff Name</th>
                            <th scope="col" className="px-5 py-3 text-left">Contact & Login</th>
                            <th scope="col" className="px-5 py-3 text-left">Role / Dept</th>
                            <th scope="col" className="px-5 py-3 text-center">Status</th>
                            <th scope="col" className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40">
                          {staffList.map((st) => {
                            const isOwner = st.role === 'owner';
                            return (
                            <tr key={st.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{st.full_name}</span>
                                  {isOwner && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                {st.phone && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{st.phone}</div>}
                                {!isOwner && (
                                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                    ₹{(attendoStaffMap[st.id]?.base_salary || 15000).toLocaleString('en-IN')}/mo • {attendoStaffMap[st.id]?.salary_type === 'per_day' ? 'Per-Day' : 'Fixed'}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3 font-mono text-xs">
                                <div>{st.email}</div>
                                {st.plain_password && !isOwner ? (
                                  <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded select-all font-mono">{st.plain_password}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => navigator.clipboard.writeText(st.plain_password || '')} 
                                      className="text-slate-400 hover:text-emerald-500 transition-colors"
                                      title="Copy Password"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-1">
                                  <Badge variant={
                                    st.role === 'owner' ? 'success' :
                                    st.role === 'manager' ? 'info' :
                                    st.role === 'supervisor' ? 'success' :
                                    st.role === 'kitchen' ? 'warning' :
                                    st.role === 'waiter' ? 'purple' : 'neutral'
                                  }>
                                    {st.role}
                                  </Badge>
                                  {st.department && !isOwner && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                      Dept: {st.department}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {isOwner ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Protected
                                  </span>
                                ) : st.is_verified === false || st.verification_status === 'pending_verification' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                                      Pending Verification
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenStaffVerifyModal(st)}
                                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800"
                                      >
                                        Verify OTP →
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResendWebStaffInvite(st)}
                                        className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800"
                                      >
                                        Resend Invite
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStaffActive(st)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                      st.is_active !== false
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    }`}
                                  >
                                    {st.is_active !== false ? 'Active' : 'Inactive'}
                                  </button>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                {isOwner ? (
                                  <span className="text-[11px] font-semibold text-slate-400 italic">Owner Account</span>
                                ) : (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(st)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors cursor-pointer"
                                      title="Edit Staff Details"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    {(st.role === 'waiter' || (st.role === 'supervisor' && st.department === 'waiter')) && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAssignModal(st)}
                                        className="px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                        title="Assign Tables"
                                      >
                                        Tables
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenResetModal(st)}
                                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
                                      title="Reset Password"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStaff(st)}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Staff"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

        {/* ACTIVE DEVICES & SECURITY (PART G) */}
        {activeTab === 'devices' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Active Devices & Security Sessions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage logged in devices, revoke trusted access, or sign out active sessions across Android and Desktop browsers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDevices}
                  isLoading={devicesLoading}
                  className="text-xs font-bold"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogoutAllDevices}
                  className="text-xs font-bold"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Logout All Devices
                </Button>
              </div>
            </div>

            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="p-0">
                {devicesList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Loading registered devices...
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {devicesList.map((dev, idx) => {
                      const isMobile = dev.platform === 'Android' || dev.platform === 'iOS';
                      return (
                        <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-lg ${
                              dev.is_current 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {isMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {dev.device_name}
                                </span>
                                {dev.is_current && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    THIS DEVICE (CURRENT)
                                  </span>
                                )}
                                {dev.is_trusted && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3" /> Trusted Device
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                Platform: {dev.platform} • Session: {dev.device_session_id?.slice(0, 16)}...
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Last Active: {dev.last_active_at ? new Date(dev.last_active_at).toLocaleString() : 'Just now'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {dev.is_trusted && !dev.is_current && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveTrustedDevice(dev.device_session_id)}
                                className="text-xs text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900/60 font-semibold"
                              >
                                Remove Trust
                              </Button>
                            )}
                            {dev.is_current ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await supabase.auth.signOut();
                                  window.location.href = '/login';
                                }}
                                className="text-xs font-semibold"
                              >
                                <LogOut className="h-3 w-3 mr-1" /> Logout Current Device
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* BACKUP & RESTORE */}
        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Export */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Export Menu Template</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Download your entire menu architecture, including all food categories, pricing rules, descriptions, tags, and images as a structured JSON file.
                  </p>
                </div>
                <div className="pt-2">
                  <Button variant="outline" onClick={handleExportMenu} className="w-full justify-center">
                    Download Menu JSON File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Import Menu Template</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Upload a previously exported JSON backup file to load categories and dishes instantly. This will append new items to your menu layout.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  <label className="w-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-4 rounded-xl cursor-pointer text-xs font-semibold text-slate-500 transition-colors">
                    <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> {importing ? 'Importing Menu...' : 'Select Menu JSON File'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportMenu}
                      className="hidden"
                      disabled={importing}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PAYMENTS CONFIGURATION PANEL */}
        {activeTab === 'payments' && (
          <form onSubmit={handleSavePaymentSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Lightweight UPI Payments Settings</h3>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Enable Online Payment</span>
                    <span className="text-xs text-slate-400 mt-1 block">Toggle this switch to allow customers to initiate one-click UPI payments upon served orders.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={paymentEnabled} 
                      onChange={() => setPaymentEnabled(!paymentEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Enable Takeaway Ordering</span>
                    <span className="text-xs text-slate-400 mt-1 block">Toggle this switch to generate a dedicated Takeaway QR and allow prepaid customer orders.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={takeawayEnabled} 
                      onChange={() => setTakeawayEnabled(!takeawayEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {paymentEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Restaurant UPI ID (pa)"
                        placeholder="e.g. a2zitems@paytm, businessname@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        required
                      />
                      <Input
                        label="UPI Name (pn)"
                        placeholder="e.g. A2Z Items Restaurant"
                        value={upiName}
                        onChange={(e) => setUpiName(e.target.value)}
                        required
                      />
                    </div>
                    <ImageUpload
                      label="Payment QR Image"
                      value={paymentQr}
                      onChange={(url) => setPaymentQr(url)}
                      restaurantId={restaurant?.id || ''}
                      pathPrefix="upi_qr"
                    />
                    <div className="p-3 bg-amber-50/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 text-xs rounded-xl flex items-start gap-2.5 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Payments are processed via UPI deep links directly on the customer's phone using a standard UPI app. No commissions or gateway fees are applied. Staff must manually verify collections inside the Live Orders portal.
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* NOTIFICATION SOUNDS PANEL */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSaveNotificationSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Kitchen & Waiter Bell Settings</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Background Notifications */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Background Push Notifications</span>
                    <span className="text-xs text-slate-400 mt-1 block">Receive browser notifications when the app is minimized or hidden.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={localStorage.getItem('smartdine_push_enabled') === 'true'}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        localStorage.setItem('smartdine_push_enabled', enabled ? 'true' : 'false');
                        if (enabled && 'Notification' in window) {
                          Notification.requestPermission();
                        }
                        // trigger a re-render by updating an arbitrary state or just let the dom handle checkbox
                        setUploadingKitchen(prev => !prev);
                        setTimeout(() => setUploadingKitchen(prev => !prev), 10);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Owner Bell Notification Toggle */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ownerBellEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'}`}>
                      {ownerBellEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Owner Bell Alerts (Sound & Push)</span>
                      <span className="text-xs text-slate-400 mt-1 block">Toggle on/off live audio chimes and mobile push rings for owner login.</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={ownerBellEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOwnerBellEnabled(checked);
                        setGlobalMute(!checked);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('cleverops_bell_muted', checked ? 'false' : 'true');
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Default Bell Status */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Volume2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100 block">Smart Anti-Fatigue Chime Active</span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 block">Rings a crisp 5-second chime with an automatic 15-second queue cooldown to prevent continuous ringing when multiple orders arrive in rapid succession.</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-bold cursor-pointer text-xs"
                    onClick={() => {
                      playLoudBell('kitchen', { force: true });
                    }}
                  >
                    <Volume2 className="h-4 w-4" /> Test Chime (5s)
                  </Button>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={loading || uploadingKitchen || uploadingWaiter}>
                    {loading ? 'Saving...' : 'Save Notification Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* AUDIT LOGS */}
        {activeTab === 'logs' && isOwner && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Restaurant Activity Audit Trail</h3>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No activity logged yet. Modifications to menus, tables, and settings will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left">Staff User</th>
                        <th scope="col" className="px-6 py-3 text-left">Action Triggered</th>
                        <th scope="col" className="px-6 py-3 text-left">Details</th>
                        <th scope="col" className="px-6 py-3 text-left">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-3 font-extrabold text-slate-900 dark:text-white">
                            {log.user_email}
                          </td>
                          <td className="px-6 py-3 uppercase">
                            <Badge variant={
                              log.action.includes('delete') ? 'error' :
                              log.action.includes('create') ? 'success' : 'neutral'
                            }>
                              {log.action.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">{log.details}</td>
                          <td className="px-6 py-3 text-slate-400 text-xs font-semibold">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* OWNER SECURITY & SELF PASSWORD CHANGE */}
        {activeTab === 'profile' && (
          <Card className="mt-8">
            <CardHeader>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Security & Owner Password</h3>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleChangeOwnerPassword} className="max-w-md space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                  <input
                    type={ownerShowPassToggle ? 'text' : 'password'}
                    value={ownerCurrPass}
                    onChange={(e) => setOwnerCurrPass(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password (min 6 chars)</label>
                  <input
                    type={ownerShowPassToggle ? 'text' : 'password'}
                    value={ownerNewPass}
                    onChange={(e) => setOwnerNewPass(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type={ownerShowPassToggle ? 'text' : 'password'}
                    value={ownerConfirmPass}
                    onChange={(e) => setOwnerConfirmPass(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ownerShowPassToggle}
                      onChange={(e) => setOwnerShowPassToggle(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Show Passwords
                  </label>

                  <button
                    type="submit"
                    disabled={ownerPassSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    {ownerPassSubmitting ? 'Updating...' : 'Update My Password'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* EDIT STAFF MODAL */}
        <Dialog
          isOpen={editStaffModalOpen}
          onClose={() => { setEditStaffModalOpen(false); setEditStaffTarget(null); }}
          title={`Edit Staff: ${editStaffTarget?.full_name || editStaffTarget?.email || ''}`}
        >
          <form onSubmit={handleSaveStaffEdit} className="space-y-4 pt-2">
            {editStaffError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold">
                {editStaffError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Full Name</label>
              <input
                type="text"
                value={editStaffName}
                onChange={(e) => setEditStaffName(e.target.value)}
                required
                placeholder="Full name"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={editStaffPhone}
                onChange={(e) => setEditStaffPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Role Permissions</label>
              <select
                value={editStaffRole}
                onChange={(e) => setEditStaffRole(e.target.value as any)}
                className="block w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
              >
                <optgroup label="Management">
                  <option value="manager">Manager (Full Ops)</option>
                  <option value="supervisor">Supervisor (Kitchen & Floor Oversight)</option>
                </optgroup>
                <optgroup label="Kitchen Wing (KDS & Food Prep)">
                  <option value="head_chef">Head Chef (KDS, Recipes, Menu)</option>
                  <option value="chef">Chef / Cook (KDS & Kitchen Ops)</option>
                  <option value="kitchen_helper">Kitchen Helper (Prep & Assist)</option>
                  <option value="kitchen">Kitchen Staff</option>
                </optgroup>
                <optgroup label="Service & Floor Wing">
                  <option value="captain">Captain (Tables, Floor, Orders)</option>
                  <option value="waiter">Waiter (Tables, Orders, Service)</option>
                  <option value="cleaner">Cleaner (Table Busser & Cleanliness)</option>
                  <option value="helper">Floor Helper</option>
                </optgroup>
                <optgroup label="Billing & Cashier">
                  <option value="cashier">Cashier (Billing & Checkout)</option>
                </optgroup>
              </select>
            </div>

            {editStaffRole === 'supervisor' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Supervisor Department Scope</label>
                <select
                  value={editStaffDepartment}
                  onChange={(e) => setEditStaffDepartment(e.target.value as any)}
                  className="block w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                >
                  <option value="waiter">Waiter / Service Department</option>
                  <option value="kitchen">Kitchen / KDS Department</option>
                  <option value="cashier">Cashier / Billing Department</option>
                  <option value="general">General Operations</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Base Salary (₹)</label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={editStaffBaseSalary}
                  onChange={(e) => setEditStaffBaseSalary(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 15000"
                  className="w-full text-sm font-bold bg-transparent text-slate-900 dark:text-white outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Updates base salary used for payroll calculations and salary slips.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Salary Calculation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditStaffSalaryType('fixed')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center border cursor-pointer transition ${
                    editStaffSalaryType === 'fixed'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Fixed Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setEditStaffSalaryType('per_day')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center border cursor-pointer transition ${
                    editStaffSalaryType === 'per_day'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Per-Day
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setEditStaffModalOpen(false); setEditStaffTarget(null); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editStaffLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                {editStaffLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog>

        {/* STAFF PASSWORD RESET MODAL */}
        <Dialog isOpen={Boolean(resetPassTarget)} onClose={() => setResetPassTarget(null)} title={`Reset Password: ${resetPassTarget?.name || ''}`}>
          <form onSubmit={handleConfirmResetStaffPassword} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Set a new password for staff member <strong>{resetPassTarget?.email}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password (min 6 chars)</label>
              <input
                type={showPassToggle ? 'text' : 'password'}
                value={newPassVal}
                onChange={(e) => setNewPassVal(e.target.value)}
                required
                minLength={6}
                placeholder="Enter new staff password"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
              <input
                type={showPassToggle ? 'text' : 'password'}
                value={confirmPassVal}
                onChange={(e) => setConfirmPassVal(e.target.value)}
                required
                minLength={6}
                placeholder="Confirm new staff password"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="showPassStaff"
                checked={showPassToggle}
                onChange={(e) => setShowPassToggle(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="showPassStaff" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                Show Password
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResetPassTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetPassSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md transition-all"
              >
                {resetPassSubmitting ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </form>
        </Dialog>

        {/* TABLE ASSIGNMENT MODAL */}
        <Dialog isOpen={Boolean(tableAssignTarget)} onClose={() => setTableAssignTarget(null)} title={`Assign Tables to ${tableAssignTarget?.full_name || 'Waiter'}`}>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Select which tables this staff member is responsible for. Orders & notifications for these tables will be scoped directly to them.
            </p>

            {allRestaurantTables.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No dining tables found. Create tables in the Tables section first.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                {allRestaurantTables.map(tbl => {
                  const isChecked = assignedTableIdsForTarget.includes(tbl.id);
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        setAssignedTableIdsForTarget(prev => 
                          prev.includes(tbl.id) ? prev.filter(id => id !== tbl.id) : [...prev, tbl.id]
                        );
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-gray-100 border-gray-950 text-gray-950 dark:bg-gray-800 dark:border-white dark:text-white shadow-sm'
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <span className="font-bold text-xs">{tbl.name}</span>
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isChecked ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'border border-gray-300 dark:border-gray-600'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                {assignedTableIdsForTarget.length} table(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTableAssignTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTableAssignments}
                  disabled={assignSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  {assignSubmitting ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* STAFF EMAIL OTP VERIFICATION MODAL */}
        <Dialog
          isOpen={verifyStaffModalOpen}
          onClose={() => setVerifyStaffModalOpen(false)}
          title={`Verify Staff Account: ${verifyingStaff?.full_name || 'Staff'}`}
        >
          <form onSubmit={handleVerifyStaffOtp} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter the 8-digit OTP sent to <strong>{verifyingStaff?.email}</strong> to verify and activate this staff member's login account.
            </p>

            {staffOtpDevHint && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 font-mono">
                Dev OTP Code: <strong className="bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">{staffOtpDevHint}</strong>
              </div>
            )}

            {staffOtpError && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold">
                {staffOtpError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Enter 8-digit OTP
              </label>
              <input
                type="text"
                maxLength={8}
                required
                value={staffOtpInput}
                onChange={(e) => setStaffOtpInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="8-digit OTP"
                className="block w-full px-3.5 py-2.5 text-center tracking-widest text-lg font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVerifyStaffModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={staffOtpLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer"
              >
                Verify & Activate Account
              </Button>
            </div>
          </form>
        </Dialog>

      </div>
    </div>
      )}
    </div>
  );
}