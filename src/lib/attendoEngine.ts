/**
 * CleverOps Attendo Engine
 * Staff Attendance, Shift Roster, Geofencing, Selfie Verification & Payroll Engine
 * 
 * NOTE: INVENTORY ENGINE IS FROZEN. This module does not touch inventory.
 */

import { supabase } from './supabase';
import { db, Restaurant, Profile } from './db';

export interface StaffProfile {
  id: string;
  restaurant_id: string;
  profile_id?: string | null;
  name: string;
  role: 'manager' | 'supervisor' | 'waiter' | 'kitchen' | 'cashier';
  phone?: string;
  email?: string;
  base_salary: number;
  salary_type?: 'fixed' | 'per_day';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  shift_name: string;
  start_time: string; // HH:mm:ss or HH:mm
  end_time: string;   // HH:mm:ss or HH:mm
  grace_period_minutes: number;
  is_active: boolean;
  created_at?: string;
}

export interface StaffShift {
  id: string;
  restaurant_id: string;
  staff_id: string;
  shift_id: string;
  assigned_date: string; // YYYY-MM-DD
  shift?: Shift;
  created_at?: string;
}

export interface StaffAttendance {
  id: string;
  restaurant_id: string;
  staff_id: string;
  staff_name?: string;
  staff_role?: string;
  date: string; // YYYY-MM-DD
  punch_in_time?: string | null; // ISO timestamp
  punch_out_time?: string | null; // ISO timestamp
  status: 'present' | 'absent' | 'half_day' | 'late';
  marked_by_type: 'self' | 'manager_override';
  marked_by_user_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy_meters?: number | null;
  distance_meters?: number | null;
  is_within_geofence?: boolean;
  selfie_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryItem {
  id: string;
  name: string;
  amount: number;
}

export interface SalaryRecord {
  id: string;
  restaurant_id: string;
  staff_id: string;
  staff_name?: string;
  staff_role?: string;
  month: number; // 1-12
  year: number;
  total_days_in_month: number;
  total_present_days: number;
  total_half_days: number;
  total_late_days: number;
  base_salary: number;
  salary_type?: 'fixed' | 'per_day';
  gross_earned: number;
  allowances: SalaryItem[]; // e.g. Uniform Allowance, Rent Allowance, Bonus
  deductions: SalaryItem[]; // e.g. Uniform Cut, Late Penalty, Damage
  total_advance: number;
  net_salary: number;
  status: 'pending' | 'paid';
  slip_url?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GeofenceConfig {
  geofence_enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
}

// Default Shifts seeded when a restaurant initializes
export const DEFAULT_SHIFTS: Omit<Shift, 'id' | 'restaurant_id'>[] = [
  { shift_name: 'Morning Shift', start_time: '09:00', end_time: '17:00', grace_period_minutes: 15, is_active: true },
  { shift_name: 'Evening / Dinner', start_time: '16:00', end_time: '23:30', grace_period_minutes: 15, is_active: true },
  { shift_name: 'Full Day Shift', start_time: '10:00', end_time: '22:00', grace_period_minutes: 20, is_active: true }
];

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format time HH:mm to 12-hour AM/PM format
 */
export function formatTimeAmPm(timeStr?: string | null): string {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) {
    // ISO string
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format duration seconds into human readable e.g. "04h 32m"
 */
export function formatWorkingDuration(totalSeconds: number): string {
  if (totalSeconds < 0) return '00h 00m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}h ${mm}m ${ss}s`;
}

// =========================================================================
// DATA ACCESS & PERSISTENCE (Hybrid Supabase Tables + Settings Fallback)
// =========================================================================

/**
 * Read restaurant attendo settings (geofence coords and preferences)
 */
export function getAttendoSettings(restaurant: Restaurant | null): GeofenceConfig {
  const att = (restaurant?.settings as any)?.attendo || {};
  return {
    geofence_enabled: att.geofence_enabled ?? false,
    latitude: att.latitude ?? null,
    longitude: att.longitude ?? null,
    radius_meters: att.radius_meters ?? 150
  };
}

/**
 * Update restaurant attendo geofence settings
 */
export async function updateAttendoSettings(
  restaurantId: string,
  settings: Partial<GeofenceConfig>
): Promise<void> {
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return;

  const currentAttendo = (rest.settings as any)?.attendo || {};
  const updatedAttendo = {
    ...currentAttendo,
    ...settings
  };

  await supabase.from('restaurants').update({
    settings: {
      ...rest.settings,
      attendo: updatedAttendo
    }
  }).eq('id', restaurantId);

  db.clearRestaurantCache(restaurantId);
}

/**
 * Load staff profiles. ONLY returns staff who have an actual created account in the restaurant.
 * Bridges salary configurations from restaurant.settings.attendo.staff_profiles.
 */
export async function getStaffProfiles(restaurantId: string): Promise<StaffProfile[]> {
  try {
    // 1. Fetch real registered staff profiles in the restaurant
    const registeredProfiles = await db.getStaffProfiles(restaurantId);
    const nonOwnerStaff = (registeredProfiles || []).filter(p => p.role !== 'owner' && p.role !== 'super_admin');

    // 2. Fetch saved salary configurations from attendo settings
    const rest = await db.getRestaurantById(restaurantId);
    const savedStaff: any[] = (rest?.settings as any)?.attendo?.staff_profiles || [];
    const salaryMap = new Map(savedStaff.map(s => [s.profile_id || s.id, s]));

    // 3. Map ONLY genuine registered staff accounts
    const verifiedStaff: StaffProfile[] = nonOwnerStaff.map(p => {
      const saved = salaryMap.get(p.id);
      const normalizedRole: StaffProfile['role'] = (
        p.role === 'manager' ? 'manager' :
        p.role === 'supervisor' ? 'supervisor' :
        p.role === 'kitchen' ? 'kitchen' :
        p.role === 'cashier' ? 'cashier' : 'waiter'
      );

      return {
        id: p.id,
        restaurant_id: restaurantId,
        profile_id: p.id,
        name: p.full_name || p.email.split('@')[0],
        role: normalizedRole,
        phone: p.phone || saved?.phone || '',
        email: p.email || '',
        base_salary: Number(saved?.base_salary) || 15000,
        salary_type: saved?.salary_type || 'fixed',
        is_active: p.is_active !== false,
        created_at: p.created_at || saved?.created_at,
        updated_at: saved?.updated_at
      };
    });

    return verifiedStaff;
  } catch (err) {
    console.warn('[Attendo] Failed loading staff profiles:', err);
    return [];
  }
}

/**
 * Create or update a staff profile (name, role, salary, phone)
 */
export async function saveStaffProfile(profile: Partial<StaffProfile> & { restaurant_id: string; name: string }): Promise<StaffProfile> {
  const payload = {
    id: profile.id || crypto.randomUUID(),
    restaurant_id: profile.restaurant_id,
    profile_id: profile.profile_id || null,
    name: profile.name,
    role: profile.role || 'waiter',
    phone: profile.phone || '',
    base_salary: Number(profile.base_salary) || 0,
    salary_type: profile.salary_type || 'fixed',
    is_active: profile.is_active !== false,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('staff_profiles')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (!error && data) return data as StaffProfile;
  } catch (_) {}

  // Sync to restaurant.settings.attendo.staff_profiles fallback
  const rest = await db.getRestaurantById(profile.restaurant_id);
  if (rest) {
    const currentList: StaffProfile[] = (rest.settings as any)?.attendo?.staff_profiles || [];
    const index = currentList.findIndex(s => s.id === payload.id || (payload.profile_id && s.profile_id === payload.profile_id));
    let updatedList = [...currentList];
    if (index >= 0) {
      updatedList[index] = { ...updatedList[index], ...payload };
    } else {
      updatedList.push(payload as StaffProfile);
    }

    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          staff_profiles: updatedList
        }
      }
    }).eq('id', profile.restaurant_id);
    db.clearRestaurantCache(profile.restaurant_id);
  }

  return payload as StaffProfile;
}

