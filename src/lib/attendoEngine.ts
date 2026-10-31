/**
 * CleverOps Attendo Engine
 * Staff Attendance, Shift Roster, Geofencing, Selfie Verification & Payroll Engine
 * 
 * NOTE: INVENTORY ENGINE IS FROZEN. This module does not touch inventory.
 */

import { supabase, getClientAuthToken } from './supabase';
import { db, Restaurant, Profile } from './db';

export interface StaffProfile {
  id: string;
  restaurant_id: string;
  profile_id?: string | null;
  name: string;
  role: Profile['role'];
  phone?: string;
  email?: string;
  base_salary: number;
  salary_type?: 'fixed' | 'per_day';
  weekly_off?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'none';
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
  approval_status?: 'pending_approval' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  approved_by_id?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  standard_hours?: number;
  overtime_hours?: number;
  overtime_amount?: number;
  overtime_status?: 'pending' | 'approved' | 'rejected';
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
  weekly_off?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'none';
  gross_earned: number;
  total_overtime_hours?: number;
  total_overtime_pay?: number;
  allowances: SalaryItem[]; // e.g. Uniform Allowance, Rent Allowance, Bonus
  deductions: SalaryItem[]; // e.g. Uniform Cut, Late Penalty, Damage
  total_advance: number;
  net_salary: number;
  status: 'pending' | 'paid';
  approval_status?: 'draft' | 'pending' | 'approved';
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  slip_url?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OvertimeConfig {
  enabled: boolean;
  min_threshold_minutes: number; // minimum extra minutes required before OT triggers (e.g. 30 mins)
  multiplier: number; // hourly rate multiplier (e.g. 1.0, 1.25, 1.5, 2.0)
  auto_approve: boolean; // whether OT automatically approves on punch-out
}

export function getOvertimeConfig(restaurant: any): OvertimeConfig {
  const ot = restaurant?.settings?.attendo?.overtime;
  return {
    enabled: ot?.enabled !== false,
    min_threshold_minutes: Number(ot?.min_threshold_minutes) || 30,
    multiplier: Number(ot?.multiplier) || 1.0,
    auto_approve: ot?.auto_approve !== false
  };
}

export async function saveOvertimeConfig(restaurantId: string, config: OvertimeConfig): Promise<void> {
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return;
  await db.updateRestaurant(restaurantId, {
    settings: ({
      ...rest.settings,
      attendo: {
        ...((rest.settings as any)?.attendo || {}),
        overtime: config
      }
    } as any)
  });
}

/**
 * Calculate standard shift duration in hours (e.g. 09:00 to 17:00 = 8.0 hrs)
 */
export function calculateShiftDurationHours(shift?: Shift | null): number {
  if (!shift || !shift.start_time || !shift.end_time) return 8.0;
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Overnight shift
  }
  const diffHours = (endMinutes - startMinutes) / 60;
  return Math.round(diffHours * 10) / 10;
}

/**
 * Robust Overtime Calculator
 */
export function calculateOvertime(params: {
  punchInTime?: string | null;
  punchOutTime?: string | null;
  shift?: Shift | null;
  baseSalary?: number;
  salaryType?: 'fixed' | 'per_day';
  otConfig?: OvertimeConfig;
}): {
  standardHours: number;
  overtimeHours: number;
  overtimeAmount: number;
  isOvertime: boolean;
} {
  const { punchInTime, punchOutTime, shift, baseSalary = 15000, salaryType = 'per_day', otConfig } = params;
  if (!punchInTime) {
    return { standardHours: 0, overtimeHours: 0, overtimeAmount: 0, isOvertime: false };
  }

  const totalWorked = calculateHoursWorked(punchInTime, punchOutTime);
  const shiftHours = calculateShiftDurationHours(shift);

  const isEnabled = otConfig ? otConfig.enabled : true;
  const minThresholdMinutes = otConfig ? otConfig.min_threshold_minutes : 30;
  const multiplier = otConfig ? otConfig.multiplier : 1.0;

  if (!isEnabled || totalWorked <= shiftHours) {
    return {
      standardHours: totalWorked,
      overtimeHours: 0,
      overtimeAmount: 0,
      isOvertime: false
    };
  }

  const extraHours = totalWorked - shiftHours;
  const extraMinutes = extraHours * 60;

  if (extraMinutes < minThresholdMinutes) {
    return {
      standardHours: totalWorked,
      overtimeHours: 0,
      overtimeAmount: 0,
      isOvertime: false
    };
  }

  const overtimeHours = Math.round(extraHours * 10) / 10;
  const standardHours = shiftHours;

  const effectiveSalary = Number(baseSalary) > 0 ? Number(baseSalary) : (salaryType === 'per_day' ? 500 : 15000);
  const hourlyRate = salaryType === 'per_day'
    ? effectiveSalary / (shiftHours > 0 ? shiftHours : 8)
    : effectiveSalary / (30 * (shiftHours > 0 ? shiftHours : 8));

  const overtimeAmount = Math.round(overtimeHours * hourlyRate * multiplier);

  return {
    standardHours,
    overtimeHours,
    overtimeAmount,
    isOvertime: true
  };
}

