# ROOT CAUSE REPORT — CLEVEROPS ENTERPRISE STABILITY AUDIT

**Target:** `https://www.cleverops.in`  
**Date:** September 4, 2026  
**Auditor:** Antigravity Engineering (Founder Stability Lock)

---

## 1. Sidebar Links Becoming Unclickable

### Technical Cause
In Next.js 16 (`app` directory) using React 19 concurrent features, `<Link>` components intercepted click events with an internal synthetic router transition (`e.preventDefault()`). When wrapped within interactive state handlers (`onClick={() => setSidebarOpen(false)}`), along with uncoordinated hydration timing, the router transition frequently stalled while native event dispatch was permanently suppressed. Furthermore, mobile overlay wrappers without explicit pointer-event isolation (`pointer-events-none` when hidden) occasionally placed invisible `z-40` transparent backdrops over the navigation bar.

### Production Impact
Owners clicking on `Menu Management`, `Smart Menu`, `Inventory`, `Reports`, or `Settings` experienced unresponsive dead clicks. The URL remained `/dashboard`, giving the impression that the system was broken or frozen.

### Permanent Fix
1. Replaced Next.js synthetic `<Link>` elements in [src/app/(dashboard)/layout.tsx](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/app/(dashboard)/layout.tsx) with native semantic `<a>` tags with absolute `href` bindings and dynamic active route detection (`pathname === item.href`).
2. Elevated sidebar navigation items to `relative z-50` and enforced pointer-events isolation on all mobile drawer backdrops.
3. Decoupled drawer close handlers so native navigation dispatch is never blocked.

### Permanent Prevention Rule
**RULE 1:** Core persistent shell navigation components must never rely on synthetic client-side router wrappers that suppress native browser click events (`e.preventDefault()`) without a hard fallback. All navigation elements must have high `z-index` isolation and pointer-events immunity from modal backdrops.

---

## 2. Menu Opening Homepage Unexpectedly

### Technical Cause
In [src/app/(dashboard)/layout.tsx](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/app/(dashboard)/layout.tsx), the `getActiveUser()` hook called `supabase.auth.getSession()`. On cold client navigations, background tab wakeups, or initial token re-hydration, the asynchronous call momentarily evaluated to `null`. The layout immediately executed `router.push('/login')` without passing a destination redirect parameter. Subsequently, [src/app/(auth)/login/page.tsx](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/app/(auth)/login/page.tsx) had a static fallback destination or intercepted logo clicks that redirected unauthenticated or re-authenticating sessions directly to `/` (the public landing page).

### Production Impact
Owners clicking `Menu Management` from the dashboard were unexpectedly thrown out of the portal and landed on the marketing landing page (`https://cleverops.in/`), disrupting store operations.

### Permanent Fix
1. In `layout.tsx`, preserved the intended destination in the redirect query parameter: `router.push(\`/login?redirect=\${encodeURIComponent(pathname)}\`)`.
2. In `login/page.tsx`, read `redirect` from `window.location.search` and routed verified users directly to `targetUrl || '/dashboard'`.
3. In `login/page.tsx`, wrapped header logos to route to `/login` rather than marketing `/` when within an authentication flow.

### Permanent Prevention Rule
**RULE 2:** Any authentication guard or session re-check that triggers a redirect must serialize and pass `redirect=${encodeURIComponent(targetPath)}`. Auth pages must strictly honor the return path upon session resolution, never defaulting blindly to `/` or dropping user context.

---

## 3. Dashboard Widgets Breaking After New Feature Releases

### Technical Cause
New features frequently introduced new fields or query assumptions directly into shared database tables or global state hooks without default value handling or schema migrations. Furthermore, uncoordinated metric calculations computed live operational metrics (e.g. `Delayed Orders`, `Tables Occupied`) from unbound historical query states rather than scoped active periods.

### Production Impact
When an unhandled null or missing property occurred, whole dashboard widget trees crashed with React runtime errors (`Cannot read properties of undefined`), leaving blank white sections or spinning skeletons on the owner dashboard.

### Permanent Fix
1. Implemented strict fallback default values (`|| 0`, `|| []`, `|| {}`) across all metric calculations in [src/app/(dashboard)/dashboard/page.tsx](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/app/(dashboard)/dashboard/page.tsx).
2. Added React Error Boundaries around high-density operational widgets so an isolated widget failure never cascades to crash the entire dashboard page.
3. Standardized metric ingestion to use typed schema validation.

### Permanent Prevention Rule
**RULE 3:** All dashboard components must treat database payloads as potentially sparse. Every metric computation must have explicit nullish coalescing defaults. New features must never alter the expected shape of shared dashboard state hooks.

---

## 4. Owner Dashboard Layout Instability

### Technical Cause
Multiple independent releases adjusted card sizes, margins, font weights, and grid structures ad-hoc without a locked container contract. Metric cards used arbitrary font sizes (some `48px`, some `24px`, some `text-xl`), varying padding (`p-6` vs `p-4`), and dynamic vertical heights that caused layout shifts when metric values changed or time filters toggled.

### Production Impact
The dashboard appeared visually chaotic and unpolished, with jumping columns, asymmetrical cards, overlapping text, and unreadable raw seconds (`847s` instead of human-readable formats).

### Permanent Fix
1. Locked all KPI cards to a uniform height (`h-[148px]`), uniform padding (`p-4`), and strict typography scale:
   - Page Title: `32px / Semibold (600)`
   - Section Titles: `20px / Semibold (600)`
   - Primary Metrics: `36px / Semibold (600) font-mono`
   - Card Headers: `13px / Medium (500) uppercase tracking-wider`
2. Formatted all duration metrics into human-readable strings (`8 min 37 sec`, `22 min 04 sec`, `13 hr 04 min`) with zero raw seconds.
3. Enforced a rigid, locked operational sequence: Delayed Orders → 5 Core KPI Cards → Live Table Occupancy → Collapsible Live Operations Command Center → Recent Orders & Top Selling Dishes.

### Permanent Prevention Rule
**RULE 4:** No individual card styling overrides. All summary cards must use the locked enterprise design tokens (`h-[148px]`, `text-[36px] font-mono`, `text-[13px] uppercase`). Layout hierarchy is strictly immutable across future releases.

---

## 5. Menu Image Rendering Issues

### Technical Cause
Menu items used raw HTML `<img>` tags inside containers with undefined or varying aspect ratios (`h-44 w-full`). When dish images had different orientations (portrait vs landscape), were slow to load, or had broken URLs, browsers rendered broken image icons, distorted aspect ratios, or large blank spaces that triggered severe Cumulative Layout Shift (CLS).

### Production Impact
The Menu Management catalog and customer menu appeared broken and unbranded, with distorted dish photography and missing image placeholders.

### Permanent Fix
1. Encapsulated dish image rendering in `MenuItemCard` in [src/app/(dashboard)/dashboard/menu/page.tsx](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/app/(dashboard)/dashboard/menu/page.tsx) with a locked `aspect-[16/10] overflow-hidden` container.
2. Added `loading="lazy"` and `decoding="async"` for smooth image rendering without layout jumps.
3. Implemented a branded neutral fallback component featuring a circular badge with `UtensilsCrossed` icon, centered dish category icon, and dietary classification (`Vegetarian` / `Non-Vegetarian`) when image URLs are absent or fail to load.

### Permanent Prevention Rule
**RULE 5:** All image elements across all portals must specify explicit container aspect ratios (e.g. `16:10`) to prevent CLS. Every image component must incorporate an `onError` fallback handler that replaces broken links with a branded, styled placeholder component.
