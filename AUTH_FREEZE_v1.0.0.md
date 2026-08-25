# CleverOps Auth Production Freeze Specification (v1.0.0-auth-freeze)

> **PRODUCTION FREEZE ENFORCED**: As of version `v1.0.0-auth-freeze`, the CleverOps authentication architecture is **FROZEN**.
> No modification may be made to any critical authentication file without running and passing the Playwright `@p0` E2E regression test suite.

---

## 1. Frozen Critical Files & Components

The following files constitute the production authentication baseline:

1. **`src/app/(auth)/login/page.tsx`**: Sign-in page with multi-role routing (`owner`, `kitchen`, `waiter`, `super_admin`).
2. **`src/app/(auth)/forgot-password/page.tsx`**: Email recovery request page with zero-suppression error alerts.
3. **`src/app/(auth)/reset-password/page.tsx`**: Cross-platform password reset interface supporting PKCE code exchange and OTP token verification.
4. **`src/app/auth/callback/route.ts`**: Server-side Next.js Route Handler processing `token_hash` & `type: 'recovery'`.
5. **`src/lib/supabase.ts`**: Production Supabase client configured with `detectSessionInUrl: true` and `flowType: 'pkce'`.

---

## 2. Production URL & Email Template Baseline

### Supabase URL Configuration (Verified)
- **Site URL**: `https://www.cleverops.in`
- **Redirect URLs**:
  - `https://www.cleverops.in/reset-password`
  - `https://www.cleverops.in/auth/callback`
  - `https://www.cleverops.in/**`

### Reset Password Email Template
```html
<a href="https://www.cleverops.in/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
  Reset Password
</a>
```

---

## 3. Mandatory CI/CD Verification Suite

Before deploying any future auth updates:
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test:e2e:p0`