export interface StaffLeaveRequest {
  id: string;
  restaurant_id: string;
  staff_id: string;
  staff_name: string;
  staff_role?: string;
  leave_type: 'casual' | 'sick' | 'paid' | 'unpaid';
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  review_notes?: string | null;
  created_at: string;
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

const STAFF_PROFILES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes fast cache
const _attendoStaffCache = new Map<string, { timestamp: number; data: StaffProfile[] }>();

// Staff records (staff_profiles, staff_shifts, staff_attendance, salary_records) are stored directly in restaurant.settings.attendo JSONB
const HAS_DEDICATED_ATTENDO_TABLES = false;

export function invalidateStaffProfilesCache(restaurantId?: string) {
  if (restaurantId) {
    _attendoStaffCache.delete(restaurantId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`smartdine_staff_cache_${restaurantId}`);
      } catch (_) {}
    }
  } else {
    _attendoStaffCache.clear();
  }
}

/**
 * Load staff profiles with in-memory + localStorage fast caching.
 * ONLY returns staff who have an actual created account in the restaurant.
 * Bridges salary configurations from restaurant.settings.attendo.staff_profiles.
 */
export async function getStaffProfiles(restaurantId: string, forceRefresh: boolean = false): Promise<StaffProfile[]> {
  try {
    if (!forceRefresh) {
      const cached = _attendoStaffCache.get(restaurantId);
      if (cached && Date.now() - cached.timestamp < STAFF_PROFILES_CACHE_TTL) {
        return cached.data;
      }
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(`smartdine_staff_cache_${restaurantId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.data) && Date.now() - parsed.timestamp < STAFF_PROFILES_CACHE_TTL) {
              _attendoStaffCache.set(restaurantId, parsed);
              return parsed.data;
            }
          }
        } catch (_) {}
      }
    }

    // 1. Fetch real registered staff profiles in the restaurant
    const registeredProfiles = await db.getStaffProfiles(restaurantId);
    const nonOwnerStaff = (registeredProfiles || []).filter(p => p.role !== 'owner' && p.role !== 'super_admin');

    // 2. Fetch saved salary configurations from attendo settings
    const rest = await db.getRestaurantById(restaurantId);
    const savedStaff: any[] = (rest?.settings as any)?.attendo?.staff_profiles || [];
    const salaryMap = new Map(savedStaff.map(s => [s.profile_id || s.id, s]));

    // 2b. Also merge from direct staff_profiles table if present
    if (HAS_DEDICATED_ATTENDO_TABLES) {
      try {
        const { data: dbProfiles } = await supabase.from('staff_profiles').select('*').eq('restaurant_id', restaurantId);
        if (dbProfiles && Array.isArray(dbProfiles)) {
          dbProfiles.forEach((dp: any) => {
            const key = dp.profile_id || dp.id;
            const existing = salaryMap.get(key) || {};
            salaryMap.set(key, { ...existing, ...dp });
          });
        }
      } catch (_) {}
    }

    // 3. Merge configured staff and registered staff so records never show 0
    const profileMap = new Map<string, StaffProfile>();

    // Seed from savedStaff in attendo settings
    savedStaff.forEach(s => {
      const id = s.profile_id || s.id;
      if (id) {
        profileMap.set(id, {
          id,
          restaurant_id: restaurantId,
          profile_id: id,
          name: s.name || 'Staff Member',
          role: s.role || 'waiter',
          phone: s.phone || '',
          email: s.email || '',
          base_salary: Number(s.base_salary) || 15000,
          salary_type: s.salary_type || 'per_day',
          weekly_off: s.weekly_off || 'none',
          is_active: s.is_active !== false,
          created_at: s.created_at,
          updated_at: s.updated_at
        });
      }
    });

    // Merge registered staff profiles
    nonOwnerStaff.forEach(p => {
      const existing = profileMap.get(p.id);
      const saved = salaryMap.get(p.id);
      const normalizedRole: StaffProfile['role'] = (p.role as Profile['role']) || existing?.role || 'waiter';

      profileMap.set(p.id, {
        id: p.id,
        restaurant_id: restaurantId,
        profile_id: p.id,
        name: p.full_name || existing?.name || p.email.split('@')[0],
        role: normalizedRole,
        phone: p.phone || existing?.phone || saved?.phone || '',
        email: p.email || existing?.email || '',
        base_salary: Number(saved?.base_salary || existing?.base_salary) || 15000,
        salary_type: saved?.salary_type || existing?.salary_type || 'per_day',
        weekly_off: saved?.weekly_off || existing?.weekly_off || 'none',
        is_active: p.is_active !== false,
        created_at: p.created_at || existing?.created_at || saved?.created_at,
        updated_at: saved?.updated_at || existing?.updated_at
      });
    });

    const verifiedStaff: StaffProfile[] = Array.from(profileMap.values());

    _attendoStaffCache.set(restaurantId, { timestamp: Date.now(), data: verifiedStaff });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`smartdine_staff_cache_${restaurantId}`, JSON.stringify({ timestamp: Date.now(), data: verifiedStaff }));
      } catch (_) {}
    }

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
    salary_type: profile.salary_type || 'per_day',
    weekly_off: profile.weekly_off || 'none',
    is_active: profile.is_active !== false,
    updated_at: new Date().toISOString()
  };

  // 1. Upsert to staff_profiles table if available
  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('staff_profiles').upsert(payload);
    } catch (_) {}
  }

  // 2. ALWAYS sync to restaurant.settings.attendo.staff_profiles via authoritative db.updateRestaurant
  try {
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

      await db.updateRestaurant(profile.restaurant_id, {
        settings: ({
          ...rest.settings,
          attendo: {
            ...((rest.settings as any)?.attendo || {}),
            staff_profiles: updatedList
          }
        } as any)
      });
    }
  } catch (err) {
    console.warn('[Attendo] Failed saving staff profile to settings:', err);
  }

  // 3. Immediately invalidate memory + localStorage staff caches
  invalidateStaffProfilesCache(profile.restaurant_id);
  db.clearRestaurantCache(profile.restaurant_id);

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
  const mergedMap = new Map<string, StaffShift>();

  // 1. Try DB table
  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      const { data: dbShifts } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('assigned_date', date);
      if (dbShifts && Array.isArray(dbShifts)) {
        dbShifts.forEach((s: any) => mergedMap.set(s.staff_id, s));
      }
    } catch (_) {}
  }

  // 2. Try restaurant settings
  try {
    const rest = await db.getRestaurantById(restaurantId);
    const allAssignments: StaffShift[] = (rest?.settings as any)?.attendo?.staff_shifts || [];
    allAssignments.filter(a => a.assigned_date === date).forEach(s => {
      if (!mergedMap.has(s.staff_id)) mergedMap.set(s.staff_id, s);
    });
  } catch (err) {
    console.warn('[Attendo] getStaffShiftsForDate err:', err);
  }

  // 3. Fallback to localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const key = `smartdine_roster_${restaurantId}_${date}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const localList: StaffShift[] = JSON.parse(raw);
        localList.forEach(s => {
          if (!mergedMap.has(s.staff_id)) mergedMap.set(s.staff_id, s);
        });
      }
    } catch (_) {}
  }

  return Array.from(mergedMap.values());
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
  const payload: StaffShift = {
    id: `roster_${staffId}_${assignedDate}`,
    restaurant_id: restaurantId,
    staff_id: staffId,
    shift_id: shiftId,
    assigned_date: assignedDate,
    created_at: new Date().toISOString()
  };

  // 1. Try DB table
  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      if (shiftId) {
        await supabase.from('staff_shifts').upsert(payload, { onConflict: 'staff_id,assigned_date' });
      } else {
        await supabase.from('staff_shifts').delete().match({ staff_id: staffId, assigned_date: assignedDate });
      }
    } catch (_) {}
  }

  // 2. Update settings via authoritative db.updateRestaurant
  try {
    const rest = await db.getRestaurantById(restaurantId);
    if (rest) {
      const roster: StaffShift[] = (rest.settings as any)?.attendo?.staff_shifts || [];
      const filtered = roster.filter(r => !(r.staff_id === staffId && r.assigned_date === assignedDate));
      if (shiftId) {
        filtered.push(payload);
      }
      await db.updateRestaurant(restaurantId, {
        settings: ({
          ...rest.settings,
          attendo: {
            ...((rest.settings as any)?.attendo || {}),
            staff_shifts: filtered
          }
        } as any)
      });
    }
  } catch (err) {
    console.warn('[Attendo] assignStaffShift settings update err:', err);
  }

  // 3. LocalStorage persistence for instant resilience
  if (typeof window !== 'undefined') {
    try {
      const key = `smartdine_roster_${restaurantId}_${assignedDate}`;
      const existingRaw = localStorage.getItem(key);
      const existingList: StaffShift[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = existingList.filter(r => r.staff_id !== staffId);
      if (shiftId) updatedList.push(payload);
      localStorage.setItem(key, JSON.stringify(updatedList));
    } catch (_) {}
  }

  return payload;
}

