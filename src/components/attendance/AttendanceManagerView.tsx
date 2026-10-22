'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  StaffProfile,
  Shift,
  StaffShift,
  StaffAttendance,
  SalaryRecord,
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
  managerApprovePunchOut
} from '@/lib/attendoEngine';
import { supabase } from '@/lib/supabase';
import { db, Restaurant, Profile } from '@/lib/db';
import SalarySlipModal from './SalarySlipModal';
import SalaryEditorModal from './SalaryEditorModal';
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
  X
} from 'lucide-react';

interface AttendanceManagerViewProps {
  restaurant: Restaurant;
  profile: Profile;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceManagerView({
  restaurant,
  profile
}: AttendanceManagerViewProps) {
  // 1. useState
  const [activeTab, setActiveTab] = useState<'live' | 'roster' | 'logs' | 'payroll' | 'settings'>('live');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Entity States
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayAttendances, setTodayAttendances] = useState<StaffAttendance[]>([]);
  const [dateRoster, setDateRoster] = useState<StaffShift[]>([]);
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
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffPasswordInput, setStaffPasswordInput] = useState('');
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);

  // Geofence Settings State
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig>(() => getAttendoSettings(restaurant));
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [punchOutMandatory, setPunchOutMandatoryState] = useState<boolean>(() => isPunchOutMandatory(restaurant));
  const [approvingPayroll, setApprovingPayroll] = useState(false);

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

  // 4. useEffect: Initial Data Loading
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

    // 15-second polling interval for robust background sync across mobile devices
    const interval = setInterval(() => {
      db.clearRestaurantCache(restId);
      loadAllData();
    }, 15000);

    // Supabase Realtime Channel for live attendance punches from staff phones
    const channel = supabase
      .channel(`attendance_realtime_${restId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restId}` },
        () => {
          db.clearRestaurantCache(restId);
          loadAllData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_attendance', filter: `restaurant_id=eq.${restId}` },
        () => {
          db.clearRestaurantCache(restId);
          loadAllData();
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

  async function loadAllData() {
    setLoading(true);
    try {
      db.clearRestaurantCache(restaurant.id);
      const [profiles, shiftList, attendances, roster] = await Promise.all([
        getStaffProfiles(restaurant.id),
        getShifts(restaurant.id),
        getAttendanceForDate(restaurant.id, selectedDate),
        getStaffShiftsForDate(restaurant.id, selectedDate)
      ]);

      setStaffList(profiles);
      setShifts(shiftList);
      setTodayAttendances(attendances);
      setDateRoster(roster);
    } catch (e) {
      console.warn('Error loading attendo data:', e);
    } finally {
      setLoading(false);
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
    } else {
      setEditingStaffMember(null);
      setStaffNameInput('');
      setStaffEmailInput('');
      setStaffPhoneInput('');
      setStaffPasswordInput('');
      setStaffRoleInput('waiter');
      setStaffSalaryInput(15000);
      setStaffSalaryTypeInput('fixed');
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
          staffRoleInput === 'supervisor' ? 'general' : staffRoleInput,
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
          salary_type: staffSalaryTypeInput
        });

        // Audit log
        await db.createAuditLog(
          restaurant.id,
          profile.id,
          profile.email,
          'create_staff',
          `Created staff account & baseline salary for ${staffNameInput.trim()} (${staffRoleInput})`
        );

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
              department: staffRoleInput === 'supervisor' ? 'general' : staffRoleInput
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
          salary_type: staffSalaryTypeInput
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
      setStaffModalError(e?.message || 'Failed to save staff profile.');
    } finally {
      setSavingStaff(false);
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
    try {
      await assignStaffShift(restaurant.id, staffId, shiftId, selectedDate);
      const updatedRoster = await getStaffShiftsForDate(restaurant.id, selectedDate);
      setDateRoster(updatedRoster);
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
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer font-bold ${
              activeTab === 'payroll' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Payroll & Salary Slips
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
            onClick={loadAllData}
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
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="cashier">Cashier</option>
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
                        {att?.selfie_url ? (
                          <img
                            src={att.selfie_url}
                            alt={staff.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-300 dark:border-slate-700 shadow-sm"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black text-sm">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                            {staff.name}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
                            {staff.role} • {staff.phone || 'No phone'}
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
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Shift:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {assignedShift?.shift_name || 'Not Scheduled'}
                        </span>
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
                      <button
                        type="button"
                        onClick={() => handleOpenOverride(staff)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold text-xs cursor-pointer transition"
                      >
                        Override
                      </button>
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
                  onClick={handleApproveAllSalaries}
                  disabled={approvingPayroll}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {approvingPayroll ? 'Approving...' : 'Approve All Attendance'}
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
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">{record.staff_name}</span>
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
                <span className="text-xs text-slate-500">
                  When enabled, employees must punch out at shift end. Missing punch-outs will trigger employee alerts and require manager approval.
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
                <span className="text-xs text-slate-500">
                  Block punch-in when staff is outside restaurant boundary.
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
              <p className="text-[11px] text-slate-400 mt-1">
                Recommended: 150m (allows staff to punch anywhere within building or parking lot).
              </p>
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Manual Override Modal */}
      {overrideModalOpen && overrideStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
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
      )}

      {/* Shift Edit / Create Modal */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs">
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
      )}

      {/* Staff Profile & Base Salary Edit / Create Modal */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingStaffMember?.id ? 'Edit Staff & Base Salary' : 'Register Staff Account & Base Salary'}
                </h3>
                <p className="text-slate-500 mt-0.5">
                  {editingStaffMember?.id
                    ? 'Update staff details, role permissions, and monthly baseline salary.'
                    : 'Create a staff login account and set their monthly baseline salary. Attendance and payroll will calculate based on this base salary.'}
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
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                {staffModalError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Account & Credentials */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={staffNameInput}
                    onChange={e => setStaffNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Staff uses this email to log in to punch attendance and view orders.</p>
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Right Column: Role Permissions & Base Compensation */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Role Permissions <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={staffRoleInput}
                    onChange={e => setStaffRoleInput(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="manager">Manager (Menu, Tables, KDS, Orders)</option>
                    <option value="supervisor">Supervisor (Department-Scoped)</option>
                    <option value="waiter">Waiter (Tables, Orders, Service)</option>
                    <option value="kitchen">Kitchen Staff (KDS, Chef)</option>
                    <option value="cashier">Cashier (Billing &amp; Checkout)</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Monthly Base Salary (₹)
                  </label>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600">
                    <span className="font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      placeholder="e.g. 18000"
                      value={staffSalaryInput}
                      onChange={e => setStaffSalaryInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-sm font-black bg-transparent text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    This base salary is used for calculating daily rate and monthly payroll slips.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Salary Calculation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStaffSalaryTypeInput('per_day')}
                      className={`p-2 rounded-lg font-bold text-center border cursor-pointer transition ${
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
                      className={`p-2 rounded-lg font-bold text-center border cursor-pointer transition ${
                        staffSalaryTypeInput === 'fixed'
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Fixed Monthly
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {staffSalaryTypeInput === 'per_day'
                      ? 'Per-Day: Pro-rated by attendance days (daily rate × days worked).'
                      : 'Fixed: Full monthly base pay irrespective of attendance punch.'}
                  </p>
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
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingStaff ? 'Saving...' : editingStaffMember?.id ? 'Update Staff & Salary' : 'Create Account & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Breakdown Editor Modal */}
      <SalaryEditorModal
        isOpen={salaryEditorOpen}
        onClose={() => setSalaryEditorOpen(false)}
        record={editingSalaryRecord}
        onSave={handleSaveSalaryRecord}
      />

      {/* Printable Salary Slip Modal */}
      <SalarySlipModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        record={selectedSlip}
        restaurant={restaurant}
      />
    </div>
  );
}
