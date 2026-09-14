/**
 * SmartDine Shared Core Bookings Engine
 * Pure business logic for reservation validations, time slot overlap collision checks,
 * and arrival status lifecycle.
 * Free of UI and framework dependencies.
 */

import { Booking, BookingStatus } from './types';

export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled'],
  seated: ['completed'],
  completed: [],
  cancelled: []
};

/**
 * Parses a time string (e.g. "19:30", "19:30:00", "2026-09-13T19:30:00Z") into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  if (!clean) return null;

  if (clean.includes('T') || clean.includes('-')) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  }

  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return (hours % 24) * 60 + (minutes % 60);
    }
  }

  return null;
}

/**
 * Validates whether two reservation times overlap given a slot buffer duration (default 90 mins).
 */
export function checkBookingOverlap(
  timeA?: string | null,
  timeB?: string | null,
  slotBufferMinutes: number = 90
): boolean {
  if (!timeA || !timeB) return false;
  const minsA = parseTimeToMinutes(timeA);
  const minsB = parseTimeToMinutes(timeB);
  if (minsA === null || minsB === null) {
    return timeA.trim().toLowerCase() === timeB.trim().toLowerCase();
  }
  const diff = Math.abs(minsA - minsB);
  return diff < slotBufferMinutes;
}

/**
 * Validates booking creation payload.
 */
export function validateBookingPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload) return { valid: false, errors: ['Payload cannot be empty'] };

  if (!payload.customer_name && !payload.customerName) {
    errors.push('Customer name is required');
  }

  const phone = payload.customer_phone || payload.customerPhone || '';
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    errors.push('Valid 10-digit customer phone number is required');
  }

  const guests = Number(payload.guest_count || payload.guestCount || 0);
  if (guests <= 0) {
    errors.push('Guest count must be greater than zero');
  }

  if (!payload.booking_date && !payload.bookingDate) {
    errors.push('Booking date is required');
  }

  if (!payload.booking_time && !payload.bookingTime) {
    errors.push('Booking time is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Evaluates whether a booking can transition to 'seated' status.
 */
export function isBookingSeatable(booking: Booking): { seatable: boolean; reason?: string } {
  if (booking.status === 'cancelled') {
    return { seatable: false, reason: 'Cancelled bookings cannot be seated' };
  }
  if (booking.status === 'completed') {
    return { seatable: false, reason: 'Booking is already completed' };
  }
  if (booking.status === 'seated') {
    return { seatable: false, reason: 'Booking is already seated' };
  }
  return { seatable: true };
}