/**
 * Get daily attendance records for a restaurant on a specific date (YYYY-MM-DD)
 */

/**
 * Timezone-safe local date string (YYYY-MM-DD) avoiding UTC midnight shift
 */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate total hours worked between punch-in and punch-out (or now if on-duty)
 */
export function calculateHoursWorked(punchInTime?: string | null, punchOutTime?: string | null): number {
  if (!punchInTime) return 0;
  const inMs = new Date(punchInTime).getTime();
  const endMs = punchOutTime ? new Date(punchOutTime).getTime() : Date.now();
  const diffMs = Math.max(0, endMs - inMs);
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
}

/**
 * Format total hours worked into human text (e.g. "1 hr", "1.5 hrs", "2 hrs")
 */
export function formatHoursWorkedText(punchInTime?: string | null, punchOutTime?: string | null): string {
  const hours = calculateHoursWorked(punchInTime, punchOutTime);
  if (hours <= 0) return '0 hrs';
  if (hours === 1) return '1 hr';
  return `${hours} hrs`;
}

function saveLocalAttendanceRecord(restaurantId: string, record: StaffAttendance) {
  if (typeof window === 'undefined') return;
  try {
    const key = `smartdine_attendo_recent_${restaurantId}`;
    const raw = localStorage.getItem(key);
    let list: StaffAttendance[] = raw ? JSON.parse(raw) : [];
    list = list.filter(a => !(a.staff_id === record.staff_id && a.date === record.date));
    list.push(record);
    if (list.length > 60) list = list.slice(-60);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export function getLocalAttendanceRecords(restaurantId: string, date?: string): StaffAttendance[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = `smartdine_attendo_recent_${restaurantId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list: StaffAttendance[] = JSON.parse(raw);
    if (date) {
      return list.filter(a => a.date === date);
    }
    return list;
  } catch {
    return [];
  }
}

export async function getAttendanceForDate(restaurantId: string, date: string): Promise<StaffAttendance[]> {
  try {
    let matched: StaffAttendance[] = [];
    if (HAS_DEDICATED_ATTENDO_TABLES) {
      try {
        const { data: dbAtts } = await supabase
          .from('staff_attendance')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('date', date);
        if (dbAtts && dbAtts.length > 0) {
          matched = dbAtts as StaffAttendance[];
        }
      } catch (_) {}
    }

    if (matched.length === 0) {
      const rest = await db.getRestaurantById(restaurantId);
      const attendanceList: StaffAttendance[] = (rest?.settings as any)?.attendo?.attendance || [];
      matched = attendanceList.filter(a => a.date === date);
    }

    const localRecords = getLocalAttendanceRecords(restaurantId, date);
    if (localRecords.length > 0) {
      const mergedMap = new Map<string, StaffAttendance>();
      matched.forEach(item => mergedMap.set(item.staff_id, item));
      localRecords.forEach(localItem => {
        const existing = mergedMap.get(localItem.staff_id);
        if (!existing) {
          mergedMap.set(localItem.staff_id, localItem);
        } else if (localItem.punch_out_time && !existing.punch_out_time) {
          mergedMap.set(localItem.staff_id, localItem);
        }
      });
      matched = Array.from(mergedMap.values());
    }

    return matched;
  } catch (err) {
    console.warn('[Attendo] getAttendanceForDate err:', err);
    return getLocalAttendanceRecords(restaurantId, date);
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
  const all = await getMonthlyAttendanceForRestaurant(restaurantId, year, month);
  return all.filter(a => a.staff_id === staffId);
}

/**
 * Get all attendance records for a restaurant across all staff for a specific month.
 * Merges Supabase staff_attendance table, restaurants settings, and localStorage for total history resilience.
 */
export async function getMonthlyAttendanceForRestaurant(
  restaurantId: string,
  year: number,
  month: number
): Promise<StaffAttendance[]> {
  try {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const mergedMap = new Map<string, StaffAttendance>();

    // 1. Fetch from staff_attendance table in Supabase
    if (HAS_DEDICATED_ATTENDO_TABLES) {
      try {
        const { data: dbAtts } = await supabase
          .from('staff_attendance')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('date', `${prefix}-01`)
          .lte('date', `${prefix}-31`);

        if (dbAtts && Array.isArray(dbAtts)) {
          dbAtts.forEach((a: any) => mergedMap.set(`${a.staff_id}_${a.date}`, a as StaffAttendance));
        }
      } catch (_) {}
    }

    // 2. Fetch from restaurant.settings.attendo.attendance
    try {
      const rest = await db.getRestaurantById(restaurantId);
      const attendanceList: StaffAttendance[] = (rest?.settings as any)?.attendo?.attendance || [];
      attendanceList
        .filter(a => a.date && a.date.startsWith(prefix))
        .forEach(a => {
          const key = `${a.staff_id}_${a.date}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, a);
          } else {
            const existing = mergedMap.get(key)!;
            mergedMap.set(key, {
              ...existing,
              ...a,
              punch_in_time: existing.punch_in_time || a.punch_in_time,
              punch_out_time: existing.punch_out_time || a.punch_out_time,
              selfie_url: existing.selfie_url || a.selfie_url
            });
          }
        });
    } catch (_) {}

    // 3. Fetch from localStorage recent attendance records
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`smartdine_attendo_recent_${restaurantId}`);
        if (raw) {
          const localList: StaffAttendance[] = JSON.parse(raw);
          localList
            .filter(a => a.date && a.date.startsWith(prefix))
            .forEach(a => {
              const key = `${a.staff_id}_${a.date}`;
              if (!mergedMap.has(key)) {
                mergedMap.set(key, a);
              } else {
                const existing = mergedMap.get(key)!;
                mergedMap.set(key, {
                  ...existing,
                  ...a,
                  punch_in_time: existing.punch_in_time || a.punch_in_time,
                  punch_out_time: existing.punch_out_time || a.punch_out_time,
                  selfie_url: existing.selfie_url || a.selfie_url
                });
              }
            });
        }
      } catch (_) {}
    }

    return Array.from(mergedMap.values());
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

  // 1. Post to backend punch endpoint with admin authority bypassing RLS
  try {
    const token = await getClientAuthToken().catch(() => '');
    const apiRes = await fetch('/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        restaurantId,
        staffId,
        date,
        latitude,
        longitude,
        accuracy,
        selfieUrl,
        notes,
        assignedShift,
        punchType: 'in'
      })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.attendance) {
        saveLocalAttendanceRecord(restaurantId, data.attendance);
        db.clearRestaurantCache(restaurantId);
        return { success: true, attendance: data.attendance };
      }
    }
  } catch (apiErr) {
    console.warn('[Attendo] Backend punch API failed, attempting direct DB:', apiErr);
  }

  // 2. Direct DB fallback if API unreachable
  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('staff_attendance').upsert(attendanceRecord, { onConflict: 'staff_id,date' });
    } catch (_) {}
  }



  saveLocalAttendanceRecord(restaurantId, attendanceRecord);
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

  // Calculate Overtime on punch-out
  let standardHours = Math.round(diffHours * 10) / 10;
  let overtimeHours = 0;
  let overtimeAmount = 0;
  let overtimeStatus: 'approved' | undefined = undefined;

  try {
    const restObj = await db.getRestaurantById(restaurantId);
    const otConfig = getOvertimeConfig(restObj);
    const staffProfiles: StaffProfile[] = (restObj?.settings as any)?.attendo?.staff_profiles || [];
    const staffProfile = staffProfiles.find(s => s.id === staffId || s.profile_id === staffId);
    const allRoster: StaffShift[] = (restObj?.settings as any)?.attendo?.staff_shifts || [];
    const assignedRoster = allRoster.find(r => r.staff_id === staffId && r.assigned_date === date);
    const allShifts: Shift[] = (restObj?.settings as any)?.attendo?.shifts || [];
    const assignedShift = allShifts.find(s => s.id === assignedRoster?.shift_id);

    const otResult = calculateOvertime({
      punchInTime: existingAttendance.punch_in_time,
      punchOutTime: now.toISOString(),
      shift: assignedShift,
      baseSalary: staffProfile?.base_salary,
      salaryType: staffProfile?.salary_type,
      otConfig
    });

    standardHours = otResult.standardHours;
    overtimeHours = otResult.overtimeHours;
    overtimeAmount = otResult.overtimeAmount;
    if (otResult.isOvertime && otConfig.auto_approve) {
      overtimeStatus = 'approved';
    }
  } catch (_) {}

  const updated: StaffAttendance = {
    ...existingAttendance,
    punch_out_time: now.toISOString(),
    status,
    standard_hours: standardHours,
    overtime_hours: overtimeHours,
    overtime_amount: overtimeAmount,
    overtime_status: overtimeStatus,
    updated_at: now.toISOString()
  };

  // 1. Post to backend punch endpoint with admin authority bypassing RLS
  try {
    const token = await getClientAuthToken().catch(() => '');
    const apiRes = await fetch('/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        restaurantId,
        staffId,
        date,
        punchType: 'out',
        existingAttendance
      })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.attendance) {
        saveLocalAttendanceRecord(restaurantId, data.attendance);
        db.clearRestaurantCache(restaurantId);
        return { success: true, attendance: data.attendance };
      }
    }
  } catch (apiErr) {
    console.warn('[Attendo] Backend punchOut API failed, attempting direct DB:', apiErr);
  }

  // 2. Direct DB fallback if API unreachable
  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('staff_attendance').upsert(updated, { onConflict: 'staff_id,date' });
    } catch (_) {}
  }



  saveLocalAttendanceRecord(restaurantId, updated);
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

  let standardHours = 0;
  let overtimeHours = 0;
  let overtimeAmount = 0;

  if (params.punchInTime && params.punchOutTime) {
    try {
      const restObj = await db.getRestaurantById(params.restaurantId);
      const otConfig = getOvertimeConfig(restObj);
      const staffProfiles: StaffProfile[] = (restObj?.settings as any)?.attendo?.staff_profiles || [];
      const staffProfile = staffProfiles.find(s => s.id === params.staffId || s.profile_id === params.staffId);
      const allRoster: StaffShift[] = (restObj?.settings as any)?.attendo?.staff_shifts || [];
      const assignedRoster = allRoster.find(r => r.staff_id === params.staffId && r.assigned_date === params.date);
      const allShifts: Shift[] = (restObj?.settings as any)?.attendo?.shifts || [];
      const assignedShift = allShifts.find(s => s.id === assignedRoster?.shift_id);

      const otResult = calculateOvertime({
        punchInTime: params.punchInTime,
        punchOutTime: params.punchOutTime,
        shift: assignedShift,
        baseSalary: staffProfile?.base_salary,
        salaryType: staffProfile?.salary_type,
        otConfig
      });
      standardHours = otResult.standardHours;
      overtimeHours = otResult.overtimeHours;
      overtimeAmount = otResult.overtimeAmount;
    } catch (_) {}
  }

  const payload: StaffAttendance = {
    id: `att_${params.staffId}_${params.date}`,
    restaurant_id: params.restaurantId,
    staff_id: params.staffId,
    date: params.date,
    punch_in_time: params.punchInTime || null,
    punch_out_time: params.punchOutTime || null,
    status: params.status,
    standard_hours: standardHours,
    overtime_hours: overtimeHours,
    overtime_amount: overtimeAmount,
    overtime_status: overtimeHours > 0 ? 'approved' : undefined,
    marked_by_type: 'manager_override',
    marked_by_user_id: params.managerUserId || null,
    notes: params.notes || 'Manager Manual Correction',
    created_at: now,
    updated_at: now
  };

  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('staff_attendance').upsert(payload, { onConflict: 'staff_id,date' });
    } catch (_) {}
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
    let totalOtHours = 0;
    let totalOtPay = 0;

    for (const a of staffAtts) {
      if (a.approval_status === 'rejected') continue;
      if (a.status === 'present') presentCount += 1;
      else if (a.status === 'half_day') halfDayCount += 1;
      else if (a.status === 'late') {
        presentCount += 1;
        lateCount += 1;
      }
      if (a.overtime_hours && a.overtime_status !== 'rejected') {
        totalOtHours += Number(a.overtime_hours) || 0;
        totalOtPay += Number(a.overtime_amount) || 0;
      }
    }

    const totalOtHoursRounded = Math.round(totalOtHours * 10) / 10;
    const totalOtPayRounded = Math.round(totalOtPay);

    const baseSalary = Number(staff.base_salary) || 0;
    const salaryType: 'fixed' | 'per_day' = existing?.salary_type || staff.salary_type || 'per_day';
    const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;

    // Gross earned: Fixed pays full baseSalary, per_day calculates by attendance days
    const effectiveDays = presentCount + halfDayCount * 0.5;
    const grossEarned = Math.round(effectiveDays * dailyRate); // Attendance-based




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

    const netSalary = Math.max(0, Math.round(grossEarned + totalOtPayRounded + totalAllowances - totalDeductions - totalAdvance));

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
      total_overtime_hours: totalOtHoursRounded,
      total_overtime_pay: totalOtPayRounded,
      allowances,
      deductions,
      total_advance: totalAdvance,
      net_salary: netSalary,
      status: existing?.status || 'pending',
      approval_status: existing?.approval_status || 'pending',
      approved_by: existing?.approved_by || null,
      approved_by_name: existing?.approved_by_name || null,
      approved_at: existing?.approved_at || null,
      slip_url: existing?.slip_url || null,
      paid_at: existing?.paid_at || null,
      created_at: existing?.created_at || new Date().toISOString(),
      weekly_off: staff.weekly_off || 'none',
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
  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('salary_records').upsert(record, { onConflict: 'staff_id,month,year' });
    } catch (_) {}
  }

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


