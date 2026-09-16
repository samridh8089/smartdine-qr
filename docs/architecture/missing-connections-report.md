# SmartDine Missing Connections Report

## Inventory to Preparing / Served

No connection is missing. `POST /api/staff/update-order-status` calls `db.updateBatchStatus` or `db.updateOrderStatus`; each calls `transitionOrderBatchLifecycle`. At `preparing`, the lifecycle calls `consumeReservedInventoryForOrderBatch`, which updates `inventory_items`, settles `inventory_reservations`, and inserts `inventory_transactions` records. `ready`, `served`, and `completed` call the same consumption path defensively; idempotency prevents a second decrement. Served should therefore not add another consumption hook.

## Observed bypass risks

1. `src/app/(dashboard)/dashboard/orders/page.tsx:1669` and `:1687` directly update `orders.status = 'cancelled'` for no-show/cancellation. Those writes bypass `/api/staff/update-order-status` and therefore can bypass the lifecycle engine's reservation release / prepared-food disposition rules.

   Correct connection: call `POST /api/staff/update-order-status` with `orderId`, `newStatus: 'cancelled'`, and the reason. Do not duplicate inventory mutations in the page; the server-side lifecycle is the frozen authority.

2. The mobile app contains direct `order_batches` status updates as offline/fallback behavior (`smartdine-mobile/src/screens/KitchenScreen.js:312`, `OrdersScreen.js:225`, `WaiterOrdersScreen.js:161`). These do not guarantee the same server-side inventory side effects as the status route.

   Correct connection: queue and replay the existing staff status API with the authenticated token, rather than replaying raw table updates. This is a routing correction only; inventory logic must remain untouched.

## Non-findings

- No Supabase Edge Function source directory is present. The runtime uses Next.js route handlers, Supabase database functions/triggers, and Realtime.
- `supabase/migrations/20260827000002_billing_trigger.sql` defines `trg_sync_order_totals` on `order_items`; it is a billing-total trigger, not an inventory trigger.
