import test from 'node:test';
import assert from 'node:assert/strict';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

test('TASK 5: @upstash/ratelimit and @upstash/redis packages are properly installed', () => {
  assert.ok(typeof Ratelimit.slidingWindow === 'function', 'Ratelimit.slidingWindow must exist');
  assert.ok(typeof Redis === 'function', 'Redis constructor must exist');
});

test('TASK 5: Unverified Authorization header does NOT elevate rate limit', async (t) => {
  let isRunning = false;
  try {
    const ping = await fetch('http://localhost:3000/api/auth/send-otp', { method: 'OPTIONS' });
    isRunning = !!ping;
  } catch {
    isRunning = false;
  }
  if (!isRunning) {
    if (t?.skip) t.skip('Server http://localhost:3000 not reachable; skipping live rate-limit test');
    return;
  }

  const fakeToken = 'Bearer fake-invalid-bearer-token-with-length-greater-than-30-chars';
  const res = await fetch('http://localhost:3000/api/auth/send-otp', {
    method: 'POST',
    headers: {
      'Authorization': fakeToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const limitHeader = res.headers.get('x-ratelimit-limit');
  assert.ok(limitHeader, 'x-ratelimit-limit header must be present');
  assert.notStrictEqual(limitHeader, '300', 'Unverified token must never receive 300 authenticated rate limit tier');
  assert.notStrictEqual(limitHeader, '1000', 'Unverified token must never receive dev elevated tier');
  assert.strictEqual(limitHeader, '5', 'Strict auth endpoints must enforce RATE_LIMIT_LOGIN_PER_IP=5');
});

test('TASK 5: Unverified cookie does NOT elevate rate limit', async (t) => {
  let isRunning = false;
  try {
    const ping = await fetch('http://localhost:3000/api/auth/send-otp', { method: 'OPTIONS' });
    isRunning = !!ping;
  } catch {
    isRunning = false;
  }
  if (!isRunning) {
    if (t?.skip) t.skip('Server http://localhost:3000 not reachable; skipping live rate-limit test');
    return;
  }

  const res = await fetch('http://localhost:3000/api/auth/send-otp', {
    method: 'POST',
    headers: {
      'Cookie': 'sb-access-token=bogus_cookie_token_here_12345678901234567890',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const limitHeader = res.headers.get('x-ratelimit-limit');
  assert.ok(limitHeader, 'x-ratelimit-limit header must be present');
  assert.notStrictEqual(limitHeader, '300', 'Unverified cookie must never receive authenticated rate limit tier');
  assert.strictEqual(limitHeader, '5', 'Strict auth endpoints must enforce RATE_LIMIT_LOGIN_PER_IP=5');
});