/**
 * Approve a single Salary Record with manager/owner audit trail
 */
export async function approveSalaryRecord(params: {
  restaurantId: string;
  salaryRecordId: string;
  approverId: string;
  approverName: string;
}): Promise<SalaryRecord | null> {
  const { restaurantId, salaryRecordId, approverId, approverName } = params;
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return null;

  const list: SalaryRecord[] = (rest.settings as any)?.attendo?.salary_records || [];
  const idx = list.findIndex(r => r.id === salaryRecordId);
  if (idx === -1) return null;

  const updated: SalaryRecord = {
    ...list[idx],
    approval_status: 'approved',
    approved_by: approverId,
    approved_by_name: approverName,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  list[idx] = updated;

  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('salary_records').upsert(updated, { onConflict: 'staff_id,month,year' });
    } catch (_) {}
  }

  await supabase.from('restaurants').update({
    settings: {
      ...rest.settings,
      attendo: {
        ...((rest.settings as any)?.attendo || {}),
        salary_records: list
      }
    }
  }).eq('id', restaurantId);
  db.clearRestaurantCache(restaurantId);

  return updated;
}

/**
 * Approve all salary records for a given month and year
 */
export async function approveAllSalaryRecords(params: {
  restaurantId: string;
  year: number;
  month: number;
  approverId: string;
  approverName: string;
}): Promise<SalaryRecord[]> {
  const { restaurantId, year, month, approverId, approverName } = params;
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return [];

  const list: SalaryRecord[] = (rest.settings as any)?.attendo?.salary_records || [];
  const nowIso = new Date().toISOString();

  const updatedList = list.map(r => {
    if (r.year === year && r.month === month) {
      return {
        ...r,
        approval_status: 'approved' as const,
        approved_by: approverId,
        approved_by_name: approverName,
        approved_at: nowIso,
        updated_at: nowIso
      };
    }
    return r;
  });

  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      const toUpsert = updatedList.filter(r => r.year === year && r.month === month);
      for (const rec of toUpsert) {
        await supabase.from('salary_records').upsert(rec, { onConflict: 'staff_id,month,year' });
      }
    } catch (_) {}
  }

  await supabase.from('restaurants').update({
    settings: {
      ...rest.settings,
      attendo: {
        ...((rest.settings as any)?.attendo || {}),
        salary_records: updatedList
      }
    }
  }).eq('id', restaurantId);
  db.clearRestaurantCache(restaurantId);

  return updatedList.filter(r => r.year === year && r.month === month);
}

