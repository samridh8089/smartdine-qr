<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:inventory-freeze-rules -->
# CRITICAL: INVENTORY SYSTEM IS FROZEN

The inventory engine is verified, production-tested, and permanently FROZEN.
DO NOT modify, refactor, rewrite, optimize, rename, or touch:
- `src/lib/inventoryEngine.ts`
- `src/lib/inventoryUnits.ts`
- Inventory reservations on acceptance (`inventory_reservations`)
- Inventory consumption on preparing (`inventory_transactions`)
- Inventory restoration / food disposition logic
- Recipe ingredient scaling & portion multiplier logic (Half/Full/Custom)
- Available stock & customer limits calculation
- Idempotency & duplicate protection

If a task or feature seems to require an inventory change:
STOP FIRST. Report: "Inventory logic is frozen. This change would affect inventory."
Isolate the UI / feature so that it works WITHOUT modifying the frozen inventory engine.
<!-- END:inventory-freeze-rules -->

<!-- BEGIN:react-hooks-safety-guardrail -->
# CleverOps Permanent Guardrail — React Hooks Safety Rule (Mandatory)

## Purpose
Prevent React Error #310 ("Rendered more hooks than during the previous render") and client-side runtime crashes on all dashboard and public routes. This is a permanent engineering standard.

## Rule 1 — Hooks Always First
Every React component must strictly structure top-level declarations in this order:
1. `useState`
2. `useRef`
3. `useMemo`
4. `useCallback`
5. `useEffect`
6. `useLayoutEffect`

Only after ALL hooks are declared may conditional returns occur:
- `if (loading) return ...`
- `if (!restaurant) return ...`
- `if (!user) return ...`
- `return (...)`

### Correct Example
```tsx
const filteredOrders = useMemo(...)
const stats = useMemo(...)

if (loading) return <Loading />
if (!restaurant) return <Empty />

return (...)
```

### Wrong Example (Forbidden)
```tsx
if (loading) return <Loading />

const filteredOrders = useMemo(...)
```

## Rule 2 — Never Add Hooks Below Early Returns
Forbidden:
- `useMemo` after `return`
- `useEffect` after `return`
- `useState` after `return`
- `useRef` after `return`

Every hook must execute unconditionally on **every render**.

## Rule 3 — Every PR Must Run Hook Audit
Before committing:
1. Search the edited file for:
   - `useState(`
   - `useMemo(`
   - `useEffect(`
   - `useCallback(`
   - `useRef(`
2. Verify no hook exists below any early `return`.
3. If found, move the hook above the return.

## Rule 4 — Pre-Commit Checklist
Before every commit verify:
- [ ] All hooks are above early returns.
- [ ] Hook order never changes between renders.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes.

## Rule 5 — Founder Safety Check
For every future Founder Proof Pack, include one extra line:
> **React Hook Safety Audit: PASS**

Meaning:
- No hook exists below early returns.
- No conditional hook execution.
- No potential React Error #310.
<!-- END:react-hooks-safety-guardrail -->

