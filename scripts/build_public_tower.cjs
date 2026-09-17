const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../docs/smartdine-control-tower-v4.html');
const destPath = path.resolve(__dirname, '../public/founder-control-center.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 0. Ensure /supabase.js is loaded locally to comply with CSP
const supabaseOldScript = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const supabaseNewScript = `<script src="/supabase.js"></script>
  <script>
    if (typeof supabase === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      document.head.appendChild(s);
    }
  </script>`;

if (html.includes(supabaseOldScript)) {
  html = html.replace(supabaseOldScript, supabaseNewScript);
}

// 1. Add Exit button to toolbar next to dark/light toggle
const exitButtonHtml = `<button class="tool-btn" onclick="exitControlCenter()" title="Exit back to Dashboard (Esc)" style="background:rgba(239,68,68,0.2);border-color:#ef4444;color:#ef4444;font-weight:bold;display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:6px;cursor:pointer;"><span>✕</span> Exit</button>`;
if (!html.includes('exitControlCenter()')) {
  html = html.replace('<button class="tool-btn" onclick="toggleTheme()" title="Toggle Dark/Light">🌓</button>', '<button class="tool-btn" onclick="toggleTheme()" title="Toggle Dark/Light">🌓</button>\n      ' + exitButtonHtml);
}

// 2. Add Top Floating Live Banner right after <header>
const liveBannerHtml = `
  <!-- ─── FLOATING LIVE ACTIVITY HUD BANNER ─── -->
  <div id="live-activity-banner" style="position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:900;background:rgba(15,23,42,0.95);border:2px solid #10b981;box-shadow:0 10px 30px rgba(0,0,0,0.8), 0 0 25px rgba(16,185,129,0.5);padding:10px 24px;border-radius:30px;display:none;align-items:center;gap:12px;font-size:13px;font-weight:700;backdrop-filter:blur(10px);pointer-events:none;transition:all 0.3s ease;">
    <span class="live-pulse-dot" style="width:12px;height:12px;border-radius:50%;background:#10b981;box-shadow:0 0 10px #10b981;animation:nodePulseGlow 1s infinite alternate;"></span>
    <span id="live-activity-text" style="color:#f8fafc;font-family:var(--font-mono);letter-spacing:0.5px;">WAITING FOR LIVE PHONE ORDER...</span>
  </div>
`;
if (!html.includes('id="live-activity-banner"')) {
  html = html.replace('</header>', '</header>\n' + liveBannerHtml);
}

// 3. Add Custom CSS for Table Chips & Node Glow
const customStyles = `
    /* Live Status Glow for Floor Table Chips */
    .table-chip.new { border-color: #38bdf8 !important; background: rgba(56, 189, 248, 0.22) !important; box-shadow: 0 0 14px rgba(56, 189, 248, 0.5) !important; color: #38bdf8 !important; }
    .table-chip.occupied { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.22) !important; box-shadow: 0 0 14px rgba(59, 130, 246, 0.5) !important; color: #60a5fa !important; }
    .table-chip.preparing { border-color: #f59e0b !important; background: rgba(245, 158, 11, 0.22) !important; box-shadow: 0 0 14px rgba(245, 158, 11, 0.5) !important; color: #fbbf24 !important; }
    .table-chip.ready { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.25) !important; box-shadow: 0 0 14px rgba(16, 185, 129, 0.5) !important; color: #34d399 !important; }
    .table-chip.served { border-color: #8b5cf6 !important; background: rgba(139, 92, 246, 0.22) !important; box-shadow: 0 0 14px rgba(139, 92, 246, 0.5) !important; color: #a78bfa !important; }
    .table-chip.available { border-color: #10b981; opacity: 0.75; }
`;
if (!html.includes('.table-chip.new {')) {
  html = html.replace('</style>', customStyles + '\n  </style>');
}

// 4. Add Recent Orders Section inside Floor Sidebar Section
const floorGridTarget = `<div class="floor-grid" id="floor-grid-cards">
                <!-- Populated by renderFloorGrid() in JS -->
              </div>`;
const floorGridWithRecent = `<div class="floor-grid" id="floor-grid-cards">
                <!-- Populated by renderFloorGrid() in JS -->
              </div>
              <div id="recent-orders-container" style="margin-top:14px;border-top:1px solid var(--border-color);padding-top:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">⚡ Recent Completed & Live Orders</span>
                  <span style="font-size:10px;color:var(--accent-data);font-weight:bold;" id="live-order-sync-badge">● LIVE SYNC</span>
                </div>
                <div id="recent-orders-list" style="display:flex;flex-direction:column;gap:6px;">
                  <div style="color:var(--text-muted);font-size:11px;text-align:center;padding:10px;">Syncing orders...</div>
                </div>
              </div>`;

if (html.includes(floorGridTarget)) {
  html = html.replace(floorGridTarget, floorGridWithRecent);
}

// 5. Enhance initialization to dynamically support restaurantId, restaurant name, and user role
const originalInit = `      // Check deep link: ?restaurant=abc123
      const urlParams = new URLSearchParams(window.location.search);
      const deepRestId = urlParams.get('restaurant');
      if (deepRestId && RESTAURANTS.some(r => r.id === deepRestId)) {
        currentRestaurantId = deepRestId;
      }`;

const enhancedInit = `      // Parameterized deep link: ?restaurant=... or ?restaurantId=...
      const urlParams = new URLSearchParams(window.location.search);
      const deepRestId = urlParams.get('restaurant') || urlParams.get('restaurantId');
      const deepRestName = urlParams.get('name') || 'The Foody Hub';
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
}

// 6. Replace initRealtimeSubscriptions with direct initSupabaseLiveNoc() in initialization
if (html.includes('initRealtimeSubscriptions(currentRestaurantId);')) {
  html = html.replace('initRealtimeSubscriptions(currentRestaurantId);', 'initSupabaseLiveNoc();');
}

// 7. Complete Realtime Engine & Event Handlers
const upgradedFloorAndNocBlock = `    // ─── AUDIO SYNTHESIZER CHIME ENGINE (WebAudio API) ───
    function playLiveChime(status) {
      const ts = new Date().toISOString();
      console.log(\`[\${ts}] playLiveChime() executed:\`, { status });
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        const s = (status || '').toLowerCase();

        if (s === 'new') {
          // High alert chime
          gain.gain.setValueAtTime(0.25, now);
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1174, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        } else if (s === 'accepted') {
          // Double harmony chime
          gain.gain.setValueAtTime(0.2, now);
          osc.frequency.setValueAtTime(587, now);
          osc.frequency.setValueAtTime(880, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (s === 'preparing') {
          // Warm prep tone
          gain.gain.setValueAtTime(0.2, now);
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(659, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (s === 'ready') {
          // Pass bell ding
          gain.gain.setValueAtTime(0.25, now);
          osc.frequency.setValueAtTime(1046, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (s === 'served') {
          // Service chime
          gain.gain.setValueAtTime(0.2, now);
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.linearRampToValueAtTime(784, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (s === 'completed') {
          // Settlement cash register ding
          gain.gain.setValueAtTime(0.25, now);
          osc.frequency.setValueAtTime(1318, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        } else {
          gain.gain.setValueAtTime(0.15, now);
          osc.frequency.setValueAtTime(660, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        }
      } catch (audioErr) {
        console.warn('[NOC Audio] AudioContext notice:', audioErr);
      }
    }

    // ─── VISUAL EVENT HANDLERS (EXPLICIT FOR EVIDENCE) ───
    function showLiveBanner(tableName, status, amount, orderId) {
      const ts = new Date().toISOString();
      console.log(\`[\${ts}] showLiveBanner() executed:\`, { tableName, status, amount, orderId });

      const banner = document.getElementById('live-activity-banner');
      const bannerText = document.getElementById('live-activity-text');
      if (banner && bannerText) {
        const s = (status || '').toLowerCase();
        const sColor = {
          new: '#38bdf8',
          accepted: '#f59e0b',
          preparing: '#f97316',
          ready: '#10b981',
          served: '#8b5cf6',
          completed: '#059669',
          cancelled: '#ef4444'
        }[s] || '#10b981';

        bannerText.innerHTML = \`⚡ <strong>LIVE EVENT:</strong> [\${tableName || 'Table'}] Order #\${(orderId||'').slice(0,8)} ➔ <span style="color:\${sColor};text-transform:uppercase;font-weight:800;">\${status}</span> \${amount ? '• ' + amount : ''}\`;
        banner.style.display = 'inline-flex';
        banner.style.borderColor = sColor;
        banner.style.boxShadow = \`0 10px 30px rgba(0,0,0,0.8), 0 0 25px \${sColor}88\`;

        setTimeout(() => {
          if (banner) {
            banner.style.borderColor = 'rgba(16,185,129,0.5)';
            banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(16,185,129,0.3)';
          }
        }, 4000);
      }

      if (typeof showToast === 'function') {
        showToast(\`⚡ Live Order Event: \${tableName} ➔ \${(status||'').toUpperCase()} \${amount ? '(' + amount + ')' : ''}\`, 'info');
      }
    }

    function animateNode(nodeId, edgeId) {
      const ts = new Date().toISOString();
      console.log(\`[\${ts}] animateNode() executed:\`, { nodeId, edgeId });
      if (!nodeId) return;

      // Auto-center camera smoothly
      if (typeof centerOnNode === 'function') {
        centerOnNode(nodeId, 1.35);
      }

      // Clear previous active nodes & edges
      document.querySelectorAll('.node-group').forEach(g => g.classList.remove('flow-active'));
      document.querySelectorAll('.edge-path').forEach(ep => ep.classList.remove('flow-active'));

      const nodeEl = document.getElementById('node-' + nodeId);
      if (nodeEl) {
        nodeEl.classList.add('flow-active');
      }

      let edgeEl = null;
      if (edgeId) {
        edgeEl = document.getElementById(edgeId);
        if (edgeEl) edgeEl.classList.add('flow-active');
      }

      setTimeout(() => {
        if (nodeEl) nodeEl.classList.remove('flow-active');
        if (edgeEl) edgeEl.classList.remove('flow-active');
      }, 5000);
    }

    function updateFloorGrid(tableName, status, amount, orderId) {
      const ts = new Date().toISOString();
      console.log(\`[\${ts}] updateFloorGrid() executed:\`, { tableName, status, amount, orderId });

      if (tableName) {
        let matchingTable = liveTables.find(t => 
          t.id.toLowerCase() === tableName.toLowerCase() || 
          tableName.toLowerCase().includes(t.id.toLowerCase())
        );

        if (!matchingTable) {
          matchingTable = {
            id: tableName,
            tableId: tableName,
            type: 'Dine In',
            seats: 4,
            status: 'available',
            orderId: '',
            amount: ''
          };
          liveTables.push(matchingTable);
        }

        if (matchingTable) {
          const s = (status || '').toLowerCase();
          const isEnded = s === 'completed' || s === 'cancelled' || s === 'rejected';
          matchingTable.status = isEnded ? 'available' : (s === 'new' ? 'occupied' : s);
          if (amount) matchingTable.amount = amount;
          matchingTable.orderId = isEnded ? '' : orderId;
        }
      }

      renderFloorGrid();
    }

    let recentCompletedOrders = [];

    function renderFloorGrid() {
      const gridEl = document.getElementById('floor-grid-cards');
      if (!gridEl) return;

      const activeCount = liveTables.filter(t => t.status !== 'available').length;
      const countEl = document.getElementById('floor-table-count');
      if (countEl) countEl.innerText = \`\${liveTables.length} (\${activeCount} Active)\`;

      gridEl.innerHTML = liveTables.map(t => \`
        <div class="table-chip \${t.status}" id="chip-\${t.id}" onclick="onTableClick('\${t.id}', '\${t.orderId}')">
          <span style="font-weight:700;">\${t.id}</span>
          <span style="font-size:10px;color:var(--text-muted);">\${t.type} • \${t.seats}s</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;">\${t.status}</span>
          <span style="font-size:10px;color:var(--accent-main);">\${t.amount || '-'}</span>
        </div>
      \`).join('');

      // Populate Recent Orders Ticker
      const recentListEl = document.getElementById('recent-orders-list');
      if (recentListEl && recentCompletedOrders.length > 0) {
        const statusColors = {
          new: '#38bdf8',
          accepted: '#f59e0b',
          preparing: '#f97316',
          ready: '#10b981',
          served: '#8b5cf6',
          completed: '#059669',
          cancelled: '#ef4444'
        };
        recentListEl.innerHTML = recentCompletedOrders.map(o => {
          const color = statusColors[o.status] || '#94a3b8';
          const tName = o.table_name || 'Table';
          const amt = '₹' + Number(o.total || 0).toLocaleString('en-IN');
          const time = o.updated_at ? new Date(o.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
          return \`
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-card);padding:6px 10px;border-radius:6px;border-left:3px solid \${color};font-size:11px;">
              <div>
                <span style="font-weight:700;color:var(--text-primary);">\${tName}</span>
                <span style="color:var(--text-muted);margin-left:4px;font-size:10px;">#\${o.id.slice(0,6)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:var(--accent-main);font-weight:700;">\${amt}</span>
                <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:\${color};background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">\${o.status}</span>
                <span style="font-size:9px;color:var(--text-muted);">\${time}</span>
              </div>
            </div>
          \`;
        }).join('');
      }
    }

    // ─── UPGRADED HIGH-RESILIENT SUPABASE LIVE NOC ENGINE ───
    let knownOrderStatuses = {};

    async function loadRealFloorTables() {
      if (!liveSupabaseClient) return;
      try {
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
        const [tRes, rRes] = await Promise.all([
          liveSupabaseClient.from('tables').select('id, name').eq('restaurant_id', restId),
          liveSupabaseClient.from('restaurants').select('settings').eq('id', restId).single()
        ]);

        const dbTables = tRes.data || [];
        const tableStates = rRes.data?.settings?.table_states || {};

        if (dbTables.length > 0) {
          liveTables = dbTables.map((t, idx) => {
            const tState = tableStates[t.id] || {};
            return {
              id: t.name || \`T-\${idx + 1}\`,
              tableId: t.id,
              type: 'Dine In',
              seats: tState.seats || tState.capacity || 4,
              status: tState.occupancy_status || 'available',
              orderId: tState.current_session_id || '',
              amount: ''
            };
          });
          renderFloorGrid();
          logDevEvent('TABLES', 'LOADED', \`Loaded \${dbTables.length} tables from database\`);
        }
      } catch (e) {
        console.warn('[NOC Tables] Error loading real tables:', e);
      }
    }

    async function initSupabaseLiveNoc() {
      if (window.__nocInitialized) return;
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.warn('[NOC Realtime] Supabase JS SDK not ready yet, retrying in 250ms...');
        setTimeout(initSupabaseLiveNoc, 250);
        return;
      }
      window.__nocInitialized = true;

      try {
        liveSupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
        console.log("Listening Restaurant:", restId);

        // 1. Load real tenant tables from database
        await loadRealFloorTables();

        // 2. Initial snapshot of active orders from database
        await syncLiveOrdersFromSupabase();

        // 3. Robust Realtime Postgres Changes Subscription
        const pgChannel = liveSupabaseClient.channel(\`founder_pg_\${restId}_\${Date.now()}\`);
        console.log("Channel:", pgChannel.topic);

        pgChannel
          // Orders Table Insert & Update
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: \`restaurant_id=eq.\${restId}\` }, (payload) => {
            console.log("Realtime Event", payload);
            logDevEvent('PG_ORDERS', payload.eventType, JSON.stringify(payload.new || {}));
            
            const ord = payload.new || payload.old || {};
            const orderRestId = ord.restaurant_id || restId;
            console.log("Restaurant ID check -> Customer order restaurant ID:", orderRestId, "| Founder Control Center restaurant ID:", restId, "| Match:", orderRestId === restId);

            if (payload.eventType === 'INSERT') {
              onRealtimeOrderEvent('new-order', {
                newStatus: ord.status || 'new',
                orderId: ord.id,
                tableName: ord.table_name,
                updatedOrder: ord
              });
            } else if (payload.eventType === 'UPDATE') {
              onRealtimeOrderEvent('order-status-updated', {
                newStatus: ord.status,
                orderId: ord.id,
                tableName: ord.table_name,
                updatedOrder: ord
              });
            }
            syncLiveOrdersFromSupabase();
          })
          // Order Batches Table Insert & Update
          .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, (payload) => {
            console.log("Realtime Event", payload);
            logDevEvent('PG_BATCH', payload.eventType, JSON.stringify(payload.new || {}));
            const b = payload.new;
            if (b && b.status) {
              onRealtimeOrderEvent('batch-status-updated', {
                newStatus: b.status,
                batchId: b.id,
                orderId: b.order_id
              });
            }
            syncLiveOrdersFromSupabase();
          })
          // System Events Bus (QR scans, Cart additions, Checkouts, Inventory)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_events', filter: \`restaurant_id=eq.\${restId}\` }, (payload) => {
            console.log("Realtime Event", payload);
            logDevEvent('SYSTEM_EVENT', payload.new?.event_type || 'event', JSON.stringify(payload.new || {}));
            if (payload.new) {
              handleSystemEventNodePulse(payload.new.event_type, payload.new);
            }
          })
          .subscribe((status) => {
            console.log("WS connection established:", pgChannel.topic, "Status:", status);
            if (status === 'SUBSCRIBED') {
              const badge = document.querySelector('.noc-badge');
              if (badge) {
                badge.innerText = 'REALTIME LIVE (WS + PG)';
                badge.style.background = '#10b981';
              }
              showToast('🟢 Live Supabase Realtime Connected (Postgres + WebSocket)', 'success');
              logDevEvent('REALTIME', 'CONNECTED', \`Listening to Postgres + Channels for \${restId}\`);
            }
          });

        // 4. WebSocket Broadcast Channels (Instant non-blocking emitter)
        const kdsChannel = liveSupabaseClient.channel(\`kds_\${restId}\`);
        console.log("Channel:", kdsChannel.topic);
        kdsChannel
          .on('broadcast', { event: 'order-status-updated' }, (p) => {
            console.log("Realtime Event", p);
            onRealtimeOrderEvent('order-status-updated', p?.payload || p);
          })
          .on('broadcast', { event: 'new-order' }, (p) => {
            console.log("Realtime Event", p);
            onRealtimeOrderEvent('new-order', p?.payload || p);
          })
          .on('broadcast', { event: 'payment-updated' }, (p) => {
            console.log("Realtime Event", p);
            onRealtimeOrderEvent('payment-updated', p?.payload || p);
          })
          .subscribe((status) => {
            console.log("WS connection established:", kdsChannel.topic, "Status:", status);
          });

        const liveOrdersChannel = liveSupabaseClient.channel(\`live_orders_\${restId}\`);
        liveOrdersChannel
          .on('broadcast', { event: 'order-status-updated' }, (p) => {
            console.log("Realtime Event", p);
            onRealtimeOrderEvent('order-status-updated', p?.payload || p);
          })
          .on('broadcast', { event: 'new-order' }, (p) => {
            console.log("Realtime Event", p);
            onRealtimeOrderEvent('new-order', p?.payload || p);
          })
          .subscribe();

        const tablesChannel = liveSupabaseClient.channel(\`tables_\${restId}\`);
        tablesChannel
          .on('broadcast', { event: 'table-status-updated' }, (p) => {
            console.log("Realtime Event", p);
            onRealtimeTableEvent(p?.payload || p);
          })
          .subscribe();

        const founderChannel = liveSupabaseClient.channel(\`founder_events_\${restId}\`);
        founderChannel
          .on('broadcast', { event: '*' }, (p) => {
            console.log("Realtime Event", p);
            const evData = p?.payload || p;
            logDevEvent('FOUNDER_BUS', p.event, JSON.stringify(evData));
            if (evData && evData.eventType) {
              handleSystemEventNodePulse(evData.eventType, evData);
            }
          })
          .subscribe();

        // 5. Periodic 2.0-Second Background Auto-Sync with State Transition Detection
        setInterval(() => {
          syncLiveOrdersFromSupabase();
        }, 2000);

      } catch (err) {
        console.warn('[NOC Realtime] Init error:', err);
      }
    }

    async function syncLiveOrdersFromSupabase() {
      if (!liveSupabaseClient) return;
      try {
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
        
        // Fetch active orders and 6 most recent orders in parallel
        const [activeRes, recentRes] = await Promise.all([
          liveSupabaseClient
            .from('orders')
            .select('id, table_name, table_id, status, total, restaurant_id, order_batches(id, status)')
            .eq('restaurant_id', restId)
            .not('status', 'in', '(completed,cancelled)'),
          liveSupabaseClient
            .from('orders')
            .select('id, table_name, table_id, status, total, restaurant_id, created_at, updated_at')
            .eq('restaurant_id', restId)
            .order('created_at', { ascending: false })
            .limit(6)
        ]);

        const activeOrders = activeRes.data || [];
        recentCompletedOrders = recentRes.data || [];

        // Detect state transitions via polling sync as a fail-safe
        activeOrders.forEach(ord => {
          const prev = knownOrderStatuses[ord.id];
          if (prev && prev !== ord.status) {
            console.log("[POLL SYNC] State Transition Detected:", ord.id, prev, "->", ord.status);
            onRealtimeOrderEvent('order-status-updated', {
              newStatus: ord.status,
              orderId: ord.id,
              tableName: ord.table_name,
              updatedOrder: ord
            });
          }
          knownOrderStatuses[ord.id] = ord.status;
        });

        // Reset tables to available first if they don't have active orders
        const activeTableNames = new Set();

        if (activeOrders.length > 0) {
          activeOrders.forEach(ord => {
            const tName = (ord.table_name || '').trim();
            if (!tName) return;
            activeTableNames.add(tName.toLowerCase());

            let matchingTable = liveTables.find(t => 
              t.id.toLowerCase() === tName.toLowerCase() || 
              tName.toLowerCase().includes(t.id.toLowerCase())
            );

            // Dynamically register table if not in predefined list (e.g. maharaja)
            if (!matchingTable) {
              matchingTable = {
                id: tName,
                tableId: ord.table_id || tName,
                type: 'Dine In',
                seats: 4,
                status: 'available',
                orderId: '',
                amount: ''
              };
              liveTables.push(matchingTable);
            }

            // Determine latest batch status if available
            let displayStatus = ord.status === 'new' ? 'occupied' : ord.status;
            if (ord.order_batches && ord.order_batches.length > 0) {
              const b = ord.order_batches[0];
              if (b.status === 'preparing') displayStatus = 'preparing';
              else if (b.status === 'ready') displayStatus = 'ready';
              else if (b.status === 'served') displayStatus = 'served';
            }

            matchingTable.status = displayStatus;
            matchingTable.orderId = ord.id;
            matchingTable.amount = '₹' + Number(ord.total || 0).toLocaleString('en-IN');
          });
        }

        // Mark tables with no active orders as available
        liveTables.forEach(t => {
          if (!activeTableNames.has(t.id.toLowerCase())) {
            if (t.status !== 'available' && t.orderId) {
              t.status = 'available';
              t.orderId = '';
              t.amount = '';
            }
          }
        });

        renderFloorGrid();
      } catch (e) {
        console.warn('[NOC Sync] Error syncing active orders:', e);
      }
    }

    function onRealtimeOrderEvent(eventType, rawPayload) {
      const payload = rawPayload?.payload || rawPayload;
      console.log("Realtime Event", payload);
      logDevEvent('REALTIME', eventType, JSON.stringify(payload || {}));

      const newStatus = (payload?.newStatus || payload?.status || 'new').toLowerCase();
      const orderId = payload?.orderId || payload?.updatedOrder?.id || payload?.id || '';
      const tableName = payload?.updatedOrder?.table_name || payload?.tableName || payload?.table_name || 'Table';
      const rawTotal = payload?.updatedOrder?.total || payload?.total;
      const amount = rawTotal ? ('₹' + Number(rawTotal).toLocaleString('en-IN')) : '';

      // 1. Play Audio Chime
      playLiveChime(newStatus);

      // 2. Show Live Activity Banner
      showLiveBanner(tableName, newStatus, amount, orderId);

      // 3. Update Floor Grid
      updateFloorGrid(tableName, newStatus, amount, orderId);

      // 4. Animate Architecture Node & Auto-Center Camera
      pulseArchitectureNodeForStatus(newStatus);

      // 5. Update Recent Orders List
      if (orderId) {
        const existingIdx = recentCompletedOrders.findIndex(o => o.id === orderId);
        const orderObj = {
          id: orderId,
          table_name: tableName,
          status: newStatus,
          total: rawTotal || 0,
          updated_at: new Date().toISOString()
        };
        if (existingIdx !== -1) {
          recentCompletedOrders[existingIdx] = orderObj;
        } else {
          recentCompletedOrders.unshift(orderObj);
          if (recentCompletedOrders.length > 8) recentCompletedOrders.pop();
        }
        renderFloorGrid();
      }
    }

    function onRealtimeTableEvent(rawPayload) {
      const payload = rawPayload?.payload || rawPayload;
      if (!payload) return;
      console.log("Realtime Event", payload);
      logDevEvent('REALTIME', 'table-status-updated', JSON.stringify(payload));
      const tId = payload.tableName || payload.tableId;
      if (!tId) return;

      let matchingTable = liveTables.find(t => 
        t.id.toLowerCase() === tId.toLowerCase() || 
        tId.toLowerCase().includes(t.id.toLowerCase())
      );
      if (matchingTable) {
        matchingTable.status = payload.status || 'available';
        renderFloorGrid();
      }
    }

    // Handles customer journey telemetry: QR scan, cart, checkout, inventory
    function handleSystemEventNodePulse(eventType, ev) {
      if (eventType === 'qr_scanned') {
        const tName = ev?.metadata?.table_name || 'Table';
        showToast(\`📱 QR Scanned at \${tName}\`, 'info');
        playLiveChime('accepted');
        animateNode('cust_qr_scan', 'edge-e_qr_to_menu');
      } else if (eventType === 'cart_updated') {
        showToast(\`🛒 Item Added to Cart\`, 'info');
        animateNode('cust_cart', 'edge-e_menu_to_cart');
      } else if (eventType === 'checkout_started') {
        showToast(\`💳 Checkout Started\`, 'info');
        animateNode('cust_checkout', 'edge-e_cart_to_checkout');
      } else if (eventType === 'order_created') {
        showToast(\`⚡ New Order Placed!\`, 'success');
        playLiveChime('new');
        animateNode('order_new', 'edge-e_placement_to_new');
      } else if (eventType === 'inventory_reserved') {
        animateNode('inv_reservation', 'edge-e_placement_to_inv_res');
      } else if (eventType === 'inventory_consumed') {
        animateNode('inv_consumption', 'edge-e_prep_to_inv_consume');
      }
    }

    function pulseArchitectureNodeForStatus(status) {
      const statusLower = (status || '').toLowerCase();
      let nodeId = 'order_new';
      let edgeId = 'edge-e_placement_to_new';

      if (statusLower === 'accepted') {
        nodeId = 'kds_accept';
        edgeId = 'edge-e_kds_accept_to_order_accepted';
      } else if (statusLower === 'preparing') {
        nodeId = 'kds_preparing';
        edgeId = 'edge-e_kds_prep_to_order_prep';
      } else if (statusLower === 'ready') {
        nodeId = 'kds_ready';
        edgeId = 'edge-e_kds_ready_to_order_ready';
      } else if (statusLower === 'served') {
        nodeId = 'waiter_serve';
        edgeId = 'edge-e_waiter_serve_to_order_served';
      } else if (statusLower === 'completed' || statusLower === 'paid') {
        nodeId = 'bill_settlement';
        edgeId = 'edge-e_payment_to_settle';
      } else if (statusLower === 'cancelled' || statusLower === 'rejected') {
        nodeId = 'order_cancel';
        edgeId = 'edge-e_cancel_to_inv_reversal';
      }

      animateNode(nodeId, edgeId);
    }`;

const startIdx = html.indexOf('function renderFloorGrid()');
const endIdx = html.indexOf('// ─── DEV LOG FILTER HELPER', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  html = html.slice(0, startIdx) + upgradedFloorAndNocBlock + '\n\n    ' + html.slice(endIdx);
  console.log('Successfully replaced FloorGrid & NOC block in HTML (' + startIdx + ' to ' + endIdx + ')');
} else {
  console.error('ERROR: Could not locate block in HTML: startIdx=' + startIdx + ', endIdx=' + endIdx);
}

// 8. Add exit function and ESC key listener
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
if (lastScriptIdx !== -1 && !html.includes('exitControlCenter()')) {
  html = html.slice(0, lastScriptIdx) + exitScript + '\n    ' + html.slice(lastScriptIdx);
}

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully updated public/founder-control-center.html (' + html.length + ' bytes)');
