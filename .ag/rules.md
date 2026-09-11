# SmartDine / CleverOps Permanent Project Rules

## 1. Git & Deployment Safety
- **Never auto commit**: Do not run `git commit` automatically unless explicitly requested and approved by the user.
- **Never auto push**: Do not execute `git push` or push commits to remote repositories without explicit user authorization.

## 2. Quality & Build Verification
- **Always run `npm run build` before claiming completion**: Verify full Next.js production build (`npm run build` or `next build`) with 0 compilation and 0 TypeScript errors before considering any task complete.
- **Run Founder smoke tests when available**: Run the founder verification test suites (`npx tsx scripts/test_founder_r4_smoke.ts` and `npx tsx scripts/test_founder_r3_smoke.ts`) whenever making changes across dashboard, floor plan, order, or customer surfaces.
- **React Hook Safety Guardrail**: Every component must maintain strict hook declaration ordering (`useState` -> `useRef` -> `useMemo` -> `useCallback` -> `useEffect`) and never call hooks conditionally or below early returns. Run `node scripts/audit-react-hooks.mjs --all` to guarantee 0 violations.

## 3. Core Engine & Backend Protection
- **Protect Inventory Engine**: The inventory system is permanently FROZEN. Never modify, refactor, rewrite, optimize, or touch `src/lib/inventoryEngine.ts`, `src/lib/inventoryUnits.ts`, inventory tables (`inventory_reservations`, `inventory_transactions`), deduction logic, recipe ingredient scaling, or portion multipliers. Isolate all UI/feature changes without modifying the frozen engine.
- **Preserve Supabase compatibility**: Maintain backward compatibility with Supabase PostgreSQL tables, RLS policies, schemas, and realtime channels. Never introduce breaking changes to database queries, stored procedures, or column types.

## 4. Engineering Discipline
- **Make minimal edits only**: Avoid large-scale rewrites, unnecessary refactoring, or collateral code modifications. Keep changes surgical, targeted, clean, and isolated to the specific task requirements.
