'use client';

import { useState, useEffect } from 'react';
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
  Smartphone, Laptop, ShieldCheck, LogOut, CheckCircle2, XCircle, KeyRound, Monitor
} from 'lucide-react';

import ResourceUsageCard from '@/components/shared/ResourceUsageCard';
import { getActiveDevices, removeTrustedDevice, logoutAllDevices } from '@/lib/sessionManager';

export default function SettingsPage() {
  const { restaurant, profile, planSpec, refresh } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'profile' | 'staff' | 'devices' | 'backup' | 'logs' | 'charges' | 'payments' | 'notifications'>('profile');
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
  
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeType, setNewChargeType] = useState<'fixed' | 'percentage'>('fixed');
  const [newChargeValue, setNewChargeValue] = useState(0);

  // Staff Management State
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<'manager' | 'supervisor' | 'waiter' | 'kitchen' | 'cashier'>('waiter');
  const [staffDepartment, setStaffDepartment] = useState<'waiter' | 'kitchen' | 'cashier' | 'service' | 'general'>('waiter');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Table Assignment Modal State
  const [tableAssignTarget, setTableAssignTarget] = useState<Profile | null>(null);
  const [allRestaurantTables, setAllRestaurantTables] = useState<any[]>([]);
  const [assignedTableIdsForTarget, setAssignedTableIdsForTarget] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Import State
  const [importing, setImporting] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);

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
      setPaymentEnabled(restaurant.settings?.payment_enabled === true);
      setUpiId(restaurant.settings?.upi_id || '');
      setUpiName(restaurant.settings?.upi_name || '');
      setPaymentQr(restaurant.settings?.payment_qr || '');
      setTakeawayEnabled(restaurant.settings?.takeaway_enabled === true);
      setKitchenBellType(restaurant.settings?.kitchen_bell_type || 'alarm');
      setWaiterBellType(restaurant.settings?.waiter_bell_type || 'alarm');
      setKitchenBellUrl(restaurant.settings?.kitchen_bell_url || '');
      setWaiterBellUrl(restaurant.settings?.waiter_bell_url || '');
      loadStaffAndLogs();
    }
  }, [restaurant]);

  const loadStaffAndLogs = async () => {
    if (!restaurant) return;
    const staff = await db.getStaffProfiles(restaurant.id);
    setStaffList(staff);
    const tables = await db.getTables(restaurant.id);
    setAllRestaurantTables(tables);
    const auditLogs = await db.getAuditLogs(restaurant.id);
    setLogs(auditLogs);
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
          custom_charges: customCharges
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
          kitchen_bell_type: kitchenBellType,
          waiter_bell_type: waiterBellType,
          kitchen_bell_url: kitchenBellUrl,
          waiter_bell_url: waiterBellUrl
        }
      });

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
    setStaffLoading(true);
    setStaffError('');

    // Pre-signup validations
    if (!staffName.trim()) {
      setStaffError('Staff Full Name is required.');
      setStaffLoading(false);
      return;
    }
    if (!staffEmail.trim() || !staffEmail.includes('@')) {
      setStaffError('Please enter a valid email address.');
      setStaffLoading(false);
      return;
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
        staffRole === 'supervisor' ? staffDepartment : (staffRole === 'waiter' ? 'waiter' : staffRole === 'kitchen' ? 'kitchen' : 'general'),
        staffPhone
      );

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
    const newStatus = st.is_active === false ? true : false;
    try {
      await db.toggleStaffActiveStatus(restaurant.id, st.id, newStatus);
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

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member? They will lose all access.')) return;
    try {
      setLoading(true);
      await db.deleteStaffProfile(staffId);
      await loadStaffAndLogs();
      alert('Staff account deleted successfully.');
    } catch (err: any) {
      alert(`Failed to delete staff: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenResetModal = (st: Profile) => {
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

    try {
      setResetPassSubmitting(true);
      await db.updateStaffPassword(resetPassTarget.id, newPassVal);
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
      {/* Settings Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings & Brand Control</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure profile settings, register staff, download menu templates, and review logs.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Restaurant Profile
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'staff'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'devices'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Active Devices & Security
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Backup & Restore
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Audit History Logs
        </button>
        <button
          onClick={() => setActiveTab('charges')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'charges'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Taxes & Charges
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Payments Settings
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Notification Sounds
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
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
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold col-span-full">
                            ✓ Active GST Rate: CGST ({cgstPercentage}%) + SGST ({sgstPercentage}%) = Total {(Number(cgstPercentage) + Number(sgstPercentage)).toFixed(2)}%
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
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Active GST Rate: Integrated IGST ({igstPercentage}%)
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
              <ResourceUsageCard
                title="Staff Logins & Accounts"
                used={staffList.length}
                limit={planSpec?.limits?.staff_accounts ?? 5}
                unitLabel="used"
              />
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
                        <option value="manager">Manager (Menu, Tables, KDS, Orders)</option>
                        <option value="supervisor">Supervisor (Department-Scoped)</option>
                        <option value="waiter">Waiter (Tables, Orders, Calls, requests)</option>
                        <option value="kitchen">Kitchen Staff (KDS, Kitchen settings)</option>
                        <option value="cashier">Cashier (Orders check, Table checkout)</option>
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

                    <Button type="submit" className="w-full mt-2" isLoading={staffLoading}>
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
                          {staffList.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-extrabold text-slate-900 dark:text-white">{st.full_name}</div>
                                {st.phone && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{st.phone}</div>}
                              </td>
                              <td className="px-5 py-3 font-mono text-xs">
                                <div>{st.email}</div>
                                {st.plain_password ? (
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
                                    st.role === 'manager' ? 'info' :
                                    st.role === 'supervisor' ? 'success' :
                                    st.role === 'kitchen' ? 'warning' :
                                    st.role === 'waiter' ? 'purple' : 'neutral'
                                  }>
                                    {st.role}
                                  </Badge>
                                  {st.department && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                      Dept: {st.department}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {st.is_verified === false || st.verification_status === 'pending_verification' ? (
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
                                <div className="flex justify-end gap-1.5">
                                  {(st.role === 'waiter' || (st.role === 'supervisor' && st.department === 'waiter')) && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssignModal(st)}
                                      className="px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                                      title="Assign Tables"
                                    >
                                      Tables
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenResetModal(st)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Reset Password"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(st.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    title="Delete Staff"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
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

                {/* Default Bell Status */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Volume2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100 block">Default Loud Bell Active</span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 block">A high-visibility, continuous two-tone alarm is configured for Kitchen and Waiter portals. No further configuration is required.</span>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-emerald-500" />
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
        {activeTab === 'logs' && (
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
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200 shadow-sm'
                          : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-bold text-xs">{tbl.name}</span>
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                      }`}>
                        {isChecked && '✓'}
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
  );
}
