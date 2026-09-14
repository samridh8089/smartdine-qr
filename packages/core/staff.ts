/**
 * SmartDine Shared Core Staff & Auth Module
 * Pure business logic for staff role permissions, role escalation defense,
 * invite validation, and OTP lifecycle rules.
 * Free of UI and framework dependencies.
 */

import { StaffRole } from './types';

export const ALLOWED_STAFF_ROLES: StaffRole[] = [
  'owner',
  'manager',
  'supervisor',
  'cashier',
  'waiter',
  'kitchen',
  'staff'
];

/**
 * Granular permissions matrix per staff role.
 */
export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  owner: [
    'dashboard:view',
    'orders:create', 'orders:read', 'orders:update', 'orders:cancel',
    'kds:view', 'kds:update',
    'billing:view', 'billing:settle', 'billing:split', 'billing:void',
    'tables:view', 'tables:edit', 'tables:transfer',
    'inventory:view', 'inventory:edit',
    'staff:invite', 'staff:edit', 'staff:delete',
    'reports:view', 'reports:export',
    'settings:view', 'settings:edit',
    'audit:view'
  ],
  manager: [
    'dashboard:view',
    'orders:create', 'orders:read', 'orders:update', 'orders:cancel',
    'kds:view', 'kds:update',
    'billing:view', 'billing:settle', 'billing:split',
    'tables:view', 'tables:edit', 'tables:transfer',
    'inventory:view', 'inventory:edit',
    'staff:invite', 'staff:edit',
    'reports:view',
    'audit:view'
  ],
  supervisor: [
    'dashboard:view',
    'orders:create', 'orders:read', 'orders:update',
    'kds:view', 'kds:update',
    'billing:view', 'billing:settle', 'billing:split',
    'tables:view', 'tables:transfer',
    'inventory:view'
  ],
  cashier: [
    'orders:read', 'orders:create',
    'billing:view', 'billing:settle', 'billing:split',
    'tables:view'
  ],
  waiter: [
    'orders:create', 'orders:read', 'orders:update',
    'tables:view',
    'menu:view'
  ],
  kitchen: [
    'kds:view',
    'orders:read', 'orders:update'
  ],
  staff: [
    'orders:read'
  ],
  super_admin: [
    '*'
  ]
};

/**
 * Checks whether a given role is authorized to perform a specific action.
 */
export function canPerformAction(role: StaffRole | string, action: string): boolean {
  const normalizedRole = (role || 'staff').toLowerCase() as StaffRole;
  if (normalizedRole === 'owner' || normalizedRole === 'super_admin') {
    return true;
  }
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  if (permissions.includes('*') || permissions.includes(action)) {
    return true;
  }
  return false;
}

/**
 * Prevents privilege escalation through staff invites.
 * It is strictly forbidden to create 'owner' or 'super_admin' via staff invite API.
 */
export function isRoleEscalationAttempt(requestedRole: string): boolean {
  const cleanRole = (requestedRole || '').toLowerCase().trim();
  return cleanRole === 'owner' || cleanRole === 'super_admin';
}

/**
 * Validates staff invitation input fields.
 */
export function validateStaffInvite(input: {
  email: string;
  role: string;
  name?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!input.email || !emailRegex.test(input.email.trim().toLowerCase())) {
    errors.push('Valid email address is required');
  }

  const requestedRole = (input.role || '').toLowerCase().trim() as StaffRole;
  if (!ALLOWED_STAFF_ROLES.includes(requestedRole)) {
    errors.push(`Invalid role '${input.role}'. Allowed roles: ${ALLOWED_STAFF_ROLES.join(', ')}`);
  }

  if (isRoleEscalationAttempt(requestedRole)) {
    errors.push('Forbidden: Cannot create owner or super_admin through staff invitations.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates OTP code format (6 to 8 digit numeric string).
 */
export function validateOtpFormat(otp: string): boolean {
  if (!otp || typeof otp !== 'string') return false;
  const clean = otp.trim();
  return /^\d{6,8}$/.test(clean);
}

/**
 * Evaluates whether an OTP timestamp has expired.
 */
export function isOtpExpired(expiresAt: string | number, now: number = Date.now()): boolean {
  const expiryTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  if (isNaN(expiryTime)) return true;
  return now > expiryTime;
}

/**
 * Computes OTP expiration timestamp (default 10 minutes TTL).
 */
export function calculateOtpExpiry(ttlMinutes: number = 10): number {
  return Date.now() + ttlMinutes * 60 * 1000;
}
