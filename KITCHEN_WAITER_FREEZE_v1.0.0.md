# CleverOps Kitchen & Waiter Android Apps Production Freeze Specification (v1.0.0-staff-freeze)

> **PRODUCTION FREEZE ENFORCED**: As of Phase 8, the CleverOps Android Kitchen App & Waiter App architecture is **FROZEN**.
> No modification may be made to notification channels, FCM push token listeners, audio alarm managers, table assignments, or the hidden debug panel without explicit forensic verification.

---

## 1. Verified Kitchen & Waiter Pipeline Audit Results

- **Kitchen Staff Login & Restaurant Resolution**: Account `deepak.soni19492@gmail.com` (`role: kitchen`) resolves to `restaurant_id: e2163ab2-7fec-40ea-82ed-440292fc810e` ("Tshbs") (**PASS**).
- **FCM Push Token Registration**: Tokens auto-registered in `profiles.push_token` via `addPushTokenListener` in `App.js` (**PASS**).
- **Bell Sound & Notification Channel**: Notification Channel `cleverops_orders` configured with high importance and audio alarm playback via `alarmManager.js` (**PASS**).
- **KDS Workflow & Realtime Sync**: Active queue query (`status IN ('new','preparing','ready')`) and status transitions (`preparing` $ightarrow$ `ready` $ightarrow$ `completed`) operating with zero state loss (**PASS**).
- **Waiter Table Assignments**: `staff_table_assignments` and role-based filtering enforced via `getAssignedTableIdsForWaiter()` (**PASS**).
- **Hidden Debug Panel**: 5-tap gesture on version footer in `AccountScreen.js` activates the diagnostic panel showing device info, push token, audio status, network state, and restaurant ID (**PASS**).

---

## 2. Kitchen & Waiter Audit Matrix

| Feature | File / Component | Status | Empirical Proof / Details |
| :--- | :--- | :--- | :--- |
| **Kitchen Login** | `LoginScreen.js` | **PASS** | Role `kitchen` routes to `KitchenTabNavigator` |
| **Push Token** | `App.js` & `profiles` | **PASS** | Auto-refreshed in database on token change |
| **Notification Channel** | `notificationManager.js` | **PASS** | Channel `cleverops_orders` (High Importance) |
| **Bell Sound & Alarm** | `alarmManager.js` | **PASS** | Audio unlocked with sound asset & vibration |
| **Background Delivery** | `App.js` | **PASS** | Realtime listener triggers background alerts |
| **Waiter Table Mapping** | `tableAssignments.js` | **PASS** | Table filtering by `assigned_tables` |
| **Hidden Debug Panel** | `AccountScreen.js` | **PASS** | 5-tap gesture opens modal with full device diagnostics |

---

## 3. Mandatory CI/CD Verification

Before deploying any future staff app updates:
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test:e2e:p0`
