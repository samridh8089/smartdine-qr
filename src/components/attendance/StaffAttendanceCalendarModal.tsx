'use client';

import { useState, useMemo } from 'react';
import {
  StaffProfile,
  StaffAttendance,
  Shift,
  StaffLeaveRequest,
  formatTimeAmPm,
  formatWorkingDuration,
  reviewAttendanceDays,
  managerApprovePunchOut
} from '@/lib/attendoEngine';
import { Restaurant } from '@/lib/db';
import {
  X,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Check,
  Ban,
  Coffee,
  Info,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface StaffAttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffProfile | null;
  restaurant: Restaurant | null;
  month: number;
  year: number;
  attendances: StaffAttendance[];
  shifts: Shift[];
  leaveRequests?: StaffLeaveRequest[];
  currentUserId: string;
  currentUserName: string;
  onAttendanceChanged: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffAttendanceCalendarModal({
  isOpen,
  onClose,
  staff,
  restaurant,
  month,
  year,
  attendances,
  shifts,
  leaveRequests = [],
  currentUserId,
  currentUserName,
  onAttendanceChanged
}: StaffAttendanceCalendarModalProps) {
  // 1. useState
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);
  const [rejectionModalDate, setRejectionModalDate] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoadingDate, setActionLoadingDate] = useState<string | null>(null);

  // 2. useMemo: Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // 3. useMemo: Daily salary rate
  const dailyRate = useMemo(() => {
    if (!staff) return 0;
    const base = Number(staff.base_salary) || 0;
    return daysInMonth > 0 ? base / daysInMonth : 0;
  }, [staff, daysInMonth]);

  // 4. useMemo: Calendar Days Data
  const calendarDays = useMemo(() => {
    if (!staff) return [];

    const monthStr = String(month).padStart(2, '0');
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeekIndex = dateObj.getDay();
      const dayOfWeekName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeekIndex];

      const isWeeklyOff = staff.weekly_off && staff.weekly_off.toLowerCase() === dayOfWeekName;

      // Find attendance for this date
      const att = attendances.find(a => a.staff_id === staff.id && a.date === dateStr);

      // Find approved leave for this date
      const leave = leaveRequests.find(l => {
        if (l.staff_id !== staff.id || l.status !== 'approved') return false;
        return dateStr >= l.start_date && dateStr <= l.end_date;
      });

      // Calculate shift duration and worked duration
      let workedSeconds = 0;
      let timingStatus: 'full' | 'half' | 'short' | 'missing_out' | 'none' = 'none';

      if (att?.punch_in_time) {
        if (att.punch_out_time) {
          const inMs = new Date(att.punch_in_time).getTime();
          const outMs = new Date(att.punch_out_time).getTime();
          workedSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
          const workedHours = workedSeconds / 3600;

          if (workedHours < 4 || att.status === 'half_day') {
            timingStatus = 'half';
          } else if (workedHours < 7) {
            timingStatus = 'short';
          } else {
            timingStatus = 'full';
          }
        } else {
          timingStatus = 'missing_out';
        }
      }

      days.push({
        day,
        dateStr,
        dayOfWeekIndex,
        dayOfWeekName,
        isWeeklyOff,
        attendance: att || null,
        leave: leave || null,
        workedSeconds,
        timingStatus
      });
    }

    return days;
  }, [staff, month, year, daysInMonth, attendances, leaveRequests]);

  // 5. useMemo: Monthly Summary Counters & Earned Salary
  const summary = useMemo(() => {
    let fullDays = 0;
    let halfDays = 0;
    let lateDays = 0;
    let weeklyOffDays = 0;
    let approvedLeaveDays = 0;
    let pendingApprovalDays = 0;
    let rejectedDays = 0;
    let missingPunchOutDays = 0;

    for (const d of calendarDays) {
      if (d.attendance) {
        if (d.attendance.approval_status === 'rejected') {
          rejectedDays += 1;
        } else if (d.attendance.approval_status === 'pending_approval') {
          pendingApprovalDays += 1;
        }

        if (d.attendance.approval_status !== 'rejected') {
          if (d.timingStatus === 'missing_out') {
            missingPunchOutDays += 1;
          }
          if (d.attendance.status === 'half_day' || d.timingStatus === 'half') {
            halfDays += 1;
          } else if (d.attendance.status === 'present' || d.attendance.status === 'late') {
            fullDays += 1;
            if (d.attendance.status === 'late') lateDays += 1;
          }
        }
      } else if (d.leave) {
        approvedLeaveDays += 1;
      } else if (d.isWeeklyOff) {
        weeklyOffDays += 1;
      }
    }

    const effectiveDays = fullDays + (halfDays * 0.5);
    const earnedSalary = Math.round(effectiveDays * dailyRate);

    return {
      fullDays,
      halfDays,
      lateDays,
      weeklyOffDays,
      approvedLeaveDays,
      pendingApprovalDays,
      rejectedDays,
      missingPunchOutDays,
      effectiveDays,
      earnedSalary
    };
  }, [calendarDays, dailyRate]);

  // Conditional early return AFTER all hooks
  if (!isOpen || !staff || !restaurant) return null;

  const handleApproveDay = async (dateStr: string) => {
    setActionLoadingDate(dateStr);
    try {
      await reviewAttendanceDays({
        restaurantId: restaurant.id,
        reviews: [{
          staffId: staff.id,
          date: dateStr,
          action: 'approved'
        }],
        reviewerId: currentUserId,
        reviewerName: currentUserName
      });
      onAttendanceChanged();
    } catch (e) {
      console.warn('Failed approving day:', e);
    } finally {
      setActionLoadingDate(null);
    }
  };

  const handleRejectDay = async (dateStr: string) => {
    setActionLoadingDate(dateStr);
    try {
      await reviewAttendanceDays({
        restaurantId: restaurant.id,
        reviews: [{
          staffId: staff.id,
          date: dateStr,
          action: 'rejected',
          rejectionReason: rejectionReason.trim() || 'Rejected by manager'
        }],
        reviewerId: currentUserId,
        reviewerName: currentUserName
      });
      setRejectionModalDate(null);
      setRejectionReason('');
      onAttendanceChanged();
    } catch (e) {
      console.warn('Failed rejecting day:', e);
    } finally {
      setActionLoadingDate(null);
    }
  };

  const handleQuickApprovePunchOut = async (dateStr: string) => {
    setActionLoadingDate(dateStr);
    try {
      await managerApprovePunchOut({
        restaurantId: restaurant.id,
        staffId: staff.id,
        date: dateStr,
        managerUserId: currentUserId,
        managerName: currentUserName,
        status: 'present',
        punchOutTime: `${dateStr}T18:00:00.000Z`,
        notes: `Punch-out approved by ${currentUserName}`
      });
      onAttendanceChanged();
    } catch (e) {
      console.warn('Failed approving punch out:', e);
    } finally {
      setActionLoadingDate(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm flex justify-center items-start">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full my-4 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Attendance Calendar — {staff.name}</span>
              </h3>
              <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {staff.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {MONTH_NAMES[month - 1]} {year} • Base: ₹{Number(staff.base_salary).toLocaleString('en-IN')} (₹{Math.round(dailyRate)}/day)
              {staff.weekly_off && staff.weekly_off !== 'none' && ` • Designated Off: ${staff.weekly_off.toUpperCase()}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Calculation KPI Summary Strip */}
        <div className="p-5 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Approved Days</span>
            <span className="text-xl font-black text-white">
              {summary.fullDays} Full <span className="text-sm font-normal text-slate-300">+ {summary.halfDays} Half</span>
            </span>
            <span className="text-[10px] text-emerald-400 block font-semibold">
              = {summary.effectiveDays} Effective Days
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Calculated Salary</span>
            <span className="text-xl font-black text-emerald-400">
              ₹{summary.earnedSalary.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-300 block">
              {summary.effectiveDays} Days × ₹{Math.round(dailyRate)}/day
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Weekly Offs</span>
            <span className="text-xl font-black text-purple-300">
              {summary.weeklyOffDays} Days
            </span>
            <span className="text-[10px] text-slate-400 block capitalize">
              {staff.weekly_off || 'None Set'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Leaves & Late</span>
            <span className="text-xl font-black text-blue-300">
              {summary.approvedLeaveDays} Leaves <span className="text-sm text-amber-300">/ {summary.lateDays} Late</span>
            </span>
            <span className="text-[10px] text-slate-400 block">
              Approved Records
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending / Missing</span>
            <span className="text-xl font-black text-amber-400">
              {summary.pendingApprovalDays + summary.missingPunchOutDays} Days
            </span>
            <span className="text-[10px] text-slate-400 block">
              Needs Review
            </span>
          </div>
        </div>

        {/* Calendar View */}
        <div className="p-6 overflow-x-auto">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-slate-500 uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Month Day Tiles Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots for first day offset */}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-28 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800" />
            ))}

            {/* Actual Calendar Days */}
            {calendarDays.map(d => {
              const hasAtt = Boolean(d.attendance);
              const isApproved = d.attendance?.approval_status === 'approved';
              const isRejected = d.attendance?.approval_status === 'rejected';
              const isPending = d.attendance?.approval_status === 'pending_approval';

              return (
                <div
                  key={d.dateStr}
                  className={`min-h-[120px] rounded-2xl p-2.5 flex flex-col justify-between border transition text-xs relative ${
                    isRejected
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isApproved
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                      : isPending
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : d.leave
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                      : d.isWeeklyOff
                      ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top Bar: Day Number & Status Pill */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-slate-800 dark:text-slate-200">
                      {d.day}
                    </span>

                    {/* Status Pill */}
                    {d.isWeeklyOff && !hasAtt && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        Weekly Off
                      </span>
                    )}

                    {d.leave && !hasAtt && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 capitalize">
                        {d.leave.leave_type} Leave
                      </span>
                    )}

                    {hasAtt && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        isRejected
                          ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                          : isApproved
                          ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                          : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 animate-pulse'
                      }`}>
                        {isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending'}
                      </span>
                    )}
                  </div>

                  {/* Middle Content: Punch Times & Timing Check */}
                  <div className="my-1.5 space-y-1">
                    {hasAtt ? (
                      <>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold leading-tight">
                          <div>In: {formatTimeAmPm(d.attendance?.punch_in_time)}</div>
                          <div>Out: {formatTimeAmPm(d.attendance?.punch_out_time)}</div>
                        </div>

                        {/* Shift Duration Evaluation */}
                        {d.timingStatus === 'missing_out' && (
                          <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">
                            Missing Out
                          </div>
                        )}

                        {d.timingStatus === 'half' && (
                          <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">
                            Half Day ({formatWorkingDuration(d.workedSeconds)})
                          </div>
                        )}

                        {d.timingStatus === 'full' && (
                          <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.5 rounded">
                            Full Shift ({formatWorkingDuration(d.workedSeconds)})
                          </div>
                        )}
                      </>
                    ) : d.isWeeklyOff ? (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                        Weekly Rest Day
                      </div>
                    ) : d.leave ? (
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Approved Time Off
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">
                        Absent
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-1">
                    {hasAtt ? (
                      <>
                        {d.timingStatus === 'missing_out' ? (
                          <button
                            type="button"
                            onClick={() => handleQuickApprovePunchOut(d.dateStr)}
                            disabled={actionLoadingDate === d.dateStr}
                            className="w-full py-0.5 text-[9px] font-extrabold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded cursor-pointer hover:opacity-90"
                          >
                            Set 6PM & Approve
                          </button>
                        ) : isApproved ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectionModalDate(d.dateStr);
                              setRejectionReason('');
                            }}
                            className="text-[9px] font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 cursor-pointer"
                          >
                            Reject
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 w-full justify-between">
                            <button
                              type="button"
                              onClick={() => handleApproveDay(d.dateStr)}
                              disabled={actionLoadingDate === d.dateStr}
                              className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectionModalDate(d.dateStr);
                                setRejectionReason('');
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveDay(d.dateStr)}
                        disabled={actionLoadingDate === d.dateStr}
                        className="text-[9px] font-semibold text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        + Mark Present
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Half Day / Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Weekly Off
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Approved Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Rejected
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl cursor-pointer transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Reject Reason Dialog */}
      {rejectionModalDate && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Reject Attendance — {rejectionModalDate}
            </h4>
            <p className="text-xs text-slate-500">
              Enter an optional reason for rejecting this attendance day:
            </p>
            <input
              type="text"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Left without notice / Invalid punch"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModalDate(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectDay(rejectionModalDate)}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer transition shadow-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
