# CleverOps v1.0.0 Final GO/NO-GO UAT Report

---

### 20-Step Real Restaurant Simulation (Target: "Tshbs" / `dsoni1281@gmail.com`)

| Step # | Simulation Activity | Result | Database & Network Empirical Proof |
| :---: | :--- | :---: | :--- |
| **1** | Owner Login | **PASS** | Account `dsoni1281@gmail.com` resolved User ID `d7450926-f2ff-4be0-9f0f-5e48fb77f07b` |
| **2** | Dashboard Loads | **PASS** | Loaded Restaurant "Tshbs" (`e2163ab2-7fec-40ea-82ed-440292fc810e`), Plan `pro` |
| **3** | Create Category | **PASS** | Created Category ID `68ef39ab-4faa-414b-8bb2-a9c610095fc7` |
| **4** | Add New Dish | **PASS** | Created Item ID `1f436e55-9c1c-43d4-8c8c-9bce05ad991a` @ ₹290 |
| **5** | Edit Dish | **PASS** | Updated Item Price to ₹299 in `menu_items` |
| **6** | Customer Scans QR | **PASS** | Opened `/menu/tshbs/table/table-1` (Table ID `af3139da-04d2-4046-984d-b61ea3f66ae5`) |
| **7** | Customer Sees Dish | **PASS** | Loaded dish "Signature Paneer Delight UAT" at updated ₹299 |
| **8** | Add Items to Cart | **PASS** | 2x Items added $ightarrow$ Subtotal ₹598.00 |
| **9-10** | Checkout & Submit | **PASS** | Created Master Order ID `536678a9-c57f-4539-a2a3-1c95eeb6b6ec` |
| **11-12** | Kitchen Alert | **PASS** | Realtime Postgres channel trigger, Bell sound alarm played |
| **13** | Kitchen Preparing | **PASS** | Order status updated to `preparing` in `orders` |
| **14** | Kitchen Ready | **PASS** | Order status updated to `ready` in `orders` |
| **15** | Waiter Served | **PASS** | Order status updated to `completed` in `orders` |
| **16** | Billing Complete | **PASS** | Payment status updated to `paid` in `orders` |
| **17** | Reports Update | **PASS** | Revenue aggregated ₹598 into analytics dashboard |
| **18** | Screen Refreshes | **PASS** | Dashboard, KDS, Billing, Menu screens hydrated with zero state loss |
| **19** | Realtime Sync | **PASS** | Postgres Realtime channels in sync across browser tabs |
| **20** | Console Audit | **PASS** | Zero unhandled runtime exceptions or network errors |
