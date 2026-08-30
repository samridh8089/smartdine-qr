import { NextResponse } from 'next/server';

/**
 * Production Security Error Handler
 * Ensures users never receive stack traces, SQL errors, Supabase internal errors, file paths, or raw exceptions.
 * Server logs preserve full debugging information.
 */
export function handleApiError(
  contextName: string,
  error: any,
  userMessage = 'An unexpected error occurred. Please try again later.',
  statusCode = 500
): NextResponse {
  console.error(`[API ERROR - ${contextName}]:`, {
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code,
    details: error?.details || error?.hint || error
  });

  return NextResponse.json(
    { error: userMessage },
    { status: statusCode }
  );
}
