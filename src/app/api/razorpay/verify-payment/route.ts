import { POST as verifyPayment } from '@/app/api/payments/verify/route';

/**
 * Razorpay Verify Payment Endpoint
 * Delegates directly to the hardened payments/verify handler to eliminate code drift (Finding C2).
 */
export async function POST(req: Request) {
  return verifyPayment(req);
}
