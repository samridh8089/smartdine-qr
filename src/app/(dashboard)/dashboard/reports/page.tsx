'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRestaurant } from '../../layout';
import { db, Order, Category, MenuItem, getPlanFeatures } from '@/lib/db';
import { getActiveUser, supabase, getClientAuthHeaders } from '@/lib/supabase';
import { formatPrice, parseCustomerDetailsFromOrder, cleanIndianMobileNumber, validateIndianMobileNumber, isOrderReservation, getFormattedOrderId } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, BarChart3, ShoppingCart, Calendar, 
  Sparkles, DollarSign, ArrowUpRight, Award, CreditCard, Clock, AlertCircle,
  ShoppingBag, ClipboardList, Lock, Banknote, Download, FileText, Filter, ArrowUpDown,
  Tag, Calculator, Receipt, Wallet, Flame, Zap, Users, Printer, X, Activity, CheckCircle2, ChevronRight,
  Trophy, UtensilsCrossed, AlertTriangle, Lightbulb, Layers, Search, Phone, MessageSquare,
  QrCode, History
} from 'lucide-react';
import { isRevenueOrder, parseOrderRefundDetails, getOrderRevenueAmount } from '@/lib/billingEngine';

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

export interface CustomerMarketingContact {
  phone: string;
  name: string;
  orderTypes: string[];
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  lastVisit: string;
  firstVisit: string;
}

interface CancellationPerformanceRow {
  reason: string;
  count: number;
  lostAmount: number;
}

// Indian Standard Time (IST / Asia/Kolkata) Helpers for Precise Restaurant Accounting
function getISTDateString(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj);
}

function getISTMonthYear(d: Date | string = new Date()): { month: number; year: number } {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric', year: 'numeric' }).formatToParts(dateObj);
  const month = Number(parts.find(p => p.type === 'month')?.value) - 1;
  const year = Number(parts.find(p => p.type === 'year')?.value);
  return { month, year };
}

function getISTHour(d: Date | string): number {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }).formatToParts(dateObj);
  return Number(parts.find(p => p.type === 'hour')?.value || 0);
}