/**
 * Get shifts for a restaurant. Auto-seeds defaults if none found.
 */
export async function getShifts(restaurantId: string): Promise<Shift[]> {
  try {
    const rest = await db.getRestaurantById(restaurantId);
    let currentShifts: Shift[] = (rest?.settings as any)?.attendo?.shifts || [];

    if (currentShifts && currentShifts.length > 0) {
      return currentShifts;
    }

    // Seed default shifts
    currentShifts = DEFAULT_SHIFTS.map((s, idx) => ({
      ...s,
      id: `shift_${idx + 1}_${restaurantId.slice(0, 6)}`,
      restaurant_id: restaurantId,
      created_at: new Date().toISOString()
    }));

    if (rest) {
      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          attendo: {
            ...((rest.settings as any)?.attendo || {}),
            shifts: currentShifts
          }
        }
      }).eq('id', restaurantId);
      db.clearRestaurantCache(restaurantId);
    }

    return currentShifts;
  } catch (err) {
    console.warn('[Attendo] getShifts err:', err);
    return [];
  }
}

/**
 * Save / Update a Shift
 */
export async function saveShift(shift: Partial<Shift> & { restaurant_id: string; shift_name: string; start_time: string; end_time: string }): Promise<Shift> {
  const payload: Shift = {
    id: shift.id || crypto.randomUUID(),
    restaurant_id: shift.restaurant_id,
    shift_name: shift.shift_name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    grace_period_minutes: shift.grace_period_minutes ?? 15,
    is_active: shift.is_active !== false,
    created_at: shift.created_at || new Date().toISOString()
  };

  try {
    await supabase.from('shifts').upsert(payload);
  } catch (_) {}

  // Update in settings fallback
  const rest = await db.getRestaurantById(shift.restaurant_id);
  if (rest) {
    const shifts: Shift[] = (rest.settings as any)?.attendo?.shifts || [];
    const idx = shifts.findIndex(s => s.id === payload.id);
    let updatedShifts = [...shifts];
    if (idx >= 0) {
      updatedShifts[idx] = payload;
    } else {
      updatedShifts.push(payload);
    }
    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          shifts: updatedShifts
        }
      }
    }).eq('id', shift.restaurant_id);
    db.clearRestaurantCache(shift.restaurant_id);
  }

  return payload;
}

