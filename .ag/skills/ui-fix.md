# UI Fix Skill

A specialized AI workflow for diagnosing, refining, and fixing user interface, layout, typography, and styling issues across SmartDine / CleverOps web and mobile surfaces.

---

## Workflow Instructions

### 1. Analyze the Requested UI Issue
- Identify the exact visual bug, alignment flaw, spacing error, contrast issue, clipping, or layout breakage.
- Locate the specific frontend presentation file(s) responsible for rendering:
  - Customer Menu & QR surfaces: `src/components/customer/*`, `src/app/(customer)/*`
  - Owner & Staff Dashboards: `src/app/(dashboard)/*`, `src/components/dashboard/*`
  - Reusable UI Elements: `src/components/ui/*`
  - Global Styles & Tokens: `src/app/globals.css`
- Understand the existing design system tokens, typography scales, dark/light theme classes, and spacing variables before editing.

### 2. Modify Only UI-Related Files
- Strictly limit modifications to presentation layers:
  - React JSX/TSX layout and structure
  - Tailwind CSS classes and utilities
  - CSS stylesheets
- Do **not** modify business logic, database queries, Supabase client calls, mutations, or API routes (`src/app/api/*`, `src/lib/db.ts`, `src/lib/supabase.ts`) unless the user explicitly requests a logic change.
- Never touch frozen core engines (`src/lib/inventoryEngine.ts`, `src/lib/inventoryUnits.ts`).

### 3. Preserve Mobile Responsiveness & Accessibility
- Ensure seamless adaptability across viewports:
  - Mobile (360px – 430px)
  - Tablet (768px – 1024px)
  - Desktop (1280px+)
- Maintain minimum touch target sizes (44x44px for primary buttons and interactive elements).
- Preserve mobile-specific patterns: sticky bottom action bars, collapsible drawers, scroll containers without layout shifts, and non-clipped text.
- Maintain high-contrast text rendering across both Light and Dark themes.

### 4. Enforce React Hook Safety Guardrail
- Any component declaration must strictly adhere to the hook order:
  1. `useState`
  2. `useRef`
  3. `useMemo`
  4. `useCallback`
  5. `useEffect`
  6. `useLayoutEffect`
- Never call hooks conditionally or below early returns (`if (loading) return ...`).
- Run the hook audit on edited files or globally:
  ```bash
  node scripts/audit-react-hooks.mjs
  ```

### 5. Build & Verification
- **Always run `npm run build`** before claiming task completion to verify:
  - 0 TypeScript compiler errors
  - 0 Turbopack / Next.js build errors across all static and dynamic routes
- If the fix impacts floor plan or order card components, run the corresponding smoke tests:
  ```bash
  npx tsx scripts/test_founder_r4_smoke.ts
  ```

### 6. Git & Deployment Safety
- **Never auto commit**: Do not run `git commit` automatically.
- **Never auto push**: Do not execute `git push` or deploy code to remote repositories without explicit user instruction.
