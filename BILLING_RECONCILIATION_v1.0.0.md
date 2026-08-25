# CleverOps Billing & Revenue Reconciliation Specification (v1.0.0-inventory-freeze)

> **PRODUCTION FREEZE ENFORCED**: As of Phase 10, the CleverOps Billing, Tax Engine & Revenue Reconciliation architecture is **FROZEN**.
> No modification may be made to GST tax rates, service charge calculations, discount applications, invoice layouts, or revenue math without explicit forensic verification.

---

## 1. Verified Billing Reconciliation Matrix

| Feature / Calculation | Component / Formula | Status | Empirical Proof / Math Verification |
| :--- | :--- | :--- | :--- |
| **GST Calculation** | `tax.ts` (`Subtotal 	imes GST%`) | **PASS** | Inclusive & Exclusive CGST/SGST tax math verified |
| **Service Charge** | `billingEngine.ts` | **PASS** | Optional restaurant service charge percentage applied |
| **Discounts & Coupons** | `discountEngine.ts` | **PASS** | Order-level & Item-level discount subtractions verified |
| **Round-off Math** | `Math.round(Grand Total)` | **PASS** | Standard mathematical round-off applied |
| **Invoice Generation** | `PunchOrderModal.tsx` | **PASS** | Thermal print invoice & digital receipt format compliant |
| **Payment Status Sync** | `orders.payment_status` | **PASS** | Status transition `pending` $ightarrow$ `paid` tracked cleanly |
| **Revenue Reconciliation** | `orders` table | **PASS** | `Subtotal + Tax - Discount = Total` verified (100% Match) |

---

## 2. Mandatory CI/CD Verification

Before deploying any future billing updates:
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test:e2e:p0`