/**
 * Delete a Shift
 */
export async function deleteShift(restaurantId: string, shiftId: string): Promise<void> {
  try {
    await supabase.from('shifts').delete().eq('id', shiftId);
  } catch (_) {}

  const rest = await db.getRestaurantById(restaurantId);
  if (rest) {
    const shifts: Shift[] = (rest.settings as any)?.attendo?.shifts || [];
    const updatedShifts = shifts.filter(s => s.id !== shiftId);
    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          shifts: updatedShifts
        }
      }
    }).eq('id', restaurantId);
    db.clearRestaurantCache(restaurantId);
  }
}

/**
 * Get Staff Roster assignments for a date
 */
export async function getStaffShiftsForDate(restaurantId: string, date: string): Promise<StaffShift[]> {
  try {
    const rest = await db.getRestaurantById(restaurantId);
    const allAssignments: StaffShift[] = (rest?.settings as any)?.attendo?.staff_shifts || [];
    return allAssignments.filter(a => a.assigned_date === date);
  } catch (err) {
    console.warn('[Attendo] getStaffShiftsForDate err:', err);
    return [];
  }
}

/**
 * Assign or Update Staff Shift for a date
 */
export async function assignStaffShift(
  restaurantId: string,
  staffId: string,
  shiftId: string,
  assignedDate: string
): Promise<StaffShift> {
  const payload = {
    id: `roster_${staffId}_${assignedDate}`,
    restaurant_id: restaurantId,
    staff_id: staffId,
    shift_id: shiftId,
    assigned_date: assignedDate,
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('staff_shifts').upsert(payload, { onConflict: 'staff_id,assigned_date,shift_id' });
  } catch (_) {}

  const rest = await db.getRestaurantById(restaurantId);
  if (rest) {
    const roster: StaffShift[] = (rest.settings as any)?.attendo?.staff_shifts || [];
    const filtered = roster.filter(r => !(r.staff_id === staffId && r.assigned_date === assignedDate));
    filtered.push(payload);
    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          staff_shifts: filtered
        }
      }
    }).eq('id', restaurantId);
    db.clearRestaurantCache(restaurantId);
  }

  return payload;
}

/**
 * Get daily attendance records for a restaurant on a specific date (YYYY-MM-DD)
 */
export async function getAttendanceForDate(restaurantId: string, date: string): Promise<StaffAttendance[]> {
  try {
    const rest = await db.getRestaurantById(restaurantId);
    const attendanceList: StaffAttendance[] = (rest?.settings as any)?.attendo?.attendance || [];
    return attendanceList.filter(a => a.date === date);
  } catch (err) {
    console.warn('[Attendo] getAttendanceForDate err:', err);
    return [];
  }
}

/**
 * Get monthly attendance for a specific staff member
 */
