'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRestaurant } from '../../../layout';
import StaffPunchCard from '@/components/attendance/StaffPunchCard';
import {
  StaffProfile,
  Shift,
  StaffAttendance,
  getStaffProfiles,
  getShifts,
  getAttendanceForDate,
  getStaffShiftsForDate
} from '@/lib/attendoEngine';

export default function AttendancePunchPage() {
  // 1. useState
  const { restaurant, profile } = useRestaurant();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayAttendances, setTodayAttendances] = useState<StaffAttendance[]>([]);
  const [todayRoster, setTodayRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // 2. useMemo: Today's date string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 3. useMemo: Find current staff profile (with selector fallback)
  const currentStaffProfile = useMemo(() => {
    if (!staffList.length) return null;
    if (selectedStaffId) {
      const found = staffList.find(s => s.id === selectedStaffId);
      if (found) return found;
    }
    if (profile) {
      const match =
        staffList.find(s => s.profile_id === profile.id || s.id === profile.id) ||
        staffList.find(s => s.name?.toLowerCase() === profile.full_name?.toLowerCase());
      if (match) return match;
    }
    return staffList[0] || null;
  }, [profile, staffList, selectedStaffId]);

  // 4. useMemo: Current staff attendance today
  const myAttendanceToday = useMemo(() => {
    if (!currentStaffProfile) return null;
    return todayAttendances.find(a => a.staff_id === currentStaffProfile.id) || null;
  }, [currentStaffProfile, todayAttendances]);

  // 5. useMemo: Assigned shift
  const myAssignedShift = useMemo(() => {
    if (!currentStaffProfile) return null;
    const rosterItem = todayRoster.find(r => r.staff_id === currentStaffProfile.id);
    if (!rosterItem) return shifts[0] || null;
    return shifts.find(s => s.id === rosterItem.shift_id) || shifts[0] || null;
  }, [currentStaffProfile, todayRoster, shifts]);

  // 6. useEffect: Load data
  useEffect(() => {
    if (!restaurant?.id) return;
    const restId: string = restaurant.id;

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
      } catch (e) {
        console.warn('Error loading punch page data:', e);
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

  const handleRefreshAttendance = async () => {
    const restId = restaurant?.id;
    if (!restId) return;
    const attendances = await getAttendanceForDate(restId, todayStr);
    setTodayAttendances(attendances);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 py-4 px-2">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-full border border-slate-200 dark:border-slate-700">
          Mobile Attendance Punch
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          {restaurant.name}
        </h1>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Punch Card...</p>
        </div>
      ) : currentStaffProfile ? (
        <div className="space-y-3">
          {staffList.length > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 font-medium">Punching As:</span>
              <select
                value={currentStaffProfile.id}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <StaffPunchCard
            restaurant={restaurant}
            staff={currentStaffProfile}
            todayShift={myAssignedShift}
            todayAttendance={myAttendanceToday}
            onAttendanceUpdated={handleRefreshAttendance}
          />
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          No staff profile linked to this account.
        </div>
      )}
    </div>
  );
}
