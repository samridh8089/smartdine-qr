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
