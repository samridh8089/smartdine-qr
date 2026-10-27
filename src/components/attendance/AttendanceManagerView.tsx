'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  StaffProfile,
  Shift,
  StaffShift,
  StaffAttendance,
  SalaryRecord,
  StaffLeaveRequest,
  getStaffProfiles,
  saveStaffProfile,
  getShifts,
  saveShift,
  deleteShift,
  getAttendanceForDate,
  getStaffShiftsForDate,
  assignStaffShift,
  managerOverrideAttendance,
  getSalaryRecords,
  calculateMonthlyPayroll,
  getMonthlyAttendanceForRestaurant,
  saveSalaryRecord,
  formatTimeAmPm,
  formatWorkingDuration,
  GeofenceConfig,
  getAttendoSettings,
  updateAttendoSettings,
  approveSalaryRecord,
  approveAllSalaryRecords,
  isPunchOutMandatory,
  setPunchOutMandatory,
  managerApprovePunchOut,
  calculateStaffEarnedSalary,
  reviewAttendanceDays,
  getRestaurantLeaveRequests,
  reviewLeaveRequest,
  submitLeaveRequest,
  cleanupOldAttendanceSelfies,
  calculateHoursWorked,
  formatHoursWorkedText,
  getLocalDateString,
  getLocalAttendanceRecords
} from '@/lib/attendoEngine';
import { supabase } from '@/lib/supabase';
import { db, Restaurant, Profile } from '@/lib/db';
import SalarySlipModal from './SalarySlipModal';
import SalaryEditorModal from './SalaryEditorModal';
import StaffAttendanceCalendarModal from './StaffAttendanceCalendarModal';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  DollarSign,
  MapPin,
  Settings,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Printer,
  FileText,
  UserCheck,
  Shield,
  Search,
  Filter,
  X,
  CalendarCheck,
  Check,
  Ban,
  Send,
  Eye,
  Info,
  XCircle,
  Coffee
} from 'lucide-react';

// Safe portal wrapper ensuring modals render at document body level above headers and sidebars
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

