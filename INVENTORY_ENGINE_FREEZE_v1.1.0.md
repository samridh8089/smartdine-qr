# INVENTORY ENGINE FREEZE v1.1.0 — SPECIFICATION & ARCHITECTURE ARCHIVE

**Status**: FREEZE LOCKED & AUDITED (P0)  
**Date**: 2026-08-26  
**Module**: `inventoryEngine.ts` & Order Lifecycle Integration (`db.ts`, `/api/staff/update-order-status`)  

---

## 1. Overview & Architectural Guarantees

This document serves as the authoritative freeze specification for the **CleverOps Production-Grade Inventory Engine (v1.1.0)**. Following forensic audit of real order `70e4954d-0048-4f5e-be73-86d94a77e4e5` ("Dal Bati"), three fundamental architectural bypasses were fixed and frozen.

### Frozen Guarantees
1. **Immediate Reservation on Placement**: Every order placed (`status: new`) immediately reserves required stock in `inventory_reservations` (`status: ACTIVE`) and increments `inventory_items.reserved_stock`.
2. **Zero API Bypass**: Route `/api/staff/update-order-status` is strictly bound to `db.updateBatchStatus` / `db.updateOrderStatus`, ensuring 100% of status changes pass through `inventoryEngine.transitionOrderBatchLifecycle`.
3. **Canonical Stock Consumption**: Moving an order to `preparing`, `ready`, `served`, `completed`, or `paid` physically deducts `inventory_items.current_stock`, clears `reserved_stock`, sets `orders.inventory_consumed = true`, and creates `ORDER_CONSUMPTION` ledger entries in `inventory_transactions`.
4. **Pre-Prep Cancellation Release**: Cancelling an order before preparation (`new` / `accepted`) releases the active reservation (`status: RELEASED`), decrements `reserved_stock`, and leaves physical `current_stock` 100% untouched.
5. **Strict Idempotency**: All operations are guarded by `ORDER_RESERVATION_<order_id>_<batch_id>` and `ORDER_CONSUMPTION_<order_id>_<batch_id>` idempotency keys. Duplicate status updates (e.g. `completed` called twice) return cleanly without double reservation or double deduction.

---

## 2. Order Lifecycle & Inventory State Machine Matrix

| Lifecycle Event | Order / Batch Status | Inventory Engine Action | DB Tables Updated | Ledger Entry (`inventory_transactions`) |
| :--- | :--- | :--- | :--- | :--- |
| **Order Placed** | `new` | `reserveInventoryForOrderBatch` | `inventory_items.reserved_stock += qty`<br>`inventory_reservations` (ACTIVE) | `RESERVATION_CREATED` |
| **Kitchen Accepts** | `accepted` | Idempotent Reservation Check | Reserved stock maintained | Skipped if reserved on `new` |
| **Kitchen Prepares / Ready / Completed** | `preparing`<br>`ready`<br>`completed`<br>`paid` | `consumeReservedInventoryForOrderBatch` | `inventory_items.current_stock -= qty`<br>`inventory_items.reserved_stock -= qty`<br>`inventory_reservations` (CONSUMED)<br>`orders.inventory_consumed = true` | `ORDER_CONSUMPTION` |
| **Order Cancelled (Pre-Prep)** | `cancelled` | `releaseInventoryReservationForOrderBatch` | `inventory_items.reserved_stock -= qty`<br>`inventory_reservations` (RELEASED) | `RESERVATION_RELEASED` |

---

## 3. Code Location Checklist

- **Order Creation Reservation**: [src/lib/db.ts](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/lib/db.ts#L1815) (`createOrder`) & [addBatchToOrder](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/lib/db.ts#L1926).
- **Payment Completion Consumption**: [src/lib/db.ts](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/lib/db.ts#L2130) (`updateOrderPaymentStatus`).
- **Status API Route Integration**: [src/app/api/staff/update-order-status/route.ts](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/app/api/staff/update-order-status/route.ts#L18-L23).
- **Core Engine Lifecycle Handler**: [src/lib/inventoryEngine.ts](file:///c:/smartdine/smartdine-qr-main%20first/smartdine-qr-main/src/lib/inventoryEngine.ts#L1668) (`transitionOrderBatchLifecycle`).

---

## 4. Verification & Regression Protection

The regression test runner script (`run_mandatory_regression_tests.ts`) executes real database verifications for:
1. `1x Dal Bati` (Order creation -> immediate reservation -> completion -> physical stock deduction).
2. `2x Dal Bati` (Portion & quantity multiplier scaling).
3. `Simultaneous Dal Bati Orders` (Concurrent order concurrency & stock accumulation safety).
4. `Cancellation Flow` (Pre-prep reservation release without touching physical stock).
5. `Idempotency Double Completion` (Calling completion twice produces 0 double deductions).