export async function getStaffMonthlyAttendance(
  restaurantId: string,
  staffId: string,
  year: number,
  month: number
): Promise<StaffAttendance[]> {
  try {
    const monthStr = String(month).padStart(2, '0');
    const rest = await db.getRestaurantById(restaurantId);
    const attendanceList: StaffAttendance[] = (rest?.settings as any)?.attendo?.attendance || [];
    return attendanceList.filter(a => a.staff_id === staffId && a.date && a.date.startsWith(`${year}-${monthStr}`));
  } catch (err) {
    console.warn('[Attendo] getStaffMonthlyAttendance err:', err);
    return [];
  }
}

/**
 * Get all attendance records for a restaurant across all staff for a specific month
 */
export async function getMonthlyAttendanceForRestaurant(
  restaurantId: string,
  year: number,
  month: number
): Promise<StaffAttendance[]> {
  try {
    const monthStr = String(month).padStart(2, '0');
    const rest = await db.getRestaurantById(restaurantId);
    const attendanceList: StaffAttendance[] = (rest?.settings as any)?.attendo?.attendance || [];
    return attendanceList.filter(a => a.date && a.date.startsWith(`${year}-${monthStr}`));
  } catch (err) {
    console.warn('[Attendo] getMonthlyAttendanceForRestaurant err:', err);
    return [];
  }
}

/**
 * PUNCH IN ACTION (With Geofence & Selfie verification)
 */
export async function punchIn(params: {
  restaurantId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  selfieUrl?: string | null;
  notes?: string;
  assignedShift?: Shift | null;
  geofenceConfig?: GeofenceConfig;
}): Promise<{ success: boolean; attendance?: StaffAttendance; error?: string }> {
  const {
    restaurantId,
    staffId,
    date,
    latitude,
    longitude,
    accuracy,
    selfieUrl,
    notes,
    assignedShift,
    geofenceConfig
  } = params;

  // 1. Calculate Geofence distance with indoor GPS drift tolerance
  let distanceMeters: number | null = null;
  let isWithinGeofence = true;

  if (geofenceConfig?.geofence_enabled && geofenceConfig.latitude && geofenceConfig.longitude) {
    if (latitude && longitude) {
      distanceMeters = calculateHaversineDistanceMeters(
        latitude,
        longitude,
        geofenceConfig.latitude,
        geofenceConfig.longitude
      );
      // Enterprise indoor GPS tolerance: mobile devices inside buildings have ±15-50m accuracy drift
      const indoorDriftAllowance = Math.min(accuracy || 0, 50);
      const effectiveDistance = Math.max(0, distanceMeters - indoorDriftAllowance);

      if (effectiveDistance > geofenceConfig.radius_meters) {
        isWithinGeofence = false;
        return {
          success: false,
          error: `Outside Restaurant Boundary: You are approximately ${distanceMeters}m away (allowed boundary: ${geofenceConfig.radius_meters}m). Please punch in from inside the restaurant.`
        };
      }
    } else {
      return {
        success: false,
        error: 'Location Access Required: Restaurant geofencing is enabled. Please enable GPS/location on your device to punch in.'
      };
    }
  }

  // 2. Check Late Status based on assigned shift
  let status: StaffAttendance['status'] = 'present';
  const now = new Date();
  if (assignedShift?.start_time) {
    const [shiftHour, shiftMin] = assignedShift.start_time.split(':').map(Number);
    const shiftStartTime = new Date(now);
    shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);

    const graceMinutes = assignedShift.grace_period_minutes ?? 15;
    const graceTime = new Date(shiftStartTime.getTime() + graceMinutes * 60000);

    if (now > graceTime) {
      status = 'late';
    }
  }

  const attendanceRecord: StaffAttendance = {
    id: `att_${staffId}_${date}`,
    restaurant_id: restaurantId,
    staff_id: staffId,
    date,
    punch_in_time: now.toISOString(),
    punch_out_time: null,
    status,
    marked_by_type: 'self',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    accuracy_meters: accuracy ?? null,
    distance_meters: distanceMeters,
    is_within_geofence: isWithinGeofence,
    selfie_url: selfieUrl || null,
    notes: notes || null,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  // Try DB upsert
  try {
    await supabase.from('staff_attendance').upsert(attendanceRecord, { onConflict: 'staff_id,date' });
  } catch (_) {}

  // Sync to settings fallback
  const rest = await db.getRestaurantById(restaurantId);
  if (rest) {
    const list: StaffAttendance[] = (rest.settings as any)?.attendo?.attendance || [];
    const filtered = list.filter(a => !(a.staff_id === staffId && a.date === date));
    filtered.push(attendanceRecord);

    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          attendance: filtered
        }
      }
    }).eq('id', restaurantId);
    db.clearRestaurantCache(restaurantId);
  }

  return { success: true, attendance: attendanceRecord };
}

