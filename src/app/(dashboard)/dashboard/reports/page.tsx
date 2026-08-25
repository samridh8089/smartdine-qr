'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import { db, Order, Category, MenuItem, getPlanFeatures } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, BarChart3, ShoppingCart, Calendar, 
  Sparkles, DollarSign, ArrowUpRight, Award, CreditCard, Clock, AlertCircle,
  ShoppingBag, ClipboardList, Lock, Banknote, Download, FileText, Filter, ArrowUpDown,
  Tag, Calculator, Receipt, Wallet
} from 'lucide-react';

interface ItemPerformanceRow {
  key: string;
  name: string;
  variantName: string;
  quantity: number;
  grossSales: number;
  discount: number;
  netSales: number;
}

interface CategoryPerformanceRow {
  categoryName: string;
  quantity: number;
  sales: number;
}

interface CustomerPerformanceRow {
  key: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  lastVisit: string;
}

interface CancellationPerformanceRow {
  reason: string;
  count: number;
  lostAmount: number;
}

export default function ReportsPage() {
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'>('today');
  
  // Date Range Controls
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appliedStartDate, setAppliedStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appliedEndDate, setAppliedEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Performance Table Sorting & Limit
  const [itemSortBy, setItemSortBy] = useState<'quantity' | 'revenue'>('revenue');
  const [itemLimit, setItemLimit] = useState<number>(10);

  const [loading, setLoading] = useState(true);

  const planConfig = getPlanFeatures(restaurant?.subscription_plan || 'starter');

  // Stats State
  const [salesSummary, setSalesSummary] = useState({
    totalOrders: 0,
    grossSales: 0,
    totalDiscount: 0,
    taxableSales: 0,
    cgstCollected: 0,
    sgstCollected: 0,
    igstCollected: 0,
    totalGstCollected: 0,
    netRevenue: 0,
    periodLabel: ''
  });

  const [customerSummary, setCustomerSummary] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    avgAOV: 0,
    avgFrequency: '1.0'
  });

  const [topCustomers, setTopCustomers] = useState<CustomerPerformanceRow[]>([]);

  const [cancellationStats, setCancellationStats] = useState({
    cancelledCount: 0,
    totalLost: 0,
    reasons: [] as CancellationPerformanceRow[]
  });

  const [itemPerformance, setItemPerformance] = useState<ItemPerformanceRow[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformanceRow[]>([]);

  useEffect(() => {
    async function loadReports() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;

      const [allOrders, cats] = await Promise.all([
        db.getOrders(restId),
        db.getCategories(restId)
      ]);
      setOrders(allOrders);
      setCategories(cats);
      computeStats(allOrders, cats);
      setLoading(false);
    }
    loadReports();
  }, [timeRange, selectedMonth, selectedYear, appliedStartDate, appliedEndDate]);

  const handleApplyCustomDates = () => {
    if (customStartDate > customEndDate) {
      alert('Start date cannot be after end date');
      return;
    }
    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
  };

  const computeStats = (allOrders: Order[], catList: Category[]) => {
    let rangeOrders: Order[] = [];
    let periodLabel = '';

    const now = new Date();

    if (timeRange === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      rangeOrders = allOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfDay && t <= endOfDay;
      });
      periodLabel = `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (timeRange === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const startOfDay = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 23, 59, 59, 999).getTime();
      rangeOrders = allOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfDay && t <= endOfDay;
      });
      periodLabel = `Yesterday (${yDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (timeRange === 'weekly') {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - 6);
      rangeOrders = allOrders.filter(o => new Date(o.created_at).getTime() >= startDate.getTime());
      periodLabel = `Last 7 Days (${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (timeRange === 'monthly') {
      rangeOrders = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = `${monthNames[selectedMonth]} ${selectedYear}`;
    } else if (timeRange === 'custom') {
      const startMs = new Date(`${appliedStartDate}T00:00:00`).getTime();
      const endMs = new Date(`${appliedEndDate}T23:59:59`).getTime();
      rangeOrders = allOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
      const sDate = new Date(`${appliedStartDate}T00:00:00`);
      const eDate = new Date(`${appliedEndDate}T00:00:00`);
      periodLabel = `${sDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${eDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }

    // EXCLUDE CANCELLED ORDERS FROM SALES AND TAX CALCULATIONS!
    const validOrders = rangeOrders.filter(o => o.status !== 'cancelled');

    let grossSales = 0;
    let totalDiscount = 0;
    let taxableSales = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;
    let igstCollected = 0;
    let totalGstCollected = 0;
    let netRevenue = 0;

    validOrders.forEach(o => {
      // Calculate item subtotal as fallback if subtotal is missing
      const itemsSubtotal = (o.items || []).reduce((sum, i) => {
        if (i.is_cancelled || i.status === 'cancelled') return sum;
        return sum + (Number(i.price) * Number(i.quantity));
      }, 0);

      const oSubtotal = Number(o.subtotal) > 0 ? Number(o.subtotal) : itemsSubtotal;

      // Extract order discount
      let oDisc = 0;
      if (o.discount_total !== undefined && o.discount_total !== null && Number(o.discount_total) > 0) {
        oDisc = Number(o.discount_total);
      } else if (o.discount_amount !== undefined && o.discount_amount !== null && Number(o.discount_amount) > 0) {
        oDisc = Number(o.discount_amount);
      } else if (o.special_instructions) {
        const matches = [...o.special_instructions.matchAll(/-\s*₹\s*([0-9.]+)/g)];
        if (matches.length > 0) {
          const val = parseFloat(matches[0][1]);
          if (!isNaN(val)) oDisc = val;
        }
      }

      const oTaxable = Math.max(0, oSubtotal - oDisc);

      let oCgst = Number(o.cgst_amount || 0);
      let oSgst = Number(o.sgst_amount || 0);
      let oIgst = Number(o.igst_amount || 0);
      let oTaxTotal = Number(o.tax_total ?? o.gst ?? 0);

      // Fallback for legacy orders where tax_total / gst > 0 but cgst/sgst/igst are 0
      if (oTaxTotal > 0 && oCgst === 0 && oSgst === 0 && oIgst === 0) {
        const isIgst = o.tax_type_snapshot === 'igst' || restaurant?.settings?.tax_mode === 'igst';
        if (isIgst) {
          oIgst = oTaxTotal;
        } else {
          oCgst = Math.round((oTaxTotal / 2 + Number.EPSILON) * 100) / 100;
          oSgst = Math.round((oTaxTotal - oCgst + Number.EPSILON) * 100) / 100;
        }
      } else if (oTaxTotal === 0 && (oCgst > 0 || oSgst > 0 || oIgst > 0)) {
        oTaxTotal = oCgst + oSgst + oIgst;
      }

      const oGrandTotal = Number(o.grand_total) > 0 
        ? Number(o.grand_total) 
        : (Number(o.total) > 0 ? Number(o.total) : Math.round((oTaxable + oTaxTotal) * 100) / 100);

      grossSales += oSubtotal;
      totalDiscount += oDisc;
      taxableSales += oTaxable;

      cgstCollected += oCgst;
      sgstCollected += oSgst;
      igstCollected += oIgst;
      totalGstCollected += oTaxTotal;
      netRevenue += oGrandTotal;
    });

    setSalesSummary({
      totalOrders: validOrders.length,
      grossSales: Math.round((grossSales + Number.EPSILON) * 100) / 100,
      totalDiscount: Math.round((totalDiscount + Number.EPSILON) * 100) / 100,
      taxableSales: Math.round((taxableSales + Number.EPSILON) * 100) / 100,
      cgstCollected: Math.round((cgstCollected + Number.EPSILON) * 100) / 100,
      sgstCollected: Math.round((sgstCollected + Number.EPSILON) * 100) / 100,
      igstCollected: Math.round((igstCollected + Number.EPSILON) * 100) / 100,
      totalGstCollected: Math.round((totalGstCollected + Number.EPSILON) * 100) / 100,
      netRevenue: Math.round((netRevenue + Number.EPSILON) * 100) / 100,
      periodLabel
    });

    // Item & Variant Performance Breakdown (Dal Makhani - Full vs Dal Makhani - Half)
    const itemMap: Record<string, ItemPerformanceRow> = {};
    validOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return;

        let baseName = item.menu_item_name;
        let vName = '-';

        // Extract variant name formatted as "Name (Variant)"
        const vMatch = item.menu_item_name.match(/^(.*?)\s*\((.*?)\)$/);
        if (vMatch) {
          baseName = vMatch[1].trim();
          vName = vMatch[2].trim();
        }

        const mapKey = `${item.menu_item_id}_${vName}`;
        if (!itemMap[mapKey]) {
          itemMap[mapKey] = {
            key: mapKey,
            name: baseName,
            variantName: vName,
            quantity: 0,
            grossSales: 0,
            discount: 0,
            netSales: 0
          };
        }

        const lineGross = item.price * item.quantity;
        itemMap[mapKey].quantity += item.quantity;
        itemMap[mapKey].grossSales += lineGross;
        itemMap[mapKey].netSales += lineGross;
      });
    });

    const performanceRows = Object.values(itemMap);
    setItemPerformance(performanceRows);

    // Customer Analytics Breakdown
    const customerMap: Record<string, CustomerPerformanceRow> = {};
    validOrders.forEach(o => {
      const custKey = (o as any).payment_reference || (o.table_name ? `Table ${o.table_name}` : (o.order_type === 'takeaway' ? 'Takeaway Guest' : `Table ${o.table_id || 'Walk-in'}`));
      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          key: custKey,
          name: custKey,
          orderCount: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          lastVisit: o.created_at
        };
      }
      customerMap[custKey].orderCount += 1;
      customerMap[custKey].totalSpent += Number(o.total || (o as any).grand_total || 0);
      if (new Date(o.created_at) > new Date(customerMap[custKey].lastVisit)) {
        customerMap[custKey].lastVisit = o.created_at;
      }
    });

    const custList = Object.values(customerMap).map(c => ({
      ...c,
      avgOrderValue: c.orderCount > 0 ? Math.round((c.totalSpent / c.orderCount + Number.EPSILON) * 100) / 100 : 0
    }));
    const totalCustCount = custList.length;
    const returningCustCount = custList.filter(c => c.orderCount > 1).length;
    const newCustCount = totalCustCount - returningCustCount;
    const avgAOV = validOrders.length > 0 ? netRevenue / validOrders.length : 0;
    const avgFreq = totalCustCount > 0 ? (validOrders.length / totalCustCount).toFixed(1) : '1.0';

    setCustomerSummary({
      totalCustomers: totalCustCount,
      newCustomers: newCustCount,
      returningCustomers: returningCustCount,
      avgAOV: Math.round((avgAOV + Number.EPSILON) * 100) / 100,
      avgFrequency: avgFreq
    });

    setTopCustomers(custList.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10));

    // Cancellation Breakdown
    const cancelledOrders = rangeOrders.filter(o => o.status === 'cancelled');
    const cancelReasonMap: Record<string, CancellationPerformanceRow> = {};
    let totalCancelledLost = 0;
    cancelledOrders.forEach(o => {
      const reason = (o as any).cancellation_reason || (o as any).cancel_reason || 'Cancelled by staff';
      if (!cancelReasonMap[reason]) {
        cancelReasonMap[reason] = { reason, count: 0, lostAmount: 0 };
      }
      const isPaid = o.payment_status === 'paid';
      const lost = isPaid ? 0 : Number(o.total || (o as any).grand_total || (o as any).subtotal || 0);
      cancelReasonMap[reason].count += 1;
      cancelReasonMap[reason].lostAmount += lost;
      totalCancelledLost += lost;
    });

    setCancellationStats({
      cancelledCount: cancelledOrders.length,
      totalLost: Math.round((totalCancelledLost + Number.EPSILON) * 100) / 100,
      reasons: Object.values(cancelReasonMap).sort((a, b) => b.count - a.count)
    });

    // Category Performance
    const catMap: Record<string, CategoryPerformanceRow> = {};
    (catList || []).forEach(c => {
      catMap[c.name] = { categoryName: c.name, quantity: 0, sales: 0 };
    });

    performanceRows.forEach(row => {
      const foundCat = catList.find(c => c.name.toLowerCase() === row.name.toLowerCase());
      const catName = foundCat ? foundCat.name : 'General Menu';
      if (!catMap[catName]) {
        catMap[catName] = { categoryName: catName, quantity: 0, sales: 0 };
      }
      catMap[catName].quantity += row.quantity;
      catMap[catName].sales += row.grossSales;
    });

    setCategoryPerformance(Object.values(catMap).filter(c => c.quantity > 0 || c.sales > 0));
  };

  // Helper to trigger CSV file download
  const triggerDownload = (filename: string, csvData: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV EXPORT 1: ORDERS SUMMARY (One row per order, perfectly accounting-friendly!)
  const handleExportOrdersSummaryCSV = () => {
    if (!orders || orders.length === 0) {
      alert('No order data available to export.');
      return;
    }

    const validOrders = orders.filter(o => o.status !== 'cancelled');
    const headers = [
      'Order ID',
      'Order Date & Time',
      'Table / Type',
      'Order Subtotal',
      'Discount Total',
      'Taxable Amount',
      'CGST Amount',
      'SGST Amount',
      'IGST Amount',
      'Total GST',
      'Grand Total',
      'Order Status'
    ];

    const rows: string[][] = validOrders.map(o => {
      const dt = new Date(o.created_at).toLocaleString('en-IN');
      const tableOrType = o.order_type === 'takeaway' ? 'Takeaway' : (o.table_name || 'Table');

      const itemsSubtotal = (o.items || []).reduce((sum, i) => {
        if (i.is_cancelled || i.status === 'cancelled') return sum;
        return sum + (Number(i.price) * Number(i.quantity));
      }, 0);

      const oSubtotal = Number(o.subtotal) > 0 ? Number(o.subtotal) : itemsSubtotal;

      let oDisc = 0;
      if (o.discount_total !== undefined && o.discount_total !== null && Number(o.discount_total) > 0) {
        oDisc = Number(o.discount_total);
      } else if (o.discount_amount !== undefined && o.discount_amount !== null && Number(o.discount_amount) > 0) {
        oDisc = Number(o.discount_amount);
      } else if (o.special_instructions) {
        const matches = [...o.special_instructions.matchAll(/-\s*₹\s*([0-9.]+)/g)];
        if (matches.length > 0) {
          const val = parseFloat(matches[0][1]);
          if (!isNaN(val)) oDisc = val;
        }
      }

      const oTaxable = Math.max(0, oSubtotal - oDisc);

      let oCgst = Number(o.cgst_amount || 0);
      let oSgst = Number(o.sgst_amount || 0);
      let oIgst = Number(o.igst_amount || 0);
      let oTaxTotal = Number(o.tax_total ?? o.gst ?? 0);

      if (oTaxTotal > 0 && oCgst === 0 && oSgst === 0 && oIgst === 0) {
        const isIgst = o.tax_type_snapshot === 'igst' || restaurant?.settings?.tax_mode === 'igst';
        if (isIgst) {
          oIgst = oTaxTotal;
        } else {
          oCgst = Math.round((oTaxTotal / 2 + Number.EPSILON) * 100) / 100;
          oSgst = Math.round((oTaxTotal - oCgst + Number.EPSILON) * 100) / 100;
        }
      } else if (oTaxTotal === 0 && (oCgst > 0 || oSgst > 0 || oIgst > 0)) {
        oTaxTotal = oCgst + oSgst + oIgst;
      }

      const oGrandTotal = Number(o.grand_total) > 0 
        ? Number(o.grand_total) 
        : (Number(o.total) > 0 ? Number(o.total) : Math.round((oTaxable + oTaxTotal) * 100) / 100);

      return [
        `"${o.id.slice(-6).toUpperCase()}"`,
        `"${dt}"`,
        `"${tableOrType}"`,
        `${oSubtotal.toFixed(2)}`,
        `${oDisc.toFixed(2)}`,
        `${oTaxable.toFixed(2)}`,
        `${oCgst.toFixed(2)}`,
        `${oSgst.toFixed(2)}`,
        `${oIgst.toFixed(2)}`,
        `${oTaxTotal.toFixed(2)}`,
        `${oGrandTotal.toFixed(2)}`,
        `"${o.status}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`CleverOps_Orders_Summary_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  // CSV EXPORT 2: ORDER ITEMS (One row per item with exact Item Subtotal = Qty * Unit Price)
  const handleExportOrderItemsCSV = () => {
    if (!orders || orders.length === 0) {
      alert('No order data available to export.');
      return;
    }

    const validOrders = orders.filter(o => o.status !== 'cancelled');
    const headers = [
      'Order ID',
      'Order Date & Time',
      'Table / Type',
      'Item Name',
      'Variant / Portion',
      'Quantity',
      'Unit Price',
      'Item Subtotal'
    ];

    const rows: string[][] = [];

    validOrders.forEach(o => {
      const dt = new Date(o.created_at).toLocaleString('en-IN');
      const tableOrType = o.order_type === 'takeaway' ? 'Takeaway' : (o.table_name || 'Table');

      (o.items || []).forEach(item => {
        if (item.is_cancelled || item.status === 'cancelled') return;
        let bName = item.menu_item_name;
        let vName = '-';
        const vMatch = item.menu_item_name.match(/^(.*?)\s*\((.*?)\)$/);
        if (vMatch) {
          bName = vMatch[1].trim();
          vName = vMatch[2].trim();
        }

        const itemSubtotal = item.price * item.quantity;

        rows.push([
          `"${o.id.slice(-6).toUpperCase()}"`,
          `"${dt}"`,
          `"${tableOrType}"`,
          `"${bName}"`,
          `"${vName}"`,
          `${item.quantity}`,
          `${item.price.toFixed(2)}`,
          `${itemSubtotal.toFixed(2)}`
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`CleverOps_Order_Items_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  // CSV EXPORT 3: COMBINED ACCOUNTING CSV (Order financial totals ONCE on row 1, subsequent item rows BLANK for order columns)
  const handleExportCombinedCSV = () => {
    if (!orders || orders.length === 0) {
      alert('No order data available to export.');
      return;
    }

    const validOrders = orders.filter(o => o.status !== 'cancelled');
    const headers = [
      'Order ID',
      'Order Date',
      'Table / Type',
      'Item Name',
      'Variant / Portion',
      'Quantity',
      'Unit Price',
      'Item Subtotal',
      'Order Subtotal',
      'Discount',
      'Taxable Amount',
      'CGST',
      'SGST',
      'IGST',
      'Total GST',
      'Grand Total'
    ];

    const rows: string[][] = [];

    validOrders.forEach(o => {
      const dt = new Date(o.created_at).toLocaleString('en-IN');
      const tableOrType = o.order_type === 'takeaway' ? 'Takeaway' : (o.table_name || 'Table');

      const itemsSubtotal = (o.items || []).reduce((sum, i) => {
        if (i.is_cancelled || i.status === 'cancelled') return sum;
        return sum + (Number(i.price) * Number(i.quantity));
      }, 0);

      const oSubtotal = Number(o.subtotal) > 0 ? Number(o.subtotal) : itemsSubtotal;

      let oDisc = 0;
      if (o.discount_total !== undefined && o.discount_total !== null && Number(o.discount_total) > 0) {
        oDisc = Number(o.discount_total);
      } else if (o.discount_amount !== undefined && o.discount_amount !== null && Number(o.discount_amount) > 0) {
        oDisc = Number(o.discount_amount);
      } else if (o.special_instructions) {
        const matches = [...o.special_instructions.matchAll(/-\s*₹\s*([0-9.]+)/g)];
        if (matches.length > 0) {
          const val = parseFloat(matches[0][1]);
          if (!isNaN(val)) oDisc = val;
        }
      }

      const oTaxable = Math.max(0, oSubtotal - oDisc);

      let oCgst = Number(o.cgst_amount || 0);
      let oSgst = Number(o.sgst_amount || 0);
      let oIgst = Number(o.igst_amount || 0);
      let oTaxTotal = Number(o.tax_total ?? o.gst ?? 0);

      if (oTaxTotal > 0 && oCgst === 0 && oSgst === 0 && oIgst === 0) {
        const isIgst = o.tax_type_snapshot === 'igst' || restaurant?.settings?.tax_mode === 'igst';
        if (isIgst) {
          oIgst = oTaxTotal;
        } else {
          oCgst = Math.round((oTaxTotal / 2 + Number.EPSILON) * 100) / 100;
          oSgst = Math.round((oTaxTotal - oCgst + Number.EPSILON) * 100) / 100;
        }
      } else if (oTaxTotal === 0 && (oCgst > 0 || oSgst > 0 || oIgst > 0)) {
        oTaxTotal = oCgst + oSgst + oIgst;
      }

      const oGrandTotal = Number(o.grand_total) > 0 
        ? Number(o.grand_total) 
        : (Number(o.total) > 0 ? Number(o.total) : Math.round((oTaxable + oTaxTotal) * 100) / 100);

      const validItems = (o.items || []).filter(i => !i.is_cancelled && i.status !== 'cancelled');

      validItems.forEach((item, idx) => {
        let bName = item.menu_item_name;
        let vName = '-';
        const vMatch = item.menu_item_name.match(/^(.*?)\s*\((.*?)\)$/);
        if (vMatch) {
          bName = vMatch[1].trim();
          vName = vMatch[2].trim();
        }

        const itemSubtotal = item.price * item.quantity;
        const isFirst = idx === 0;

        rows.push([
          `"${o.id.slice(-6).toUpperCase()}"`,
          `"${dt}"`,
          `"${tableOrType}"`,
          `"${bName}"`,
          `"${vName}"`,
          `${item.quantity}`,
          `${item.price.toFixed(2)}`,
          `${itemSubtotal.toFixed(2)}`,
          // Order-level financial fields ONLY ON FIRST ROW per order:
          isFirst ? `${oSubtotal.toFixed(2)}` : '""',
          isFirst ? `${oDisc.toFixed(2)}` : '""',
          isFirst ? `${oTaxable.toFixed(2)}` : '""',
          isFirst ? `${oCgst.toFixed(2)}` : '""',
          isFirst ? `${oSgst.toFixed(2)}` : '""',
          isFirst ? `${oIgst.toFixed(2)}` : '""',
          isFirst ? `${oTaxTotal.toFixed(2)}` : '""',
          isFirst ? `${oGrandTotal.toFixed(2)}` : '""'
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`CleverOps_Accounting_Report_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  // PDF Export Handler (Triggers Printable Report View)
  const handleExportPDF = () => {
    window.print();
  };

  if (!planConfig.allowAnalytics) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 text-white my-8 shadow-2xl relative overflow-hidden">
        <div className="h-16 w-16 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <BarChart3 className="h-8 w-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-2xl font-black">Analytics & Reports Locked</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Detailed sales reports, GST tax summaries, and portion item analytics are available on <strong className="text-white">PRO</strong> and <strong className="text-white">PREMIUM</strong> plans.
          </p>
        </div>
        <a href="/dashboard/billing">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-sm shadow-lg transition-all cursor-pointer">
            Upgrade Plan to Unlock Reports
          </button>
        </a>
      </div>
    );
  }

  // Sorted Performance Rows
  const sortedPerformance = [...itemPerformance].sort((a, b) => {
    return itemSortBy === 'quantity' ? b.quantity - a.quantity : b.netSales - a.netSales;
  }).slice(0, itemLimit);

  // Clean, Subtle KPI Component Data (Stripe/Toast POS Aesthetic)
  const kpiCards = [
    {
      id: 'valid-orders',
      label: 'VALID ORDERS',
      value: salesSummary.totalOrders.toString(),
      desc: 'Excludes cancelled',
      icon: ShoppingBag,
      iconColor: 'text-blue-500 dark:text-blue-400',
      valueColor: 'text-slate-900 dark:text-white',
    },
    {
      id: 'gross-sales',
      label: 'GROSS SALES',
      value: formatPrice(salesSummary.grossSales, restaurant?.settings?.currency || 'INR'),
      desc: 'Subtotal before discount',
      icon: TrendingUp,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      valueColor: 'text-slate-900 dark:text-white',
    },
    {
      id: 'discounts',
      label: 'DISCOUNTS',
      value: `-${formatPrice(salesSummary.totalDiscount, restaurant?.settings?.currency || 'INR')}`,
      desc: 'Promo & offer vouchers',
      icon: Tag,
      iconColor: 'text-rose-500 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      id: 'taxable-sales',
      label: 'TAXABLE SALES',
      value: formatPrice(salesSummary.taxableSales, restaurant?.settings?.currency || 'INR'),
      desc: 'Gross minus discount',
      icon: Calculator,
      iconColor: 'text-indigo-500 dark:text-indigo-400',
      valueColor: 'text-slate-900 dark:text-white',
    },
    {
      id: 'gst-collected',
      label: 'GST COLLECTED',
      value: formatPrice(salesSummary.totalGstCollected, restaurant?.settings?.currency || 'INR'),
      desc: 'CGST+SGST / IGST',
      icon: Receipt,
      iconColor: 'text-teal-500 dark:text-teal-400',
      valueColor: 'text-slate-900 dark:text-white',
    },
    {
      id: 'net-revenue',
      label: 'NET REVENUE',
      value: formatPrice(salesSummary.netRevenue, restaurant?.settings?.currency || 'INR'),
      desc: 'Grand total collected',
      icon: Wallet,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-slate-900 dark:text-white',
      cardBorder: 'border-emerald-500/40 dark:border-emerald-500/30 ring-1 ring-emerald-500/20 dark:ring-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      
      {/* HEADER & DATE RANGE FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Analytics & Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Real-time sales performance, GST tax snapshots, portion analytics & accounting reports.
          </p>
        </div>

        {/* Compact Action Controls: Time Filter & Export Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Filter Selector */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('yesterday')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'yesterday'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* EXPORT ACTION GROUP */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/40 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <Button onClick={handleExportOrdersSummaryCSV} variant="ghost" size="sm" className="gap-1 text-xs font-bold bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 h-7">
              <Download className="h-3 w-3 text-emerald-600" /> Orders CSV
            </Button>
            <Button onClick={handleExportOrderItemsCSV} variant="ghost" size="sm" className="gap-1 text-xs font-bold bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 h-7">
              <Download className="h-3 w-3 text-emerald-600" /> Items CSV
            </Button>
            <Button onClick={handleExportCombinedCSV} variant="ghost" size="sm" className="gap-1 text-xs font-bold bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 h-7">
              <Download className="h-3 w-3 text-emerald-600" /> Accounting CSV
            </Button>
            <Button onClick={handleExportPDF} variant="primary" size="sm" className="gap-1 text-xs font-bold shadow-2xs px-2.5 py-1 h-7">
              <FileText className="h-3 w-3" /> Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* CUSTOM DATE RANGE FILTER PANEL */}
      {timeRange === 'custom' && (
        <Card className="print:hidden border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-4 flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
              />
            </div>
            <Button onClick={handleApplyCustomDates} variant="primary" size="sm" className="w-full sm:w-auto">
              Apply Date Filter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PRINT REPORT HEADER (Only visible when printing/saving PDF) */}
      <div className="hidden print:block text-center border-b pb-4">
        <h1 className="text-2xl font-black">{restaurant?.name}</h1>
        <p className="text-xs text-slate-600 font-bold">Sales & GST Tax Accounting Summary</p>
        <p className="text-xs text-slate-500 mt-1">Period: {salesSummary.periodLabel} | Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* 1. SALES OVERVIEW METRIC CARDS (CLEAN COMMERCIAL POS/ACCOUNTING SAAS KPI COMPONENT) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-3.5">
        {kpiCards.map((kpi) => {
          return (
            <Card 
              key={kpi.id} 
              className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all rounded-xl p-3.5 flex flex-col justify-between h-full min-h-[110px] ${kpi.cardBorder || ''}`}
            >
              <div className="space-y-1">
                <span className="text-[10px] xl:text-[11px] font-semibold uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </span>
                <p className={`text-base xl:text-lg 2xl:text-xl font-bold font-mono tracking-tight whitespace-nowrap pt-1 ${kpi.valueColor}`}>
                  {kpi.value}
                </p>
              </div>

              <p className="text-[10px] xl:text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-tight pt-1">
                {kpi.desc}
              </p>
            </Card>
          );
        })}
      </div>

      {/* 2. TAX SUMMARY TABLE (GST SNAPSHOTS) */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">GST Tax Summary</h3>
            <p className="text-xs text-slate-400 font-medium">Tax calculated from stored order snapshots for {salesSummary.periodLabel}.</p>
          </div>
          <Badge variant="success" className="font-mono text-xs">
            Stored Snapshots Active
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">Tax Metric</th>
                  <th className="py-3 px-4 text-right">Taxable Sales</th>
                  <th className="py-3 px-4 text-right">CGST</th>
                  <th className="py-3 px-4 text-right">SGST</th>
                  <th className="py-3 px-4 text-right">IGST</th>
                  <th className="py-3 px-4 text-right">Total GST Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm font-semibold">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Intrastate (CGST + SGST)</td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatPrice(salesSummary.taxableSales, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatPrice(salesSummary.cgstCollected, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatPrice(salesSummary.sgstCollected, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">₹0.00</td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(salesSummary.cgstCollected + salesSummary.sgstCollected, restaurant?.settings?.currency || 'INR')}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Interstate (IGST)</td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatPrice(salesSummary.igstCollected > 0 ? salesSummary.taxableSales : 0, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">₹0.00</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">₹0.00</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatPrice(salesSummary.igstCollected, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(salesSummary.igstCollected, restaurant?.settings?.currency || 'INR')}
                  </td>
                </tr>
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-extrabold text-sm border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="py-4 px-4 text-slate-900 dark:text-white">Total GST Collected</td>
                  <td className="py-4 px-4 text-right font-mono">{formatPrice(salesSummary.taxableSales, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">{formatPrice(salesSummary.cgstCollected, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">{formatPrice(salesSummary.sgstCollected, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">{formatPrice(salesSummary.igstCollected, restaurant?.settings?.currency || 'INR')}</td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">
                    {formatPrice(salesSummary.totalGstCollected, restaurant?.settings?.currency || 'INR')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. MENU ITEM & PORTION PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Item & Portion Performance</h3>
              <p className="text-xs text-slate-400 font-medium">Distinct sales metrics for each dish and portion size.</p>
            </div>
            
            <div className="flex items-center gap-2 print:hidden">
              <select
                value={itemSortBy}
                onChange={(e) => setItemSortBy(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
              >
                <option value="revenue">Sort by Revenue</option>
                <option value="quantity">Sort by Quantity</option>
              </select>

              <select
                value={itemLimit}
                onChange={(e) => setItemLimit(Number(e.target.value))}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={100}>All Items</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {sortedPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No item sales recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Portion / Size</th>
                      <th className="py-3 px-4 text-center">Qty Sold</th>
                      <th className="py-3 px-4 text-right">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm font-semibold">
                    {sortedPerformance.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.name}</td>
                        <td className="py-3 px-4">
                          {row.variantName !== '-' ? (
                            <span className="inline-block text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                              {row.variantName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono">{row.quantity}</td>
                        <td className="py-3 px-4 text-right font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatPrice(row.grossSales, restaurant?.settings?.currency || 'INR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. CATEGORY PERFORMANCE */}
        <Card className="lg:col-span-1 border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
          <CardHeader className="pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Category Performance</h3>
            <p className="text-xs text-slate-400 font-medium">Sales breakdown across menu categories.</p>
          </CardHeader>
          <CardContent>
            {categoryPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No category sales data available.</p>
            ) : (
              <div className="space-y-3">
                {categoryPerformance.map((cat, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">{cat.categoryName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{cat.quantity} items sold</p>
                    </div>
                    <span className="font-black text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      {formatPrice(cat.sales, restaurant?.settings?.currency || 'INR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. CUSTOMER ANALYTICS & INSIGHTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Customer Analytics & Retention</h3>
            <p className="text-xs text-slate-400 font-medium">Customer order counts, lifetime spending, and frequency for {salesSummary.periodLabel}.</p>
          </div>
        </div>

        {/* Customer KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Total Guests</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{customerSummary.totalCustomers}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Unique customer sessions</p>
          </Card>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">New Customers</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{customerSummary.newCustomers}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">First-time visitors</p>
          </Card>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Returning Guests</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{customerSummary.returningCustomers}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Repeat diners</p>
          </Card>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Avg Order Value (AOV)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {formatPrice(customerSummary.avgAOV, restaurant?.settings?.currency || 'INR')}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Spend per order</p>
          </Card>
        </div>

        {/* Top Customers Table */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
          <CardHeader className="pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Top Spending Customers / Tables</h3>
            <p className="text-xs text-slate-400 font-medium">Ranked by total spending in the selected period.</p>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No customer data recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4">Customer / Identifier</th>
                      <th className="py-3 px-4 text-center">Orders Placed</th>
                      <th className="py-3 px-4 text-right">Avg Order Value</th>
                      <th className="py-3 px-4 text-right">Total Spent</th>
                      <th className="py-3 px-4 text-right">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm font-semibold">
                    {topCustomers.map((cust, idx) => (
                      <tr key={cust.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          {cust.name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">{cust.orderCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatPrice(cust.avgOrderValue, restaurant?.settings?.currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(cust.totalSpent, restaurant?.settings?.currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                          {new Date(cust.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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

      {/* 6. ORDER CANCELLATIONS & LOSS ANALYSIS */}
      <Card className="border border-red-200/80 dark:border-red-950/60 bg-red-50/10 dark:bg-red-950/10 shadow-2xs rounded-xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-red-900 dark:text-red-300">Order Cancellations & Loss Analysis</h3>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium">Audit of cancelled orders and lost revenue during {salesSummary.periodLabel}.</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold text-red-700 dark:text-red-400">
              {cancellationStats.cancelledCount} Cancelled Orders
            </span>
            <p className="text-sm font-black font-mono text-red-600 dark:text-red-400">
              - {formatPrice(cancellationStats.totalLost, restaurant?.settings?.currency || 'INR')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {cancellationStats.reasons.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 italic py-4 text-center font-bold">
              🎉 Zero cancellations recorded in this period!
            </p>
          ) : (
            <div className="overflow-x-auto border border-red-100 dark:border-red-900/40 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-100/40 dark:bg-red-950/40 text-[11px] font-extrabold text-red-700 dark:text-red-300 uppercase tracking-wider border-b border-red-200 dark:border-red-900/40">
                    <th className="py-3 px-4">Cancellation Reason</th>
                    <th className="py-3 px-4 text-center">Orders Count</th>
                    <th className="py-3 px-4 text-right">Lost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-900/30 text-xs md:text-sm font-semibold">
                  {cancellationStats.reasons.map((cr, idx) => (
                    <tr key={idx} className="hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {cr.reason}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-red-600 dark:text-red-400">{cr.count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-700 dark:text-red-300">
                        {formatPrice(cr.lostAmount, restaurant?.settings?.currency || 'INR')}
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
  );
}
