'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import AttendanceManagerView from '@/components/attendance/AttendanceManagerView';
import StaffPunchCard from '@/components/attendance/StaffPunchCard';
import {
  StaffProfile,
  Shift,
  StaffAttendance,
  getStaffProfiles,
  getShifts,
  getAttendanceForDate,
  getStaffShiftsForDate,
  cleanupOldAttendanceSelfies,
  getLocalDateString
} from '@/lib/attendoEngine';

export default function AttendancePage() {
  // 1. useState
  const { restaurant, profile, activeRole } = useRestaurant();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayAttendances, setTodayAttendances] = useState<StaffAttendance[]>([]);
  const [todayRoster, setTodayRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    if (activeRole && ['waiter', 'kitchen', 'cashier', 'kitchen_helper', 'cleaner', 'helper'].includes(activeRole)) {
      return true;
    }
    return false;
  });
  const [viewMode, setViewMode] = useState<'manager' | 'punch'>(() => {
    // If waiter, kitchen, cashier, cleaner, helper -> default to personal punch card
    if (activeRole && ['waiter', 'kitchen', 'cashier', 'kitchen_helper', 'cleaner', 'helper'].includes(activeRole)) {
      return 'punch';
    }
    return 'manager';
  });

  // 2. useMemo: Find current user's staff profile
  const currentStaffProfile = useMemo(() => {
    if (!profile || !staffList.length) return null;
    return (
      staffList.find(s => s.profile_id === profile.id || s.id === profile.id) ||
      staffList.find(s => s.name?.toLowerCase() === profile.full_name?.toLowerCase()) ||
      staffList[0] ||
      null
    );
  }, [profile, staffList]);

  // 3. useMemo: Today's date string
  const todayStr = useMemo(() => getLocalDateString(), []);

  // 4. useMemo: Current staff member's attendance today
  const myAttendanceToday = useMemo(() => {
    if (!currentStaffProfile) return null;
    return todayAttendances.find(a => a.staff_id === currentStaffProfile.id) || null;
  }, [currentStaffProfile, todayAttendances]);

  // 5. useMemo: Current staff member's assigned shift today
  const myAssignedShift = useMemo(() => {
    if (!currentStaffProfile) return null;
    const rosterItem = todayRoster.find(r => r.staff_id === currentStaffProfile.id);
    if (!rosterItem) return shifts[0] || null;
    return shifts.find(s => s.id === rosterItem.shift_id) || shifts[0] || null;
  }, [currentStaffProfile, todayRoster, shifts]);

  // 6. useEffect: Load staff & attendance data
  useEffect(() => {
    if (!restaurant?.id) return;
    const restId: string = restaurant.id;

    // In manager view, AttendanceManagerView already manages its own comprehensive data loading
    // Only personal punch card view requires outer profile & shift state
    if (viewMode !== 'punch') {
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const [profiles, shiftList, attendances, roster] = await Promise.all([
          getStaffProfiles(restId),
          getShifts(restId),
          getAttendanceForDate(restId, todayStr),
          getStaffShiftsForDate(restId, todayStr)
        ]);

        setStaffList(profiles);
        setShifts(shiftList);
        setTodayAttendances(attendances);
        setTodayRoster(roster);

        // Silent background sweep: auto-purge selfies older than 30 days
        if (typeof window !== 'undefined') {
          const storageKey = `attendo_selfie_cleanup_${restId}`;
          const lastCleaned = localStorage.getItem(storageKey);
          const now = Date.now();
          const isFirstDayOfMonth = new Date().getDate() === 1;
          const daysSinceLast = lastCleaned ? (now - parseInt(lastCleaned, 10)) / 86400000 : 999;

          if (isFirstDayOfMonth || daysSinceLast >= 7) {
            cleanupOldAttendanceSelfies(restId, 30)
              .then(res => {
                if (res.cleanedCount > 0) {
                  console.log(`[Attendo] Auto-purged ${res.cleanedCount} selfie(s) older than 30 days.`);
                }
                localStorage.setItem(storageKey, now.toString());
              })
              .catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Error loading attendance page data:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [restaurant?.id, todayStr]);

  // Conditional early return AFTER all hooks
  if (!restaurant || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isManagementRole = activeRole === 'owner' || activeRole === 'manager' || activeRole === 'supervisor' || profile?.role === 'owner' || profile?.role === 'manager' || profile?.role === 'supervisor';

  const handleRefreshAttendance = async () => {
    const restId = restaurant?.id;
    if (!restId) return;
    const attendances = await getAttendanceForDate(restId, todayStr);
    setTodayAttendances(attendances);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28 md:pb-12 w-full overflow-x-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            Staff Attendance & Payroll
          </h1>
        </div>

        {/* View Switcher for Owners/Managers/Supervisors */}
        {isManagementRole && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold overflow-x-auto max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('manager')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'manager'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Team Management Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('punch')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'punch'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Personal Punch Card
            </button>
          </div>
        )}
      </div>

      {viewMode === 'manager' && isManagementRole ? (
        <AttendanceManagerView restaurant={restaurant} profile={profile} activeRole={activeRole} />
      ) : loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading attendance records...</p>
        </div>
      ) : (
        currentStaffProfile ? (
          <StaffPunchCard
            restaurant={restaurant}
            staff={currentStaffProfile}
            todayShift={myAssignedShift}
            todayAttendance={myAttendanceToday}
            onAttendanceUpdated={handleRefreshAttendance}
          />
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            No staff profile linked to your account yet. Please add staff profiles in the Settings tab.
          </div>
        )
      )}
    </div>
  );
}