/**
 * PUNCH OUT ACTION
 */
export async function punchOut(params: {
  restaurantId: string;
  staffId: string;
  date: string;
  existingAttendance: StaffAttendance;
}): Promise<{ success: boolean; attendance?: StaffAttendance; error?: string }> {
  const { restaurantId, staffId, date, existingAttendance } = params;

  if (!existingAttendance.punch_in_time) {
    return { success: false, error: 'No punch-in record found for today.' };
  }

  const now = new Date();
  const punchInDate = new Date(existingAttendance.punch_in_time);
  const diffHours = (now.getTime() - punchInDate.getTime()) / (1000 * 60 * 60);

  // If worked less than 4 hours, mark as half day (unless previously late or overridden)
  let status = existingAttendance.status;
  if (diffHours < 4 && status !== 'half_day') {
    status = 'half_day';
  }

  const updated: StaffAttendance = {
    ...existingAttendance,
    punch_out_time: now.toISOString(),
    status,
    updated_at: now.toISOString()
  };

  try {
    await supabase.from('staff_attendance').upsert(updated, { onConflict: 'staff_id,date' });
  } catch (_) {}

  // Sync to settings fallback
  const rest = await db.getRestaurantById(restaurantId);
  if (rest) {
    const list: StaffAttendance[] = (rest.settings as any)?.attendo?.attendance || [];
    const filtered = list.filter(a => !(a.staff_id === staffId && a.date === date));
    filtered.push(updated);

    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          attendance: filtered
        }
      }
    }).eq('id', restaurantId);
    db.clearRestaurantCache(restaurantId);
  }

  return { success: true, attendance: updated };
}

/**
 * MANAGER OVERRIDE ATTENDANCE
 */
export async function managerOverrideAttendance(params: {
  restaurantId: string;
  staffId: string;
  date: string;
  status: StaffAttendance['status'];
  punchInTime?: string | null;
  punchOutTime?: string | null;
  notes?: string;
  managerUserId?: string;
}): Promise<StaffAttendance> {
  const now = new Date().toISOString();
  const payload: StaffAttendance = {
    id: `att_${params.staffId}_${params.date}`,
    restaurant_id: params.restaurantId,
    staff_id: params.staffId,
    date: params.date,
    punch_in_time: params.punchInTime || null,
    punch_out_time: params.punchOutTime || null,
    status: params.status,
    marked_by_type: 'manager_override',
    marked_by_user_id: params.managerUserId || null,
    notes: params.notes || 'Manager Manual Correction',
    created_at: now,
    updated_at: now
  };

  try {
    await supabase.from('staff_attendance').upsert(payload, { onConflict: 'staff_id,date' });
  } catch (_) {}

  const rest = await db.getRestaurantById(params.restaurantId);
  if (rest) {
    const list: StaffAttendance[] = (rest.settings as any)?.attendo?.attendance || [];
    const filtered = list.filter(a => !(a.staff_id === params.staffId && a.date === params.date));
    filtered.push(payload);

    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          attendance: filtered
        }
      }
    }).eq('id', params.restaurantId);
    db.clearRestaurantCache(params.restaurantId);
  }

  return payload;
}

// =========================================================================
// AUTOMATED PAYROLL ENGINE & SALARY SLIP GENERATOR
// =========================================================================

/**
 * Get salary records for a specific month and year
 */
export async function getSalaryRecords(
  restaurantId: string,
  year: number,
  month: number
): Promise<SalaryRecord[]> {
  try {
    const [rest, activeStaff] = await Promise.all([
      db.getRestaurantById(restaurantId),
      getStaffProfiles(restaurantId)
    ]);
    const activeStaffIds = new Set(activeStaff.map(s => s.id));
    const records: SalaryRecord[] = (rest?.settings as any)?.attendo?.salary_records || [];
    return records.filter(r => r.year === year && r.month === month && activeStaffIds.has(r.staff_id));
  } catch (err) {
    console.warn('[Attendo] getSalaryRecords err:', err);
    return [];
  }
}