/**
 * Manager / Owner Manual Approval & Override for Missing Punch-Out
 */
export async function managerApprovePunchOut(params: {
  restaurantId: string;
  staffId: string;
  date: string;
  managerUserId: string;
  managerName: string;
  status?: StaffAttendance['status'];
  punchOutTime?: string;
  notes?: string;
}): Promise<{ success: boolean; attendance?: StaffAttendance; error?: string }> {
  const { restaurantId, staffId, date, managerUserId, managerName, status = 'present', punchOutTime, notes } = params;

  const now = new Date();
  const rest = await db.getRestaurantById(restaurantId);
  const list: StaffAttendance[] = (rest?.settings as any)?.attendo?.attendance || [];
  const existing = list.find(a => a.staff_id === staffId && a.date === date);

  const updated: StaffAttendance = {
    id: existing?.id || `att_${staffId}_${date}`,
    restaurant_id: restaurantId,
    staff_id: staffId,
    staff_name: existing?.staff_name,
    staff_role: existing?.staff_role,
    date,
    punch_in_time: existing?.punch_in_time || `${date}T09:00:00.000Z`,
    punch_out_time: punchOutTime || existing?.punch_out_time || now.toISOString(),
    status,
    marked_by_type: 'manager_override',
    marked_by_user_id: managerUserId,
    notes: notes || `Approved by ${managerName}`,
    created_at: existing?.created_at || now.toISOString(),
    updated_at: now.toISOString()
  };

  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('staff_attendance').upsert(updated, { onConflict: 'staff_id,date' });
    } catch (_) {}
  }



  return { success: true, attendance: updated };
}

