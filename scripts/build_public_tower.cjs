const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../docs/smartdine-control-tower-v4.html');
const destPath = path.resolve(__dirname, '../public/founder-control-center.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Add Exit button to toolbar next to dark/light toggle
const exitButtonHtml = `<button class="tool-btn" onclick="exitControlCenter()" title="Exit back to Dashboard (Esc)" style="background:rgba(239,68,68,0.2);border-color:#ef4444;color:#ef4444;font-weight:bold;display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:6px;cursor:pointer;"><span>✕</span> Exit</button>`;
html = html.replace('<button class="tool-btn" onclick="toggleTheme()" title="Toggle Dark/Light">🌓</button>', '<button class="tool-btn" onclick="toggleTheme()" title="Toggle Dark/Light">🌓</button>\n      ' + exitButtonHtml);

// 2. Enhance initialization to dynamically support restaurantId, restaurant name, and user role
const originalInit = `      // Check deep link: ?restaurant=abc123
      const urlParams = new URLSearchParams(window.location.search);
      const deepRestId = urlParams.get('restaurant');
      if (deepRestId && RESTAURANTS.some(r => r.id === deepRestId)) {
        currentRestaurantId = deepRestId;
      }`;

const enhancedInit = `      // Parameterized deep link: ?restaurant=... or ?restaurantId=...
      const urlParams = new URLSearchParams(window.location.search);
      const deepRestId = urlParams.get('restaurant') || urlParams.get('restaurantId');
      const deepRestName = urlParams.get('name') || 'CleverOps Live Tenant';
      const deepUserRole = urlParams.get('role');

      if (deepUserRole && deepUserRole !== 'super_admin') {
        isSuperAdmin = false;
        const roleBadge = document.getElementById('current-role-badge');
        if (roleBadge) roleBadge.innerText = 'OWNER (ISOLATED)';
      }

      if (deepRestId) {
        if (!RESTAURANTS.some(r => r.id === deepRestId)) {
          RESTAURANTS.unshift({
            id: deepRestId,
            name: deepRestName,
            slug: deepRestName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'tenant',
            plan: 'Pro',
            planBadge: 'PRO ACTIVE',
            planColor: '#10b981',
            status: 'online',
            lastSync: 'Just now',
            owner: 'Store Owner',
            email: 'owner@cleverops.in',
            phone: '+91 8949266064',
            upi: 'cleverops@upi',
            currency: 'INR (₹)',
            tax: '5% CGST/SGST',
            tablesCount: 16,
            activeOrdersCount: 2,
            todayRevenue: 2850,
            logoText: deepRestName.slice(0, 3).toUpperCase(),
            logoBg: 'linear-gradient(135deg, #10b981, #047857)',
            isProductionVerified: true
          });
        }
        currentRestaurantId = deepRestId;
      }`;

if (html.includes(originalInit)) {
  html = html.replace(originalInit, enhancedInit);
} else {
  console.warn('Warning: originalInit pattern not found directly, checking partial replacement');
  html = html.replace(
    "const deepRestId = urlParams.get('restaurant');",
    "const deepRestId = urlParams.get('restaurant') || urlParams.get('restaurantId');"
  );
}

// 3. Add exit function and ESC key listener
const exitScript = `
    // ─── CONTROL TOWER NAVIGATION & HOST MESSAGING ───
    function exitControlCenter() {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'SMARTDINE_EXIT_CONTROL_CENTER' }, '*');
        } else {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        window.location.href = '/dashboard';
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        exitControlCenter();
      }
    });
`;

const lastScriptIdx = html.lastIndexOf('</script>');
if (lastScriptIdx !== -1) {
  html = html.slice(0, lastScriptIdx) + exitScript + '\n    ' + html.slice(lastScriptIdx);
}

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully updated public/founder-control-center.html (' + html.length + ' bytes)');
