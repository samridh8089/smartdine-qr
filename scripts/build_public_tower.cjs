const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../docs/smartdine-control-tower-v4.html');
const destPath = path.resolve(__dirname, '../public/founder-control-center.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Add Exit button to toolbar next to dark/light toggle
const exitButtonHtml = `<button class="tool-btn" onclick="exitControlCenter()" title="Exit back to Dashboard (Esc)" style="background:rgba(239,68,68,0.2);border-color:#ef4444;color:#ef4444;font-weight:bold;display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:6px;cursor:pointer;"><span>✕</span> Exit</button>`;
if (!html.includes('exitControlCenter()')) {
  html = html.replace('<button class="tool-btn" onclick="toggleTheme()" title="Toggle Dark/Light">🌓</button>', '<button class="tool-btn" onclick="toggleTheme()" title="Toggle Dark/Light">🌓</button>\n      ' + exitButtonHtml);
}

// 2. Add Top Floating Live Banner right after <header>
const liveBannerHtml = `
  <!-- ─── FLOATING LIVE ACTIVITY HUD BANNER ─── -->
  <div id="live-activity-banner" style="position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:900;background:rgba(15,23,42,0.92);border:1px solid rgba(16,185,129,0.5);box-shadow:0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(16,185,129,0.3);padding:8px 20px;border-radius:24px;display:none;align-items:center;gap:10px;font-size:12px;font-weight:700;backdrop-filter:blur(8px);pointer-events:none;transition:all 0.3s ease;">
    <span class="live-pulse-dot" style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;animation:nodePulseGlow 1s infinite alternate;"></span>
    <span id="live-activity-text" style="color:#f8fafc;font-family:var(--font-mono);">WAITING FOR LIVE PHONE ORDER...</span>
  </div>
`;
if (!html.includes('id="live-activity-banner"')) {
  html = html.replace('</header>', '</header>\n' + liveBannerHtml);
}

// 3. Add Recent Orders Section inside Floor Sidebar Section
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

// 4. Enhance initialization to dynamically support restaurantId, restaurant name, and user role
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

// 5. Upgrade Supabase Live NOC Engine
const upgradedFloorAndNocBlock = `    // ─── AUDIO SYNTHESIZER CHIME ENGINE (WebAudio API) ───
    function playLiveChime(status) {
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
          gain.gain.setValueAtTime(0.2, now);
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1174, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (s === 'accepted') {
          // Double harmony chime
          gain.gain.setValueAtTime(0.18, now);
          osc.frequency.setValueAtTime(587, now);
          osc.frequency.setValueAtTime(880, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.start(now);
          osc.stop(now + 0.32);
        } else if (s === 'preparing') {
          // Warm prep tone
          gain.gain.setValueAtTime(0.18, now);
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(659, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (s === 'ready') {
          // Pass bell ding
          gain.gain.setValueAtTime(0.25, now);
          osc.frequency.setValueAtTime(1046, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (s === 'served') {
          // Service chime
          gain.gain.setValueAtTime(0.18, now);
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.linearRampToValueAtTime(784, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (s === 'completed') {
          // Settlement cash register ding
          gain.gain.setValueAtTime(0.22, now);
          osc.frequency.setValueAtTime(1318, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        }
      } catch (audioErr) {
        console.warn('[NOC Audio] AudioContext notice:', audioErr);
      }
    }

    let recentCompletedOrders = [];

    function renderFloorGrid() {
      const r = RESTAURANTS.find(x => x.id === currentRestaurantId) || RESTAURANTS[0];
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
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.warn('[NOC Realtime] Supabase JS SDK not ready');
        return;
      }
      try {
        liveSupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

        // 1. Load real tenant tables from database
        await loadRealFloorTables();

        // 2. Initial snapshot of active orders from database
        await syncLiveOrdersFromSupabase();

        // 3. Robust Realtime Postgres Changes Subscription
        const pgChannel = liveSupabaseClient.channel(\`founder_pg_\${restId}_\${Date.now()}\`);

        pgChannel
          // Orders Table Insert & Update
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: \`restaurant_id=eq.\${restId}\` }, (p) => {
            logDevEvent('PG_ORDERS', p.eventType, JSON.stringify(p.new || {}));
            if (p.eventType === 'INSERT') {
              const ord = p.new;
              onRealtimeOrderEvent('new-order', {
                newStatus: ord.status || 'new',
                orderId: ord.id,
                tableName: ord.table_name,
                updatedOrder: ord
              });
            } else if (p.eventType === 'UPDATE') {
              const ord = p.new;
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, (p) => {
            logDevEvent('PG_BATCH', p.eventType, JSON.stringify(p.new || {}));
            const b = p.new;
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
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_events', filter: \`restaurant_id=eq.\${restId}\` }, (p) => {
            logDevEvent('SYSTEM_EVENT', p.new?.event_type || 'event', JSON.stringify(p.new || {}));
            if (p.new) {
              handleSystemEventNodePulse(p.new.event_type, p.new);
            }
          })
          .subscribe((status) => {
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
        liveSupabaseClient.channel(\`kds_\${restId}\`)
          .on('broadcast', { event: 'order-status-updated' }, (p) => onRealtimeOrderEvent('order-status-updated', p?.payload || p))
          .on('broadcast', { event: 'new-order' }, (p) => onRealtimeOrderEvent('new-order', p?.payload || p))
          .on('broadcast', { event: 'payment-updated' }, (p) => onRealtimeOrderEvent('payment-updated', p?.payload || p))
          .subscribe();

        liveSupabaseClient.channel(\`live_orders_\${restId}\`)
          .on('broadcast', { event: 'order-status-updated' }, (p) => onRealtimeOrderEvent('order-status-updated', p?.payload || p))
          .on('broadcast', { event: 'new-order' }, (p) => onRealtimeOrderEvent('new-order', p?.payload || p))
          .subscribe();

        liveSupabaseClient.channel(\`tables_\${restId}\`)
          .on('broadcast', { event: 'table-status-updated' }, (p) => onRealtimeTableEvent(p?.payload || p))
          .subscribe();

        liveSupabaseClient.channel(\`founder_events_\${restId}\`)
          .on('broadcast', { event: '*' }, (p) => {
            const evData = p?.payload || p;
            logDevEvent('FOUNDER_BUS', p.event, JSON.stringify(evData));
            if (evData && evData.eventType) {
              handleSystemEventNodePulse(evData.eventType, evData);
            }
          })
          .subscribe();

        // 5. Periodic 2.5-Second Background Auto-Sync
        setInterval(() => {
          syncLiveOrdersFromSupabase();
        }, 2500);

      } catch (err) {
        console.warn('[NOC Realtime] Init error:', err);
      }
    }

    async function syncLiveOrdersFromSupabase() {
      if (!liveSupabaseClient) return;
      try {
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
        
        // Fetch active orders and 5 most recent orders in parallel
        const [activeRes, recentRes] = await Promise.all([
          liveSupabaseClient
            .from('orders')
            .select('id, table_name, table_id, status, total, order_batches(id, status)')
            .eq('restaurant_id', restId)
            .not('status', 'in', '(completed,cancelled)'),
          liveSupabaseClient
            .from('orders')
            .select('id, table_name, table_id, status, total, created_at, updated_at')
            .eq('restaurant_id', restId)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        const activeOrders = activeRes.data || [];
        recentCompletedOrders = recentRes.data || [];

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
      logDevEvent('REALTIME', eventType, JSON.stringify(payload || {}));

      const newStatus = payload?.newStatus || payload?.status || 'new';
      const orderId = payload?.orderId || payload?.updatedOrder?.id || '';
      const tableName = payload?.updatedOrder?.table_name || payload?.tableName || 'Table';
      const amount = payload?.updatedOrder?.total ? ('₹' + Number(payload.updatedOrder.total).toLocaleString('en-IN')) : '';

      // Play audio chime for live feedback
      playLiveChime(newStatus);

      // Show toast
      showToast(\`⚡ Live Order Event: \${tableName} ➔ \${newStatus.toUpperCase()} \${amount ? '(' + amount + ')' : ''}\`, 'info');

      // Update Top Floating Activity Banner
      const banner = document.getElementById('live-activity-banner');
      const bannerText = document.getElementById('live-activity-text');
      if (banner && bannerText) {
        bannerText.innerHTML = \`⚡ <strong>LIVE EVENT:</strong> [\${tableName}] Order #\${(orderId||'').slice(0,8)} ➔ <span style="color:#10b981;text-transform:uppercase;">\${newStatus}</span> \${amount ? '• ' + amount : ''}\`;
        banner.style.display = 'inline-flex';
        banner.style.borderColor = '#10b981';
        setTimeout(() => {
          if (banner) banner.style.borderColor = 'rgba(16,185,129,0.5)';
        }, 3000);
      }

      // Update Live Floor card dynamically
      if (tableName) {
        let matchingTable = liveTables.find(t => 
          t.id.toLowerCase() === tableName.toLowerCase() || 
          tableName.toLowerCase().includes(t.id.toLowerCase())
        );

        if (!matchingTable && tableName) {
          matchingTable = {
            id: tableName,
            type: 'Dine In',
            seats: 4,
            status: 'available',
            orderId: '',
            amount: ''
          };
          liveTables.push(matchingTable);
        }

        if (matchingTable) {
          matchingTable.status = (newStatus === 'completed' || newStatus === 'cancelled') ? 'available' : newStatus;
          if (amount) {
            matchingTable.amount = amount;
          }
          matchingTable.orderId = (newStatus === 'completed' || newStatus === 'cancelled') ? '' : orderId;
          renderFloorGrid();
        }
      }

      // Pulse corresponding node on the architecture diagram!
      pulseArchitectureNodeForStatus(newStatus);
    }

    function onRealtimeTableEvent(rawPayload) {
      const payload = rawPayload?.payload || rawPayload;
      if (!payload) return;
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
        pulseArchitectureNodes(['cust_qr_scan', 'cust_menu'], 'edge-e_qr_to_menu');
      } else if (eventType === 'cart_updated') {
        showToast(\`🛒 Item Added to Cart\`, 'info');
        pulseArchitectureNodes(['cust_cart'], 'edge-e_menu_to_cart');
      } else if (eventType === 'checkout_started') {
        showToast(\`💳 Checkout Started\`, 'info');
        pulseArchitectureNodes(['cust_checkout'], 'edge-e_cart_to_checkout');
      } else if (eventType === 'order_created') {
        showToast(\`⚡ New Order Placed!\`, 'success');
        playLiveChime('new');
        pulseArchitectureNodes(['cust_order_placement', 'order_new'], 'edge-e_placement_to_new');
      } else if (eventType === 'inventory_reserved') {
        pulseArchitectureNodes(['inv_reservation'], 'edge-e_placement_to_inv_res');
      } else if (eventType === 'inventory_consumed') {
        pulseArchitectureNodes(['inv_consumption'], 'edge-e_prep_to_inv_consume');
      }
    }

    function pulseArchitectureNodeForStatus(status) {
      const statusLower = (status || '').toLowerCase();
      let nodeIds = ['order_new'];
      let edgeId = 'edge-e_placement_to_new';

      if (statusLower === 'accepted') {
        nodeIds = ['kds_accept', 'order_accepted', 'inv_reservation'];
        edgeId = 'edge-e_kds_accept_to_order_accepted';
      } else if (statusLower === 'preparing') {
        nodeIds = ['kds_preparing', 'order_preparing', 'inv_consumption'];
        edgeId = 'edge-e_kds_prep_to_order_prep';
      } else if (statusLower === 'ready') {
        nodeIds = ['kds_ready', 'order_ready'];
        edgeId = 'edge-e_kds_ready_to_order_ready';
      } else if (statusLower === 'served') {
        nodeIds = ['waiter_serve', 'order_served'];
        edgeId = 'edge-e_waiter_serve_to_order_served';
      } else if (statusLower === 'completed' || statusLower === 'paid') {
        nodeIds = ['bill_generation', 'bill_payment', 'bill_settlement'];
        edgeId = 'edge-e_payment_to_settle';
      } else if (statusLower === 'cancelled' || statusLower === 'rejected') {
        nodeIds = ['order_cancel', 'inv_reversal'];
        edgeId = 'edge-e_cancel_to_inv_reversal';
      }

      pulseArchitectureNodes(nodeIds, edgeId);
    }

    function pulseArchitectureNodes(nodeIds, edgeId) {
      if (!nodeIds || nodeIds.length === 0) return;
      centerOnNode(nodeIds[0], 1.35);

      document.querySelectorAll('.node-group').forEach(g => g.classList.remove('flow-active'));
      document.querySelectorAll('.edge-path').forEach(ep => ep.classList.remove('flow-active'));

      const activeEls = [];
      nodeIds.forEach(id => {
        const el = document.getElementById('node-' + id);
        if (el) {
          el.classList.add('flow-active');
          activeEls.push(el);
        }
      });

      let edgeEl = null;
      if (edgeId) {
        edgeEl = document.getElementById(edgeId);
        if (edgeEl) edgeEl.classList.add('flow-active');
      }

      setTimeout(() => {
        activeEls.forEach(el => el.classList.remove('flow-active'));
        if (edgeEl) edgeEl.classList.remove('flow-active');
      }, 5000);
    }`;

const startIdx = html.indexOf('function renderFloorGrid()');
const endIdx = html.indexOf('// ─── DEV LOG FILTER HELPER', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  html = html.slice(0, startIdx) + upgradedFloorAndNocBlock + '\n\n    ' + html.slice(endIdx);
  console.log('Successfully replaced FloorGrid & NOC block in HTML (' + startIdx + ' to ' + endIdx + ')');
} else {
  console.error('ERROR: Could not locate block in HTML: startIdx=' + startIdx + ', endIdx=' + endIdx);
}

// 6. Add exit function and ESC key listener
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