/**
 * Check if punch out is mandatory for restaurant
 */
export function isPunchOutMandatory(restaurant: Restaurant | null): boolean {
  if (!restaurant) return true;
  const val = (restaurant.settings as any)?.attendo?.punch_out_mandatory;
  return val !== undefined ? Boolean(val) : true;
}

/**
 * Toggle punch-out mandatory policy
 */
export async function setPunchOutMandatory(restaurantId: string, mandatory: boolean): Promise<void> {
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return;
  await supabase.from('restaurants').update({
    settings: {
      ...rest.settings,
      attendo: {
        ...((rest.settings as any)?.attendo || {}),
        punch_out_mandatory: mandatory
      }
    }
  }).eq('id', restaurantId);
  db.clearRestaurantCache(restaurantId);
}

/**
 * Get dates where employee punched in but forgot to punch out (past dates)
 */
/**
 * Calculate earned salary dynamically for a given number of approved days
 */
export function calculateStaffEarnedSalary(
  baseSalary: number,
  salaryType: 'fixed' | 'per_day',
  daysInMonth: number,
  approvedDays: number,
  halfDays: number = 0
): number {
  const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
  const effectiveDays = approvedDays + halfDays * 0.5;
  return Math.round(effectiveDays * dailyRate);
}

/**
 * Employee submits past missed attendance for manager approval
 */