interface AttendanceManagerViewProps {
  restaurant: Restaurant;
  profile: Profile;
  activeRole?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getDeptForRole = (role: string) => {
  if (role === 'supervisor') return 'general';
  if (['head_chef', 'chef', 'kitchen', 'kitchen_helper'].includes(role)) return 'kitchen';
  if (['captain', 'waiter', 'cleaner', 'helper'].includes(role)) return 'waiter';
  if (role === 'cashier') return 'cashier';
  return 'general';
};

export default function AttendanceManagerView({
  restaurant,
  profile,
  activeRole
}: AttendanceManagerViewProps) {
  const currentRole = activeRole || profile?.role || 'owner';
  const isSupervisor = currentRole === 'supervisor';
  const canManagePayroll = currentRole === 'owner' || currentRole === 'manager';
  // 1. useState
  const [activeTab, setActiveTab] = useState<'live' | 'roster' | 'logs' | 'payroll' | 'leaves' | 'settings'>('live');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Entity States - seeded immediately from restaurant prop for instantaneous 0ms first paint
  const [staffList, setStaffList] = useState<StaffProfile[]>(() => {
    const list: StaffProfile[] = (restaurant?.settings as any)?.attendo?.staff_profiles || [];
    if (typeof window !== 'undefined' && restaurant?.id) {
      try {
        const raw = localStorage.getItem(`smartdine_staff_cache_${restaurant.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.data) && parsed.data.length > 0) return parsed.data;
        }
      } catch (_) {}
    }
    return list;
  });
  const [shifts, setShifts] = useState<Shift[]>(() => {
    return (restaurant?.settings as any)?.attendo?.shifts || [];
  });
  const [todayAttendances, setTodayAttendances] = useState<StaffAttendance[]>(() => {
    const today = getLocalDateString();
    const list: StaffAttendance[] = (restaurant?.settings as any)?.attendo?.attendance || [];
    let matched = list.filter(a => a.date === today);
    if (typeof window !== 'undefined' && restaurant?.id) {
      const local = getLocalAttendanceRecords(restaurant.id, today);
      if (local.length > 0) {
        const map = new Map<string, StaffAttendance>();
        matched.forEach(m => map.set(m.staff_id, m));
        local.forEach(l => map.set(l.staff_id, l));
        matched = Array.from(map.values());
      }
    }
    return matched;
  });
  const [dateRoster, setDateRoster] = useState<StaffShift[]>(() => {
    const today = getLocalDateString();
    const all: StaffShift[] = (restaurant?.settings as any)?.attendo?.staff_shifts || [];
    return all.filter(a => a.assigned_date === today);
  });
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals & Selection
  const [selectedSlip, setSelectedSlip] = useState<SalaryRecord | null>(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [editingSalaryRecord, setEditingSalaryRecord] = useState<SalaryRecord | null>(null);
  const [salaryEditorOpen, setSalaryEditorOpen] = useState(false);

  // Manual Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideStaff, setOverrideStaff] = useState<StaffProfile | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<StaffAttendance['status']>('present');
  const [overridePunchIn, setOverridePunchIn] = useState('');
  const [overridePunchOut, setOverridePunchOut] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  // Shift Modal State
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Partial<Shift> | null>(null);
  const [shiftNameInput, setShiftNameInput] = useState('');
  const [shiftStartInput, setShiftStartInput] = useState('09:00');
  const [shiftEndInput, setShiftEndInput] = useState('17:00');
  const [shiftGraceInput, setShiftGraceInput] = useState(15);

  // Staff Profile & Base Salary Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffProfile | null>(null);
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffRoleInput, setStaffRoleInput] = useState<StaffProfile['role']>('waiter');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [staffSalaryInput, setStaffSalaryInput] = useState<number>(15000);
  const [staffSalaryTypeInput, setStaffSalaryTypeInput] = useState<'fixed' | 'per_day'>('per_day');
  const [staffWeeklyOffInput, setStaffWeeklyOffInput] = useState<StaffProfile['weekly_off']>('none');
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffPasswordInput, setStaffPasswordInput] = useState('');
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);
  const [purgingEmail, setPurgingEmail] = useState(false);

  // Geofence Settings State
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig>(() => getAttendoSettings(restaurant));
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [punchOutMandatory, setPunchOutMandatoryState] = useState<boolean>(() => isPunchOutMandatory(restaurant));
  const [approvingPayroll, setApprovingPayroll] = useState(false);

  // In-Place Staff OTP Verification Modal State
  const [staffOtpModalOpen, setStaffOtpModalOpen] = useState(false);
  const [verifyingStaff, setVerifyingStaff] = useState<Profile | null>(null);
  const [staffOtpInput, setStaffOtpInput] = useState('');
  const [staffOtpLoading, setStaffOtpLoading] = useState(false);
  const [staffOtpError, setStaffOtpError] = useState<string | null>(null);
  const [staffOtpSuccess, setStaffOtpSuccess] = useState<string | null>(null);

  // Day-by-Day Attendance Approval Center State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalStaffId, setApprovalStaffId] = useState<string>('');
  const [approvalSelectedDates, setApprovalSelectedDates] = useState<string[]>([]);
  const [approvalMonthAttendances, setApprovalMonthAttendances] = useState<StaffAttendance[]>([]);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalRejectNote, setApprovalRejectNote] = useState('');
  const [showRejectNoteInput, setShowRejectNoteInput] = useState(false);

  // Leave Management State
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);

  // Manager / Owner Direct Leave Recording Modal State
  const [managerLeaveModalOpen, setManagerLeaveModalOpen] = useState(false);
  const [managerLeaveStaffId, setManagerLeaveStaffId] = useState('');
  const [managerLeaveType, setManagerLeaveType] = useState<StaffLeaveRequest['leave_type']>('casual');
  const [managerLeaveStartDate, setManagerLeaveStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [managerLeaveEndDate, setManagerLeaveEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [managerLeaveReason, setManagerLeaveReason] = useState('');
  const [managerLeaveSaving, setManagerLeaveSaving] = useState(false);
  const [managerLeaveError, setManagerLeaveError] = useState<string | null>(null);

  // Employee Attendance Calendar Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarModalStaff, setCalendarModalStaff] = useState<StaffProfile | null>(null);
  const [calendarModalAttendances, setCalendarModalAttendances] = useState<StaffAttendance[]>([]);

  // Employee Attendance History & Selfie Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStaff, setHistoryStaff] = useState<StaffProfile | null>(null);
  const [historyAttendances, setHistoryAttendances] = useState<StaffAttendance[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewSelfieUrl, setPreviewSelfieUrl] = useState<string | null>(null);
  const [managerLiveTicker, setManagerLiveTicker] = useState(0);
  // Storage & Selfie Optimizer State
  const [cleaningSelfies, setCleaningSelfies] = useState(false);
  const [cleanupResultNotice, setCleanupResultNotice] = useState<string | null>(null);

  // 2. useMemo: Filtered Staff List
  const filteredStaffList = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery));
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  // 3. useMemo: Live KPI Metrics for Today
  const kpis = useMemo(() => {
    let present = 0;
    let late = 0;
    let onDuty = 0;
    let absent = 0;

    for (const s of staffList) {
      const att = todayAttendances.find(a => a.staff_id === s.id);
      if (!att || !att.punch_in_time) {
        absent += 1;
      } else {
        if (att.status === 'present') present += 1;
        else if (att.status === 'late') {
          present += 1;
          late += 1;
        } else if (att.status === 'half_day') present += 1;

        if (!att.punch_out_time) {
          onDuty += 1;
        }
      }
    }

    return {
      totalStaff: staffList.length,
      present,
      late,
      onDuty,
      absent
    };
  }, [staffList, todayAttendances]);

  // 4. useMemo: Selected Staff Member for Day-by-Day Attendance Approval
  const approvalStaffMember = useMemo(() => {
    return staffList.find(s => s.id === approvalStaffId) || staffList[0] || null;
  }, [staffList, approvalStaffId]);

  // 5. useMemo: Total Days in selected month for Day-by-Day Attendance Approval
  const approvalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // 6. useMemo: Real-time Live Salary Recalculation for Day-by-Day Approval
  const approvalEarnedSalary = useMemo(() => {
    if (!approvalStaffMember) return 0;
    const baseSalary = Number(approvalStaffMember.base_salary) || 0;
    const salaryType = approvalStaffMember.salary_type || 'per_day';
    const monthStr = String(selectedMonth).padStart(2, '0');
    const staffAtts = approvalMonthAttendances.filter(
      a => a.staff_id === approvalStaffMember.id && a.date.startsWith(`${selectedYear}-${monthStr}`)
    );
    let approvedDays = 0;
    let halfDays = 0;
    for (const a of staffAtts) {
      if (a.approval_status === 'rejected') continue;
      if (a.approval_status === 'approved' || a.status === 'present' || a.status === 'late') {
        approvedDays += 1;
      } else if (a.status === 'half_day') {
        halfDays += 1;
      }
    }
    return calculateStaffEarnedSalary(baseSalary, salaryType, approvalDaysInMonth, approvedDays, halfDays);
  }, [approvalStaffMember, approvalMonthAttendances, selectedYear, selectedMonth, approvalDaysInMonth]);

  // 7. useMemo: Leave requests filtered
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter(l => leaveFilter === 'all' || l.status === leaveFilter);
  }, [leaveRequests, leaveFilter]);

  // 8. useMemo: Pending leaves count badge
  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(l => l.status === 'pending').length;
  }, [leaveRequests]);

  // Periodic update every 60s for live hours calculation
  useEffect(() => {
    const t = setInterval(() => {
      setManagerLiveTicker(prev => prev + 1);
    }, 60000);
    return () => clearInterval(t);
  }, []);
  // 9. useEffect: Initial Data Loading
  useEffect(() => {
    if (!restaurant?.id) return;
    loadAllData();
  }, [restaurant?.id, selectedDate]);

  // 5. useEffect: Load Salary Records when payroll month/year changes
  useEffect(() => {
    if (!restaurant?.id) return;
    getSalaryRecords(restaurant.id, selectedYear, selectedMonth).then(records => {
      setSalaryRecords(records);
    });
  }, [restaurant?.id, selectedYear, selectedMonth]);

  // 6. useEffect: Real-time Attendance & Heartbeat Sync
  useEffect(() => {
    if (!restaurant?.id) return;
    const restId = restaurant.id;

    // 60-second polling interval for robust background sync (silent without UI flicker)
    const interval = setInterval(() => {
      loadAllData(true);
    }, 60000);

    // Supabase Realtime Channel for live attendance punches from staff phones
    const channel = supabase
      .channel(`attendance_realtime_${restId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restId}` },
        () => {
          loadAllData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_attendance', filter: `restaurant_id=eq.${restId}` },
        async () => {
          try {
            const attendances = await getAttendanceForDate(restId, selectedDate);
            setTodayAttendances(attendances);
          } catch (_) {}
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, selectedDate]);

  // Conditional early return AFTER all hooks
  if (!restaurant || !profile) return null;

  async function loadAllData(isSilent: boolean = false) {
    if (!isSilent && staffList.length === 0) {
      setLoading(true);
    }
    try {
      const [profiles, shiftList, attendances, roster, leaves] = await Promise.all([
        getStaffProfiles(restaurant.id),
        getShifts(restaurant.id),
        getAttendanceForDate(restaurant.id, selectedDate),
        getStaffShiftsForDate(restaurant.id, selectedDate),
        getRestaurantLeaveRequests(restaurant.id)
      ]);

      if (profiles && profiles.length > 0) {
        setStaffList(profiles);
      }
      if (shiftList && shiftList.length > 0) {
        setShifts(shiftList);
      }
      setTodayAttendances(attendances);
      setDateRoster(roster);
      setLeaveRequests(leaves);
    } catch (e) {
      console.warn('Error loading attendo data:', e);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }

  // --- ACTIONS ---
  const handleOpenOverride = (staff: StaffProfile) => {
    const existing = todayAttendances.find(a => a.staff_id === staff.id);
    setOverrideStaff(staff);
    setOverrideStatus(existing?.status || 'present');
    setOverridePunchIn(existing?.punch_in_time ? new Date(existing.punch_in_time).toISOString().slice(11, 16) : '09:00');
    setOverridePunchOut(existing?.punch_out_time ? new Date(existing.punch_out_time).toISOString().slice(11, 16) : '');
    setOverrideNotes(existing?.notes || 'Manager Manual Correction');
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!overrideStaff) return;
    try {
      const inTimeIso = overridePunchIn ? `${selectedDate}T${overridePunchIn}:00.000Z` : null;
      const outTimeIso = overridePunchOut ? `${selectedDate}T${overridePunchOut}:00.000Z` : null;

      await managerOverrideAttendance({
        restaurantId: restaurant.id,
        staffId: overrideStaff.id,
        date: selectedDate,
        status: overrideStatus,
        punchInTime: inTimeIso,
        punchOutTime: outTimeIso,
        notes: overrideNotes,
        managerUserId: profile.id
      });

      setOverrideModalOpen(false);
      await loadAllData();
    } catch (e) {
      console.error('Failed saving override:', e);
    }
  };

  const handleSaveShiftModal = async () => {
    if (!shiftNameInput.trim()) return;
    try {
      await saveShift({
        id: editingShift?.id,
        restaurant_id: restaurant.id,
        shift_name: shiftNameInput.trim(),
        start_time: shiftStartInput,
        end_time: shiftEndInput,
        grace_period_minutes: Number(shiftGraceInput) || 15
      });
      setShiftModalOpen(false);
      const updatedShifts = await getShifts(restaurant.id);
      setShifts(updatedShifts);
    } catch (e) {
      console.error('Failed saving shift:', e);
    }
  };

  const handleDeleteShiftClick = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    await deleteShift(restaurant.id, shiftId);
    const updated = await getShifts(restaurant.id);
    setShifts(updated);
  };

  // Quick 1-click update of Weekly Off with optimistic UI
  const handleQuickUpdateWeeklyOff = async (staffMember: StaffProfile, newWeeklyOff: string) => {
    if (!restaurant) return;
    // Immediate optimistic update so dropdown never snaps back or requires multiple clicks
    setStaffList(prev => prev.map(s => s.id === staffMember.id ? { ...s, weekly_off: newWeeklyOff as any } : s));

    try {
      await saveStaffProfile({
        id: staffMember.id,
        profile_id: staffMember.profile_id,
        restaurant_id: restaurant.id,
        name: staffMember.name,
        role: staffMember.role,
        phone: staffMember.phone,
        base_salary: staffMember.base_salary,
        salary_type: staffMember.salary_type,
        weekly_off: newWeeklyOff as any
      });
    } catch (e) {
      console.error('Failed updating weekly off:', e);
    }
  };

  // Open Manager Leave Submission Modal
  const handleOpenManagerLeaveModal = (preselectedStaffId?: string) => {
    const defaultStaffId = preselectedStaffId || staffList[0]?.id || '';
    setManagerLeaveStaffId(defaultStaffId);
    setManagerLeaveType('casual');
    setManagerLeaveStartDate(new Date().toISOString().slice(0, 10));
    setManagerLeaveEndDate(new Date().toISOString().slice(0, 10));
    setManagerLeaveReason('');
    setManagerLeaveError(null);
    setManagerLeaveModalOpen(true);
  };

  // Save Pre-Approved Leave directly by Manager/Owner
  const handleSaveManagerLeave = async () => {
    if (!managerLeaveStaffId) {
      setManagerLeaveError('Please select a staff member.');
      return;
    }
    if (!managerLeaveStartDate || !managerLeaveEndDate) {
      setManagerLeaveError('Please select both start and end dates.');
      return;
    }
    if (managerLeaveStartDate > managerLeaveEndDate) {
      setManagerLeaveError('Start date cannot be after end date.');
      return;
    }

    const staffMember = staffList.find(s => s.id === managerLeaveStaffId);
    if (!staffMember) {
      setManagerLeaveError('Staff member not found.');
      return;
    }

    setManagerLeaveSaving(true);
    setManagerLeaveError(null);
    try {
      await submitLeaveRequest({
        restaurantId: restaurant.id,
        staffId: staffMember.id,
        staffName: staffMember.name,
        staffRole: staffMember.role,
        leaveType: managerLeaveType,
        startDate: managerLeaveStartDate,
        endDate: managerLeaveEndDate,
        reason: managerLeaveReason.trim() || 'Recorded directly by Owner/Manager',
        status: 'approved',
        reviewedById: profile.id,
        reviewedByName: profile.full_name || 'Management',
        reviewNotes: 'Approved directly by Owner/Manager'
      });
      await loadAllData();
      setManagerLeaveModalOpen(false);
    } catch (err: any) {
      console.error('Failed recording leave:', err);
      setManagerLeaveError(err?.message || 'Failed to record leave.');
    } finally {
      setManagerLeaveSaving(false);
    }
  };

  const handleOpenStaffEdit = (staffIdOrMember: string | StaffProfile | null) => {
    setStaffModalError('');
    if (!staffIdOrMember) {
      setEditingStaffMember(null);
      setStaffNameInput('');
      setStaffEmailInput('');
      setStaffPhoneInput('');
      setStaffPasswordInput('');
      setStaffRoleInput('waiter');
      setStaffSalaryInput(15000);
      setStaffSalaryTypeInput('per_day');
      setStaffWeeklyOffInput('none');
      setStaffModalOpen(true);
      return;
    }
    const member = typeof staffIdOrMember === 'string'
      ? staffList.find(s => s.id === staffIdOrMember)
      : staffIdOrMember;

    if (member) {
      setEditingStaffMember(member);
      setStaffNameInput(member.name);
      setStaffEmailInput(member.email || '');
      setStaffPhoneInput(member.phone || '');
      setStaffPasswordInput('');
      setStaffRoleInput(member.role);
      setStaffSalaryInput(Number(member.base_salary) || 15000);
      setStaffSalaryTypeInput(member.salary_type || 'per_day');
      setStaffWeeklyOffInput(member.weekly_off || 'none');
    } else {
      setEditingStaffMember(null);
      setStaffNameInput('');
      setStaffEmailInput('');
      setStaffPhoneInput('');
      setStaffPasswordInput('');
      setStaffRoleInput('waiter');
      setStaffSalaryInput(15000);
      setStaffSalaryTypeInput('fixed');
      setStaffWeeklyOffInput('none');
    }
    setStaffModalOpen(true);
  };

  const handleSaveStaffModal = async () => {
    setStaffModalError('');
    if (!staffNameInput.trim()) {
      setStaffModalError('Staff full name is required.');
      return;
    }

    setSavingStaff(true);
    try {
      if (!editingStaffMember) {
        // Registering a brand new staff account
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanEmail = staffEmailInput.trim().toLowerCase();
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
          setStaffModalError('Please enter a valid email address for staff login.');
          setSavingStaff(false);
          return;
        }

        const ownerEmail = profile?.email?.trim().toLowerCase() || (restaurant?.settings as any)?.owner_email?.trim().toLowerCase();
        if (ownerEmail && cleanEmail === ownerEmail) {
          setStaffModalError('Restaurant owner email cannot be registered as a staff account.');
          setSavingStaff(false);
          return;
        }

        if (staffList.some(s => s.email?.trim().toLowerCase() === cleanEmail)) {
          setStaffModalError('A staff account with this email address already exists.');
          setSavingStaff(false);
          return;
        }

        const cleanPhone = staffPhoneInput.trim().replace(/\D/g, '');
        if (cleanPhone && cleanPhone.length < 10) {
          setStaffModalError('Please enter a valid 10-digit mobile number.');
          setSavingStaff(false);
          return;
        }

        if (!staffPasswordInput || staffPasswordInput.length < 6) {
          setStaffModalError('Staff password must be at least 6 characters long.');
          setSavingStaff(false);
          return;
        }

        const newProfile = await db.createStaffProfile(
          cleanEmail,
          staffPasswordInput,
          staffNameInput.trim(),
          staffRoleInput,
          restaurant.id,
          getDeptForRole(staffRoleInput),
          staffPhoneInput.trim()
        );

        // Save baseline salary in attendo settings
        await saveStaffProfile({
          id: newProfile.id,
          profile_id: newProfile.id,
          restaurant_id: restaurant.id,
          name: staffNameInput.trim(),
          role: staffRoleInput,
          phone: staffPhoneInput.trim(),
          base_salary: Number(staffSalaryInput) || 0,
          salary_type: staffSalaryTypeInput,
          weekly_off: staffWeeklyOffInput || 'none'
        });

        // Audit log
        if (profile?.id) {
          try {
            await db.createAuditLog(
              restaurant.id,
              profile.id,
              profile.email || 'manager',
              'create_staff',
              `Created staff account for ${staffNameInput.trim()}`
            );
          } catch (auditErr) {
            console.warn('Failed to record staff creation audit log:', auditErr);
          }
        }


        // Dispatch Staff Email OTP directly
        try {
          await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'staff_creation',
              email: cleanEmail,
              recipientName: staffNameInput.trim(),
              restaurantName: restaurant.name,
              userId: newProfile.id,
              restaurantId: restaurant.id
            })
          });
        } catch (e) {
          console.warn('Failed to dispatch staff OTP:', e);
        }

        setVerifyingStaff(newProfile);
        setStaffOtpInput('');
        setStaffOtpError(null);
        setStaffOtpSuccess(null);
        setStaffOtpModalOpen(true);

        await loadAllData();
        setStaffModalOpen(false);
      } else {
        // Editing existing staff
        const targetProfileId = editingStaffMember.profile_id || editingStaffMember.id;
        if (targetProfileId) {
          try {
            await db.updateStaffProfile(restaurant.id, targetProfileId, {
              fullName: staffNameInput.trim(),
              phone: staffPhoneInput.trim(),
              role: staffRoleInput,
              department: getDeptForRole(staffRoleInput)
            });
          } catch (e) {
            console.warn('Could not update profiles table directly:', e);
          }
        }

        const saved = await saveStaffProfile({
          id: editingStaffMember.id,
          profile_id: targetProfileId,
          restaurant_id: restaurant.id,
          name: staffNameInput.trim(),
          role: staffRoleInput,
          phone: staffPhoneInput.trim(),
          base_salary: Number(staffSalaryInput) || 0,
          salary_type: staffSalaryTypeInput,
          weekly_off: staffWeeklyOffInput || 'none'
        });

        // Update local staff list
        setStaffList(prev => {
          const idx = prev.findIndex(s => s.id === saved.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return [...prev, saved];
        });

        // Update matching salary records for this staff member
        setSalaryRecords(prev => prev.map(rec => {
          if (rec.staff_id === saved.id) {
            const days = rec.total_days_in_month || 30;
            const effDays = (Number(rec.total_present_days) || 0) + (Number(rec.total_half_days) || 0) * 0.5;
            const dailyRate = days > 0 ? saved.base_salary / days : 0;
            const salaryType = saved.salary_type || rec.salary_type || 'fixed';
            const gross = salaryType === 'per_day' ? Math.round(effDays * dailyRate) : saved.base_salary;
            const allowancesSum = (rec.allowances || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
            const dedsSum = (rec.deductions || []).reduce((a, b) => a + (Number(b.amount) || 0), 0) + (Number(rec.total_advance) || 0);
            const net = Math.max(0, gross + allowancesSum - dedsSum);
            const updatedRec = {
              ...rec,
              base_salary: saved.base_salary,
              salary_type: salaryType,
              gross_earned: gross,
              net_salary: net
            };
            saveSalaryRecord(updatedRec).catch(() => {});
            return updatedRec;
          }
          return rec;
        }));

        await loadAllData();
        setStaffModalOpen(false);
      }
    } catch (e: any) {
      console.error('Failed saving staff profile:', e);
      let msg = 'Failed to save staff profile. Please try again.';
      if (typeof e === 'string' && e.trim() && e !== '{}' && e !== '[object Object]') {
        msg = e.trim();
      } else if (e?.message && typeof e.message === 'string' && e.message.trim() && e.message !== '{}' && e.message !== '[object Object]') {
        msg = e.message.trim();
      } else if (e?.error) {
        if (typeof e.error === 'string' && e.error.trim() && e.error !== '{}' && e.error !== '[object Object]') {
          msg = e.error.trim();
        } else if (e.error?.message && typeof e.error.message === 'string' && e.error.message.trim() && e.error.message !== '{}') {
          msg = e.error.message.trim();
        }
      }
      setStaffModalError(msg);
    } finally {
      setSavingStaff(false);
    }
  };

  const handlePurgeAndRetry = async () => {
    if (!staffEmailInput.trim()) return;
    setPurgingEmail(true);
    setStaffModalError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/staff/delete-by-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: staffEmailInput.trim().toLowerCase(),
          restaurantId: restaurant.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffModalError(data.error || 'Failed to delete old account.');
        return;
      }
      // Stale account deleted from Supabase Auth! Automatically retry creation now!
      await handleSaveStaffModal();
    } catch (err: any) {
      setStaffModalError(err.message || 'Error deleting old account.');
    } finally {
      setPurgingEmail(false);
    }
  };

  const handleToggleRecordSalaryType = async (rec: SalaryRecord) => {
    const nextType: 'fixed' | 'per_day' = rec.salary_type === 'per_day' ? 'fixed' : 'per_day';
    const days = rec.total_days_in_month || 30;
    const effDays = (Number(rec.total_present_days) || 0) + (Number(rec.total_half_days) || 0) * 0.5;
    const dailyRate = days > 0 ? rec.base_salary / days : 0;
    const gross = nextType === 'fixed' ? rec.base_salary : Math.round(effDays * dailyRate);
    const allowancesSum = (rec.allowances || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const dedsSum = (rec.deductions || []).reduce((a, b) => a + (Number(b.amount) || 0), 0) + (Number(rec.total_advance) || 0);
    const net = Math.max(0, gross + allowancesSum - dedsSum);

    const updated: SalaryRecord = {
      ...rec,
      salary_type: nextType,
      gross_earned: gross,
      net_salary: net
    };

    // Persist to staff profile so future calculations remember this salary structure
    if (rec.staff_id) {
      const staffMember = staffList.find(s => s.id === rec.staff_id);
      if (staffMember) {
        saveStaffProfile({
          id: staffMember.id,
          restaurant_id: restaurant.id,
          name: staffMember.name,
          base_salary: staffMember.base_salary,
          salary_type: nextType
        }).catch(() => {});
        setStaffList(prev => prev.map(s => s.id === rec.staff_id ? { ...s, salary_type: nextType } : s));
      }
    }

    await handleSaveSalaryRecord(updated);
  };

  const handleAssignRoster = async (staffId: string, shiftId: string) => {
    // Immediate optimistic UI update so shift assigns instantly in 1-click
    setDateRoster(prev => {
      const filtered = prev.filter(r => !(r.staff_id === staffId && r.assigned_date === selectedDate));
      if (shiftId) {
        filtered.push({
          id: `roster_${staffId}_${selectedDate}`,
          restaurant_id: restaurant.id,
          staff_id: staffId,
          shift_id: shiftId,
          assigned_date: selectedDate,
          created_at: new Date().toISOString()
        });
      }
      return filtered;
    });

    try {
      await assignStaffShift(restaurant.id, staffId, shiftId, selectedDate);
    } catch (e) {
      console.error('Failed assigning shift:', e);
    }
  };

  const handleTogglePunchOutMandatory = async (mandatory: boolean) => {
    setPunchOutMandatoryState(mandatory);
    try {
      await setPunchOutMandatory(restaurant.id, mandatory);
      setSettingsNotice(`Punch-out requirement is now ${mandatory ? 'MANDATORY' : 'OPTIONAL'}.`);
      setTimeout(() => setSettingsNotice(null), 3000);
    } catch (_) {}
  };

  const handleApproveSingleSalary = async (rec: SalaryRecord) => {
    try {
      const approverName = profile?.full_name ? `${profile.full_name} (${profile.role || 'Manager'})` : 'Manager';
      const updated = await approveSalaryRecord({
        restaurantId: restaurant.id,
        salaryRecordId: rec.id,
        approverId: profile?.id || 'manager',
        approverName
      });
      if (updated) {
        setSalaryRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
      }
    } catch (err) {
      console.warn('Failed approving salary:', err);
    }
  };

  const handleApproveAllSalaries = async () => {
    if (!salaryRecords.length) return;
    setApprovingPayroll(true);
    try {
      const approverName = profile?.full_name ? `${profile.full_name} (${profile.role || 'Manager'})` : 'Manager';
      const updatedList = await approveAllSalaryRecords({
        restaurantId: restaurant.id,
        year: selectedYear,
        month: selectedMonth,
        approverId: profile?.id || 'manager',
        approverName
      });
      setSalaryRecords(updatedList);
    } catch (err) {
      console.warn('Failed approving all salaries:', err);
    } finally {
      setApprovingPayroll(false);
    }
  };

  const handleManagerDirectPunchOut = async (staffMember: StaffProfile, existingAtt?: StaffAttendance) => {
    try {
      const approverName = profile?.full_name ? `${profile.full_name} (${profile.role || 'Manager'})` : 'Manager';
      const res = await managerApprovePunchOut({
        restaurantId: restaurant.id,
        staffId: staffMember.id,
        date: selectedDate,
        managerUserId: profile?.id || 'manager',
        managerName: approverName,
        status: 'present'
      });
      if (res.success && res.attendance) {
        setTodayAttendances(prev => {
          const filtered = prev.filter(a => a.staff_id !== staffMember.id);
          return [...filtered, res.attendance!];
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSelfieCleanup = async () => {
    try {
      setCleaningSelfies(true);
      setCleanupResultNotice(null);
      const res = await cleanupOldAttendanceSelfies(restaurant.id, 30);
      if (res.success && res.cleanedCount > 0) {
        setCleanupResultNotice(`Storage cleaned! ${res.cleanedCount} selfie(s) older than 30 days were purged.`);
      } else if (res.success) {
        setCleanupResultNotice('All clear! No selfies older than 30 days found.');
      } else {
        setCleanupResultNotice('Storage check completed.');
      }
    } catch (e: any) {
      setCleanupResultNotice(`Cleanup failed: ${e.message}`);
    } finally {
      setCleaningSelfies(false);
    }
  };

  const handleCalculatePayrollClick = async () => {
    try {
      setLoading(true);
      const monthlyAttendances = await getMonthlyAttendanceForRestaurant(
        restaurant.id,
        selectedYear,
        selectedMonth
      );
      const records = await calculateMonthlyPayroll(
        restaurant.id,
        selectedYear,
        selectedMonth,
        staffList,
        monthlyAttendances,
        salaryRecords
      );
      // Save all records
      for (const rec of records) {
        await saveSalaryRecord(rec);
      }
      setSalaryRecords(records);
    } catch (e) {
      console.error('Error calculating payroll:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- OTP VERIFICATION HANDLERS ---
  const handleVerifyStaffOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingStaff || !restaurant) return;
    setStaffOtpLoading(true);
    setStaffOtpError(null);
    setStaffOtpSuccess(null);

    const cleanOtp = staffOtpInput.trim().replace(/\D/g, '');
    if (!/^\d{6,8}$/.test(cleanOtp)) {
      setStaffOtpError('Please enter a valid OTP code (6 or 8 digits).');
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
        setStaffOtpError(data.error || 'Verification failed. Please enter the correct OTP.');
        setStaffOtpLoading(false);
        return;
      }

      setStaffOtpSuccess('Staff account verified and activated successfully!');
      setTimeout(() => {
        setStaffOtpModalOpen(false);
        setVerifyingStaff(null);
      }, 1200);

      await loadAllData();
    } catch (err: any) {
      setStaffOtpError(err.message || 'Error verifying OTP.');
    } finally {
      setStaffOtpLoading(false);
    }
  };

  const handleResendStaffOtp = async () => {
    if (!verifyingStaff || !restaurant) return;
    setStaffOtpLoading(true);
    setStaffOtpError(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'staff_creation',
          email: verifyingStaff.email,
          recipientName: verifyingStaff.full_name || 'Staff Member',
          restaurantName: restaurant.name,
          userId: verifyingStaff.id,
          restaurantId: restaurant.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP.');
      setStaffOtpSuccess(`OTP resent successfully to ${verifyingStaff.email}`);
    } catch (err: any) {
      setStaffOtpError(err.message || 'Could not resend OTP.');
    } finally {
      setStaffOtpLoading(false);
    }
  };

  const handleOpenStaffVerifyModal = (staffMember: StaffProfile) => {
    setVerifyingStaff({
      id: staffMember.id,
      email: staffMember.email || '',
      full_name: staffMember.name,
      role: staffMember.role as any,
      restaurant_id: staffMember.restaurant_id
    } as Profile);
    setStaffOtpInput('');
    setStaffOtpError(null);
    setStaffOtpSuccess(null);
    setStaffOtpModalOpen(true);
  };

  // --- EMPLOYEE ATTENDANCE HISTORY & SELFIE MODAL HANDLER ---
  const handleOpenStaffHistory = async (staffMember: StaffProfile) => {
    setHistoryStaff(staffMember);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const monthAtts = await getMonthlyAttendanceForRestaurant(restaurant.id, selectedYear, selectedMonth);
      const filtered = monthAtts.filter(a => a.staff_id === staffMember.id);
      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setHistoryAttendances(filtered);
    } catch (e) {
      console.warn('Failed loading employee history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };
  // --- EMPLOYEE CALENDAR MODAL HANDLER ---
  const handleOpenEmployeeCalendar = async (staffMember: StaffProfile) => {
    setCalendarModalStaff(staffMember);
    setCalendarModalOpen(true);
    try {
      const monthAtts = await getMonthlyAttendanceForRestaurant(restaurant.id, selectedYear, selectedMonth);
      setCalendarModalAttendances(monthAtts);
    } catch (e) {
      console.warn('Failed loading month attendances for calendar:', e);
    }
  };

  // --- ATTENDANCE APPROVAL CENTER HANDLERS ---
  const handleOpenAttendanceApproval = async (staffId?: string) => {
    const targetStaffId = staffId || staffList[0]?.id || '';
    setApprovalStaffId(targetStaffId);
    setApprovalSelectedDates([]);
    setShowRejectNoteInput(false);
    setApprovalRejectNote('');
    setApprovalModalOpen(true);

    try {
      const allMonthAtts = await getMonthlyAttendanceForRestaurant(restaurant.id, selectedYear, selectedMonth);
      setApprovalMonthAttendances(allMonthAtts);
    } catch (e) {
      console.warn('Failed loading month attendances:', e);
    }
  };

  const handleSelectApprovalDate = (date: string) => {
    setApprovalSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handleSelectAllApprovalDates = (allDates: string[]) => {
    if (approvalSelectedDates.length === allDates.length) {
      setApprovalSelectedDates([]);
    } else {
      setApprovalSelectedDates(allDates);
    }
  };

  const handleBatchReviewAttendance = async (action: 'approved' | 'rejected') => {
    if (approvalSelectedDates.length === 0 || !approvalStaffMember) return;
    setApprovalSubmitting(true);
    try {
      const reviews = approvalSelectedDates.map(date => ({
        staffId: approvalStaffMember.id,
        date,
        action,
        rejectionReason: action === 'rejected' ? (approvalRejectNote.trim() || 'Rejected by manager') : undefined
      }));

      await reviewAttendanceDays({
        restaurantId: restaurant.id,
        reviews,
        reviewerId: profile.id,
        reviewerName: profile.full_name || profile.email
      });

      const allMonthAtts = await getMonthlyAttendanceForRestaurant(restaurant.id, selectedYear, selectedMonth);
      setApprovalMonthAttendances(allMonthAtts);
      setApprovalSelectedDates([]);
      setShowRejectNoteInput(false);
      setApprovalRejectNote('');

      await handleCalculatePayrollClick();
    } catch (e) {
      console.warn('Failed reviewing attendance days:', e);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // --- LEAVE MANAGEMENT HANDLER ---
  const handleReviewLeave = async (requestId: string, action: 'approved' | 'rejected', reason?: string) => {
    setLeaveActionLoading(true);
    try {
      await reviewLeaveRequest({
        restaurantId: restaurant.id,
        requestId,
        action,
        reviewerId: profile.id,
        reviewerName: profile.full_name || profile.email,
        rejectionReason: reason
      });
      const updated = await getRestaurantLeaveRequests(restaurant.id);
      setLeaveRequests(updated);
    } catch (e) {
      console.warn('Failed reviewing leave request:', e);
    } finally {
      setLeaveActionLoading(false);
    }
  };

  const handleSaveSalaryRecord = async (updated: SalaryRecord) => {
    await saveSalaryRecord(updated);
    setSalaryRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (updated.staff_id && updated.base_salary !== undefined) {
      setStaffList(prev => prev.map(s => s.id === updated.staff_id ? { ...s, base_salary: updated.base_salary } : s));
    }
  };

  const handleSaveGeofenceSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      await updateAttendoSettings(restaurant.id, geofenceConfig);
      setSettingsNotice('Geofence configuration saved successfully!');
      setTimeout(() => setSettingsNotice(null), 3000);
    } catch (e: any) {
      setSettingsNotice('Error saving settings: ' + (e.message || 'Unknown error'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAcquireCurrentLocationAsRestaurant = () => {
    if (typeof window !== 'undefined' && navigator?.geolocation) {
      setSettingsNotice('Acquiring current GPS location from browser...');
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGeofenceConfig(prev => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          }));
          setSettingsNotice(`Location acquired: Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}. Click "Save Geofence Settings" to confirm.`);
        },
        err => {
          console.warn('Unable to acquire GPS:', err);
          let msg = err.message;
          if (err.code === 1) {
            msg = 'Location permission denied: Please allow Location access in your browser address bar (lock icon) and try again.';
          } else if (err.code === 2) {
            msg = 'Position unavailable: Please turn on device GPS/Location services.';
          } else if (err.code === 3) {
            msg = 'GPS timeout: Took too long to acquire location. Please try again.';
          }
          setSettingsNotice('Unable to acquire GPS: ' + msg);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    } else {
      setSettingsNotice('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer font-bold ${
              activeTab === 'live' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Live Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer font-bold ${
              activeTab === 'roster' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Shift Roster
          </button>
          {canManagePayroll && (
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer font-bold ${
                activeTab === 'payroll' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Payroll & Salary Slips
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer font-bold flex items-center gap-1.5 ${
              activeTab === 'leaves' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>Leave Requests</span>
            {pendingLeavesCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full">
                {pendingLeavesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer font-bold ${
              activeTab === 'settings' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Geofence Settings
          </button>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-300"
          />
          <button
            type="button"
            onClick={() => loadAllData(false)}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE ATTENDANCE BOARD */}
      {/* ========================================================================= */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Staff</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.totalStaff}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Present Today</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.present}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Currently On Duty</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.onDuty}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Late Punches</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.late}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Absent / Pending</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.absent}</p>
            </div>
          </div>

          {/* Search & Department Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Role:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="all">All Roles</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="head_chef">Head Chef</option>
                  <option value="chef">Chef / Cook</option>
                  <option value="kitchen_helper">Kitchen Helper</option>
                  <option value="captain">Captain</option>
                  <option value="waiter">Waiter</option>
                  <option value="cleaner">Cleaner</option>
                  <option value="cashier">Cashier</option>
                  <option value="helper">Floor Helper</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleOpenStaffEdit(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm cursor-pointer transition"
              >
                + Add Staff & Set Salary
              </button>
            </div>
          </div>

          {/* Live Staff Grid */}
          {filteredStaffList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No registered staff found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Only staff who have an active created account are listed in attendance and payroll. Register a staff account to get started.
              </p>
              <button
                type="button"
                onClick={() => handleOpenStaffEdit(null)}
                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm cursor-pointer transition"
              >
                + Register Staff & Set Salary
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaffList.map(staff => {
                const att = todayAttendances.find(a => a.staff_id === staff.id);
                const assignedShiftRef = dateRoster.find(r => r.staff_id === staff.id);
                const assignedShift = shifts.find(s => s.id === assignedShiftRef?.shift_id);
                const isPunchedIn = !!att?.punch_in_time;
                const isOnDuty = isPunchedIn && !att?.punch_out_time;

                return (
                  <div
                    key={staff.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black text-sm border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                            {staff.name}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
                            {staff.role}{staff.phone ? ` • ${staff.phone}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div>
                        {isOnDuty && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold rounded">
                            On Duty
                          </span>
                        )}
                        {!isOnDuty && isPunchedIn && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold rounded">
                            Completed
                          </span>
                        )}
                        {!isPunchedIn && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold rounded">
                            Absent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shift & Time Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Shift:</span>
                        <select
                          value={assignedShiftRef?.shift_id || ''}
                          onChange={e => handleAssignRoster(staff.id, e.target.value)}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                          title="Assign shift for this date in 1-click"
                        >
                          <option value="">Not Scheduled</option>
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.shift_name} ({formatTimeAmPm(s.start_time)} - {formatTimeAmPm(s.end_time)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Punch In:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatTimeAmPm(att?.punch_in_time)}
                        </span>
                      </div>
                      {att?.punch_out_time && (
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Punch Out:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatTimeAmPm(att.punch_out_time)}
                          </span>
                        </div>
                      )}
                      {isPunchedIn && (
                        <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-1 mt-1">
                          <span className="font-medium">Worked Today:</span>
                          <span className="font-bold text-slate-900 dark:text-white bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px]">
                            {formatHoursWorkedText(att?.punch_in_time, att?.punch_out_time)} {isOnDuty ? '(Active)' : '(Completed)'}
                          </span>
                        </div>
                      )}
                      {att?.status === 'late' && (
                        <div className="text-[10px] font-semibold text-slate-500">
                          Late punch-in detected
                        </div>
                      )}
                      {att?.marked_by_type === 'manager_override' && (
                        <div className="text-[10px] text-slate-500 font-medium italic">
                          Manager Override Applied
                        </div>
                      )}
                    </div>

                    {/* Weekly Off Quick Selector */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                        <Coffee className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>Weekly Off:</span>
                      </span>
                      <select
                        value={staff.weekly_off || 'none'}
                        onChange={e => handleQuickUpdateWeeklyOff(staff, e.target.value)}
                        className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold capitalize outline-none cursor-pointer text-slate-800 dark:text-slate-200 shadow-xs"
                        title="Change designated weekly off day anytime"
                      >
                        <option value="none">None</option>
                        <option value="monday">Mon</option>
                        <option value="tuesday">Tue</option>
                        <option value="wednesday">Wed</option>
                        <option value="thursday">Thu</option>
                        <option value="friday">Fri</option>
                        <option value="saturday">Sat</option>
                        <option value="sunday">Sun</option>
                      </select>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenStaffEdit(staff)}
                        className="px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-200 dark:border-slate-700"
                        title="Click to edit staff details and salary structure"
                      >
                        <span>Base: ₹{staff.base_salary.toLocaleString('en-IN')}/mo</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {(staff.salary_type || 'fixed') === 'fixed' ? 'Fixed' : 'Per-Day'}
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenStaffHistory(staff)}
                          className="px-2.5 py-1 text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition border border-slate-300 dark:border-slate-700 shadow-2xs"
                          title="View complete login/logout history and selfies"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>History</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(staff)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold text-xs cursor-pointer transition"
                        >
                          Override
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHIFT MANAGEMENT & ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Shifts Master List Header */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Restaurant Shifts & Working Hours
              </h3>
              
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingShift(null);
                setShiftNameInput('');
                setShiftStartInput('09:00');
                setShiftEndInput('17:00');
                setShiftGraceInput(15);
                setShiftModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              Add New Shift
            </button>
          </div>

          {/* Shifts Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shifts.map(shift => (
              <div
                key={shift.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{shift.shift_name}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingShift(shift);
                        setShiftNameInput(shift.shift_name);
                        setShiftStartInput(shift.start_time);
                        setShiftEndInput(shift.end_time);
                        setShiftGraceInput(shift.grace_period_minutes);
                        setShiftModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShiftClick(shift.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Working Hours:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatTimeAmPm(shift.start_time)} - {formatTimeAmPm(shift.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grace Period:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{shift.grace_period_minutes} mins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Shift Roster Assignment Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Staff Shift Assignment for {new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </h4>
                
              </div>
            </div>

            <div className="space-y-2">
              {staffList.map(staff => {
                const assigned = dateRoster.find(r => r.staff_id === staff.id);

                return (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block">{staff.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{staff.role}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Assigned Shift:</span>
                      <select
                        value={assigned?.shift_id || ''}
                        onChange={e => handleAssignRoster(staff.id, e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100"
                      >
                        <option value="">-- No Shift Assigned --</option>
                        {shifts.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.shift_name} ({formatTimeAmPm(s.start_time)} - {formatTimeAmPm(s.end_time)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYROLL & SALARY SLIPS */}
      {/* ========================================================================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Month Filter & One-Click Payroll Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Monthly Staff Payroll & Salary Slips
              </h3>
              
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>

              <button
                type="button"
                onClick={handleCalculatePayrollClick}
                disabled={staffList.length === 0}
                title={staffList.length === 0 ? 'No registered staff accounts. Register staff accounts first.' : 'Calculate Monthly Payroll'}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calculate Monthly Payroll
              </button>

              {salaryRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenAttendanceApproval()}
                  disabled={approvingPayroll}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Attendance Approval</span>
                </button>
              )}
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Base Salary</th>
                    <th className="px-4 py-3">Attendance Days</th>
                    <th className="px-4 py-3">Gross Earned</th>
                    <th className="px-4 py-3">Allowances (Uniform/Rent)</th>
                    <th className="px-4 py-3">Deductions & Advance</th>
                    <th className="px-4 py-3 font-bold text-slate-900 dark:text-white">Net Salary</th>
                    <th className="px-4 py-3">Approval</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                          <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                          <p className="font-bold text-slate-700 dark:text-slate-200">No registered staff accounts</p>
                          <p className="text-slate-400 text-[11px]">
                            Salary slips are only generated for staff with an active account. Please register a staff account to get started.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setActiveTab('live'); handleOpenStaffEdit(null); }}
                            className="mt-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm cursor-pointer transition"
                          >
                            + Register Staff Account
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : salaryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No payroll computed for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}. Click &quot;Calculate Monthly Payroll&quot; to generate records.
                      </td>
                    </tr>
                  ) : (
                    salaryRecords.map(record => {
                      const totalAllowances = (record.allowances || []).reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
                      const totalDeductions = (record.deductions || []).reduce((acc, d) => acc + (Number(d.amount) || 0), 0) + (Number(record.total_advance) || 0);

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                const st = staffList.find(s => s.id === record.staff_id);
                                if (st) handleOpenEmployeeCalendar(st);
                              }}
                              className="text-left group cursor-pointer"
                              title="Click to view detailed monthly attendance calendar"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1.5 transition">
                                <span>{record.staff_name}</span>
                                <Calendar className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                              </span>
                            </button>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{record.staff_role}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => handleOpenStaffEdit(record.staff_id)}
                                className="font-bold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition"
                                title="Click to edit employee base salary"
                              >
                                <span>₹{Number(record.base_salary).toLocaleString('en-IN')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleRecordSalaryType(record)}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md cursor-pointer transition inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Click to toggle between Fixed Monthly and Per-Day Pro-rated calculation"
                              >
                                {(record.salary_type || 'fixed') === 'fixed' ? 'Fixed' : 'Per-Day'}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{record.total_present_days} Full</span>
                            {record.total_half_days > 0 && <span className="text-slate-400"> + {record.total_half_days} Half</span>}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            <div>₹{Number(record.gross_earned).toLocaleString('en-IN')}</div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {(record.salary_type || 'fixed') === 'fixed' ? 'Full Base' : 'Days Pro-rated'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            +₹{totalAllowances.toLocaleString('en-IN')}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({(record.allowances || []).length} items)
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            -₹{totalDeductions.toLocaleString('en-IN')}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({(record.deductions || []).length} items)
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white">
                            ₹{Number(record.net_salary).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                record.status === 'paid'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                const st = staffList.find(s => s.id === record.staff_id);
                                if (st) handleOpenEmployeeCalendar(st);
                              }}
                              className="px-2.5 py-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold text-xs bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer transition border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1"
                              title="Open Monthly Attendance Calendar"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Calendar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAttendanceApproval(record.staff_id)}
                              className="px-2.5 py-1 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 rounded-lg cursor-pointer transition border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1"
                              title="Day-by-Day Attendance Approval Center"
                            >
                              <CalendarCheck className="w-3 h-3" />
                              <span>Approval</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSalaryRecord(record);
                                setSalaryEditorOpen(true);
                              }}
                              className="px-2.5 py-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold text-xs bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer transition border border-slate-200 dark:border-slate-700"
                              title="Edit Allowances & Deductions"
                            >
                              Breakdown
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSlip(record);
                                setSlipModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-white font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-lg cursor-pointer transition"
                              title="Print Payslip"
                            >
                              View Slip
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB: LEAVE REQUESTS & APPROVALS */}
      {/* ========================================================================= */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Staff Leave Management & Approvals
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenManagerLeaveModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition mr-1"
                title="Directly record and approve leave for any employee"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Staff Leave</span>
              </button>

              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLeaveFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer transition ${
                    leaveFilter === f
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'All Requests' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {filteredLeaveRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No leave requests found</p>
                <p className="text-xs text-slate-500">Employees can submit leave requests from their punch card interface.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Leave Type</th>
                      <th className="px-4 py-3">Dates & Duration</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLeaveRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-800 dark:text-slate-100 block">{req.staff_name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">{req.staff_role}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="capitalize px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {req.leave_type} Leave
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          <div>{req.start_date} to {req.end_date}</div>
                          <span className="text-[10px] text-slate-400 font-normal">({req.total_days} Days)</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate text-slate-600 dark:text-slate-300">
                          {req.reason}
                        </td>
                        <td className="px-4 py-3.5">
                          {req.status === 'approved' ? (
                            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Pending Review
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReviewLeave(req.id, 'approved')}
                                disabled={leaveActionLoading}
                                className="px-2.5 py-1 text-white font-bold text-xs bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = prompt('Optional rejection note:');
                                  handleReviewLeave(req.id, 'rejected', reason || undefined);
                                }}
                                disabled={leaveActionLoading}
                                className="px-2.5 py-1 text-white font-bold text-xs bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition shadow-xs"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GEOFENCE SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Restaurant Geofencing & Location Punch Settings
            </h3>
            
          </div>

          {settingsNotice && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
              {settingsNotice}
            </div>
          )}

          <div className="space-y-4">
            {/* Toggle Punch-out Mandatory Setting */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Punch-Out Mandatory Policy
                </span>
              </div>
              <input
                type="checkbox"
                checked={punchOutMandatory}
                onChange={e => handleTogglePunchOutMandatory(e.target.checked)}
                className="w-5 h-5 accent-slate-900 dark:accent-white rounded cursor-pointer"
              />
            </div>

            {/* Toggle Enable Geofence */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Enforce Strict Geofencing
                </span>
              </div>
              <input
                type="checkbox"
                checked={geofenceConfig.geofence_enabled}
                onChange={e => setGeofenceConfig(prev => ({ ...prev, geofence_enabled: e.target.checked }))}
                className="w-5 h-5 accent-slate-900 dark:accent-white rounded cursor-pointer"
              />
            </div>

            {/* Latitude & Longitude */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Restaurant Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 28.6139"
                  value={geofenceConfig.latitude ?? ''}
                  onChange={e => setGeofenceConfig(prev => ({ ...prev, latitude: parseFloat(e.target.value) || null }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Restaurant Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 77.2090"
                  value={geofenceConfig.longitude ?? ''}
                  onChange={e => setGeofenceConfig(prev => ({ ...prev, longitude: parseFloat(e.target.value) || null }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Set to Current Location Button */}
            <button
              type="button"
              onClick={handleAcquireCurrentLocationAsRestaurant}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer transition"
            >
              Use Current Location as Restaurant Center
            </button>

            {/* Allowed Radius in meters */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Allowed Geofence Radius (Meters)
              </label>
              <input
                type="number"
                min="20"
                max="5000"
                value={geofenceConfig.radius_meters}
                onChange={e => setGeofenceConfig(prev => ({ ...prev, radius_meters: Number(e.target.value) || 150 }))}
                className="w-48 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />

            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSaveGeofenceSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Geofence Settings'}
              </button>
            </div>

            {/* Storage Optimizer & 30-Day Auto-Purge */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">
                    ⚡ Storage Optimizer &amp; Selfie Auto-Purge
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Attendance selfies older than 30 days are automatically purged to prevent storage bloat. Staff punch times, working hours, and salary records are permanently preserved.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                  Status: Auto-Cleanup Active (Every 30 Days)
                </span>
                <button
                  type="button"
                  onClick={handleManualSelfieCleanup}
                  disabled={cleaningSelfies}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {cleaningSelfies ? 'Cleaning Storage...' : 'Clean Old Selfies Now (> 30 Days)'}
                </button>
              </div>
              {cleanupResultNotice && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {cleanupResultNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Manual Override Modal */}
      {overrideModalOpen && overrideStaff && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs my-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Manual Attendance Override
              </h3>
              <p className="text-slate-500">
                Adjust attendance for <strong className="text-slate-800 dark:text-white">{overrideStaff.name}</strong> on {selectedDate}.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={overrideStatus}
                    onChange={e => setOverrideStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Punch In Time</label>
                    <input
                      type="time"
                      value={overridePunchIn}
                      onChange={e => setOverridePunchIn(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Punch Out Time</label>
                    <input
                      type="time"
                      value={overridePunchOut}
                      onChange={e => setOverridePunchOut(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Forgot phone, approved by manager"
                    value={overrideNotes}
                    onChange={e => setOverrideNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOverride}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
                >
                  Apply Override
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Shift Edit / Create Modal */}
      {shiftModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs my-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingShift?.id ? 'Edit Shift' : 'Create New Shift'}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shift Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Rush, Dinner Service"
                    value={shiftNameInput}
                    onChange={e => setShiftNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={shiftStartInput}
                      onChange={e => setShiftStartInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                    <input
                      type="time"
                      value={shiftEndInput}
                      onChange={e => setShiftEndInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={shiftGraceInput}
                    onChange={e => setShiftGraceInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveShiftModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
                >
                  Save Shift
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Staff Profile & Base Salary Edit / Create Modal (Optimized UI - SS2 Fix) */}
      {staffModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-3.5 text-xs my-auto">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingStaffMember?.id ? 'Edit Staff Profile & Salary' : 'Register Staff Account & Salary'}
                  </h3>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    {editingStaffMember?.id
                      ? 'Update employee role permissions, weekly off, and monthly baseline salary.'
                      : 'Create a staff login account and designate their baseline salary and weekly off day.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {staffModalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="flex-1 leading-relaxed">
                    {staffModalError}
                  </div>
                  <button
                    type="button"
                    disabled={purgingEmail}
                    onClick={handlePurgeAndRetry}
                    className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm text-center"
                  >
                    {purgingEmail ? 'Purging Old Account...' : 'Purge Old Account & Force Register'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Left Column: Account & Credentials */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Staff Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={staffNameInput}
                      onChange={e => setStaffNameInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none"
                      required
                    />
                  </div>

                  {!editingStaffMember && (
                    <>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Staff Login Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. ramesh@restaurant.com"
                          value={staffEmailInput}
                          onChange={e => setStaffEmailInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Access Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={staffPasswordInput}
                          onChange={e => setStaffPasswordInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={staffPhoneInput}
                      onChange={e => setStaffPhoneInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                    />
                  </div>
                </div>

                {/* Right Column: Role Permissions & Base Compensation */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Staff Role Permissions <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={staffRoleInput}
                      onChange={e => setStaffRoleInput(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                    >
                      <optgroup label="Management">
                        <option value="manager">Manager (Full Ops)</option>
                        <option value="supervisor">Supervisor (Kitchen & Floor Oversight)</option>
                      </optgroup>
                      <optgroup label="Kitchen Wing (KDS & Prep)">
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

                  {canManagePayroll ? (
                    <>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Monthly Base Salary (₹)
                        </label>
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            placeholder="e.g. 18000"
                            value={staffSalaryInput}
                            onChange={e => setStaffSalaryInput(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full text-xs font-black bg-transparent text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Salary Calculation Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setStaffSalaryTypeInput('per_day')}
                            className={`py-1.5 px-2 rounded-lg font-bold text-center border cursor-pointer transition text-[11px] ${
                              staffSalaryTypeInput === 'per_day'
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            Per-Day (Default)
                          </button>
                          <button
                            type="button"
                            onClick={() => setStaffSalaryTypeInput('fixed')}
                            className={`py-1.5 px-2 rounded-lg font-bold text-center border cursor-pointer transition text-[11px] ${
                              staffSalaryTypeInput === 'fixed'
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            Fixed Monthly
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 font-medium">
                      🔒 Base Salary &amp; Wages are managed exclusively by the Restaurant Owner &amp; Manager.
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Designated Weekly Off Day
                    </label>
                    <select
                      value={staffWeeklyOffInput}
                      onChange={e => setStaffWeeklyOffInput(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold capitalize outline-none"
                    >
                      <option value="none">None (No Fixed Weekly Off)</option>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaffModal}
                  disabled={
                    savingStaff ||
                    !staffNameInput.trim() ||
                    (!editingStaffMember && (!staffEmailInput.trim() || !staffPasswordInput.trim()))
                  }
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingStaff ? 'Saving...' : editingStaffMember?.id ? 'Update Staff & Salary' : 'Create Account & Save'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Manager / Owner Record Leave Modal */}
      {managerLeaveModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 text-xs my-auto">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Record Employee Leave</span>
                  </h3>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Directly assign and pre-approve leave for any staff member
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManagerLeaveModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {managerLeaveError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                  {managerLeaveError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Staff Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={managerLeaveStaffId}
                    onChange={e => setManagerLeaveStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none text-slate-900 dark:text-white"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Leave Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['casual', 'sick', 'paid', 'unpaid'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setManagerLeaveType(type)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold capitalize border cursor-pointer transition ${
                          managerLeaveType === type
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={managerLeaveStartDate}
                      onChange={e => setManagerLeaveStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={managerLeaveEndDate}
                      onChange={e => setManagerLeaveEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Management Notes
                  </label>
                  <textarea
                    rows={2}
                    value={managerLeaveReason}
                    onChange={e => setManagerLeaveReason(e.target.value)}
                    placeholder="e.g. Medical emergency, family function, advance approved..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium outline-none resize-none"
                  />
                </div>

                <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-[11px] text-blue-800 dark:text-blue-200 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>This leave will be immediately recorded as <strong>Pre-Approved</strong> by Management.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setManagerLeaveModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveManagerLeave}
                  disabled={managerLeaveSaving || !managerLeaveStaffId || !managerLeaveStartDate || !managerLeaveEndDate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {managerLeaveSaving ? 'Saving...' : 'Record & Approve Leave'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Salary Breakdown Editor Modal */}
      <SalaryEditorModal
        isOpen={salaryEditorOpen}
        onClose={() => setSalaryEditorOpen(false)}
        record={editingSalaryRecord}
        onSave={handleSaveSalaryRecord}
      />


      {/* EMPLOYEE ATTENDANCE HISTORY & SELFIE MODAL */}
      {historyModalOpen && historyStaff && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 bg-slate-950/85 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black text-sm">
                    {historyStaff.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {historyStaff.name} — Attendance History
                      </h3>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {historyStaff.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}{historyStaff.phone ? ` • ${historyStaff.phone}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Strip */}
              <div className="p-4 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Days Logged</span>
                  <span className="text-lg font-black text-white">
                    {historyAttendances.length} Days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Hours Worked</span>
                  <span className="text-lg font-black text-emerald-400">
                    {Math.round(historyAttendances.reduce((acc, a) => acc + calculateHoursWorked(a.punch_in_time, a.punch_out_time), 0) * 10) / 10} hrs
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Base Salary</span>
                  <span className="text-lg font-black text-slate-200">
                    ₹{Number(historyStaff.base_salary).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>

              {/* Records List */}
              <div className="p-5 overflow-y-auto flex-1 space-y-3">
                {historyLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading attendance history...
                  </div>
                ) : historyAttendances.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No attendance records found for this employee this month.
                  </div>
                ) : (
                  historyAttendances.map(att => {
                    const hoursWorked = formatHoursWorkedText(att.punch_in_time, att.punch_out_time);
                    const isToday = att.date === selectedDate;
                    const isOnDuty = !!att.punch_in_time && !att.punch_out_time;

                    return (
                      <div
                        key={att.id || att.date}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {/* Selfie Thumbnail with Zoom on Click */}
                          {att.selfie_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewSelfieUrl(att.selfie_url || null)}
                              className="relative group shrink-0 cursor-pointer"
                              title="Click to view full selfie photo"
                            >
                              <img
                                src={att.selfie_url}
                                alt="Selfie"
                                className="w-12 h-12 rounded-xl object-cover border-2 border-slate-300 dark:border-slate-700 group-hover:scale-105 transition shadow-sm"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[10px] font-bold shrink-0">
                              No Photo
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                {new Date(att.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                              <span>In: <strong>{formatTimeAmPm(att.punch_in_time)}</strong></span>
                              <span className="mx-1.5">•</span>
                              <span>Out: <strong>{att.punch_out_time ? formatTimeAmPm(att.punch_out_time) : (isOnDuty ? 'On Duty' : '--')}</strong></span>
                            </div>
                            {att.notes && (
                              <div className="text-[10px] text-slate-400 mt-0.5 italic">
                                Note: {att.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            {hoursWorked}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                              att.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : att.status === 'late'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : att.status === 'half_day'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs cursor-pointer transition shadow-sm"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* FULL SELFIE PHOTO LIGHTBOX PREVIEW */}
      {previewSelfieUrl && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] p-4 bg-slate-950/90 backdrop-blur-md flex justify-center items-center">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Punch Selfie Verification
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewSelfieUrl(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                <img
                  src={previewSelfieUrl}
                  alt="Full Selfie Verification"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setPreviewSelfieUrl(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl cursor-pointer transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Printable Salary Slip Modal */}
      <SalarySlipModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        record={selectedSlip}
        restaurant={restaurant}
      />

      {/* Monthly Attendance Calendar Modal */}
      <StaffAttendanceCalendarModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        staff={calendarModalStaff}
        restaurant={restaurant}
        month={selectedMonth}
        year={selectedYear}
        attendances={calendarModalAttendances}
        shifts={shifts}
        leaveRequests={leaveRequests}
        currentUserId={profile.id}
        currentUserName={profile.full_name || profile.email}
        onAttendanceChanged={async () => {
          const updatedAtts = await getMonthlyAttendanceForRestaurant(restaurant.id, selectedYear, selectedMonth);
          setCalendarModalAttendances(updatedAtts);
          await loadAllData();
          await handleCalculatePayrollClick();
        }}
      />

      {/* IN-PLACE STAFF EMAIL OTP VERIFICATION MODAL */}
      {staffOtpModalOpen && verifyingStaff && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span>Verify Staff Account</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setStaffOtpModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                An 8-digit verification OTP was sent to <strong>{verifyingStaff.email}</strong>. Enter it below to activate <strong>{verifyingStaff.full_name || 'Staff'}</strong>'s account immediately.
              </p>

              {staffOtpSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{staffOtpSuccess}</span>
                </div>
              )}

              {staffOtpError && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{staffOtpError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyStaffOtp} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Enter 8-digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    value={staffOtpInput}
                    onChange={e => setStaffOtpInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="• • • • • • • •"
                    className="block w-full px-3.5 py-3 text-center tracking-widest text-xl font-mono font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResendStaffOtp}
                    disabled={staffOtpLoading}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStaffOtpModalOpen(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={staffOtpLoading || staffOtpInput.length < 6}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50"
                    >
                      {staffOtpLoading ? 'Verifying...' : 'Verify & Activate'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DAY-BY-DAY ATTENDANCE APPROVAL CENTER MODAL */}
      {approvalModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Attendance Approval Center
                    </h3>
                    <p className="text-xs text-slate-500">
                      Day-by-day attendance review with real-time salary recalculation • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={approvalStaffId}
                    onChange={e => {
                      setApprovalStaffId(e.target.value);
                      setApprovalSelectedDates([]);
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role.toUpperCase()})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setApprovalModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

            {/* Live Calculation Strip */}
            {approvalStaffMember && (
              <div className="p-4 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Employee</span>
                  <span className="font-extrabold text-sm">{approvalStaffMember.name}</span>
                  <span className="text-slate-400 block text-[10px] capitalize">
                    {approvalStaffMember.role} • Weekly Off: {approvalStaffMember.weekly_off || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Salary</span>
                  <span className="font-extrabold text-sm">₹{Number(approvalStaffMember.base_salary).toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 block text-[10px]">
                    ₹{Math.round(Number(approvalStaffMember.base_salary) / (approvalDaysInMonth || 30))}/day
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Selected Days</span>
                  <span className="font-extrabold text-sm text-amber-300">
                    {approvalSelectedDates.length} Days Selected
                  </span>
                  <span className="text-slate-400 block text-[10px]">Multi-select checkboxes</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Live Earned Salary</span>
                  <span className="font-black text-base text-emerald-400">
                    ₹{approvalEarnedSalary.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-300 block text-[10px]">Based on approved attendance</span>
                </div>
              </div>
            )}

            {/* Batch Actions Toolbar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allDates = Array.from({ length: approvalDaysInMonth }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0');
                      const m = String(selectedMonth).padStart(2, '0');
                      return `${selectedYear}-${m}-${d}`;
                    });
                    handleSelectAllApprovalDates(allDates);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  {approvalSelectedDates.length === approvalDaysInMonth ? 'Deselect All' : 'Select All Days'}
                </button>

                {approvalStaffMember && (
                  <button
                    type="button"
                    onClick={() => handleOpenEmployeeCalendar(approvalStaffMember)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>View Calendar Grid</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchReviewAttendance('approved')}
                  disabled={approvalSelectedDates.length === 0 || approvalSubmitting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Selected ({approvalSelectedDates.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectNoteInput(prev => !prev)}
                  disabled={approvalSelectedDates.length === 0 || approvalSubmitting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Reject Selected ({approvalSelectedDates.length})</span>
                </button>
              </div>
            </div>

            {/* Optional Rejection Reason Bar */}
            {showRejectNoteInput && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 flex items-center gap-3 text-xs">
                <span className="font-bold text-rose-800 dark:text-rose-300 shrink-0">
                  Rejection Reason (Optional):
                </span>
                <input
                  type="text"
                  value={approvalRejectNote}
                  onChange={e => setApprovalRejectNote(e.target.value)}
                  placeholder="e.g. Incomplete shift / Did not punch out"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleBatchReviewAttendance('rejected')}
                  disabled={approvalSubmitting}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            )}

            {/* Day-by-Day Table */}
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold sticky top-0 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 w-10">Select</th>
                    <th className="px-4 py-2.5">Date & Day</th>
                    <th className="px-4 py-2.5">Punch Times</th>
                    <th className="px-4 py-2.5">Worked Duration</th>
                    <th className="px-4 py-2.5">Shift Completion</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Array.from({ length: approvalDaysInMonth }, (_, idx) => {
                    const dayNum = idx + 1;
                    const dStr = String(dayNum).padStart(2, '0');
                    const mStr = String(selectedMonth).padStart(2, '0');
                    const dateStr = [selectedYear, mStr, dStr].join('-');
                    const dateObj = new Date(selectedYear, selectedMonth - 1, dayNum);
                    const dayOfWeek = dateObj.toLocaleDateString([], { weekday: 'short' });
                    const dayOfWeekFull = dateObj.toLocaleDateString([], { weekday: 'long' }).toLowerCase();

                    const isWeeklyOff = approvalStaffMember?.weekly_off === dayOfWeekFull;
                    const att = approvalMonthAttendances.find(
                      a => a.staff_id === approvalStaffMember?.id && a.date === dateStr
                    );

                    let durationStr = '--';
                    let timingTag = 'none';

                    if (att?.punch_in_time) {
                      if (att.punch_out_time) {
                        const inMs = new Date(att.punch_in_time).getTime();
                        const outMs = new Date(att.punch_out_time).getTime();
                        const sec = Math.max(0, Math.floor((outMs - inMs) / 1000));
                        durationStr = formatWorkingDuration(sec);
                        timingTag = (sec / 3600 < 4 || att.status === 'half_day') ? 'half' : 'full';
                      } else {
                        timingTag = 'missing';
                      }
                    }

                    const isChecked = approvalSelectedDates.includes(dateStr);
                    const isApproved = att?.approval_status === 'approved';
                    const isRejected = att?.approval_status === 'rejected';

                    return (
                      <tr
                        key={dateStr}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                          isChecked ? 'bg-slate-50 dark:bg-slate-800/50' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectApprovalDate(dateStr)}
                            className="w-4 h-4 rounded text-slate-900 dark:text-white cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          <span>{dayNum} {MONTH_NAMES[selectedMonth - 1].slice(0, 3)} ({dayOfWeek})</span>
                          {isWeeklyOff && (
                            <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              Weekly Off
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {att?.punch_in_time ? (
                            <span>{formatTimeAmPm(att.punch_in_time)} - {formatTimeAmPm(att.punch_out_time)}</span>
                          ) : (
                            <span className="text-slate-400">No punch</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono">
                          {durationStr}
                        </td>
                        <td className="px-4 py-2.5">
                          {timingTag === 'full' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              Full Shift
                            </span>
                          )}
                          {timingTag === 'half' && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-full">
                              Half Day (&lt;4h)
                            </span>
                          )}
                          {timingTag === 'missing' && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 rounded-full">
                              No Punch Out
                            </span>
                          )}
                          {timingTag === 'none' && !isWeeklyOff && (
                            <span className="text-[10px] text-slate-400">Absent</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 capitalize font-medium">
                          {att?.status || (isWeeklyOff ? 'Weekly Off' : 'Absent')}
                        </td>
                        <td className="px-4 py-2.5">
                          {isApproved ? (
                            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : isRejected ? (
                            <span
                              className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 inline-flex items-center gap-1"
                              title={att?.rejection_reason || 'Rejected by manager'}
                            >
                              <Ban className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : att ? (
                            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Calculations update payroll slips immediately upon approval.
              </span>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl cursor-pointer transition shadow-sm"
              >
                Close Approval Center
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
