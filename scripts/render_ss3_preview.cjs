const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 860, deviceScaleFactor: 2 });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { background-color: #f8fafc; color: #0f172a; overflow-x: hidden; padding-bottom: 30px; }

  /* Top App Header */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #ffffff;
    border-bottom: 1px solid #f1f5f9;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .btn-manage {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .restaurant-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
  }
  .rest-logo {
    width: 26px;
    height: 26px;
    background: #0f172a;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bell-btn {
    width: 36px;
    height: 36px;
    background: #0f172a;
    color: #ffffff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  /* PROMINENT "BACK TO ORDERS LIST" BUTTON CONTAINER */
  .back-btn-container {
    padding: 12px 14px 4px;
  }
  .btn-back-prominent {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 12px;
    padding: 10px 14px;
    color: #1e293b;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .back-icon-circle {
    width: 26px;
    height: 26px;
    background: #f1f5f9;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0f172a;
  }

  /* Single Unified Order Card */
  .order-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    margin: 8px 14px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  /* Header Section: Order ID, Table, Status & Total */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
  }
  .order-id-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .order-id {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .table-badge {
    background: #f1f5f9;
    color: #334155;
    font-size: 11px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .status-badges {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
  .badge-completed {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
  }
  .badge-paid {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
  }
  .price-col {
    text-align: right;
  }
  .grand-total {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
  }
  .print-btn {
    margin-top: 6px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 700;
    color: #334155;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* SECTION 1: FOOD ITEMS FIRST (KAM KI CHEEZ SABSE PEHLE) */
  .items-section {
    padding: 14px 0 10px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .food-item-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .food-info {
    flex: 1;
  }
  .food-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .check-icon {
    color: #059669;
    font-weight: bold;
    font-size: 13px;
  }
  .food-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .food-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #64748b;
  }
  .item-status-served {
    background: #e2e8f0;
    color: #334155;
    font-size: 9px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .food-price {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
  }

  /* SECTION 2: QUICK ACTION & PAYMENT BREAKDOWN */
  .action-section {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
    margin-top: 6px;
    margin-bottom: 12px;
  }
  .action-pill-paid {
    background: #ecfdf5;
    border: 1px solid #10b981;
    color: #047857;
    font-size: 12px;
    font-weight: 700;
    padding: 9px 12px;
    border-radius: 9px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .refund-btn {
    width: 100%;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    padding: 8px;
    border-radius: 8px;
    text-align: center;
  }
  .finalized-note {
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
    margin-top: 6px;
  }

  /* SECTION 3: TIMELINE & METADATA (NICHE / BOTTOM) */
  .meta-section {
    border-top: 1px solid #f1f5f9;
    padding-top: 12px;
    margin-top: 6px;
  }
  .timeline-bar {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 9px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 700;
    color: #334155;
    margin-bottom: 12px;
  }
  .activity-log-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
  }
  .log-title {
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .log-item {
    font-size: 12px;
    color: #334155;
    padding: 3px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .log-dot {
    width: 5px;
    height: 5px;
    background: #94a3b8;
    border-radius: 50%;
  }
  .time-stamp-footer {
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 10px;
    font-weight: 600;
  }
</style>
</head>
<body>

  <!-- Top App Navigation -->
  <div class="top-bar">
    <button class="btn-manage">Manage</button>
    <div class="restaurant-title">
      <div class="rest-logo">B</div>
      <span>The Bistro Cafe</span>
    </div>
    <div class="bell-btn">🔔</div>
  </div>

  <!-- Prominent "Back to Orders List" Button -->
  <div class="back-btn-container">
    <button class="btn-back-prominent">
      <div class="back-icon-circle">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </div>
      <span>Back to Orders List</span>
    </button>
  </div>

  <!-- Unified Order Card (No split, single seamless container) -->
  <div class="order-card">
    
    <!-- Header: Order Number, Table, Badges & Amount -->
    <div class="card-header">
      <div>
        <div class="order-id-row">
          <span class="order-id">Order #26D8427</span>
          <span class="table-badge">TABLE 2</span>
        </div>
        <div class="status-badges">
          <span class="badge-completed">Completed</span>
          <span class="badge-paid">Paid Verified</span>
        </div>
      </div>
      <div class="price-col">
        <div class="grand-total">₹45</div>
        <button class="print-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print Bill
        </button>
      </div>
    </div>

    <!-- 1. FOOD ITEMS FIRST (KAM KI CHIZ SABSE PEHLE) -->
    <div class="items-section">
      <div class="section-label">
        <span>Ordered Dishes (1 Item)</span>
        <span style="color:#059669; font-weight:700;">All Served</span>
      </div>
      
      <div class="food-item-box">
        <div class="food-info">
          <div class="food-name-row">
            <span class="check-icon">✓</span>
            <span class="food-name">Kozhi Nirachathu (Full Chicken)</span>
          </div>
          <div class="food-meta">
            <span class="item-status-served">SERVED</span>
            <span>Qty: 1 × ₹45</span>
          </div>
        </div>
        <div class="food-price">₹45</div>
      </div>
    </div>

    <!-- 2. QUICK ACTIONS & PAYMENT STATUS -->
    <div class="action-section">
      <div class="action-pill-paid">
        <span>✓ Paid: Split (₹22.50 Cash + ₹22.50 Online UPI)</span>
      </div>
      <button class="refund-btn">↺ Issue Refund</button>
      <div class="finalized-note">ⓘ This order has been finalized and cannot be edited.</div>
    </div>

    <!-- 3. TIMELINE & SECONDARY DETAILS NICHE -->
    <div class="meta-section">
      <div class="timeline-bar">
        <span>🕒 Order Timeline</span>
        <span style="color:#64748b; font-size:11px;">View history ▼</span>
      </div>

      <div class="activity-log-box">
        <div class="log-title">Order Activity Log</div>
        <div class="log-item"><span class="log-dot"></span> Accepted by: <b>Deepak Ji</b></div>
        <div class="log-item"><span class="log-dot"></span> Cooking by: <b>Samridh Tomar</b></div>
        <div class="log-item"><span class="log-dot"></span> Ready by: <b>Samridh Tomar</b></div>
        <div class="log-item"><span class="log-dot"></span> Served by: <b>Samridh Tomar</b></div>
        <div class="log-item"><span class="log-dot"></span> Completed by: <b>Samridh Tomar</b></div>
      </div>

      <div class="time-stamp-footer">
        Order Placed: 27 Oct 2026 at 03:58 PM
      </div>
    </div>

  </div>

</body>
</html>
  `;

  await page.setContent(html);
  const outPath = path.resolve('C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/ss3_redesigned_unified_preview.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved updated preview to:', outPath);

  await browser.close();
})();