export async function requestPastAttendance(params: {
  restaurantId: string;
  staffId: string;
  staffName: string;
  date: string;
  punchInTime: string;
  punchOutTime?: string;
  notes?: string;
}): Promise<StaffAttendance> {
  const { restaurantId, staffId, staffName, date, punchInTime, punchOutTime, notes } = params;
  const now = new Date().toISOString();
  const record: StaffAttendance = {
    id: `att_${staffId}_${date}`,
    restaurant_id: restaurantId,
    staff_id: staffId,
    staff_name: staffName,
    date,
    punch_in_time: punchInTime,
    punch_out_time: punchOutTime || null,
    status: 'present',
    marked_by_type: 'self',
    approval_status: 'pending_approval',
    notes: notes || 'Past attendance approval requested by employee',
    created_at: now,
    updated_at: now
  };

  if (HAS_DEDICATED_ATTENDO_TABLES) {
    try {
      await supabase.from('staff_attendance').upsert(record, { onConflict: 'staff_id,date' });
    } catch (_) {}
  }



  return record;
}

/**
 * Manager / Owner reviews attendance days (Approve or Reject individual/selected days)
 */
export async function reviewAttendanceDays(params: {
  restaurantId: string;
  reviews: Array<{
    staffId: string;
    date: string;
    action: 'approved' | 'rejected';
    rejectionReason?: string;
    punchInTime?: string;
    punchOutTime?: string;
    status?: StaffAttendance['status'];
  }>;
  reviewerId: string;
  reviewerName: string;
}): Promise<void> {
  const { restaurantId, reviews, reviewerId, reviewerName } = params;
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return;

  const list: StaffAttendance[] = (rest.settings as any)?.attendo?.attendance || [];
  const now = new Date().toISOString();

  for (const rev of reviews) {
    const existingIdx = list.findIndex(a => a.staff_id === rev.staffId && a.date === rev.date);
    if (existingIdx >= 0) {
      list[existingIdx] = {
        ...list[existingIdx],
        approval_status: rev.action,
        rejection_reason: rev.action === 'rejected' ? (rev.rejectionReason || 'Rejected by manager') : null,
        approved_by_id: reviewerId,
        approved_by_name: reviewerName,
        approved_at: now,
        status: rev.status || list[existingIdx].status,
        punch_in_time: rev.punchInTime || list[existingIdx].punch_in_time,
        punch_out_time: rev.punchOutTime || list[existingIdx].punch_out_time,
        updated_at: now
      };
      if (HAS_DEDICATED_ATTENDO_TABLES) {
        try {
          await supabase.from('staff_attendance').upsert(list[existingIdx], { onConflict: 'staff_id,date' });
        } catch (_) {}
      }
    } else {
      const newRec: StaffAttendance = {
        id: `att_${rev.staffId}_${rev.date}`,
        restaurant_id: restaurantId,
        staff_id: rev.staffId,
        date: rev.date,
        punch_in_time: rev.punchInTime || `${rev.date}T09:00:00.000Z`,
        punch_out_time: rev.punchOutTime || `${rev.date}T18:00:00.000Z`,
        status: rev.status || 'present',
        marked_by_type: 'manager_override',
        approval_status: rev.action,
        rejection_reason: rev.action === 'rejected' ? (rev.rejectionReason || 'Rejected by manager') : null,
        approved_by_id: reviewerId,
        approved_by_name: reviewerName,
        approved_at: now,
        created_at: now,
        updated_at: now
      };
      list.push(newRec);
      if (HAS_DEDICATED_ATTENDO_TABLES) {
        try {
          await supabase.from('staff_attendance').upsert(newRec, { onConflict: 'staff_id,date' });
        } catch (_) {}
      }
    }
  }


}

/**
 * Submit a staff leave request (by employee or directly pre-approved by manager/owner)
 */
export async function submitLeaveRequest(params: {
  restaurantId: string;
  staffId: string;
  staffName: string;
  staffRole?: string;
  leaveType: StaffLeaveRequest['leave_type'];
  startDate: string;
  endDate: string;
  reason: string;
  status?: 'pending' | 'approved';
  reviewedById?: string;
  reviewedByName?: string;
  reviewNotes?: string;
}): Promise<StaffLeaveRequest> {
  const { restaurantId, staffId, staffName, staffRole, leaveType, startDate, endDate, reason, status = 'pending' } = params;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const now = new Date().toISOString();

  const isApproved = status === 'approved';

  const request: StaffLeaveRequest = {
    id: `leave_${staffId}_${Date.now()}`,
    restaurant_id: restaurantId,
    staff_id: staffId,
    staff_name: staffName,
    staff_role: staffRole,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    total_days: diffDays,
    reason: reason.trim(),
    status: isApproved ? 'approved' : 'pending',
    reviewed_by_id: isApproved ? params.reviewedById : undefined,
    reviewed_by_name: isApproved ? params.reviewedByName : undefined,
    review_notes: isApproved ? (params.reviewNotes || 'Pre-approved by Manager/Owner') : undefined,
    reviewed_at: isApproved ? now : undefined,
    created_at: now,
    updated_at: now
  };

  const rest = await db.getRestaurantById(restaurantId);
  if (rest) {
    const leaves: StaffLeaveRequest[] = (rest.settings as any)?.attendo?.leave_requests || [];
    leaves.unshift(request);

    await supabase.from('restaurants').update({
      settings: {
        ...rest.settings,
        attendo: {
          ...((rest.settings as any)?.attendo || {}),
          leave_requests: leaves
        }
      }
    }).eq('id', restaurantId);
    db.clearRestaurantCache(restaurantId);
  }

  return request;
}

