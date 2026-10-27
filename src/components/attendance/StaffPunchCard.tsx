'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  StaffProfile,
  Shift,
  StaffAttendance,
  SalaryRecord,
  StaffLeaveRequest,
  requestPastAttendance,
  submitLeaveRequest,
  getStaffLeaveRequests,
  punchIn,
  punchOut,
  getStaffMonthlyAttendance,
  getSalaryRecords,
  formatTimeAmPm,
  formatWorkingDuration,
  calculateHoursWorked,
  formatHoursWorkedText,
  getLocalDateString,
  GeofenceConfig,
  getAttendoSettings,
  calculateHaversineDistanceMeters,
  isPunchOutMandatory,
  getMissedPunchOutDates
} from '@/lib/attendoEngine';
import { Restaurant, db } from '@/lib/db';
import SelfieCaptureModal from './SelfieCaptureModal';
import SalarySlipModal from './SalarySlipModal';
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  LogOut,
  LogIn,
  ShieldCheck,
  User,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';

interface StaffPunchCardProps {
  restaurant: Restaurant | null;
  staff: StaffProfile;
  todayShift: Shift | null;
  todayAttendance: StaffAttendance | null;
  onAttendanceUpdated: () => void;
}

export default function StaffPunchCard({
  restaurant,
  staff,
  todayShift,
  todayAttendance,
  onAttendanceUpdated
}: StaffPunchCardProps) {
  // 1. useState
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [workingSeconds, setWorkingSeconds] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<'punch' | 'history' | 'leaves' | 'slips'>('punch');
  const [periodicTicker, setPeriodicTicker] = useState(0);
  
  // Past Attendance Request State
  const [pastReqModalOpen, setPastReqModalOpen] = useState(false);
  const [pastReqDate, setPastReqDate] = useState(() => getLocalDateString(new Date(Date.now() - 86400000)));
  const [pastReqInTime, setPastReqInTime] = useState('09:00');
  const [pastReqOutTime, setPastReqOutTime] = useState('18:00');
  const [pastReqNotes, setPastReqNotes] = useState('');
  const [pastReqLoading, setPastReqLoading] = useState(false);
  const [pastReqSuccess, setPastReqSuccess] = useState<string | null>(null);

  // Leave Request State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<StaffLeaveRequest['leave_type']>('casual');
  const [leaveStartDate, setLeaveStartDate] = useState(() => getLocalDateString());
  const [leaveEndDate, setLeaveEndDate] = useState(() => getLocalDateString());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [myLeaves, setMyLeaves] = useState<StaffLeaveRequest[]>([]);
  const [selfieModalOpen, setSelfieModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // History & Slips
  const [monthlyHistory, setMonthlyHistory] = useState<StaffAttendance[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalaryRecord[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<SalaryRecord | null>(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [missedDates, setMissedDates] = useState<string[]>([]);

  // 2. useRef
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 3. useMemo
  const geofenceConfig: GeofenceConfig = useMemo(() => {
    return getAttendoSettings(restaurant);
  }, [restaurant]);

  const geofenceDistance = useMemo(() => {
    if (!gpsCoords || !geofenceConfig.latitude || !geofenceConfig.longitude) return null;
    return calculateHaversineDistanceMeters(
      gpsCoords.latitude,
      gpsCoords.longitude,
      geofenceConfig.latitude,
      geofenceConfig.longitude
    );
  }, [gpsCoords, geofenceConfig]);

  const isWithinGeofence = useMemo(() => {
    if (!geofenceConfig.geofence_enabled) return true;
    // If manager hasn't set restaurant coordinates yet, do not block staff
    if (!geofenceConfig.latitude || !geofenceConfig.longitude) return true;
    if (geofenceDistance === null) return null;
    // Allow up to 50m indoor GPS drift allowance based on mobile accuracy
    const indoorAllowance = Math.min(gpsCoords?.accuracy || 0, 50);
    const effectiveDistance = Math.max(0, geofenceDistance - indoorAllowance);
    return effectiveDistance <= geofenceConfig.radius_meters;
  }, [geofenceConfig, geofenceDistance, gpsCoords?.accuracy]);

  const geofenceStatusText = useMemo(() => {
    if (!geofenceConfig.geofence_enabled) {
      return 'GPS Geofencing Flexible Mode';
    }
    if (!geofenceConfig.latitude || !geofenceConfig.longitude) {
      return 'Restaurant Center Not Set (Flexible Mode)';
    }
    if (gpsLoading) {
      return 'Acquiring GPS Location...';
    }
    if (isWithinGeofence === true) {
      return 'Within Restaurant Premises';
    }
    if (isWithinGeofence === false) {
      return 'Outside Geofence Boundary';
    }
    if (gpsError) {
      return 'GPS Location Unavailable';
    }
    return 'Acquiring GPS Location...';
  }, [geofenceConfig, isWithinGeofence, gpsLoading, gpsError]);

  const geofenceSubtitleText = useMemo(() => {
    if (gpsLoading) return 'Detecting device GPS satellites...';
    if (!geofenceConfig.geofence_enabled) return 'Any location allowed by manager';
    if (!geofenceConfig.latitude || !geofenceConfig.longitude) {
      return 'Manager has not set restaurant location center';
    }
    if (geofenceDistance !== null) {
      return `${geofenceDistance}m from restaurant center${gpsCoords?.accuracy ? ` (±${Math.round(gpsCoords.accuracy)}m accuracy)` : ''}`;
    }
    if (gpsError) return gpsError;
    return 'Tap refresh icon to detect coordinates';
  }, [gpsLoading, geofenceConfig, geofenceDistance, gpsCoords?.accuracy, gpsError]);

  const historySummary = useMemo(() => {
    let daysWorked = 0;
    let totalHours = 0;
    let totalOvertimeHours = 0;
    let totalOvertimePay = 0;
    for (const att of monthlyHistory) {
      if (att.status === 'present' || att.status === 'late' || att.status === 'half_day' || att.punch_in_time) {
        daysWorked += 1;
      }
      totalHours += calculateHoursWorked(att.punch_in_time, att.punch_out_time);
      if (att.overtime_hours && att.overtime_hours > 0) {
        totalOvertimeHours += att.overtime_hours;
        totalOvertimePay += (att.overtime_amount || 0);
      }
    }
    return {
      daysWorked,
      totalHours: Math.round(totalHours * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      totalOvertimePay
    };
  }, [monthlyHistory]);
  const todayStatus = useMemo(() => {
    if (!todayAttendance || !todayAttendance.punch_in_time) return 'not_punched';
    if (todayAttendance.punch_out_time) return 'completed';
    return 'on_duty';
  }, [todayAttendance]);

  // Periodic update every 60 seconds for hours worked
  useEffect(() => {
    const ticker = setInterval(() => {
      setPeriodicTicker(prev => prev + 1);
    }, 60000);
    return () => clearInterval(ticker);
  }, []);
  // 4. useEffect: Live clock ticker
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // 5. useEffect: Duty Stopwatch ticker
  useEffect(() => {
    if (todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time) {
      const punchInMs = new Date(todayAttendance.punch_in_time).getTime();
      const updateWorkingTime = () => {
        const diffSecs = Math.max(0, Math.floor((Date.now() - punchInMs) / 1000));
        setWorkingSeconds(diffSecs);
      };
      updateWorkingTime();
      timerRef.current = setInterval(updateWorkingTime, 1000);
    } else {
      setWorkingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [todayAttendance]);

  const acquireGpsLocation = (showNotification = false) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setGpsError('Geolocation is not supported on this device/browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy
        });
        setGpsError(null);
        setGpsLoading(false);
      },
      err => {
        console.warn('GPS Error:', err);
        let msg = err.message || 'Unable to acquire GPS';
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location in browser address bar (lock icon).';
        } else if (err.code === 2) {
          msg = 'Position unavailable. Please enable device GPS/Location.';
        } else if (err.code === 3) {
          msg = 'GPS acquisition timed out. Please tap Refresh GPS.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  // 6. useEffect: Acquire GPS location
  useEffect(() => {
    acquireGpsLocation();
  }, []);

  // 6.5 useEffect: Detect missed punch-out dates for staff notice
  useEffect(() => {
    if (!restaurant?.id || !staff?.id) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const todayStr = now.toISOString().split('T')[0];

    if (isPunchOutMandatory(restaurant)) {
      getStaffMonthlyAttendance(restaurant.id, staff.id, currentYear, currentMonth).then(atts => {
        const missed = getMissedPunchOutDates(atts, todayStr);
        setMissedDates(missed);
      });
    }
  }, [restaurant, staff, todayAttendance]);

  // 7. useEffect: Load history & slips when tab selected
  useEffect(() => {
    if (!restaurant?.id || !staff?.id) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (activeSubTab === 'history') {
      getStaffMonthlyAttendance(restaurant.id, staff.id, currentYear, currentMonth).then(atts => {
        setMonthlyHistory(atts);
      });
    } else if (activeSubTab === 'slips') {
      getSalaryRecords(restaurant.id, currentYear, currentMonth).then(records => {
        const staffRecords = records.filter(r => r.staff_id === staff.id);
        setSalarySlips(staffRecords);
      });
    }
  }, [activeSubTab, restaurant?.id, staff?.id]);

  // Conditional early return AFTER all hooks
  if (!restaurant || !staff) return null;

  const handlePunchInStart = () => {
    setErrorMessage(null);
    // If strict geofence is enabled and restaurant center coordinates are configured
    if (geofenceConfig.geofence_enabled && geofenceConfig.latitude && geofenceConfig.longitude) {
      if (gpsLoading) {
        setErrorMessage('Acquiring your GPS location... Please wait a few seconds and tap again.');
        return;
      }
      if (!gpsCoords) {
        acquireGpsLocation(true);
        if (gpsError) {
          setErrorMessage(`GPS Required: ${gpsError}. Please tap Refresh GPS.`);
        } else {
          setErrorMessage('Acquiring your GPS location... Please allow location in your browser and tap Refresh GPS.');
        }
        return;
      }
      if (isWithinGeofence === false) {
        setErrorMessage(`Cannot punch in: You are approximately ${geofenceDistance}m away from the restaurant. Allowed boundary is ${geofenceConfig.radius_meters}m.`);
        return;
      }
    }
    setSelfieModalOpen(true);
  };

  const handleSelfieCaptured = async (selfieUrl: string) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const todayStr = getLocalDateString();
      const res = await punchIn({
        restaurantId: restaurant.id,
        staffId: staff.id,
        date: todayStr,
        latitude: gpsCoords?.latitude,
        longitude: gpsCoords?.longitude,
        accuracy: gpsCoords?.accuracy,
        selfieUrl,
        assignedShift: todayShift,
        geofenceConfig
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to punch in');
      } else {
        db.clearRestaurantCache(restaurant.id);
        onAttendanceUpdated();
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error marking attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOutClick = async () => {
    if (!todayAttendance) return;
    const confirmOut = window.confirm('Are you sure you want to punch out and end your shift for today?');
    if (!confirmOut) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const todayStr = getLocalDateString();
      const res = await punchOut({
        restaurantId: restaurant.id,
        staffId: staff.id,
        date: todayStr,
        existingAttendance: todayAttendance
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to punch out');
      } else {
        db.clearRestaurantCache(restaurant.id);
        onAttendanceUpdated();
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error recording punch out');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Notice Banner: Missing Punch-Out Warning */}
      {missedDates.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-950 dark:text-amber-100">
              Notice: Aapne {missedDates.length} din punch-out nahi kiya hai
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              Missed Dates: <strong>{missedDates.join(', ')}</strong>. Kripya apne manager ya owner se sampark karke attendance manually approve karwayen.
            </p>
          </div>
        </div>
      )}
      {/* Sub-Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
        <button
          type="button"
          onClick={() => setActiveSubTab('punch')}
          className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center ${
            activeSubTab === 'punch' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Punch Portal
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center ${
            activeSubTab === 'history' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Monthly History
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('slips')}
          className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center ${
            activeSubTab === 'slips' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Salary Slips
        </button>
      </div>

      {/* TAB 1: PUNCH PORTAL */}
      {activeSubTab === 'punch' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-slate-800 dark:text-slate-100">
          {/* Staff Info & Live Clock Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black text-lg border border-slate-200 dark:border-slate-700">
                {staff.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight text-slate-900 dark:text-white">
                  {staff.name}
                </h3>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {staff.role}
                </span>
              </div>
            </div>

            {/* Live Clock */}
            <div className="text-right">
              <div className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Assigned Shift Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Today's Assigned Shift
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {todayShift?.shift_name || 'Regular Shift'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {formatTimeAmPm(todayShift?.start_time || '09:00')} - {formatTimeAmPm(todayShift?.end_time || '17:00')}
                {todayShift?.grace_period_minutes ? ` (Grace: ${todayShift.grace_period_minutes}m)` : ''}
              </p>
            </div>
            <div>
              {todayStatus === 'on_duty' && (
                <span className="inline-flex items-center px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs rounded-full">
                  On Duty
                </span>
              )}
              {todayStatus === 'completed' && (
                <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs rounded-full border border-slate-200 dark:border-slate-700">
                  Completed
                </span>
              )}
              {todayStatus === 'not_punched' && (
                <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-semibold text-xs rounded-full border border-slate-200 dark:border-slate-700">
                  Not Punched
                </span>
              )}
            </div>
          </div>

          {/* Time Worked Today (When On Duty) */}
          {todayStatus === 'on_duty' && (
            <div className="bg-slate-900 text-white dark:bg-slate-800 rounded-2xl p-5 text-center shadow-sm space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Time Worked Today
              </span>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                {formatHoursWorkedText(todayAttendance?.punch_in_time, null)}
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Punched In at: {formatTimeAmPm(todayAttendance?.punch_in_time)}
                {todayAttendance?.status === 'late' && ' (Late Mark)'}
              </p>
            </div>
          )}

          {/* Completed Shift Summary (When Finished) */}
          {todayStatus === 'completed' && (
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Punch-In Time:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatTimeAmPm(todayAttendance?.punch_in_time)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Punch-Out Time:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatTimeAmPm(todayAttendance?.punch_out_time)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Total Hours Worked:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatHoursWorkedText(todayAttendance?.punch_in_time, todayAttendance?.punch_out_time)}</span>
              </div>
              {Boolean(todayAttendance?.overtime_hours && todayAttendance.overtime_hours > 0) && (
                <div className="flex justify-between items-center text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60 font-bold">
                  <span>Overtime (OT):</span>
                  <span>+{todayAttendance?.overtime_hours} hrs {todayAttendance?.overtime_amount ? `(₹${todayAttendance.overtime_amount})` : ''}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold">
                <span>Shift Status:</span>
                <span className="capitalize text-slate-900 dark:text-white">{todayAttendance?.status}</span>
              </div>
            </div>
          )}

          {/* Geolocation Status Badge */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {geofenceStatusText}
                </p>
                <p className="text-[10px] text-slate-400">
                  {geofenceSubtitleText}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => acquireGpsLocation(true)}
                disabled={gpsLoading}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition shadow-xs"
                title="Refresh GPS Location"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              </button>
              {isWithinGeofence && (
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Selfie Snapshot Indicator if punched */}
          {todayAttendance?.selfie_url && (
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <img
                src={todayAttendance.selfie_url}
                alt="Selfie"
                className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-600"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Selfie Attendance Verified
                </span>
                <span className="text-[10px] text-slate-500">Captured at punch-in</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* BIG ACTION BUTTON */}
          <div className="pt-2">
            {todayStatus === 'not_punched' && (
              <button
                type="button"
                onClick={handlePunchInStart}
                disabled={actionLoading}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 active:scale-[0.99] text-white font-black text-base rounded-2xl shadow-sm flex items-center justify-center cursor-pointer transition disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Take Selfie & Punch In'}
              </button>
            )}

            {todayStatus === 'on_duty' && (
              <button
                type="button"
                onClick={handlePunchOutClick}
                disabled={actionLoading}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.99] text-white font-black text-base rounded-2xl shadow-sm flex items-center justify-center cursor-pointer transition disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Punch Out & End Shift'}
              </button>
            )}

            {todayStatus === 'completed' && (
              <div className="text-center p-3 text-xs text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                Shift complete for today. See you on your next shift.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY ATTENDANCE HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              My Attendance Timeline
            </h4>
            <span className="text-[11px] text-slate-500 font-semibold">
              This Month
            </span>
          </div>

          {/* Clean Metric Summary Bar for Staff */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Days Worked</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{historySummary.daysWorked} Days</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Hours Worked</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{historySummary.totalHours} hrs</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 block">Overtime (OT)</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {historySummary.totalOvertimeHours} hrs {historySummary.totalOvertimePay > 0 ? `(₹${historySummary.totalOvertimePay})` : ''}
              </span>
            </div>
          </div>

          {monthlyHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No attendance records found for this month yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {monthlyHistory.map(att => {
                const hoursText = formatHoursWorkedText(att.punch_in_time, att.punch_out_time);
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                        {att.date.slice(-2)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {new Date(att.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          In: {formatTimeAmPm(att.punch_in_time)} • Out: {att.punch_out_time ? formatTimeAmPm(att.punch_out_time) : 'On Duty'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {hoursText}
                      </span>
                      {Boolean(att.overtime_hours && att.overtime_hours > 0) && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                          +{att.overtime_hours}h OT
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          att.status === 'present'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2.5: MY LEAVES */}
      {activeSubTab === 'leaves' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                My Leave Applications
              </h4>
              <span className="text-[11px] text-slate-500">
                Track status of applied time-off & submit new leave requests
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLeaveSuccess(null);
                setLeaveModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl cursor-pointer transition shadow-sm"
            >
              + Apply for Leave
            </button>
          </div>

          {myLeaves.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No leave requests applied yet. Click "+ Apply for Leave" if you need time off.
            </div>
          ) : (
            <div className="space-y-2.5">
              {myLeaves.map(l => (
                <div
                  key={l.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {l.leave_type} Leave ({l.total_days} Days)
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        l.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : l.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Duration: <strong>{l.start_date}</strong> to <strong>{l.end_date}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Reason: {l.reason}
                  </div>
                  {l.rejection_reason && (
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      Note from manager: {l.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SALARY SLIPS */}
      {activeSubTab === 'slips' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              My Monthly Salary Slips
            </h4>
            <span className="text-[11px] text-slate-500 font-semibold">
              Monthly Payslips
            </span>
          </div>

          {salarySlips.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No salary slips issued for this month yet. Check back once payroll is finalized by manager.
            </div>
          ) : (
            <div className="space-y-3">
              {salarySlips.map(slip => (
                <div
                  key={slip.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800"
                >
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">
                      Salary Slip — Month {slip.month}/{slip.year}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Net Pay: <strong className="text-slate-900 dark:text-white font-bold">₹{slip.net_salary.toLocaleString('en-IN')}</strong> ({slip.status.toUpperCase()})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlip(slip);
                      setSlipModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition"
                  >
                    View Slip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selfie Capture Camera Modal */}
      <SelfieCaptureModal
        isOpen={selfieModalOpen}
        onClose={() => setSelfieModalOpen(false)}
        onCapture={handleSelfieCaptured}
      />

      {/* Salary Slip Modal */}
      <SalarySlipModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        record={selectedSlip}
        restaurant={restaurant}
      />
    </div>
  );
}
