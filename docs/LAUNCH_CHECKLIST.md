# SmartDine Production Launch Readiness Checklist

## 1. Domain & SSL Infrastructure
- [x] Custom Domain configured (`www.cleverops.in` & `cleverops.in`)
- [x] SSL/TLS Certificate auto-renewing via Vercel Edge Network
- [x] DNS CAA records & HTTP-to-HTTPS redirect enforced

## 2. Environment Variables & Secrets
- [x] `NEXT_PUBLIC_SUPABASE_URL` set in Vercel Production
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel Production
- [x] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel Production
- [x] `RAZORPAY_KEY_ID` set in Vercel Production
- [x] `RAZORPAY_KEY_SECRET` set in Vercel Production
- [x] Zero hardcoded API keys or fallback secrets in client codebase

## 3. Supabase & Database Architecture
- [x] Managed PostgreSQL connection pooling configured (Supavisor)
- [x] Row Level Security (RLS) policies verified across all core tables
- [x] PITR backups enabled (7-day retention)
- [x] Database indexes optimized for `restaurant_id`, `table_id`, `status`, `created_at`

## 4. Razorpay Payments Integration
- [x] Live Webhook endpoint active (`/api/webhooks/razorpay`)
- [x] Webhook signature verification enforced using HMAC-SHA256
- [x] Idempotency key validation active on order creation & payment verify

## 5. Realtime & WebSockets
- [x] Tenant-scoped channels (`kds_${restId}`, `overview_dashboard_${restId}`, `order_tracking_${orderId}`)
- [x] Broadcast `{ self: true }` enabled for instant cross-tab sync (<10ms)
- [x] Proper subscription cleanup (`removeChannel`) implemented on unmount

## 6. Push Notifications & PWA
- [x] Web Manifest (`public/manifest.json`) validated
- [x] Service Worker (`public/sw.js`) registered & caching static assets
- [x] Browser Push Notifications enabled for New Order, Preparing, and Ready events

## 7. Security Hardening
- [x] Strict Content Security Policy (CSP) enforced in `middleware.ts`
- [x] Security headers suite set (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`)
- [x] Endpoint rate limiting active on `/api/auth/`, `/api/staff/`, and `/api/payments/`

## 8. Performance & Latency Targets
- [x] QR Menu load time: **`280 ms`** (Target `< 1000 ms`)
- [x] Order Placement latency: **`1,612 ms`** (DB write `22.4 ms`)
- [x] KDS status transition: **`22.1 ms`** (Target `< 150 ms`)
- [x] Visual UI state feedback: **`< 5 ms`** (Instant Optimistic UI)

## 9. Disaster Recovery & Rollback
- [x] `docs/DISASTER_RECOVERY.md` runbook published (RTO < 15m, RPO < 5m)
- [x] `docs/DEPLOYMENT_RUNBOOK.md` published (Expand → Migrate → Contract)
- [x] Vercel Instant Rollback (`npx vercel rollback`) verified

## 10. Monitoring & Health Endpoints
- [x] `/api/health` probe returning HTTP 200 with uptime & version
- [x] `/api/ready` probe returning HTTP 200 with DB ping & `Server-Timing` headers