/**
 * Get leave requests for a single staff member
 */
export async function getStaffLeaveRequests(restaurantId: string, staffId: string): Promise<StaffLeaveRequest[]> {
  try {
    const rest = await db.getRestaurantById(restaurantId);
    const leaves: StaffLeaveRequest[] = (rest?.settings as any)?.attendo?.leave_requests || [];
    return leaves.filter(l => l.staff_id === staffId);
  } catch {
    return [];
  }
}

/**
 * Get all leave requests for a restaurant
 */
export async function getRestaurantLeaveRequests(restaurantId: string): Promise<StaffLeaveRequest[]> {
  try {
    const rest = await db.getRestaurantById(restaurantId);
    const leaves: StaffLeaveRequest[] = (rest?.settings as any)?.attendo?.leave_requests || [];
    return leaves;
  } catch {
    return [];
  }
}

/**
 * Manager reviews (Approve / Reject) a staff leave request
 */
export async function reviewLeaveRequest(params: {
  restaurantId: string;
  requestId: string;
  action: 'approved' | 'rejected';
  reviewerId: string;
  reviewerName: string;
  rejectionReason?: string;
}): Promise<StaffLeaveRequest | null> {
  const { restaurantId, requestId, action, reviewerId, reviewerName, rejectionReason } = params;
  const rest = await db.getRestaurantById(restaurantId);
  if (!rest) return null;

  const leaves: StaffLeaveRequest[] = (rest.settings as any)?.attendo?.leave_requests || [];
  const idx = leaves.findIndex(l => l.id === requestId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  leaves[idx] = {
    ...leaves[idx],
    status: action,
    reviewed_by_id: reviewerId,
    reviewed_by_name: reviewerName,
    reviewed_at: now,
    rejection_reason: action === 'rejected' ? (rejectionReason || null) : null,
    updated_at: now
  };

  await supabase.from('restaurants').update({
    settings: {
      ...rest.settings,
      attendo: {
        ...((rest.settings as any)?.attendo || {}),
        leave_requests: leaves
      }
    }
  }).eq('id', restaurantId);
  db.clearRestaurantCache(restaurantId);

  return leaves[idx];
}

export function getMissedPunchOutDates(attendances: StaffAttendance[], todayDateStr: string): string[] {
  return attendances
    .filter(a => a.date < todayDateStr && a.punch_in_time && !a.punch_out_time && a.marked_by_type !== 'manager_override')
    .map(a => a.date)
    .sort();
}

/**
 * Auto-cleanup: Purge punch selfies older than daysThreshold (default 30 days / 1 month)
 * Preserves the full attendance record (punch times, duty hours, salary status) permanently,
 * but frees database & storage bloat by nulling selfie_url.
 */
export async function cleanupOldAttendanceSelfies(
  restaurantId: string,
  daysThreshold = 30
): Promise<{ success: boolean; cleanedCount: number; cutoffDate: string }> {
  try {
    const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
    const cutoffDateStr = cutoff.toISOString().split('T')[0];

    let cleanedCount = 0;

    // 1. Clean DB table if table exists
    if (HAS_DEDICATED_ATTENDO_TABLES) {
      try {
        const { data, error } = await supabase
          .from('staff_attendance')
          .update({ selfie_url: null, updated_at: new Date().toISOString() })
          .eq('restaurant_id', restaurantId)
          .lt('date', cutoffDateStr)
          .not('selfie_url', 'is', null)
          .select('id');

        if (!error && data) {
          cleanedCount = data.length;
        }
      } catch (_) {}
    }

    // 2. Clean fallback settings JSON in restaurant row
    const rest = await db.getRestaurantById(restaurantId);
    if (rest && (rest.settings as any)?.attendo?.attendance) {
      const { attendance: _legacy, ...restAttendo } = (rest.settings as any).attendo;
      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          attendo: restAttendo
        }
      }).eq('id', restaurantId);
      db.clearRestaurantCache(restaurantId);
    }

    return {
      success: true,
      cleanedCount,
      cutoffDate: cutoffDateStr
    };
  } catch (err) {
    console.warn('[Attendo] cleanupOldAttendanceSelfies err:', err);
    return {
      success: false,
      cleanedCount: 0,
      cutoffDate: ''
    };
  }
}


/**
 * Get short-lived signed URL for an attendance selfie (accessible only by owner/manager)
 */
export async function getAttendanceSelfieSignedUrl(restaurantId: string, pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }
  try {
    const token = await getClientAuthToken().catch(() => '');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/attendance/selfie-url?restaurantId=${encodeURIComponent(restaurantId)}&path=${encodeURIComponent(pathOrUrl)}`, {
      headers
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('[Attendo] Failed to fetch signed URL for selfie:', err);
    return null;
  }
}