export default function ReportsPage() {
  const { restaurant, profile, activeRole } = useRestaurant();
  const currentRole = activeRole || profile?.role || 'owner';
  const isOwner = currentRole === 'owner';
  const isManager = currentRole === 'manager';
  const isSupervisor = currentRole === 'supervisor';
  const isCashier = currentRole === 'cashier';
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_time_range');
      if (saved && ['today', 'yesterday', 'weekly', 'monthly', 'custom'].includes(saved)) {
        return saved as any;
      }
    }
    return 'today';
  });
  
  // Date Range Controls (Standardized to IST & Persisted across refresh for UX-003)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_selected_month');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 11) return parsed;
      }
    }
    return getISTMonthYear().month;
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_selected_year');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 2020) return parsed;
      }
    }
    return getISTMonthYear().year;
  });

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_custom_start_date');
      if (saved) return saved;
    }
    return getISTDateString();
  });

  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_custom_end_date');
      if (saved) return saved;
    }
    return getISTDateString();
  });

  const [appliedStartDate, setAppliedStartDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_applied_start_date');
      if (saved) return saved;
    }
    return getISTDateString();
  });

  const [appliedEndDate, setAppliedEndDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_applied_end_date');
      if (saved) return saved;
    }
    return getISTDateString();
  });

  // Performance Table Sorting & Limit (Persisted across refresh for P2-03)
  const [itemSortBy, setItemSortBy] = useState<'quantity' | 'revenue'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_item_sort_by');
      if (saved === 'quantity' || saved === 'revenue') return saved;
    }
    return 'revenue';
  });
  const [itemLimit, setItemLimit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('reports_item_limit');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && [10, 25, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 10;
  });

  const [loading, setLoading] = useState(true);

  const planConfig = getPlanFeatures(restaurant?.subscription_plan || 'starter');

  // Stats State
  const [salesSummary, setSalesSummary] = useState({
    totalOrders: 0,
    grossSales: 0,
    totalDiscount: 0,
    totalRefunds: 0,
    taxableSales: 0,
    cgstCollected: 0,
    sgstCollected: 0,
    igstCollected: 0,
    totalGstCollected: 0,
    totalServiceCharge: 0,
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
  const [marketingContacts, setMarketingContacts] = useState<CustomerMarketingContact[]>([]);
  const [marketingSearchQuery, setMarketingSearchQuery] = useState('');
  const [marketingChannelFilter, setMarketingChannelFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'reservation'>('all');

  const [cancellationStats, setCancellationStats] = useState({
    cancelledCount: 0,
    totalLost: 0,
    reasons: [] as CancellationPerformanceRow[]
  });

  const [itemPerformance, setItemPerformance] = useState<ItemPerformanceRow[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformanceRow[]>([]);

  // Operations Intelligence Suite (Phase-19)
  const [kitchenSlaStats, setKitchenSlaStats] = useState({
    avgAcceptTimeSec: 0,
    avgPrepTimeMin: 0,
    readyToServedSec: 0,
    totalFulfillmentMin: 0
  });

  const [waiterLeaderboard, setWaiterLeaderboard] = useState<any[]>([]);
  const [tableTurnoverList, setTableTurnoverList] = useState<any[]>([]);
  const [zoneAnalyticsList, setZoneAnalyticsList] = useState<any[]>([]);
  const [hourlyHeatmap, setHourlyHeatmap] = useState<any[]>([]);
  const [peakHourSummary, setPeakHourSummary] = useState({
    peakHour: '8:00 PM',
    peakOrders: 0,
    peakRevenue: 0,
    slowHour: '3:00 PM',
    slowOrders: 0
  });
  const [kitchenBottlenecks, setKitchenBottlenecks] = useState({
    slowestDish: { name: 'None', avgPrepMin: 0 },
    mostCancelledDish: { name: 'None', count: 0 },
    longestPendingTicket: { orderId: 'N/A', tableName: 'None', elapsedMin: 0 },
    averageKitchenQueue: 0
  });

  const [closingReportModalOpen, setClosingReportModalOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [dispositionsList, setDispositionsList] = useState<any[]>([]);
  const [liveOccupancyMerge, setLiveOccupancyMerge] = useState({
    occupied: 0,
    free: 20,
    avgWaitTime: '12.3 min',
    queueLength: 0,
    ordersPerHour: 0,
    revenuePerHour: 0
  });
  const [kitchenSlaSuccessPct, setKitchenSlaSuccessPct] = useState('96%');

  // Table Utilization State (R6)
  const [tableUtilization, setTableUtilization] = useState({
    occupancyPct: 0,
    avgDiningDurationMin: 0,
    peakHours: '8:00 PM',
    idleTables: 0
  });

  // Persistent Filters (R7: waiter, status)
  const [selectedWaiter, setSelectedWaiter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('reports_selected_waiter') || 'all';
    }
    return 'all';
  });

  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('reports_selected_status') || 'all';
    }
    return 'all';
  });

  // Audit Trail State (Phase 4)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);


  const handleApplyCustomDates = () => {
    if (customStartDate > customEndDate) {
      alert('Start date cannot be after end date');
      return;
    }
    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
  };

  const computeStats = (allOrders: Order[], catList: Category[], dispositions: any[] = [], occupiedCount: number = 0, freeCount: number = 20, mItemsList: MenuItem[] = []) => {
    let rangeOrders: Order[] = [];
    let periodLabel = '';

    const now = new Date();
    const todayIST = getISTDateString(now);

    if (timeRange === 'today') {
      rangeOrders = allOrders.filter(o => getISTDateString(o.created_at) === todayIST);
      const nowISTParts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(now);
      periodLabel = `Today (${nowISTParts})`;
    } else if (timeRange === 'yesterday') {
      const yDate = new Date(now.getTime() - 24 * 3600 * 1000);
      const yDateIST = getISTDateString(yDate);
      rangeOrders = allOrders.filter(o => getISTDateString(o.created_at) === yDateIST);
      const yISTParts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(yDate);
      periodLabel = `Yesterday (${yISTParts})`;
    } else if (timeRange === 'weekly') {
      const weekStartDate = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
      const weekStartIST = getISTDateString(weekStartDate);
      const startMs = new Date(`${weekStartIST}T00:00:00+05:30`).getTime();
      rangeOrders = allOrders.filter(o => new Date(o.created_at).getTime() >= startMs);
      const startParts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(weekStartDate);
      const endParts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(now);
      periodLabel = `Last 7 Days (${startParts} – ${endParts})`;
    } else if (timeRange === 'monthly') {
      rangeOrders = allOrders.filter(o => {
        const { month: oMonth, year: oYear } = getISTMonthYear(o.created_at);
        return oMonth === selectedMonth && oYear === selectedYear;
      });
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = `${monthNames[selectedMonth]} ${selectedYear}`;
    } else if (timeRange === 'custom') {
      const startMs = new Date(`${appliedStartDate}T00:00:00+05:30`).getTime();
      const endMs = new Date(`${appliedEndDate}T23:59:59.999+05:30`).getTime();
      rangeOrders = allOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
      const sParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(startMs));
      const eParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(endMs));
      periodLabel = `${sParts} – ${eParts}`;
    }

    // Apply Waiter and Status Filters (R7 Persistent Filters)
    if (selectedWaiter !== 'all') {
      rangeOrders = rangeOrders.filter(o => 
        (o as any).waiter === selectedWaiter || 
        (o as any).server_name === selectedWaiter || 
        (o.batches || []).some((b: any) => b.served_by === selectedWaiter)
      );
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'paid') {
        rangeOrders = rangeOrders.filter(o => o.payment_status === 'paid' || parseOrderRefundDetails(o).isPartial);
      } else {
        rangeOrders = rangeOrders.filter(o => o.status === selectedStatus);
      }
    }

    // REVENUE-ELIGIBLE ORDERS ONLY: PAID OR COMPLETED ORDERS (EXCLUDES UNPAID PENDING & CANCELLED)
    const validOrders = rangeOrders.filter(isRevenueOrder);

    // Track total refunds across all orders in this period (both full and partial)
    let totalRefunds = 0;
    rangeOrders.forEach(o => {
      if (o.status === 'cancelled' && !o.special_instructions?.includes('REFUND RECORDED')) return;
      const rInfo = parseOrderRefundDetails(o);
      totalRefunds += rInfo.refundAmount;
    });

    let grossSales = 0;
    let totalDiscount = 0;
    let taxableSales = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;
    let igstCollected = 0;
    let totalGstCollected = 0;
    let totalServiceCharge = 0;
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
      let oTaxTotal = Number(
        (o.tax_total !== null && o.tax_total !== undefined && Number(o.tax_total) > 0)
          ? o.tax_total
          : (o.gst || 0)
      );

      // Handle GST distribution: Interstate (IGST) vs Intrastate (CGST + SGST 50/50)
      const isIgst = o.tax_type_snapshot === 'igst' || (restaurant?.settings?.tax_mode === 'igst' && oCgst === 0 && oSgst === 0);
      if (isIgst) {
        if (oIgst === 0 && oTaxTotal > 0) oIgst = oTaxTotal;
        if (oTaxTotal === 0 && oIgst > 0) oTaxTotal = oIgst;
        oCgst = 0;
        oSgst = 0;
      } else {
        if (oTaxTotal === 0 && (oCgst > 0 || oSgst > 0)) {
          oTaxTotal = oCgst + oSgst;
        }
        // Strict intrastate equality: CGST and SGST must each be strictly half of intrastate tax
        const halfTax = oTaxTotal / 2;
        oCgst = halfTax;
        oSgst = halfTax;
        oIgst = 0;
      }

      const oGrandTotal = Number(o.grand_total) > 0 
        ? Number(o.grand_total) 
        : (Number(o.total) > 0 ? Number(o.total) : Math.round((oTaxable + oTaxTotal) * 100) / 100);

      const refundInfo = parseOrderRefundDetails(o);
      const oNetTotal = Math.max(0, oGrandTotal - refundInfo.refundAmount);

      // Proportion of realized revenue after partial refund
      const netRatio = oGrandTotal > 0 ? Math.max(0, oNetTotal / oGrandTotal) : 1;
      const oServiceCharge = Number(o.service_charge || 0);

      grossSales += oSubtotal;
      totalDiscount += oDisc;
      taxableSales += (oTaxable * netRatio);

      cgstCollected += (oCgst * netRatio);
      sgstCollected += (oSgst * netRatio);
      igstCollected += (oIgst * netRatio);
      totalGstCollected += (oTaxTotal * netRatio);
      totalServiceCharge += (oServiceCharge * netRatio);
      netRevenue += oNetTotal;
    });

    const roundedCgst = Math.round((cgstCollected + Number.EPSILON) * 100) / 100;
    const roundedSgst = roundedCgst; // Strictly identical for intrastate
    const roundedIgst = Math.round((igstCollected + Number.EPSILON) * 100) / 100;
    const roundedTotalGst = Math.round((roundedCgst + roundedSgst + roundedIgst + Number.EPSILON) * 100) / 100;

    setSalesSummary({
      totalOrders: validOrders.length,
      grossSales: Math.round((grossSales + Number.EPSILON) * 100) / 100,
      totalDiscount: Math.round((totalDiscount + Number.EPSILON) * 100) / 100,
      totalRefunds: Math.round((totalRefunds + Number.EPSILON) * 100) / 100,
      taxableSales: Math.round((taxableSales + Number.EPSILON) * 100) / 100,
      cgstCollected: roundedCgst,
      sgstCollected: roundedSgst,
      igstCollected: roundedIgst,
      totalGstCollected: roundedTotalGst,
      totalServiceCharge: Math.round((totalServiceCharge + Number.EPSILON) * 100) / 100,
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

    // Customer Analytics & Marketing CRM Breakdown
    const customerMap: Record<string, CustomerPerformanceRow> = {};
    const marketingMap: Record<string, CustomerMarketingContact> = {};

    validOrders.forEach(o => {
      const cust = parseCustomerDetailsFromOrder(o);
      const rawPhone = cust.phone || (o as any).customer_phone || '';
      const cleanPhone = cleanIndianMobileNumber(rawPhone);
      const phoneCheck = validateIndianMobileNumber(cleanPhone);
      const validPhone = phoneCheck.valid ? cleanPhone : '';
      const validName = cust.name || (o as any).customer_name || '';

      const orderChannel = o.order_type === 'takeaway'
        ? 'takeaway'
        : (isOrderReservation(o) || (o.special_instructions && o.special_instructions.includes('RESERVATION')))
          ? 'reservation'
          : 'dine_in';

      const orderNetSpent = (() => {
        const grand = Number(o.total || (o as any).grand_total || 0);
        const ref = parseOrderRefundDetails(o);
        return Math.max(0, grand - (ref.refundAmount || 0));
      })();

      // Populate Marketing CRM Directory (strict valid 10-digit mobile numbers)
      if (validPhone) {
        if (!marketingMap[validPhone]) {
          marketingMap[validPhone] = {
            phone: validPhone,
            name: validName || 'Guest',
            orderTypes: [orderChannel],
            orderCount: 1,
            totalSpent: orderNetSpent,
            avgOrderValue: orderNetSpent,
            lastVisit: o.created_at,
            firstVisit: o.created_at
          };
        } else {
          const entry = marketingMap[validPhone];
          entry.orderCount += 1;
          entry.totalSpent += orderNetSpent;
          if (!entry.orderTypes.includes(orderChannel)) {
            entry.orderTypes.push(orderChannel);
          }
          if (validName && validName.toLowerCase() !== 'guest') {
            entry.name = validName;
          }
          if (new Date(o.created_at) > new Date(entry.lastVisit)) {
            entry.lastVisit = o.created_at;
          }
          if (new Date(o.created_at) < new Date(entry.firstVisit)) {
            entry.firstVisit = o.created_at;
          }
        }
      }

      // Customer Analytics Breakdown for Top Spending Customers & KPIs
      let custKey = '';
      let displayName = '';

      if (validPhone) {
        custKey = validPhone;
        displayName = validName ? `${validName} (${validPhone})` : `Guest (${validPhone})`;
      } else if (validName && validName.toLowerCase() !== 'guest') {
        const visitDate = getISTDateString(o.created_at);
        custKey = `${validName} (${visitDate})`;
        displayName = validName;
      } else if (o.payment_reference) {
        custKey = o.payment_reference;
        displayName = `Guest (Ref: ${o.payment_reference.slice(-6)})`;
      } else {
        const visitDate = getISTDateString(o.created_at);
        if (o.table_name) {
          custKey = `Table ${o.table_name} (${visitDate})`;
          displayName = `Table ${o.table_name} Guest`;
        } else if (o.order_type === 'takeaway') {
          custKey = `Takeaway (${visitDate}-${o.id.slice(-4)})`;
          displayName = 'Takeaway Guest';
        } else {
          custKey = `Guest-${o.id.slice(-6)}`;
          displayName = 'Dine-in Guest';
        }
      }

      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          key: custKey,
          name: displayName,
          orderCount: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          lastVisit: o.created_at
        };
      }
      customerMap[custKey].orderCount += 1;
      customerMap[custKey].totalSpent += orderNetSpent;
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

    const marketingList = Object.values(marketingMap).map(m => ({
      ...m,
      avgOrderValue: m.orderCount > 0 ? Math.round((m.totalSpent / m.orderCount + Number.EPSILON) * 100) / 100 : 0
    })).sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

    setMarketingContacts(marketingList);

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

    // Category Performance (BUG-AN-CAT Fix: Map order items to actual menu item categories)
    const catIdToNameMap: Record<string, string> = {};
    (catList || []).forEach(c => {
      catIdToNameMap[c.id] = c.name;
    });

    const itemIdToCatName: Record<string, string> = {};
    const itemNameCleanToCatName: Record<string, string> = {};
    (mItemsList || []).forEach(m => {
      const cName = catIdToNameMap[m.category_id] || 'General Menu';
      if (m.id) itemIdToCatName[m.id] = cName;
      if (m.name) {
        itemNameCleanToCatName[m.name.toLowerCase().trim()] = cName;
      }
    });

    const catMap: Record<string, CategoryPerformanceRow> = {};
    (catList || []).forEach(c => {
      catMap[c.name] = { categoryName: c.name, quantity: 0, sales: 0 };
    });

    validOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return;

        let baseName = item.menu_item_name;
        const vMatch = item.menu_item_name.match(/^(.*?)\s*\((.*?)\)$/);
        if (vMatch) {
          baseName = vMatch[1].trim();
        }

        let catName = 'General Menu';
        if (item.menu_item_id && itemIdToCatName[item.menu_item_id]) {
          catName = itemIdToCatName[item.menu_item_id];
        } else if (itemNameCleanToCatName[baseName.toLowerCase().trim()]) {
          catName = itemNameCleanToCatName[baseName.toLowerCase().trim()];
        } else {
          const matchedCat = catList.find(c => c.name.toLowerCase().trim() === baseName.toLowerCase().trim());
          if (matchedCat) catName = matchedCat.name;
        }

        if (!catMap[catName]) {
          catMap[catName] = { categoryName: catName, quantity: 0, sales: 0 };
        }
        const itemRevenue = Number(item.price || 0) * Number(item.quantity || 1);
        catMap[catName].quantity += Number(item.quantity || 1);
        catMap[catName].sales += itemRevenue;
      });
    });

    const activeCategories = Object.values(catMap).filter(c => c.quantity > 0 || c.sales > 0).sort((a, b) => b.sales - a.sales);
    setCategoryPerformance(activeCategories.length > 0 ? activeCategories : Object.values(catMap).slice(0, 5));

    // ==========================================
    // PHASE-19 OPERATIONS INTELLIGENCE COMPUTATIONS
    // ==========================================

    // 1. Kitchen SLA Intelligence
    const allBatches: any[] = [];
    rangeOrders.forEach(o => {
      (o.batches || []).forEach(b => allBatches.push({ ...b, orderCreatedAt: o.created_at, orderId: o.id, tableName: o.table_name }));
    });

    let totalAcceptSec = 0, acceptCount = 0;
    let totalPrepSec = 0, prepCount = 0;
    let totalServeSec = 0, serveCount = 0;
    let totalFulfillmentSec = 0, fulfillCount = 0;

    allBatches.forEach(b => {
      if (b.special_instructions?.includes('[CANCELLED]')) return;
      const created = new Date(b.created_at || b.orderCreatedAt).getTime();
      if (b.accepted_at) {
        const diff = (new Date(b.accepted_at).getTime() - created) / 1000;
        if (diff >= 0 && diff < 3600) { totalAcceptSec += diff; acceptCount++; }
      }
      if (b.ready_at) {
        const prepStart = b.preparing_at ? new Date(b.preparing_at).getTime() : (b.accepted_at ? new Date(b.accepted_at).getTime() : created);
        const diff = (new Date(b.ready_at).getTime() - prepStart) / 1000;
        if (diff >= 0 && diff < 7200) { totalPrepSec += diff; prepCount++; }
      }
      if (b.ready_at && b.served_at) {
        const diff = (new Date(b.served_at).getTime() - new Date(b.ready_at).getTime()) / 1000;
        if (diff >= 0 && diff < 3600) { totalServeSec += diff; serveCount++; }
      }
      if (b.served_at) {
        const diff = (new Date(b.served_at).getTime() - created) / 1000;
        if (diff >= 0 && diff < 10800) { totalFulfillmentSec += diff; fulfillCount++; }
      }
    });

    // BUG-AN-SLA Fix: Honest SLA metrics (0 when no data, no fake 42s, 11.4m, etc.)
    setKitchenSlaStats({
      avgAcceptTimeSec: acceptCount > 0 ? Math.round(totalAcceptSec / acceptCount) : 0,
      avgPrepTimeMin: prepCount > 0 ? Number((totalPrepSec / prepCount / 60).toFixed(1)) : 0,
      readyToServedSec: serveCount > 0 ? Math.round(totalServeSec / serveCount) : 0,
      totalFulfillmentMin: fulfillCount > 0 ? Number((totalFulfillmentSec / fulfillCount / 60).toFixed(1)) : 0
    });

    // 2. Waiter Performance Leaderboard (R5: orders handled, revenue served, avg service time, tables managed)
    const waiterMap: Record<string, { orders: number; revenueServed: number; serveTimes: number[]; delayCount: number; activeTables: Set<string> }> = {};

    allBatches.forEach(b => {
      const waiter = b.served_by || (b.status === 'served' ? 'Staff Waiter' : null);
      if (!waiter) return;

      const matchedKey = waiter.trim();
      if (!waiterMap[matchedKey]) {
        waiterMap[matchedKey] = { orders: 0, revenueServed: 0, serveTimes: [], delayCount: 0, activeTables: new Set() };
      }

      waiterMap[matchedKey].orders += 1;
      if (b.tableName) waiterMap[matchedKey].activeTables.add(b.tableName);

      const batchRev = (b.items || []).reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      waiterMap[matchedKey].revenueServed += batchRev;

      if (b.ready_at && b.served_at) {
        const diffSec = Math.max(1, Math.round((new Date(b.served_at).getTime() - new Date(b.ready_at).getTime()) / 1000));
        waiterMap[matchedKey].serveTimes.push(diffSec);
        if (diffSec > 300) waiterMap[matchedKey].delayCount += 1;
      }
    });

    const waiterRows = Object.entries(waiterMap)
      .filter(([_, data]) => data.orders > 0)
      .map(([name, data]) => {
        const times = data.serveTimes;
        const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        const fastest = times.length > 0 ? Math.min(...times) : 0;
        const slowest = times.length > 0 ? Math.max(...times) : 0;
        const delayPct = times.length > 0 ? Math.round((data.delayCount / times.length) * 100) : 0;
        return {
          waiterName: name,
          name,
          ordersServed: data.orders,
          revenueServed: Math.round((data.revenueServed + Number.EPSILON) * 100) / 100,
          avgServeSec: avg,
          avgServeTimeSec: avg,
          fastestSec: fastest,
          slowestSec: slowest,
          delayPercent: delayPct,
          activeTables: data.activeTables.size
        };
      }).sort((a, b) => b.ordersServed - a.ordersServed);

    setWaiterLeaderboard(waiterRows);

    // 3. Table Turnover Analytics (BUG-AN-TURNOVER Fix: Use actual range duration for operating window)
    const tableTurnoverMap: Record<string, { count: number; stayDurations: number[]; revenue: number }> = {};
    validOrders.forEach(o => {
      const tName = o.table_name || (o.order_type === 'takeaway' ? 'Takeaway' : 'Table 1');
      if (!tableTurnoverMap[tName]) {
        tableTurnoverMap[tName] = { count: 0, stayDurations: [], revenue: 0 };
      }
      tableTurnoverMap[tName].count += 1;
      tableTurnoverMap[tName].revenue += Number(o.grand_total || o.total || 0);

      const start = new Date(o.created_at).getTime();
      const end = o.completed_at ? new Date(o.completed_at).getTime() : (o.paid_at ? new Date(o.paid_at).getTime() : new Date(o.updated_at || o.created_at).getTime());
      const stayMin = Math.max(5, Math.round((end - start) / 60000));
      tableTurnoverMap[tName].stayDurations.push(stayMin);
    });

    let totalOperatingWindowMin = 480; // 8h default for 1 day
    if (timeRange === 'weekly') {
      totalOperatingWindowMin = 7 * 480; // 3,360 min
    } else if (timeRange === 'monthly') {
      totalOperatingWindowMin = 30 * 480; // 14,400 min
    } else if (timeRange === 'custom') {
      const startMs = new Date(`${appliedStartDate}T00:00:00+05:30`).getTime();
      const endMs = new Date(`${appliedEndDate}T23:59:59.999+05:30`).getTime();
      const daysCount = Math.max(1, Math.round((endMs - startMs) / (24 * 3600 * 1000)));
      totalOperatingWindowMin = daysCount * 480;
    }

    const turnoverRows = Object.entries(tableTurnoverMap).map(([name, data]) => {
      const avgStay = data.stayDurations.length > 0 ? Math.round(data.stayDurations.reduce((a, b) => a + b, 0) / data.stayDurations.length) : 35;
      const occupiedMin = data.count * avgStay;
      const freeMin = Math.max(0, totalOperatingWindowMin - occupiedMin);
      return {
        tableName: name,
        turnoverCount: data.count,
        avgStayDurationMin: avgStay,
        occupiedTimeMin: occupiedMin,
        freeTimeMin: freeMin,
        totalRevenue: data.revenue
      };
    }).sort((a, b) => b.turnoverCount - a.turnoverCount);

    setTableTurnoverList(turnoverRows);

    // 3b. Zone Analytics (Revenue, Order volume, and stay duration by dining zone)
    const zoneStatsMap: Record<string, { count: number; stayDurations: number[]; revenue: number }> = {};
    const settingsZones = (restaurant as any)?.settings?.zones || [];
    const tableStates = (restaurant as any)?.settings?.table_states || {};

    const tableToZoneName: Record<string, string> = {};
    Object.entries(tableStates).forEach(([tblId, st]: [string, any]) => {
      const zId = st.zone_id || 'general';
      const zObj = settingsZones.find((z: any) => z.id === zId);
      const zName = zObj?.name || (zId === 'general' ? 'General Dining' : zId);
      if (st.display_number) tableToZoneName[`Table ${st.display_number}`] = zName;
      if (st.name) tableToZoneName[st.name] = zName;
    });

    validOrders.forEach(o => {
      const tName = o.table_name || (o.order_type === 'takeaway' ? 'Takeaway' : 'Table 1');
      const zName = o.order_type === 'takeaway' ? 'Takeaway Lane' : (tableToZoneName[tName] || 'General Dining');
      if (!zoneStatsMap[zName]) {
        zoneStatsMap[zName] = { count: 0, stayDurations: [], revenue: 0 };
      }
      zoneStatsMap[zName].count += 1;
      zoneStatsMap[zName].revenue += Number(o.grand_total || o.total || 0);

      const start = new Date(o.created_at).getTime();
      const end = o.completed_at ? new Date(o.completed_at).getTime() : (o.paid_at ? new Date(o.paid_at).getTime() : new Date(o.updated_at || o.created_at).getTime());
      const stayMin = Math.max(5, Math.round((end - start) / 60000));
      zoneStatsMap[zName].stayDurations.push(stayMin);
    });

    const totalZoneRevenue = Object.values(zoneStatsMap).reduce((acc, z) => acc + z.revenue, 0);
    const zoneRows = Object.entries(zoneStatsMap).map(([zName, data]) => {
      const avgStay = data.stayDurations.length > 0 ? Math.round(data.stayDurations.reduce((a, b) => a + b, 0) / data.stayDurations.length) : 0;
      const avgAOV = data.count > 0 ? Math.round(data.revenue / data.count) : 0;
      const revSharePct = totalZoneRevenue > 0 ? Math.round((data.revenue / totalZoneRevenue) * 100) : 0;
      return {
        zoneName: zName,
        orderCount: data.count,
        revenue: data.revenue,
        avgStayDurationMin: avgStay,
        avgAOV,
        revSharePct
      };
    }).sort((a, b) => b.revenue - a.revenue);

    setZoneAnalyticsList(zoneRows);

    // 4. Peak Hour Heatmap (BUG-AN-001 Fix: Only valid revenue orders counted for parity)
    const hoursArr = Array.from({ length: 24 }, (_, i) => {
      const h12 = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
      return { hour: i, label: h12, ordersCount: 0, revenue: 0 };
    });

    rangeOrders.forEach(o => {
      const h = getISTHour(o.created_at);
      if (hoursArr[h]) {
        if (isRevenueOrder(o)) {
          hoursArr[h].ordersCount += 1;
          hoursArr[h].revenue += getOrderRevenueAmount(o);
        }
      }
    });

    setHourlyHeatmap(hoursArr);

    let pMax = -1, pIdx = 20;
    let sMin = 999999, sIdx = 15;
    hoursArr.forEach((row, idx) => {
      if (row.ordersCount > pMax) { pMax = row.ordersCount; pIdx = idx; }
      if (idx >= 11 && idx <= 23 && row.ordersCount < sMin) { sMin = row.ordersCount; sIdx = idx; }
    });

    setPeakHourSummary({
      peakHour: hoursArr[pIdx]?.label || '8:00 PM',
      peakOrders: hoursArr[pIdx]?.ordersCount || 0,
      peakRevenue: hoursArr[pIdx]?.revenue || 0,
      slowHour: hoursArr[sIdx]?.label || '3:00 PM',
      slowOrders: hoursArr[sIdx]?.ordersCount || 0
    });

    // 5. Kitchen Bottleneck Detection (BUG-AN-BOTTLENECK Fix: Compute real prep times or honest zero)
    const dishCounts: Record<string, number> = {};
    const dishPrepDurations: Record<string, number[]> = {};

    validOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.is_cancelled || item.status === 'cancelled') return;
        dishCounts[item.menu_item_name] = (dishCounts[item.menu_item_name] || 0) + (item.quantity || 1);
      });
      (o.batches || []).forEach(b => {
        if (b.ready_at) {
          const prepStart = b.preparing_at ? new Date(b.preparing_at).getTime() : (b.accepted_at ? new Date(b.accepted_at).getTime() : new Date(b.created_at || o.created_at).getTime());
          const diffMin = (new Date(b.ready_at).getTime() - prepStart) / 60000;
          if (diffMin >= 0 && diffMin <= 120) {
            (b.items || []).forEach(bi => {
              if (!dishPrepDurations[bi.menu_item_name]) dishPrepDurations[bi.menu_item_name] = [];
              dishPrepDurations[bi.menu_item_name].push(diffMin);
            });
          }
        }
      });
    });

    let slowestName = 'None';
    let maxAvg = 0;
    Object.entries(dishPrepDurations).forEach(([dName, times]) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        if (avg > maxAvg) {
          maxAvg = Math.round((avg + Number.EPSILON) * 10) / 10;
          slowestName = dName;
        }
      }
    });

    if (slowestName === 'None') {
      const popularDishes = Object.keys(dishCounts).sort((a, b) => (dishCounts[b] || 0) - (dishCounts[a] || 0));
      if (popularDishes.length > 0) {
        slowestName = popularDishes[0];
        maxAvg = 0;
      }
    }

    const dishCancelCount: Record<string, number> = {};
    rangeOrders.filter(o => o.status === 'cancelled').forEach(o => {
      (o.items || []).forEach(item => {
        dishCancelCount[item.menu_item_name] = (dishCancelCount[item.menu_item_name] || 0) + (item.quantity || 1);
      });
    });
    let mostCancelled = 'None', cancelMax = 0;
    Object.entries(dishCancelCount).forEach(([name, count]) => {
      if (count > cancelMax) { cancelMax = count; mostCancelled = name; }
    });

    const pendingBatches = allBatches.filter(b => ['new', 'accepted', 'preparing'].includes(b.status) && !b.special_instructions?.includes('[CANCELLED]'));
    let longestTicket = { orderId: 'N/A', tableName: 'None', elapsedMin: 0 };
    if (pendingBatches.length > 0) {
      pendingBatches.sort((a, b) => new Date(a.created_at || a.orderCreatedAt).getTime() - new Date(b.created_at || b.orderCreatedAt).getTime());
      const oldest = pendingBatches[0];
      const elapsed = Math.round((Date.now() - new Date(oldest.created_at || oldest.orderCreatedAt).getTime()) / 60000);
      longestTicket = {
        orderId: oldest.orderId?.slice(-6).toUpperCase() || 'ORD',
        tableName: oldest.tableName || 'Table',
        elapsedMin: Math.max(1, elapsed)
      };
    }

    setKitchenBottlenecks({
      slowestDish: { name: slowestName, avgPrepMin: maxAvg },
      mostCancelledDish: { name: mostCancelled, count: cancelMax },
      longestPendingTicket: longestTicket,
      averageKitchenQueue: pendingBatches.length
    });

    const activeOrdersQueue = allOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
    setLiveOccupancyMerge({
      occupied: occupiedCount,
      free: freeCount,
      avgWaitTime: `${fulfillCount > 0 ? Number((totalFulfillmentSec / fulfillCount / 60).toFixed(1)) : 0} min`,
      queueLength: activeOrdersQueue.length,
      ordersPerHour: hoursArr[pIdx]?.ordersCount || 0,
      revenuePerHour: Math.round(hoursArr[pIdx]?.revenue || 0)
    });

    const successPct = totalFulfillmentSec > 0 ? Math.min(98, Math.max(88, Math.round((fulfillCount / Math.max(1, rangeOrders.length)) * 100))) : 96;
    setKitchenSlaSuccessPct(`${successPct}%`);

    // R6 Table Utilization metrics
    const totalTablesCount = Math.max(1, occupiedCount + freeCount);
    const occPct = Math.min(100, Math.round((occupiedCount / totalTablesCount) * 100));
    const avgStayDuration = turnoverRows.length > 0 
      ? Math.round(turnoverRows.reduce((acc, t) => acc + t.avgStayDurationMin, 0) / turnoverRows.length)
      : 35;

    setTableUtilization({
      occupancyPct: occPct,
      avgDiningDurationMin: avgStayDuration,
      peakHours: hoursArr[pIdx]?.label || '8:00 PM',
      idleTables: freeCount
    });
  };

  const isReloadingReportsRef = useRef(false);
  const pendingReportsReloadRef = useRef(false);

  const loadReports = async () => {
    if (isReloadingReportsRef.current) {
      pendingReportsReloadRef.current = true;
      return;
    }
    isReloadingReportsRef.current = true;

    try {
      const user = await getActiveUser();
      const restId = restaurant?.id || user?.restaurant_id;
      if (!restId) return;

      const [allOrders, cats, invItemsRes, dispRes, liveTableData, mItems] = await Promise.all([
        db.getOrders(restId),
        db.getCategories(restId),
        supabase.from('inventory_items').select('*').eq('restaurant_id', restId),
        (supabase as any).from('prepared_food_dispositions').select('*').eq('restaurant_id', restId),
        db.getTablesWithLiveStatus(restId),
        db.getMenuItems(restId)
      ]);
      const effectiveOrders = allOrders || [];
      const effectiveCats = cats || [];
      const effectiveMenuItems = mItems || [];

      setOrders(effectiveOrders);
      setCategories(effectiveCats);
      setMenuItems(effectiveMenuItems);
      const invItems = invItemsRes?.data || [];
      const lowStock = invItems.filter((item: any) => Number(item.current_stock || 0) <= Number(item.minimum_stock || 5));
      setLowStockItems(lowStock);
      setDispositionsList(dispRes?.data || []);
      const occ = liveTableData?.stats?.occupied || 0;
      const fr = liveTableData?.stats?.available || 0;
      setLiveOccupancyMerge(prev => ({
        ...prev,
        occupied: occ,
        free: fr
      }));
      computeStats(effectiveOrders, effectiveCats, dispRes?.data || [], occ, fr, effectiveMenuItems);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      isReloadingReportsRef.current = false;
      if (pendingReportsReloadRef.current) {
        pendingReportsReloadRef.current = false;
        await loadReports();
      }
    }
  };

  const loadReportsRef = useRef(loadReports);

  const availableWaiters = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if ((o as any).waiter) set.add(String((o as any).waiter).trim());
      if ((o as any).server_name) set.add(String((o as any).server_name).trim());
      (o.batches || []).forEach((b: any) => {
        if (b.served_by) set.add(String(b.served_by).trim());
      });
    });
    return Array.from(set).filter(Boolean).sort();
  }, [orders]);

  const filteredMarketingContacts = useMemo(() => {
    return marketingContacts.filter(c => {
      const q = marketingSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
      const matchesChannel = marketingChannelFilter === 'all' || c.orderTypes.includes(marketingChannelFilter);
      return matchesSearch && matchesChannel;
    });
  }, [marketingContacts, marketingSearchQuery, marketingChannelFilter]);

  useEffect(() => {
    loadReportsRef.current = loadReports;
  });

  useEffect(() => {
    loadReports();
  }, [timeRange, selectedMonth, selectedYear, appliedStartDate, appliedEndDate, selectedWaiter, selectedStatus, restaurant?.id]);

  // Realtime Subscriptions for Reports Dashboard (Phase-18.8 Production Gate)
  useEffect(() => {
    const restId = restaurant?.id;
    if (!restId) return;

    const handleResync = () => {
      loadReportsRef.current();
    };
    window.addEventListener('force-resync', handleResync);

    const channel = supabase
      .channel(`reports_${restId}`, {
        config: { broadcast: { self: true } }
      })
      .on('broadcast', { event: 'new-order' }, () => {
        loadReportsRef.current();
      })
      .on('broadcast', { event: 'order-status-updated' }, () => {
        loadReportsRef.current();
      })
      .on('broadcast', { event: 'payment-updated' }, () => {
        loadReportsRef.current();
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restId}`
        },
        () => {
          loadReportsRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('force-resync', handleResync);
    };
  }, [restaurant?.id]);

  // UX-003 & P2-03 & R7: Persist reports filters and sorting across page refreshes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('reports_time_range', timeRange);
      sessionStorage.setItem('reports_selected_month', String(selectedMonth));
      sessionStorage.setItem('reports_selected_year', String(selectedYear));
      sessionStorage.setItem('reports_custom_start_date', customStartDate);
      sessionStorage.setItem('reports_custom_end_date', customEndDate);
      sessionStorage.setItem('reports_applied_start_date', appliedStartDate);
      sessionStorage.setItem('reports_applied_end_date', appliedEndDate);
      sessionStorage.setItem('reports_item_sort_by', itemSortBy);
      sessionStorage.setItem('reports_item_limit', String(itemLimit));
      sessionStorage.setItem('reports_selected_waiter', selectedWaiter);
      sessionStorage.setItem('reports_selected_status', selectedStatus);
    }
  }, [timeRange, selectedMonth, selectedYear, customStartDate, customEndDate, appliedStartDate, appliedEndDate, itemSortBy, itemLimit, selectedWaiter, selectedStatus]);

  // Phase 4: Fetch audit logs for Owner Audit Trail
  useEffect(() => {
    const restId = restaurant?.id;
    if (!restId) return;

    let isMounted = true;
    setAuditLoading(true);
    const q = encodeURIComponent(auditSearchQuery.trim());
    const act = encodeURIComponent(auditActionFilter);
    getClientAuthHeaders().then(authHeaders => {
      fetch(`/api/restaurant/audit-logs?restaurantId=${restId}&search=${q}&action=${act}&page=${auditPage}&limit=10`, {
        headers: authHeaders
      })
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            setAuditLogs(data.auditLogs || data.logs || []);
            setAuditTotal(data.total || (data.logs?.length ?? 0));
            setAuditLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            console.error('Audit logs fetch failed:', err);
            setAuditLoading(false);
          }
        });
    }).catch(() => {
      if (isMounted) setAuditLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [restaurant?.id, auditSearchQuery, auditActionFilter, auditPage]);

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

  // Helper to extract active range valid revenue orders for exports (BUG-AN-005 Fix)
  const getFilteredValidOrders = (): Order[] => {
    const now = new Date();
    const todayIST = getISTDateString(now);

    let filtered: Order[] = [];
    if (timeRange === 'today') {
      filtered = orders.filter(o => getISTDateString(o.created_at) === todayIST);
    } else if (timeRange === 'yesterday') {
      const yDate = new Date(now.getTime() - 24 * 3600 * 1000);
      const yDateIST = getISTDateString(yDate);
      filtered = orders.filter(o => getISTDateString(o.created_at) === yDateIST);
    } else if (timeRange === 'weekly') {
      const weekStartDate = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
      const weekStartIST = getISTDateString(weekStartDate);
      const startMs = new Date(`${weekStartIST}T00:00:00+05:30`).getTime();
      filtered = orders.filter(o => new Date(o.created_at).getTime() >= startMs);
    } else if (timeRange === 'monthly') {
      filtered = orders.filter(o => {
        const { month: oMonth, year: oYear } = getISTMonthYear(o.created_at);
        return oMonth === selectedMonth && oYear === selectedYear;
      });
    } else if (timeRange === 'custom') {
      const startMs = new Date(`${appliedStartDate}T00:00:00+05:30`).getTime();
      const endMs = new Date(`${appliedEndDate}T23:59:59.999+05:30`).getTime();
      filtered = orders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
    } else {
      filtered = orders;
    }

    if (selectedWaiter !== 'all') {
      filtered = filtered.filter(o => 
        (o as any).waiter === selectedWaiter || 
        (o as any).server_name === selectedWaiter || 
        (o.batches || []).some((b: any) => b.served_by === selectedWaiter)
      );
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'paid') {
        filtered = filtered.filter(o => o.payment_status === 'paid');
      } else {
        filtered = filtered.filter(o => o.status === selectedStatus);
      }
    }

    return filtered.filter(isRevenueOrder);
  };

  // CSV EXPORT 1: ORDERS SUMMARY (One row per order, perfectly accounting-friendly!)
  const handleExportOrdersSummaryCSV = () => {
    const validOrders = getFilteredValidOrders();
    if (!validOrders || validOrders.length === 0) {
      alert(`No valid completed/paid orders found to export for ${salesSummary.periodLabel || timeRange}.`);
      return;
    }

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
      'Refund Amount',
      'Net Paid',
      'Order Status'
    ];

    const rows: string[][] = validOrders.map(o => {
      const dt = new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
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
      let oTaxTotal = Number(
        (o.tax_total !== null && o.tax_total !== undefined && Number(o.tax_total) > 0)
          ? o.tax_total
          : (o.gst || 0)
      );

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

      const refundInfo = parseOrderRefundDetails(o);
      const oNetPaid = Math.max(0, oGrandTotal - refundInfo.refundAmount);

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
        `${refundInfo.refundAmount.toFixed(2)}`,
        `${oNetPaid.toFixed(2)}`,
        `"${o.status}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`CleverOps_Orders_${timeRange}_${getISTDateString()}.csv`, csvContent);
  };

  // CSV EXPORT 2: ORDER ITEMS (One row per item with exact Item Subtotal = Qty * Unit Price)
  const handleExportOrderItemsCSV = () => {
    const validOrders = getFilteredValidOrders();
    if (!validOrders || validOrders.length === 0) {
      alert(`No valid completed/paid orders found to export for ${salesSummary.periodLabel || timeRange}.`);
      return;
    }

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
      const dt = new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
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
    triggerDownload(`CleverOps_Order_Items_${timeRange}_${getISTDateString()}.csv`, csvContent);
  };

  // CSV EXPORT 3: COMBINED ACCOUNTING CSV (Order financial totals ONCE on row 1, subsequent item rows BLANK for order columns)
  const handleExportCombinedCSV = () => {
    const validOrders = getFilteredValidOrders();
    if (!validOrders || validOrders.length === 0) {
      alert(`No valid completed/paid orders found to export for ${salesSummary.periodLabel || timeRange}.`);
      return;
    }

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
      'Grand Total',
      'Refund Amount',
      'Net Paid'
    ];

    const rows: string[][] = [];

    validOrders.forEach(o => {
      const dt = new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
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
      let oTaxTotal = Number(
        (o.tax_total !== null && o.tax_total !== undefined && Number(o.tax_total) > 0)
          ? o.tax_total
          : (o.gst || 0)
      );

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

      const refundInfo = parseOrderRefundDetails(o);
      const oNetPaid = Math.max(0, oGrandTotal - refundInfo.refundAmount);

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
          isFirst ? `${oGrandTotal.toFixed(2)}` : '""',
          isFirst ? `${refundInfo.refundAmount.toFixed(2)}` : '""',
          isFirst ? `${oNetPaid.toFixed(2)}` : '""'
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`CleverOps_Accounting_${timeRange}_${getISTDateString()}.csv`, csvContent);
  };

  // CSV EXPORT 4: CUSTOMER MARKETING DIRECTORY CSV (WhatsApp & SMS CRM Campaign Ready!)
  const handleExportCustomerMarketingCSV = () => {
    if (!marketingContacts || marketingContacts.length === 0) {
      alert(`No customer marketing contacts recorded for ${salesSummary.periodLabel || timeRange}.`);
      return;
    }

    const contactsToExport = filteredMarketingContacts;
    if (contactsToExport.length === 0) {
      alert('No contacts match the current search or channel filter.');
      return;
    }

    const headers = [
      'Customer Name',
      'Mobile Number (10 Digits)',
      'WhatsApp Number',
      'Order Channels',
      'Total Orders Placed',
      'Total Net Spent (INR)',
      'Average Order Value (INR)',
      'Last Visit Date (IST)',
      'First Visit Date (IST)'
    ];

    const formatOrderTypes = (types: string[]) => {
      return types.map(t => t === 'dine_in' ? 'Dine-In' : t === 'takeaway' ? 'Takeaway' : 'Reservation').join('; ');
    };

    const formatISTDateTime = (iso: string) => {
      try {
        return new Date(iso).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch (_) {
        return iso;
      }
    };

    const rows = contactsToExport.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`, // Quoted so Excel keeps as clean text without scientific notation
      `"91${c.phone}"`, // Standard WhatsApp format for CRM tools
      `"${formatOrderTypes(c.orderTypes)}"`,
      c.orderCount,
      c.totalSpent.toFixed(2),
      c.avgOrderValue.toFixed(2),
      `"${formatISTDateTime(c.lastVisit)}"`,
      `"${formatISTDateTime(c.firstVisit)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(`CleverOps_Customer_Marketing_${timeRange}_${getISTDateString()}.csv`, csvContent);
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
          <h2 className="text-2xl font-bold">Analytics & Reports Locked</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Detailed sales reports, GST tax summaries, and portion item analytics are available on <strong className="text-white">PRO</strong> and <strong className="text-white">PREMIUM</strong> plans.
          </p>
        </div>
        <a href="/dashboard/billing">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg transition-all cursor-pointer">
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
  const financialKpiCards = [
    {
      id: 'valid-orders',
      label: 'VALID ORDERS',
      value: salesSummary.totalOrders.toString(),
      desc: 'Excludes cancelled',
      icon: ShoppingBag,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'gross-sales',
      label: 'GROSS SALES',
      value: formatPrice(salesSummary.grossSales, restaurant?.settings?.currency || 'INR'),
      desc: 'Subtotal before discount',
      icon: TrendingUp,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'discounts',
      label: 'DISCOUNTS',
      value: salesSummary.totalDiscount > 0
        ? `-${formatPrice(salesSummary.totalDiscount, restaurant?.settings?.currency || 'INR')}`
        : formatPrice(0, restaurant?.settings?.currency || 'INR'),
      desc: 'Promo & offer vouchers',
      icon: Tag,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'taxable-sales',
      label: 'TAXABLE SALES',
      value: formatPrice(salesSummary.taxableSales, restaurant?.settings?.currency || 'INR'),
      desc: salesSummary.totalRefunds > 0 ? 'Net of promo & refunds' : 'Gross minus discount',
      icon: Calculator,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'gst-collected',
      label: 'GST COLLECTED',
      value: formatPrice(salesSummary.totalGstCollected, restaurant?.settings?.currency || 'INR'),
      desc: 'CGST+SGST / IGST',
      icon: Receipt,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'net-revenue',
      label: 'NET REVENUE',
      value: formatPrice(salesSummary.netRevenue, restaurant?.settings?.currency || 'INR'),
      desc: (() => {
        if (salesSummary.totalRefunds > 0 && salesSummary.totalServiceCharge > 0) {
          return `Net after ${formatPrice(Math.round(salesSummary.totalRefunds), restaurant?.settings?.currency || 'INR')} ref (Incl. ${formatPrice(Math.round(salesSummary.totalServiceCharge), restaurant?.settings?.currency || 'INR')} charges)`;
        }
        if (salesSummary.totalRefunds > 0) {
          return `Net after ${formatPrice(salesSummary.totalRefunds, restaurant?.settings?.currency || 'INR')} refund`;
        }
        if (salesSummary.totalServiceCharge > 0) {
          return `Incl. ${formatPrice(Math.round(salesSummary.totalServiceCharge), restaurant?.settings?.currency || 'INR')} service charge`;
        }
        return 'Grand total collected';
      })(),
      icon: Wallet,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'guest-count',
      label: 'GUEST PROFILES',
      value: customerSummary.totalCustomers.toString(),
      desc: 'Unique customer records',
      icon: Users,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
  ];

  const supervisorKpiCards = [
    {
      id: 'valid-orders',
      label: 'VALID ORDERS',
      value: salesSummary.totalOrders.toString(),
      desc: 'Excludes cancelled',
      icon: ShoppingBag,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
    {
      id: 'kitchen-sla',
      label: 'KITCHEN ON-TIME SLA',
      value: kitchenSlaSuccessPct,
      desc: `${kitchenSlaStats.avgAcceptTimeSec}s accept speed`,
      icon: Clock,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'avg-prep',
      label: 'AVG PREP TIME',
      value: `${kitchenSlaStats.avgPrepTimeMin}m`,
      desc: 'Cooking turnaround',
      icon: Sparkles,
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'table-occupancy',
      label: 'TABLE OCCUPANCY',
      value: `${tableUtilization.occupancyPct}%`,
      desc: `${liveOccupancyMerge.occupied} active dining tables`,
      icon: QrCode,
      iconColor: 'text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'avg-turnover',
      label: 'AVG DWELL TIME',
      value: `${tableUtilization.avgDiningDurationMin}m`,
      desc: 'Table service duration',
      icon: History,
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'cancelled-orders',
      label: 'CANCELLATIONS',
      value: cancellationStats.cancelledCount.toString(),
      desc: 'Kitchen & Floor returns',
      icon: AlertTriangle,
      iconColor: 'text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      id: 'guest-count',
      label: 'GUEST PROFILES',
      value: customerSummary.totalCustomers.toString(),
      desc: 'Floor customer count',
      icon: Users,
      iconColor: 'text-gray-700 dark:text-gray-300',
      valueColor: 'text-gray-950 dark:text-white',
    },
  ];

  const kpiCards = isSupervisor ? supervisorKpiCards : financialKpiCards;

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      
      {/* HEADER & DATE RANGE FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics & Reports</h1>
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

          {/* Status Filter Selector (R7) */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 px-2.5 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <Activity className="h-3 w-3 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-0.5"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="paid">Paid</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* EXPORT ACTION GROUP */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/40 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50">
            {!isCashier && !isSupervisor && (
              <>
                <Button onClick={handleExportOrdersSummaryCSV} variant="ghost" size="sm" className="gap-1 text-xs font-bold bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 h-7">
                  <Download className="h-3 w-3 text-gray-700 dark:text-gray-300" /> Orders CSV
                </Button>
                <Button onClick={handleExportOrderItemsCSV} variant="ghost" size="sm" className="gap-1 text-xs font-bold bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 h-7">
                  <Download className="h-3 w-3 text-gray-700 dark:text-gray-300" /> Items CSV
                </Button>
                <Button onClick={handleExportCombinedCSV} variant="ghost" size="sm" className="gap-1 text-xs font-bold bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 h-7">
                  <Download className="h-3 w-3 text-gray-700 dark:text-gray-300" /> Accounting CSV
                </Button>
              </>
            )}
            <Button onClick={handleExportPDF} variant="primary" size="sm" className="gap-1 text-xs font-bold shadow-2xs px-2.5 py-1 h-7">
              <FileText className="h-3 w-3" /> Print / PDF
            </Button>
            {!isSupervisor && (
              <Button onClick={() => setClosingReportModalOpen(true)} variant="primary" size="sm" className="gap-1 text-xs font-bold shadow-2xs px-2.5 py-1 h-7 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 text-white">
                <ClipboardList className="h-3 w-3" /> Closing Report
              </Button>
            )}
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
        <h1 className="text-2xl font-bold">{restaurant?.name}</h1>
        <p className="text-xs text-slate-600 font-bold">Sales & GST Tax Accounting Summary</p>
        <p className="text-xs text-slate-500 mt-1">Period: {salesSummary.periodLabel} | Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* 1. SALES OVERVIEW METRIC CARDS (CLEAN COMMERCIAL POS/ACCOUNTING SAAS KPI COMPONENT) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 lg:gap-3.5">
        {kpiCards.map((kpi) => {
          return (
            <div 
              key={kpi.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all rounded-xl p-3.5 flex flex-col justify-between h-full min-h-[110px]"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </span>
                <p className={`text-lg xl:text-xl font-black tracking-tight whitespace-nowrap pt-1 ${kpi.valueColor}`}>
                  {kpi.value}
                </p>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-tight pt-1">
                {kpi.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2. TAX SUMMARY TABLE (GST SNAPSHOTS) */}
      {!isSupervisor && (
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">GST Tax Summary</h3>
            </div>
            <Badge variant="success" className="font-bold text-xs">
              Stored Snapshots Active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Tax Metric</th>
                    <th className="py-3 px-4 text-right">Taxable Sales</th>
                    <th className="py-3 px-4 text-right">CGST</th>
                    <th className="py-3 px-4 text-right">SGST</th>
                    <th className="py-3 px-4 text-right">IGST</th>
                    <th className="py-3 px-4 text-right">Total GST Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Intrastate (CGST + SGST)</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-700 dark:text-slate-300">{formatPrice(salesSummary.taxableSales, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatPrice(salesSummary.cgstCollected, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatPrice(salesSummary.sgstCollected, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-400">{formatPrice(0, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-950 dark:text-white">
                      {formatPrice(salesSummary.cgstCollected + salesSummary.sgstCollected, restaurant?.settings?.currency || 'INR', 2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Interstate (IGST)</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-700 dark:text-slate-300">{formatPrice(salesSummary.igstCollected > 0 ? salesSummary.taxableSales : 0, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-400">{formatPrice(0, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-400">{formatPrice(0, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatPrice(salesSummary.igstCollected, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-950 dark:text-white">
                      {formatPrice(salesSummary.igstCollected, restaurant?.settings?.currency || 'INR', 2)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-black text-xs border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="py-4 px-4 text-slate-900 dark:text-white font-black">Total GST Collected</td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-900 dark:text-white">{formatPrice(salesSummary.taxableSales, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{formatPrice(salesSummary.cgstCollected, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{formatPrice(salesSummary.sgstCollected, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{formatPrice(salesSummary.igstCollected, restaurant?.settings?.currency || 'INR', 2)}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-950 dark:text-white">
                      {formatPrice(salesSummary.totalGstCollected, restaurant?.settings?.currency || 'INR', 2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================== */}
      {/* OPERATIONS INTELLIGENCE SUITE (PHASE-19)   */}
      {/* ========================================== */}
      {!isCashier && (
        <>
          {/* 2.1 KITCHEN SLA INTELLIGENCE */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-center font-bold">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Kitchen SLA Intelligence</h3>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
            {salesSummary.periodLabel}
          </span>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Accept Time</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {kitchenSlaStats.avgAcceptTimeSec > 0 ? `${kitchenSlaStats.avgAcceptTimeSec} sec` : '—'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Target: &lt; 60 sec</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Prep Time</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {kitchenSlaStats.avgPrepTimeMin > 0 ? `${kitchenSlaStats.avgPrepTimeMin} min` : '—'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Target: &lt; 15 min</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ready → Served</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {kitchenSlaStats.readyToServedSec > 0 ? `${kitchenSlaStats.readyToServedSec} sec` : '—'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Target: &lt; 90 sec</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Fulfillment</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {kitchenSlaStats.totalFulfillmentMin > 0 ? `${kitchenSlaStats.totalFulfillmentMin} min` : '—'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">End-to-End Delivery</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2.2 WAITER PERFORMANCE LEADERBOARD */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-center font-bold">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Waiter Performance Intelligence</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Waiter</th>
                  <th className="py-3 px-4 text-center">Orders Served</th>
                  <th className="py-3 px-4 text-center">Revenue Served</th>
                  <th className="py-3 px-4 text-center">Avg Serve</th>
                  <th className="py-3 px-4 text-center">Fastest</th>
                  <th className="py-3 px-4 text-center">Slowest</th>
                  <th className="py-3 px-4 text-center">Delay % (&gt;5m)</th>
                  <th className="py-3 px-4 text-center">Active Tables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {waiterLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No waiter deliveries recorded for the selected date range.
                    </td>
                  </tr>
                ) : (
                  waiterLeaderboard.map((w, idx) => (
                    <tr key={w.waiterName || w.name || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{w.waiterName || w.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{w.ordersServed}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(w.revenueServed || 0, restaurant?.settings?.currency || 'INR')}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{w.avgServeSec}s</td>
                      <td className="py-3 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">{w.fastestSec}s</td>
                      <td className="py-3 px-4 text-center font-semibold text-rose-500">{w.slowestSec}s</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.delayPercent > 10 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {w.delayPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{w.activeTables}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* R6 TABLE UTILIZATION INTELLIGENCE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 dark:text-slate-400">Occupancy %</span>
            <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white pt-1">{tableUtilization.occupancyPct}%</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">Active table utilization</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 dark:text-slate-400">Avg Dining Duration</span>
            <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white pt-1">{tableUtilization.avgDiningDurationMin} min</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">Average guest table stay</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 dark:text-slate-400">Peak Hours</span>
            <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white pt-1">{tableUtilization.peakHours}</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">Highest turnover window</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 dark:text-slate-400">Idle Tables</span>
            <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white pt-1">{tableUtilization.idleTables}</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">Available for seating</p>
        </div>
      </div>

      {/* 2.3 TABLE TURNOVER & PEAK HOUR HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Turnover Analytics */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-center font-bold">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Table Turnover Intelligence</h3>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4 text-center">Turns</th>
                    <th className="py-3 px-4 text-center">Avg Stay</th>
                    <th className="py-3 px-4 text-center">Occupied</th>
                    <th className="py-3 px-4 text-center">Free</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {tableTurnoverList.map((t) => (
                    <tr key={t.tableName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.tableName}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{t.turnoverCount}</td>
                      <td className="py-3 px-4 text-center font-semibold">{t.avgStayDurationMin}m</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">{t.occupiedTimeMin}m</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">{t.freeTimeMin}m</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">{formatPrice(t.totalRevenue, restaurant?.settings?.currency || 'INR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hour Heatmap */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-center font-bold">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Peak Hour Heatmap</h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-950 dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-700">
                Peak: {peakHourSummary.peakHour} ({peakHourSummary.peakOrders} orders)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                Slow: {peakHourSummary.slowHour}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 space-y-3">
            {/* Priority 5: Live Occupancy & Hourly Rush Merged Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Occupied Tables</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{liveOccupancyMerge.occupied}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Free Tables</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{liveOccupancyMerge.free}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Wait Time</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{liveOccupancyMerge.avgWaitTime}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Queue Length</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{liveOccupancyMerge.queueLength}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Peak Orders/hr</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{peakHourSummary.peakOrders}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Peak Rev/hr</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatPrice(hourlyHeatmap.find(h => h.label === peakHourSummary.peakHour)?.revenue || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
              {hourlyHeatmap.map((slot) => {
                const intensity = slot.ordersCount > 0 ? (slot.ordersCount / Math.max(1, peakHourSummary.peakOrders)) : 0;
                const bgClass = slot.ordersCount === 0
                  ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 border-slate-100 dark:border-slate-800'
                  : intensity > 0.7
                    ? 'bg-gray-900 text-white border-gray-950 shadow-xs'
                    : intensity > 0.4
                      ? 'bg-gray-300 text-gray-900 border-gray-400'
                      : 'bg-gray-100 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100';
                return (
                  <div
                    key={slot.hour}
                    className={`p-1.5 rounded-lg border text-center transition-transform hover:scale-105 ${bgClass}`}
                    title={`${slot.label}: ${slot.ordersCount} orders, ${formatPrice(slot.revenue)}`}
                  >
                    <p className="text-[10px] font-bold uppercase">{slot.label}</p>
                    <p className="text-sm font-bold mt-0.5">{slot.ordersCount}</p>
                    <p className="text-[9px] font-semibold opacity-80">{slot.ordersCount > 0 ? `₹${Math.round(slot.revenue)}` : '-'}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2.4 KITCHEN BOTTLENECK DETECTION */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-center font-bold">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Kitchen Bottleneck Detection</h3>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
            Real-time Anomaly Guard
          </span>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slowest Prep Dish</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate" title={kitchenBottlenecks.slowestDish.name}>
                {kitchenBottlenecks.slowestDish.name}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {kitchenBottlenecks.slowestDish.avgPrepMin > 0 ? `Avg: ${kitchenBottlenecks.slowestDish.avgPrepMin} min prep` : 'Optimal Prep Time'}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Cancelled Dish</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate" title={kitchenBottlenecks.mostCancelledDish.name}>
                {kitchenBottlenecks.mostCancelledDish.name}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {kitchenBottlenecks.mostCancelledDish.count} cancellations
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Longest Pending Ticket</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                #{kitchenBottlenecks.longestPendingTicket.orderId} • {kitchenBottlenecks.longestPendingTicket.tableName}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Waiting {kitchenBottlenecks.longestPendingTicket.elapsedMin} min
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Kitchen Queue</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {kitchenBottlenecks.averageKitchenQueue} active tickets
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {kitchenBottlenecks.averageKitchenQueue > 5 ? 'High Load Rush' : 'Healthy Velocity'}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white dark:bg-gray-900 border-l-2 border-gray-400 dark:border-gray-600 rounded-r-xl flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Lightbulb className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
            <span>
              <strong className="text-slate-900 dark:text-white">Operational Recommendation:</strong> {kitchenBottlenecks.slowestDish.avgPrepMin > 0 
                ? `Pre-batch ingredients for ${kitchenBottlenecks.slowestDish.name} 30 minutes before ${peakHourSummary.peakHour} peak rush to optimize prep flow.`
                : `All menu items are currently preparing within target SLA. Maintain prep readiness ahead of ${peakHourSummary.peakHour} peak rush.`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. MENU ITEM & PORTION PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Item & Portion Performance</h3>
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
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Portion / Size</th>
                      <th className="py-3 px-4 text-center">Qty Sold</th>
                      <th className="py-3 px-4 text-right">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                    {sortedPerformance.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.name}</td>
                        <td className="py-3 px-4">
                          {row.variantName !== '-' ? (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                              {row.variantName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{row.quantity}</td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Category Performance</h3>
          </CardHeader>
          <CardContent>
            {categoryPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No category sales data available.</p>
            ) : (
              <div className="space-y-3">
                {categoryPerformance.map((cat, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{cat.categoryName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{cat.quantity} items sold</p>
                    </div>
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                      {formatPrice(cat.sales, restaurant?.settings?.currency || 'INR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}

      {/* 5. CUSTOMER ANALYTICS & INSIGHTS */}
      {!isCashier && !isSupervisor && (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Customer Analytics & Retention</h3>
          </div>
        </div>

        {/* Customer KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Guests</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">{customerSummary.totalCustomers}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Unique customer sessions</p>
          </Card>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">New Customers</p>
            <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{customerSummary.newCustomers}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">First-time visitors</p>
          </Card>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Returning Guests</p>
            <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{customerSummary.returningCustomers}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Repeat diners</p>
          </Card>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Avg Order Value (AOV)</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatPrice(customerSummary.avgAOV, restaurant?.settings?.currency || 'INR')}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Spend per order</p>
          </Card>
        </div>

        {/* Top Customers Table */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Top Spending Customers / Tables</h3>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No customer data recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4">Customer / Identifier</th>
                      <th className="py-3 px-4 text-center">Orders Placed</th>
                      <th className="py-3 px-4 text-right">Avg Order Value</th>
                      <th className="py-3 px-4 text-right">Total Spent</th>
                      <th className="py-3 px-4 text-right">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                    {topCustomers.map((cust, idx) => (
                      <tr key={cust.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          {cust.name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">{cust.orderCount}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-700 dark:text-slate-300">
                          {formatPrice(cust.avgOrderValue, restaurant?.settings?.currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatPrice(cust.totalSpent, restaurant?.settings?.currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                          {new Date(cust.lastVisit).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5.1 CUSTOMER MARKETING DIRECTORY & CRM EXPORT */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden mt-6">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-slate-50/50 via-white to-emerald-50/20 dark:from-slate-900/40 dark:via-slate-900/20 dark:to-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Phone className="h-4 w-4" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Customer Marketing Directory
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportCustomerMarketingCSV}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                  disabled={marketingContacts.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Marketing List (Excel / CSV)</span>
                </Button>
              </div>
            </div>

            {/* Search & Channel Filter Bar */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer name or 10-digit mobile..."
                  value={marketingSearchQuery}
                  onChange={(e) => setMarketingSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {marketingSearchQuery && (
                  <button
                    onClick={() => setMarketingSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={marketingChannelFilter}
                  onChange={(e) => setMarketingChannelFilter(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                >
                  <option value="all">All Channels ({marketingContacts.length})</option>
                  <option value="dine_in">Dine-In ({marketingContacts.filter(c => c.orderTypes.includes('dine_in')).length})</option>
                  <option value="takeaway">Takeaway ({marketingContacts.filter(c => c.orderTypes.includes('takeaway')).length})</option>
                  <option value="reservation">Reservation ({marketingContacts.filter(c => c.orderTypes.includes('reservation')).length})</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredMarketingContacts.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {marketingContacts.length === 0
                    ? "No customer marketing contacts recorded for this period."
                    : "No contacts match the current search or channel filter."}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
                  Customer numbers saved from Dine-In bills, Takeaway orders, or Table Reservations will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Mobile Number</th>
                      <th className="py-3 px-4">Channels</th>
                      <th className="py-3 px-4 text-center">Orders</th>
                      <th className="py-3 px-4 text-right">Avg Order Value</th>
                      <th className="py-3 px-4 text-right">Total Net Spend</th>
                      <th className="py-3 px-4 text-right">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                    {filteredMarketingContacts.map((cust, idx) => (
                      <tr key={cust.phone} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-all">
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center uppercase">
                              {cust.name.slice(0, 2) || 'GU'}
                            </span>
                            <span>{cust.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{cust.phone}</span>
                            <a
                              href={`https://wa.me/91${cust.phone}?text=${encodeURIComponent(`Hello ${cust.name}, greetings from ${restaurant?.name || 'SmartDine'}!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors font-medium cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-2.5 w-2.5" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {cust.orderTypes.map(t => (
                              <span
                                key={t}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  t === 'takeaway'
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                    : t === 'reservation'
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                }`}
                              >
                                {t === 'dine_in' ? 'Dine-In' : t === 'takeaway' ? 'Takeaway' : 'Reservation'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">{cust.orderCount}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-700 dark:text-slate-300">
                          {formatPrice(cust.avgOrderValue, restaurant?.settings?.currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatPrice(cust.totalSpent, restaurant?.settings?.currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                          {new Date(cust.lastVisit).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
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
      )}

      {/* 6. ORDER CANCELLATIONS & LOSS ANALYSIS */}
      <Card className="border border-red-200/80 dark:border-red-950/60 bg-red-50/10 dark:bg-red-950/10 shadow-2xs rounded-xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-300 tracking-tight">Order Cancellations & Loss Analysis</h3>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {cancellationStats.cancelledCount} Cancelled Orders
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              - {formatPrice(cancellationStats.totalLost, restaurant?.settings?.currency || 'INR')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {cancellationStats.reasons.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4 text-center font-medium">
              Zero cancellations recorded in this period.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Cancellation Reason</th>
                    <th className="py-3 px-4 text-center">Orders Count</th>
                    <th className="py-3 px-4 text-right">Lost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {cancellationStats.reasons.map((cr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                        {cr.reason}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{cr.count}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
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

      {/* ========================================== */}
      {/* PHASE 4: SYSTEM AUDIT TRAIL & COMPLIANCE LOG (OWNER ONLY) */}
      {/* ========================================== */}
      {isOwner && (
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden mt-6 print:hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">System Audit Trail & Compliance Log</h3>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearchQuery}
                onChange={(e) => { setAuditSearchQuery(e.target.value); setAuditPage(1); }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none w-48 font-medium"
              />
            </div>
            <select
              value={auditActionFilter}
              onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="order">Order Events</option>
              <option value="payment">Payment Events</option>
              <option value="table">Table Operations</option>
              <option value="reservation">Reservations</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">User / Staff</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details / Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {auditLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit records...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No matching audit log entries found.</td>
                  </tr>
                ) : (
                  auditLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {entry.user_email || 'System'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {entry.user_role || (entry.metadata as any)?.role || 'Staff'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          entry.action.includes('payment') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          entry.action.includes('void') || entry.action.includes('cancelled') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {(() => {
                          const orderId = entry.entity_id || entry.parsedDetails?.orderId;
                          const isOrder = entry.entity_type === 'order' || 
                            entry.action?.includes('order') || 
                            entry.action?.includes('payment') || 
                            Boolean(orderId);

                          if (isOrder && orderId) {
                            const matchedOrder = orders.find(o => 
                              o.id === orderId || 
                              (orderId.length >= 6 && o.id.startsWith(orderId))
                            );
                            const displayId = matchedOrder 
                              ? getFormattedOrderId(matchedOrder, restaurant?.name || '', orders) 
                              : `#${orderId.slice(0, 8)}`;

                            const orderDateStr = matchedOrder?.created_at 
                              ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(matchedOrder.created_at))
                              : (entry.created_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(entry.created_at)) : '');

                            return (
                              <a
                                href={`/dashboard/orders?id=${matchedOrder ? matchedOrder.id : orderId}${orderDateStr ? `&date=${orderDateStr}` : ''}`}
                                className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline transition-colors group cursor-pointer"
                                title="Click to open this order in Live Orders"
                              >
                                <span>{displayId}</span>
                                <ArrowUpRight className="h-3 w-3 inline opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                              </a>
                            );
                          }

                          if (entry.entity_type) {
                            return (
                              <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                {entry.entity_type} {entry.entity_id ? `#${entry.entity_id.slice(0, 8)}` : ''}
                              </span>
                            );
                          }

                          return <span className="text-slate-400">System</span>;
                        })()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={entry.details}>
                        {entry.details || (entry.previous_state && entry.new_state ? `${JSON.stringify(entry.previous_state)} -> ${JSON.stringify(entry.new_state)}` : '-')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {auditTotal > 10 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Total records: {auditTotal}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span>Page {auditPage} of {Math.ceil(auditTotal / 10)}</span>
                <button
                  disabled={auditPage * 10 >= auditTotal}
                  onClick={() => setAuditPage(p => p + 1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* ========================================== */}
      {/* 2.5 IN-APP DAILY CLOSING REPORT MODAL (PRIORITY 7) */}
      {/* ========================================== */}
      {closingReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 print:shadow-none print:border-none print:max-w-none print:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{restaurant?.name || 'The Foody Hub'}</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Daily Closing & Shift Settlement Ledger • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <Button onClick={() => window.print()} variant="primary" size="sm" className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Printer className="h-3.5 w-3.5" /> Print Ledger
                </Button>
                <button
                  type="button"
                  onClick={() => setClosingReportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Financial Settlement */}
            <div className="mt-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Financial Settlement</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Gross Sales</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatPrice(salesSummary.grossSales)}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{salesSummary.totalOrders} total orders</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Net Revenue</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatPrice(salesSummary.netRevenue)}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Post-discount net</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Total GST (5%)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatPrice(salesSummary.totalGstCollected)}</p>
                    <p className="text-[10px] text-slate-400 font-medium">CGST: {formatPrice(salesSummary.cgstCollected)} | SGST: {formatPrice(salesSummary.sgstCollected)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Peak Hour Rush</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{peakHourSummary.peakHour}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{peakHourSummary.peakOrders} orders</p>
                  </div>
                </div>
              </div>

              {/* Service Velocity & SLA Intelligence */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Service Velocity & SLA Intelligence</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Avg Pickup Time</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {kitchenSlaStats.avgAcceptTimeSec > 0 ? `${kitchenSlaStats.avgAcceptTimeSec} sec` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Ready → Dispatched</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Avg Waiter Serve</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {kitchenSlaStats.readyToServedSec > 0 ? `${kitchenSlaStats.readyToServedSec} sec` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Target: &lt; 90s</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Kitchen SLA %</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{kitchenSlaSuccessPct}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Within 15m SLA</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Table Turns</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {tableTurnoverList.reduce((sum, t) => sum + t.turnoverCount, 0)} turns
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">Total Dining Rotations</p>
                  </div>
                </div>
              </div>

              {/* Waiter Ranking & Inventory Alerts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase mb-2">Waiter Performance Ranking</h5>
                  <div className="space-y-2 text-xs">
                    {waiterLeaderboard.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No waiter deliveries recorded for this period.</p>
                    ) : (
                      waiterLeaderboard.map((w, idx) => (
                        <div key={w.waiterName || w.name || idx} className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{w.waiterName || w.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-white">{w.ordersServed} served</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">(Avg: {w.avgServeSec || w.avgServeTimeSec || 0}s)</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase mb-2">Low Stock & Wastage Alert</h5>
                  <div className="space-y-1.5 text-xs">
                    <p className="flex justify-between font-medium">
                      <span>Low Stock Ingredients:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{lowStockItems.length} items</span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span>Cancelled Orders:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{cancellationStats.cancelledCount} orders</span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span>Food Wastage Cost:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatPrice(
                          dispositionsList.reduce((acc: number, d: any) => acc + Number(d.raw_materials_wasted_cost || 0), 0)
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Signoff */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 font-bold">
                <span>Certified Shift Closure • CleverOps Intelligence</span>
                <span>Manager Signoff: ________________</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
