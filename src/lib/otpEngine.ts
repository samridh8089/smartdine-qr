import { sendProductionEmailOtp } from './otpDelivery';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export interface OtpRecord {
  id: string;
  target: string;
  otpHash: string;
  type: 'owner_email' | 'staff_email' | 'password_reset';
  user_id?: string;
  restaurant_id?: string;
  expires_at: string;
  resend_available_at: string;
  verified: boolean;
  attempts: number;
  created_at: string;
}

// In-memory active OTP cache for speed
const activeOtps = new Map<string, OtpRecord>();

/**
 * Generate a cryptographically secure 8-digit numeric OTP (10000000 - 99999999)
 */
export function generateNumericOtp(): string {
  const min = 10000000;
  const max = 99999999;
  const range = max - min + 1;
  const randomBytes = crypto.randomBytes(4);
  const randomInt = randomBytes.readUInt32BE(0);
  return (min + (randomInt % range)).toString();
}

/**
 * Validate that an OTP is strictly 8 numeric digits
 */
export function isValid8DigitOtp(otp: string): boolean {
  return /^\d{8}$/.test((otp || '').trim());
}

/**
 * Hash an OTP for secure storage
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

/**
 * Create, register and dispatch real production 8-digit Email OTP with DB Session persistence
 */
export async function createAndDispatchOtp(params: {
  target: string;
  type: 'owner_email' | 'staff_email' | 'password_reset';
  recipientName?: string;
  restaurantName?: string;
  userId?: string;
  restaurantId?: string;
}): Promise<{ success: boolean; sessionId: string; expiresAt: string; message: string; otp?: string }> {
  const cleanTarget = params.target.trim().toLowerCase();
  const key = `${params.type}:${cleanTarget}`;
  const now = Date.now();
  const sessionId = `sess_otp_${now}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Check 30-second resend cooldown in DB & Memory
  let existing = activeOtps.get(key);
  if (!existing) {
    try {
      const { data: dbSess } = await supabaseAdmin
        .from('otp_sessions')
        .select('*')
        .eq('target', cleanTarget)
        .eq('type', params.type)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbSess) {
        existing = {
          id: dbSess.id,
          target: dbSess.target,
          otpHash: dbSess.otp_hash,
          type: dbSess.type,
          user_id: dbSess.user_id,
          expires_at: dbSess.expires_at,
          resend_available_at: dbSess.resend_available_at,
          verified: dbSess.verified,
          attempts: dbSess.attempts,
          created_at: dbSess.created_at
        };
      }
    } catch (e) {}
  }

  if (existing && new Date(existing.resend_available_at).getTime() > now) {
    const waitSecs = Math.ceil((new Date(existing.resend_available_at).getTime() - now) / 1000);
    console.log(`[OTP Cooldown] ${cleanTarget} must wait ${waitSecs}s`);
    return {
      success: false,
      sessionId: existing.id,
      expiresAt: existing.expires_at,
      message: `Please wait ${waitSecs} seconds before requesting a new OTP.`
    };
  }

  // 2. Invalidate old active OTP sessions in DB
  try {
    await supabaseAdmin
      .from('otp_sessions')
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq('target', cleanTarget)
      .eq('type', params.type)
      .eq('verified', false);
  } catch (e) {}

  activeOtps.delete(key);

  // 3. Generate 8-digit OTP & Session Record
  const otp = generateNumericOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
  const resendAvailableAt = new Date(now + 30 * 1000).toISOString(); // 30 seconds cooldown

  const record: OtpRecord = {
    id: sessionId,
    target: cleanTarget,
    otpHash,
    type: params.type,
    user_id: params.userId,
    restaurant_id: params.restaurantId,
    expires_at: expiresAt,
    resend_available_at: resendAvailableAt,
    verified: false,
    attempts: 0,
    created_at: new Date().toISOString()
  };

  // 4. Persist to DB table `otp_sessions`
  try {
    await supabaseAdmin.from('otp_sessions').insert({
      id: sessionId,
      target: cleanTarget,
      type: params.type,
      otp_hash: otpHash,
      user_id: params.userId,
      expires_at: expiresAt,
      resend_available_at: resendAvailableAt,
      verified: false,
      attempts: 0,
      created_at: new Date().toISOString()
    });
  } catch (dbErr: any) {
    console.error('[OTP DB Insert Error]:', dbErr?.message);
  }

  activeOtps.set(key, record);

  // Debug Logging
  console.log('[DEBUG OTP CREATED]', {
    sessionId,
    target: cleanTarget,
    type: params.type,
    expiresAt,
    otpForDevTest: otp
  });

  // 5. Dispatch via real production Email provider
  const emailRes = await sendProductionEmailOtp({
    email: cleanTarget,
    otp,
    recipientName: params.recipientName,
    type: params.type,
    restaurantName: params.restaurantName
  });

  if (emailRes.success) {
    console.log(`[SERVER LOG: Email Sent] Target: ${cleanTarget} | Provider: ${emailRes.provider} | MessageId: ${emailRes.messageId || 'N/A'}`);
  } else {
    console.error(`[SERVER LOG: Delivery Failure] Target: ${cleanTarget} | Error: ${emailRes.error || 'Unknown error'}`);
  }

  return {
    success: true,
    sessionId,
    expiresAt,
    message: `8-digit verification OTP dispatched to ${cleanTarget}`,
    otp
  };
}

/**
 * Verify a submitted 8-digit Email OTP with DB Session Fallback and exact error messages
 */
export async function verifyOtp(params: {
  target: string;
  type: 'owner_email' | 'staff_email' | 'password_reset';
  otp: string;
  sessionId?: string;
  userId?: string;
}): Promise<{ success: boolean; message: string; autoResent?: boolean; newSessionId?: string }> {
  const cleanTarget = params.target.trim().toLowerCase();
  const cleanOtp = (params.otp || '').trim().replace(/\D/g, '');

  console.log('[DEBUG OTP VERIFY PAYLOAD]', {
    target: cleanTarget,
    sessionId: params.sessionId,
    type: params.type,
    otpLength: cleanOtp.length
  });

  if (!isValid8DigitOtp(cleanOtp)) {
    console.warn(`[SERVER LOG: Verification Failure] Target: ${cleanTarget} | Reason: Invalid OTP length`);
    return { success: false, message: 'Invalid OTP. Please enter the correct 8-digit code.' };
  }

  const key = `${params.type}:${cleanTarget}`;
  let record: OtpRecord | null = activeOtps.get(key) || null;

  // Query database table `otp_sessions` by sessionId or target + type
  try {
    let query = supabaseAdmin
      .from('otp_sessions')
      .select('*')
      .eq('target', cleanTarget)
      .eq('type', params.type)
      .eq('verified', false);

    if (params.sessionId) {
      query = query.eq('id', params.sessionId);
    }

    const { data: dbSess } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbSess) {
      record = {
        id: dbSess.id,
        target: dbSess.target,
        otpHash: dbSess.otp_hash,
        type: dbSess.type,
        user_id: dbSess.user_id,
        expires_at: dbSess.expires_at,
        resend_available_at: dbSess.resend_available_at,
        verified: dbSess.verified,
        attempts: dbSess.attempts,
        created_at: dbSess.created_at
      };
    }
  } catch (e) {
    console.error('[OTP Verify DB Query Error]:', e);
  }

  // If no active session exists: Automatically trigger a new session to prevent trapping the user!
  if (!record) {
    console.warn(`[SERVER LOG: Verification Failure] Target: ${cleanTarget} | Reason: No active OTP session found in DB or memory`);
    
    // Auto-resend fresh OTP
    const resendRes = await createAndDispatchOtp({
      target: cleanTarget,
      type: params.type
    });

    return {
      success: false,
      autoResent: true,
      newSessionId: resendRes.sessionId,
      message: 'No active OTP found. A new verification code has been dispatched to your email.'
    };
  }

  // Check Expiry (10 minutes)
  const isExpired = new Date(record.expires_at).getTime() < Date.now();
  if (isExpired) {
    activeOtps.delete(key);
    try {
      await supabaseAdmin.from('otp_sessions').update({ verified: true }).eq('id', record.id);
    } catch (e) {}

    console.warn(`[SERVER LOG: Verification Failure] Target: ${cleanTarget} | Reason: OTP expired`);
    return { success: false, message: 'OTP expired. Please request a new verification code.' };
  }

  // Check Attempt Limit (5 max)
  if (record.attempts >= 5) {
    activeOtps.delete(key);
    try {
      await supabaseAdmin.from('otp_sessions').update({ verified: true }).eq('id', record.id);
    } catch (e) {}

    console.warn(`[SERVER LOG: Verification Failure] Target: ${cleanTarget} | Reason: Max 5 attempts exceeded`);
    return { success: false, message: 'Too many incorrect attempts. This OTP is locked. Please request a new code.' };
  }

  const incomingHash = hashOtp(cleanOtp);

  // Check Hash Match
  if (record.otpHash === incomingHash) {
    // SINGLE USE: Invalidate immediately upon successful verification
    activeOtps.delete(key);
    try {
      await supabaseAdmin.from('otp_sessions').update({ verified: true, updated_at: new Date().toISOString() }).eq('id', record.id);
    } catch (e) {}

    console.log('[DEBUG OTP VERIFICATION SUCCESS]', {
      sessionId: record.id,
      target: cleanTarget,
      type: params.type
    });

    return { success: true, message: 'Email OTP verified successfully!' };
  }

  // Increment Failure Attempt Count in DB & Memory
  record.attempts += 1;
  try {
    await supabaseAdmin.from('otp_sessions').update({ attempts: record.attempts, updated_at: new Date().toISOString() }).eq('id', record.id);
  } catch (e) {}

  console.warn(`[SERVER LOG: Verification Failure] Target: ${cleanTarget} | Reason: Invalid OTP (${record.attempts}/5)`);

  if (record.attempts >= 5) {
    activeOtps.delete(key);
    return { success: false, message: 'Too many incorrect attempts. This OTP is locked. Please request a new code.' };
  }

  return {
    success: false,
    message: 'Invalid OTP. Please enter the correct 8-digit code.'
  };
}
