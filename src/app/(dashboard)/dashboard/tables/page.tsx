'use client';

import { useState, useEffect, useRef } from 'react';
import { db, Table } from '@/lib/db';
import { useRestaurant } from '../../layout';
import { getActiveUser, supabase } from '@/lib/supabase';
import { generateQRDataURL } from '@/lib/qr';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { 
  Plus, QrCode, Download, ExternalLink, Trash2, 
  AlertTriangle, Printer, HelpCircle, Calendar, ShoppingBag
} from 'lucide-react';

import ResourceUsageCard from '@/components/shared/ResourceUsageCard';

export default function TablesPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [activePlan, setActivePlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [loading, setLoading] = useState(true);

  // Merged Tables state
  const [activeMergeGroups, setActiveMergeGroups] = useState<any[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeGroupName, setMergeGroupName] = useState('');
  const [mergeErrorMsg, setMergeErrorMsg] = useState('');

  // QR URLs map, keyed by tableId, storing base64 QR code image data
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [takeawayQR, setTakeawayQR] = useState('');
  const [reservationQR, setReservationQR] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [tableName, setTableName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Table Assignments State
  const [tableAssignments, setTableAssignments] = useState<any[]>([]);
  const [tableStats, setTableStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    inactive: 0,
    occupancyRate: 0
  });

  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTablesData = async (restId: string) => {
    try {
      const { tables: liveTbls, stats } = await db.getTablesWithLiveStatus(restId);
      setTables(liveTbls);
      setTableStats(stats);

      const groups = await db.getMergeGroups(restId, 'active');
      setActiveMergeGroups(groups || []);

      const assigns = await db.getTableAssignments(restId);
      setTableAssignments(assigns || []);
    } catch (e) {
      console.error('Error fetching tables data:', e);
    }
  };

  useEffect(() => {
    let channel: any = null;

    const debouncedReload = (restId: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (restId) fetchTablesData(restId);
      }, 200);
    };

    async function loadTables() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;
      setRestaurantId(restId);

      const rest = await db.getRestaurantById(restId);
      if (rest) {
        setRestaurantSlug(rest.slug);
        setActivePlan(rest.subscription_plan);
      }

      await fetchTablesData(restId);
      setLoading(false);

      // Realtime subscription to live orders, table changes and QR state
      channel = supabase
        .channel(`tables_page_${restId}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restId}` },
          () => debouncedReload(restId)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restId}` },
          () => debouncedReload(restId)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'restaurants', filter: `id=eq.${restId}` },
          () => debouncedReload(restId)
        )
        .subscribe();
    }
    loadTables();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Compute and load base64 QR codes whenever tables change
  useEffect(() => {
    async function generateQRs() {
      if (!restaurantSlug) return;
      
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Generate Takeaway QR Code
      const takeawayUrl = `${origin}/menu/${restaurantSlug}/takeaway`;
      const takeDataUrl = await generateQRDataURL(takeawayUrl);
      setTakeawayQR(takeDataUrl);

      // Generate Table Reservation QR Code
      const reservationUrl = `${origin}/menu/${restaurantSlug}/reservation`;
      const resDataUrl = await generateQRDataURL(reservationUrl);
      setReservationQR(resDataUrl);

      if (tables.length === 0) return;
      
      const newQRs: Record<string, string> = {};
      for (const table of tables) {
        // Customer QR link structure: /menu/[slug]/table/[id]
        const targetUrl = `${origin}/menu/${restaurantSlug}/table/${table.id}`;
        const dataUrl = await generateQRDataURL(targetUrl);
        newQRs[table.id] = dataUrl;
      }
      setQrCodes(newQRs);
    }
    generateQRs();
  }, [tables, restaurantSlug]);

  const refreshTables = async () => {
    if (!restaurantId) return;
    const { tables: liveTbls, stats } = await db.getTablesWithLiveStatus(restaurantId);
    setTables(liveTbls);
    setTableStats(stats);
    const groups = await db.getMergeGroups(restaurantId, 'active');
    setActiveMergeGroups(groups || []);
    const assigns = await db.getTableAssignments(restaurantId);
    setTableAssignments(assigns || []);
  };

  const handleToggleQR = async (tableId: string, currentEnabled: boolean) => {
    try {
      await db.toggleTableQR(restaurantId, tableId, !currentEnabled);
      await refreshTables();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle QR status');
    }
  };

  const toggleTableSelection = (tableId: string) => {
    setSelectedTableIds(prev => 
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const handleOpenMergeModal = () => {
    setMergeErrorMsg('');
    if (selectedTableIds.length < 2) {
      alert('Please select at least 2 tables to merge.');
      return;
    }
    const selectedTbls = tables.filter(t => selectedTableIds.includes(t.id));
    const names = selectedTbls.map(t => t.name).join(', ');
    setMergeGroupName(`Group (${names})`);
    setMergeModalOpen(true);
  };

  const handleCreateMergeGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMergeErrorMsg('');

    if (!mergeGroupName.trim()) return;

    try {
      const selectedTbls = tables.filter(t => selectedTableIds.includes(t.id));
      await db.createTableMergeGroup(
        restaurantId,
        mergeGroupName.trim(),
        selectedTbls.map(t => ({ id: t.id, name: t.name }))
      );
      setMergeModalOpen(false);
      setSelectedTableIds([]);
      await refreshTables();
    } catch (err: any) {
      setMergeErrorMsg(err.message || 'Failed to merge tables');
    }
  };

  const handleUnmergeGroup = async (groupId: string, groupName: string) => {
    if (confirm(`Unmerge "${groupName}"?\n\nThis merged group has active unpaid orders. Unmerging will affect future orders only. Existing orders will remain under ${groupName}.`)) {
      try {
        await db.unmergeTableGroup(restaurantId, groupId);
        await refreshTables();
      } catch (err: any) {
        alert(err.message || 'Failed to unmerge group');
      }
    }
  };

  const handleOpenModal = () => {
    setErrorMsg('');
    // Auto-suggest next table name (e.g. "Table 4" if we have 3 tables)
    const count = tables.length;
    setTableName(`Table ${count + 1}`);
    setModalOpen(true);
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tableName.trim()) return;

    try {
      await db.createTable(restaurantId, tableName);
      setModalOpen(false);
      await refreshTables();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create table');
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (confirm('Are you sure you want to delete this table? The QR code will no longer work.')) {
      try {
        await db.deleteTable(id);
        await refreshTables();
      } catch (err: any) {
        alert(err.message || 'Failed to delete table');
      }
    }
  };

  const handleToggleOccupancy = async (tableId: string, currentStatus: string) => {
    try {
      const isOccupied = currentStatus !== 'occupied';
      await db.toggleTableOccupancy(restaurantId, tableId, isOccupied);
      await fetchTablesData(restaurantId);
    } catch (err: any) {
      alert('Failed to update table occupancy: ' + (err.message || err));
    }
  };

  const downloadQR = (table: Table) => {
    const qrData = qrCodes[table.id];
    if (!qrData) return;

    const link = document.createElement('a');
    link.href = qrData;
    link.download = `${tableNameToFilename(table.name)}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableNameToFilename = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  const printTableQR = (table: Table) => {
    const qrData = qrCodes[table.id];
    if (!qrData) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const customerUrl = `${origin}/menu/${restaurantSlug}/table/${table.id}`;

    // Create a printable window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${table.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
            }
            .container {
              border: 4px double #e2e8f0;
              border-radius: 24px;
              padding: 40px;
              max-width: 450px;
              margin: 0 auto;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #059669;
              margin-bottom: 5px;
            }
            .sub {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 30px;
              font-weight: 500;
            }
            .qr-img {
              width: 300px;
              height: 300px;
              margin-bottom: 20px;
            }
            .table-number {
              font-size: 32px;
              font-weight: 900;
              margin: 10px 0;
            }
            .instructions {
              font-size: 16px;
              font-weight: 600;
              color: #059669;
              background-color: #ecfdf5;
              padding: 10px 20px;
              border-radius: 9999px;
              display: inline-block;
              margin-top: 15px;
            }
            .footer-link {
              margin-top: 20px;
              font-size: 10px;
              color: #94a3b8;
            }
            @media print {
              body { padding: 0; }
              .container { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">CleverOps</div>
            <div class="sub">SCAN & ORDER INSTANTLY</div>
            <img class="qr-img" src="${qrData}" alt="QR Code" />
            <div class="table-number">${table.name}</div>
            <div class="instructions">Scan to View Menu & Place Order</div>
            <div class="footer-link">${customerUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printTakeawayQR = () => {
    if (!takeawayQR) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const takeawayUrl = `${origin}/menu/${restaurantSlug}/takeaway`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - Takeaway</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .container { border: 4px double #e2e8f0; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            .logo { font-size: 24px; font-weight: 800; color: #7c3aed; margin-bottom: 5px; }
            .sub { font-size: 14px; color: #64748b; margin-bottom: 30px; font-weight: 500; }
            .qr-img { width: 300px; height: 300px; margin-bottom: 20px; }
            .table-number { font-size: 32px; font-weight: 900; margin: 10px 0; color: #7c3aed; }
            .instructions { font-size: 16px; font-weight: 600; color: #7c3aed; background-color: #f5f3ff; padding: 10px 20px; border-radius: 9999px; display: inline-block; margin-top: 15px; }
            .footer-link { margin-top: 20px; font-size: 10px; color: #94a3b8; }
            @media print { body { padding: 0; } .container { border: none; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">CleverOps</div>
            <div class="sub">SCAN & ORDER TAKEAWAY</div>
            <img class="qr-img" src="${takeawayQR}" alt="Takeaway QR Code" />
            <div class="table-number">TAKEAWAY ORDER</div>
            <div class="instructions">Scan to Order & Pay Instantly</div>
            <div class="footer-link">${takeawayUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printReservationQR = () => {
    if (!reservationQR) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const reservationUrl = `${origin}/menu/${restaurantSlug}/reservation`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - Table Reservation</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .container { border: 4px double #e2e8f0; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            .logo { font-size: 24px; font-weight: 800; color: #4f46e5; margin-bottom: 5px; }
            .sub { font-size: 14px; color: #64748b; margin-bottom: 30px; font-weight: 500; }
            .qr-img { width: 300px; height: 300px; margin-bottom: 20px; }
            .table-number { font-size: 32px; font-weight: 900; margin: 10px 0; color: #4f46e5; }
            .instructions { font-size: 16px; font-weight: 600; color: #4f46e5; background-color: #eef2ff; padding: 10px 20px; border-radius: 9999px; display: inline-block; margin-top: 15px; }
            .footer-link { margin-top: 20px; font-size: 10px; color: #94a3b8; }
            @media print { body { padding: 0; } .container { border: none; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">CleverOps</div>
            <div class="sub">TABLE RESERVATION</div>
            <img class="qr-img" src="${reservationQR}" alt="QR Code" />
            <div class="table-number">BOOK A TABLE</div>
            <div class="instructions">Scan to Reserve Table Online</div>
            <div class="footer-link">${reservationUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-10 w-32 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-72 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { planSpec } = useRestaurant();
  const maxTablesLimit = planSpec.limits.tables;
  const tablesUsed = tables.length;

  return (
    <div className="space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[36px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Table Management</h2>
          <p className="text-slate-500 text-[14px] font-normal mt-1">Generate QR codes for tables, merge dining groups, and monitor order flows by location.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTableIds.length >= 2 && (
            <Button size="sm" variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={handleOpenMergeModal}>
              Merge ({selectedTableIds.length}) Tables
            </Button>
          )}
          <Button size="sm" onClick={handleOpenModal}>
            <Plus className="h-4 w-4 mr-1" /> Add Table
          </Button>
        </div>
      </div>

      {/* Live Occupancy Header Widget */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Tables</p>
          <p className="text-[34px] font-bold font-mono text-slate-900 dark:text-white mt-1 leading-tight">{tableStats.total}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</p>
          <p className="text-[34px] font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">{tableStats.available}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Occupied</p>
          <p className="text-[34px] font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 leading-tight">{tableStats.occupied}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Inactive / QR Off</p>
          <p className="text-[34px] font-bold font-mono text-slate-700 dark:text-slate-300 mt-1 leading-tight">{tableStats.inactive}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Occupancy %</p>
          <p className="text-[34px] font-bold font-mono text-slate-900 dark:text-white mt-1 leading-tight">{tableStats.occupancyRate}%</p>
        </div>
      </div>

      {/* Table SLA Overlay Legend Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
          <span>Table SLA Overlay:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-semibold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 🟢 On Time (&lt; 10m)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> 🟡 Near SLA (10–15m)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> 🔴 Breached (&gt; 15m)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> ⚪ Free
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Live Clock: {new Date(nowTime).toLocaleTimeString()}
        </div>
      </div>

      {/* Resource Usage Counter */}
      <div className="max-w-md">
        <ResourceUsageCard
          title="Dining Tables & QRs"
          used={tablesUsed}
          limit={maxTablesLimit}
          unitLabel="used"
        />
      </div>

      {/* Active Merge Groups Banner */}
      {activeMergeGroups.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
              Active Merged Dining Groups ({activeMergeGroups.length})
            </h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Unified QR Dining Sessions</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeMergeGroups.map((g: any) => (
              <div key={g.id} className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{g.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tables: {(g.members || []).map((m: any) => m.table_name).join(' + ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/orders?merge_group_id=${g.id}`} className="text-xs text-emerald-600 hover:underline font-bold">
                    View Orders & Bill
                  </Link>
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleUnmergeGroup(g.id, g.name)}>
                    Unmerge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription limits banner */}
      {maxTablesLimit !== null && tablesUsed >= maxTablesLimit * 0.8 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <strong>Plan usage alert:</strong> You are using {tablesUsed}/{maxTablesLimit} tables. 
            Upgrade your plan under <Link href="/dashboard/billing" className="font-bold underline">Billing</Link> to create more tables.
          </div>
        </div>
      )}

      {/* Takeaway QR Section */}
      <div className="bg-white border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Takeaway ordering QR
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 uppercase border border-purple-200 dark:border-purple-900/30">
                  Takeaway
                </span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Scans directly to menu in takeaway mode without physical table mapping.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center w-40 h-40 shadow-inner shrink-0">
            {takeawayQR ? (
              <img 
                src={takeawayQR} 
                alt="Takeaway QR Code" 
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="h-8 w-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Takeaway Order Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/takeaway`}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/takeaway`;
                    navigator.clipboard.writeText(url);
                    alert('Takeaway link copied to clipboard!');
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = takeawayQR;
                  link.download = `takeaway-qr.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <Download className="h-4 w-4 text-slate-400" />
                <span>Download QR</span>
              </button>

              <button
                onClick={printTakeawayQR}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>Print QR</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Order takeaway directly from our menu: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurantSlug + '/takeaway')}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/takeaway`;
                  navigator.clipboard.writeText(url);
                  alert('Instagram sharing link copied! Paste it in your Instagram Bio or Stories.');
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>Instagram</span>
              </button>

              <a
                href={`sms:?&body=${encodeURIComponent('Order takeaway directly from our menu here: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurantSlug + '/takeaway')}`}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>SMS Share</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Table Reservation QR Section */}
      <div className="bg-white border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Table Reservation QR & Link
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 uppercase border border-indigo-200 dark:border-indigo-900/30">
                  Reservation
                </span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Allows guests to book tables & pre-order dishes online directly from your website or social media.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center w-40 h-40 shadow-inner shrink-0">
            {reservationQR ? (
              <img 
                src={reservationQR} 
                alt="Table Reservation QR Code" 
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="h-8 w-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Table Reservation Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/reservation`}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/reservation`;
                    navigator.clipboard.writeText(url);
                    alert('Table Reservation link copied to clipboard!');
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = reservationQR;
                  link.download = `table-reservation-qr.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <Download className="h-4 w-4 text-slate-400" />
                <span>Download QR</span>
              </button>

              <button
                onClick={printReservationQR}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>Print QR</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Reserve a table at our restaurant online: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurantSlug + '/reservation')}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/reservation`;
                  navigator.clipboard.writeText(url);
                  alert('Reservation link copied! Add it to your Instagram bio.');
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>Instagram</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
          <QrCode className="h-10 w-10 text-slate-300" />
          <span>No tables created yet. Click "Add Table" above to create your first QR ordering table!</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const customerUrl = `/menu/${restaurantSlug}/table/${table.id}`;
            const qrData = qrCodes[table.id];
            const activeGroupForTable = activeMergeGroups.find(g => (g.members || []).some((m: any) => m.table_id === table.id || m.table_name === table.name));
            const assignedWaiters = tableAssignments.filter(a => a.table_id === table.id);

            // Phase-20 Table SLA Overlay Calculation
            const isOccupied = table.occupancy_status === 'occupied';
            const occupiedTime = new Date(table.occupied_at || Date.now()).getTime();
            const elapsedMs = Math.max(0, nowTime - occupiedTime);
            const elapsedMin = Math.floor(elapsedMs / 60000);
            const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
            const elapsedStr = `${elapsedMin}m ${String(elapsedSec).padStart(2, '0')}s`;

            let slaBadge = null;
            let borderClass = 'border-slate-200 dark:border-slate-800';

            if (table.payment_pending) {
              borderClass = 'border-2 border-rose-500 shadow-md shadow-rose-100 dark:shadow-none';
              slaBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  🔴 Breached ({elapsedStr})
                </span>
              );
            } else if (!isOccupied) {
              borderClass = 'border-slate-200 dark:border-slate-800';
              slaBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  ⚪ Free
                </span>
              );
            } else if (elapsedMin < 10) {
              borderClass = 'border-2 border-emerald-500 shadow-md shadow-emerald-50 dark:shadow-none';
              slaBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  🟢 On Time ({elapsedStr})
                </span>
              );
            } else if (elapsedMin <= 15) {
              borderClass = 'border-2 border-amber-500 shadow-md shadow-amber-50 dark:shadow-none';
              slaBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  🟡 Near SLA ({elapsedStr})
                </span>
              );
            } else {
              borderClass = 'border-2 border-rose-500 shadow-md shadow-rose-100 dark:shadow-none';
              slaBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  🔴 Breached ({elapsedStr})
                </span>
              );
            }

            return (
              <Card key={table.id} className={`hover:shadow-md transition-all duration-300 ${borderClass} ${selectedTableIds.includes(table.id) ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : ''}`}>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  {/* Table Header */}
                  <div className="w-full flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTableIds.includes(table.id)}
                        onChange={() => toggleTableSelection(table.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-900 dark:text-white text-lg">{table.name}</span>
                      {activeGroupForTable && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200">
                          {activeGroupForTable.name}
                        </span>
                      )}
                      {assignedWaiters.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                          {assignedWaiters.map(w => w.waiter_name).join(', ')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1.5 border border-rose-50 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete table"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* QR Code Container */}
                  <div className="relative p-3 border border-slate-100 rounded-2xl bg-slate-50 flex items-center justify-center w-48 h-48 shadow-inner group">
                    {qrData ? (
                      <img 
                        src={qrData} 
                        alt={`QR Code for ${table.name}`} 
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="h-10 w-10 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* QR Link */}
                  <div className="w-full truncate text-[11px] font-semibold text-slate-400 select-all p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    {origin + customerUrl}
                  </div>

                  {/* Live Status & QR Controls Row */}
                  <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      {slaBadge}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleOccupancy(table.id, table.occupancy_status || 'available')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          table.occupancy_status === 'occupied'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {table.occupancy_status === 'occupied' ? 'Mark Available' : 'Mark Occupied'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleQR(table.id, table.qr_enabled !== false)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          table.qr_enabled !== false
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {table.qr_enabled !== false ? 'Disable QR' : 'Enable QR'}
                      </button>
                    </div>
                  </div>

                  {/* QR Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-100">
                    <button
                      onClick={() => downloadQR(table)}
                      className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
                    >
                      <Download className="h-4 w-4 text-slate-400" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => printTableQR(table)}
                      className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
                    >
                      <Printer className="h-4 w-4 text-slate-400" />
                      <span>Print QR</span>
                    </button>

                    {table.occupancy_status === 'occupied' ? (
                      <Link
                        href={`/dashboard/orders?table_id=${table.id}`}
                        className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 transition-colors text-xs font-bold"
                      >
                        <ShoppingBag className="h-4 w-4 text-rose-600" />
                        <span>Live Orders</span>
                      </Link>
                    ) : (
                      <Link
                        href={customerUrl}
                        target="_blank"
                        className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-slate-100 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-semibold"
                      >
                        <ExternalLink className="h-4 w-4 text-emerald-500" />
                        <span>Test Menu</span>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* --- Create Table Modal --- */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Table"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTable}>Create Table</Button>
          </>
        }
      >
        <form onSubmit={handleCreateTable} className="space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <Input
            label="Table Name / Number"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="e.g. Table 1, Outdoor 4, Cabin B"
            required
            autoFocus
          />
        </form>
      </Dialog>

      {/* --- Merge Tables Modal --- */}
      <Dialog
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="Merge Selected Physical Tables"
      >
        <form onSubmit={handleCreateMergeGroup} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Selected physical tables: <strong className="text-emerald-600">{tables.filter(t => selectedTableIds.includes(t.id)).map(t => t.name).join(' + ')}</strong>
          </p>
          <p className="text-xs text-slate-400">
            Scanning any of these physical table QR codes will open the unified dining session. Each order will retain its physical table identity.
          </p>
          {mergeErrorMsg && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm font-medium">
              {mergeErrorMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Merge Group Name
            </label>
            <Input
              value={mergeGroupName}
              onChange={(e) => setMergeGroupName(e.target.value)}
              placeholder="e.g. Family 1, Birthday Party Group"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setMergeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirm & Merge Tables
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
