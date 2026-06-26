'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import { db, Profile, AuditLog } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Settings, Users, History, Download, Upload, 
  Sparkles, Check, AlertCircle, Plus, Trash2, Eye
} from 'lucide-react';

export default function SettingsPage() {
  const { restaurant, profile, refresh } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'profile' | 'staff' | 'backup' | 'logs'>('profile');
  const [loading, setLoading] = useState(false);

  // Profile Settings Form
  const [restName, setRestName] = useState(restaurant?.name || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [gst, setGst] = useState(restaurant?.gst_number || '');
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(restaurant?.cover_image_url || '');
  const [themeColor, setThemeColor] = useState(restaurant?.settings?.theme_color || 'emerald');

  // Staff Management State
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'manager' | 'waiter' | 'kitchen' | 'cashier'>('waiter');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

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
      loadStaffAndLogs();
    }
  }, [restaurant]);

  const loadStaffAndLogs = async () => {
    if (!restaurant) return;
    const staff = await db.getStaffProfiles(restaurant.id);
    setStaffList(staff);
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
    if (!['manager', 'waiter', 'kitchen', 'cashier'].includes(staffRole)) {
      setStaffError('Please select a valid staff role.');
      setStaffLoading(false);
      return;
    }

    try {
      await db.createStaffProfile(
        staffEmail,
        staffPassword,
        staffName,
        staffRole,
        restaurant.id
      );

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'create_staff',
        `Created staff account for ${staffName} (${staffRole})`
      );

      setStaffEmail('');
      setStaffPassword('');
      setStaffName('');
      alert('Staff member registered successfully!');
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
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Settings className="h-4 w-4" /> Restaurant Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'staff'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Staff Accounts</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Download className="h-4 w-4" /> Backup & Restore</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><History className="h-4 w-4" /> Audit History Logs</span>
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
                    <Input
                      label="Restaurant Logo URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or similar"
                    />
                    <Input
                      label="Cover Hero Image URL"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or similar"
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

        {/* STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
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
                        <option value="waiter">Waiter (Tables, Orders, Calls, requests)</option>
                        <option value="kitchen">Kitchen Staff (KDS, Kitchen settings)</option>
                        <option value="cashier">Cashier (Orders check, Table checkout)</option>
                      </select>
                    </div>

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
                            <th scope="col" className="px-6 py-3 text-left">Staff Name</th>
                            <th scope="col" className="px-6 py-3 text-left">Email Address</th>
                            <th scope="col" className="px-6 py-3 text-left">Assigned Role</th>
                            <th scope="col" className="px-6 py-3 text-left">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40">
                          {staffList.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-55/50 transition-colors">
                              <td className="px-6 py-3 font-extrabold text-slate-900 dark:text-white">{st.full_name}</td>
                              <td className="px-6 py-3 font-mono text-xs">{st.email}</td>
                              <td className="px-6 py-3">
                                <Badge variant={
                                  st.role === 'manager' ? 'info' :
                                  st.role === 'kitchen' ? 'warning' :
                                  st.role === 'waiter' ? 'purple' : 'neutral'
                                }>
                                  {st.role}
                                </Badge>
                              </td>
                              <td className="px-6 py-3 text-slate-400 text-xs">Recently</td>
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
                        <tr key={log.id} className="hover:bg-slate-55/50 transition-colors">
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

      </div>
    </div>
  );
}
