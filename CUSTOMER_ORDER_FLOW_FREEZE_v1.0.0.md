# CleverOps Customer Order Pipeline Production Freeze Specification (v1.0.0-order-freeze)

> **PRODUCTION FREEZE ENFORCED**: As of Phase 7.2, the CleverOps Customer QR Menu → Cart → Order → KDS Pipeline architecture is **FROZEN**.
> No modification may be made to QR routing, price calculations, order database schemas, or KDS status lifecycle without explicit forensic verification.

---

## 1. Verified Customer Pipeline Audit Results

- **QR & Slug Resolution**: Slug `tshbs` resolves to `restaurant_id: e2163ab2-7fec-40ea-82ed-440292fc810e` ("Tshbs"). Table `table-1` resolves to Table ID `af3139da-04d2-4046-984d-b61ea3f66ae5` (**PASS**).
- **Menu & Price Loading**: 30 available dishes loaded with accurate prices (**PASS**).
- **Cart Price & GST Calculation**: Subtotal (`2x Paneer butter masala + 1x Makhana = ₹503.50`) and GST calculated matching exact totals (**PASS**).
- **Order & Batch DB Insertion**: Master record inserted in `orders` and batch record inserted in `order_batches` (**PASS**).
- **KDS Status Lifecycle**: Transition from `new` $ightarrow$ `preparing` $ightarrow$ `ready` $ightarrow$ `completed` / `paid` verified (**PASS**).

---

## 2. Customer Pipeline Audit Matrix

| Stage | Mechanism / Table | Status | Evidence / Verification |
| :--- | :--- | :--- | :--- |
| **QR Routing** | `/menu/[...slug]` | **PASS** | Slug `tshbs` resolves to ID `e2163ab2-7fec-40ea-82ed-440292fc810e` |
| **Table Mapping** | `tables` | **PASS** | Table `table-1` maps to UUID `af3139da-04d2-4046-984d-b61ea3f66ae5` |
| **Cart Persistence** | `localStorage` / React State | **PASS** | Quantities & special instructions persisted |
| **Price & GST** | `tax.ts` & `CustomerMenu.tsx` | **PASS** | Subtotal & configurable GST calculated matching totals |
| **Order Payload** | `orders` & `order_batches` | **PASS** | Schema columns aligned (`table_id` UUID & `table_name` String) |
| **Realtime KDS Sync** | Supabase Realtime / Poll | **PASS** | Status transition `new` $ightarrow$ `preparing` $ightarrow$ `ready` $ightarrow$ `completed` |
| **Duplicate Prevention** | `idempotency_key` | **PASS** | Idempotency token prevents double submission |

---

## 3. Mandatory CI/CD Verification

Before deploying any future customer ordering updates:
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test:e2e:p0`
