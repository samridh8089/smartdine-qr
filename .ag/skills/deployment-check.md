# Deployment Check Skill

A specialized AI workflow for pre-flight verification, environment sanity checks, and production deployment readiness auditing across SmartDine / CleverOps applications.

---

## Workflow Instructions

### 1. TypeScript & Static Analysis Audit
- Run strict TypeScript typechecking without emitting files:
  ```bash
  npx tsc --noEmit
  ```
  Ensure **0 compilation errors** across all source files.
- Run the CleverOps React Hooks Safety Guardrail check across all components:
  ```bash
  node scripts/audit-react-hooks.mjs --all
  ```
  Ensure **0 hook ordering or conditional hook violations**.

### 2. Full Production Build Verification
- Execute the complete Next.js production build:
  ```bash
  npm run build
  ```
- Verify:
  - Exit Code is **0**.
  - All static (`○`) and dynamic (`ƒ`) routes (82+ routes) compile and optimize cleanly.
  - No fatal module resolution, Turbopack, or chunking errors.

### 3. Environment Variables Sanity Check
- Verify that required production environment variables are defined and non-empty (comparing against `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_BASE_URL`
  - Push / FCM configuration keys (`FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
  - Payment gateway credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`)
- Confirm that no production secrets are hardcoded in client-exposed files.

### 4. Accidental Localhost URL Scan
- Search `src/` to ensure no hardcoded `localhost:3000`, `127.0.0.1`, or development ports exist in production client fetch requests:
  - Ensure client calls use relative paths (`/api/...`) or dynamic window/origin utilities.
  - Ensure server fetches resolve via environment configuration (`process.env.NEXT_PUBLIC_APP_URL`).

### 5. Static Assets & Public File Integrity Check
- Confirm that critical static assets in `public/` and `src/app/` exist and are accessible:
  - Favicon & App Icons: `/favicon.ico`, `/icon.png`, `/apple-icon.png`
  - Fallback Media: `/dish-placeholder.svg` or placeholder assets
  - Audio Notifications: sound alert files for waiter/KDS alerts
  - Web Manifest & PWA icons if active

### 6. Founder Acceptance Smoke Test Verification
- Run existing smoke test suites to ensure core workflows remain regression-free:
  ```bash
  npx tsx scripts/test_founder_r4_smoke.ts
  npx tsx scripts/test_founder_r3_smoke.ts
  ```
- Verify 100% pass rates on Blueprint Invariance, Order ID formatting, and Inventory Engine protection.

### 7. Deployment Readiness Report Generation
- Synthesize all findings into a clear, structured Markdown report:
  - **Build Status**: Pass / Fail (Route count, compile time)
  - **TypeScript Status**: Pass / Fail (Error count)
  - **Hook Guardrail**: Pass / Fail (Violations count)
  - **Environment Variables**: Verified / Missing
  - **Localhost Audit**: Clean / Findings
  - **Static Assets**: Verified
  - **Founder Tests**: X/X Passed
  - **Final Recommendation**: `READY FOR PRODUCTION DEPLOYMENT` or `BLOCKERS DETECTED`

### 8. Deployment & Git Safety
- **Never deploy automatically**: Do not run `vercel deploy`, `vercel --prod`, or remote deployment triggers automatically.
- **Never auto commit**: Do not run `git commit` automatically.
- **Never auto push**: Do not run `git push` without explicit user instruction.