/**
 * Calculate Monthly Payroll across all active staff members
 */
export async function calculateMonthlyPayroll(
  restaurantId: string,
  year: number,
  month: number,
  staffList: StaffProfile[],
  allMonthlyAttendances: StaffAttendance[],
  existingRecords: SalaryRecord[] = []
): Promise<SalaryRecord[]> {
  const daysInMonth = new Date(year, month, 0).getDate();

  // If monthly attendances not provided or empty, auto-fetch full month from database/settings
  let monthlyAttendances = allMonthlyAttendances;
  if (!monthlyAttendances || monthlyAttendances.length === 0) {
    monthlyAttendances = await getMonthlyAttendanceForRestaurant(restaurantId, year, month);
  }

  const generatedRecords: SalaryRecord[] = staffList.map(staff => {
    const existing = existingRecords.find(r => r.staff_id === staff.id);

    // Filter attendance for this staff member in this month
    const monthStr = String(month).padStart(2, '0');
    const staffAtts = monthlyAttendances.filter(
      a => a.staff_id === staff.id && a.date.startsWith(`${year}-${monthStr}`)
    );

    let presentCount = 0;
    let halfDayCount = 0;
    let lateCount = 0;

    for (const a of staffAtts) {
      if (a.status === 'present') presentCount += 1;
      else if (a.status === 'half_day') halfDayCount += 1;
      else if (a.status === 'late') {
        presentCount += 1;
        lateCount += 1;
      }
    }

    const baseSalary = Number(staff.base_salary) || 0;
    const salaryType: 'fixed' | 'per_day' = existing?.salary_type || staff.salary_type || 'fixed';
    const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;

    // Gross earned: Fixed pays full baseSalary, per_day calculates by attendance days
    const effectiveDays = presentCount + halfDayCount * 0.5;
    const grossEarned = salaryType === 'per_day'
      ? Math.round(effectiveDays * dailyRate)
      : baseSalary;

    // Existing or default dynamic allowances (Uniform, Rent, etc.)
    const allowances: SalaryItem[] = existing?.allowances || [
      { id: 'al_1', name: 'Uniform Allowance', amount: 0 },
      { id: 'al_2', name: 'Rent Allowance', amount: 0 }
    ];

    // Existing or default dynamic deductions
    const deductions: SalaryItem[] = existing?.deductions || [
      { id: 'ded_1', name: 'Late / Penalty Cut', amount: 0 },
      { id: 'ded_2', name: 'Uniform Security Cut', amount: 0 }
    ];

    const totalAllowances = allowances.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalDeductions = deductions.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalAdvance = Number(existing?.total_advance) || 0;

    const netSalary = Math.max(0, Math.round(grossEarned + totalAllowances - totalDeductions - totalAdvance));

    const record: SalaryRecord = {
      id: existing?.id || `sal_${staff.id}_${year}_${month}`,
      restaurant_id: restaurantId,
      staff_id: staff.id,
      staff_name: staff.name,
      staff_role: staff.role,
      month,
      year,
      total_days_in_month: daysInMonth,
      total_present_days: presentCount,
      total_half_days: halfDayCount,
      total_late_days: lateCount,
      base_salary: baseSalary,
      salary_type: salaryType,
      gross_earned: grossEarned,
      allowances,
      deductions,
      total_advance: totalAdvance,
      net_salary: netSalary,
      status: existing?.status || 'pending',
      slip_url: existing?.slip_url || null,
      paid_at: existing?.paid_at || null,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return record;
  });

  return generatedRecords;
}

/**
 * Save / Update a Salary Record (Allows editing allowances, deductions, and payment status)
 */
export async function saveSalaryRecord(record: SalaryRecord): Promise<SalaryRecord> {
  try {
    await supabase.from('salary_records').upsert(record, { onConflict: 'staff_id,month,year' });
  } catch (_) {}

  const rest = await db.getRestaurantById(record.restaurant_id);
  if (rest) {
    const list: SalaryRecord[] = (rest.settings as any)?.attendo?.salary_records || [];
    const filtered = list.filter(r => !(r.staff_id === record.staff_id && r.month === record.month && r.year === record.year));
    filtered.push(record);

    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          salary_records: filtered
        }
      }
    }).eq('id', record.restaurant_id);
    db.clearRestaurantCache(record.restaurant_id);
  }

  return record;
}
