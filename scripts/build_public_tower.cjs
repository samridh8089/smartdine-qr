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
}

// 3. Upgrade Supabase Live NOC engine to support:
// - Real DB tables loading (maharaja, table 5, etc.)
// - postgres_changes on orders, order_batches, system_events, tables
// - broadcast events on kds, live_orders, tables, founder_events
// - periodic 3-second auto-poll fallback
// - multi-step node pulse animations for QR scan, cart, checkout, new, accepted, preparing, ready, served, completed

const originalNocBlock = `    async function initSupabaseLiveNoc() {
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.warn('[NOC Realtime] Supabase JS SDK not ready');
        return;
      }
      try {
        liveSupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

        // 1. Initial snapshot of active orders from database
        await syncLiveOrdersFromSupabase();

        // 2. Subscribe to KDS broadcast channel
        const ch = liveSupabaseClient.channel(\`kds_\${restId}\`);
        ch.on('broadcast', { event: 'order-status-updated' }, (payload) => {
          onRealtimeOrderEvent('order-status-updated', payload?.payload);
        })
        .on('broadcast', { event: 'new-order' }, (payload) => {
          onRealtimeOrderEvent('new-order', payload?.payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            const badge = document.querySelector('.noc-badge');
            if (badge) {
              badge.innerText = 'REALTIME LIVE';
              badge.style.background = '#10b981';
            }
            showToast('🟢 Live Supabase Realtime Connected', 'success');
            logDevEvent('REALTIME', 'CONNECTED', \`Listening to kds_\${restId}\`);
          }
        });

        // 3. Subscribe to live orders & tables channels
        liveSupabaseClient.channel(\`live_orders_\${restId}\`)
          .on('broadcast', { event: 'order-status-updated' }, (p) => onRealtimeOrderEvent('order-status-updated', p?.payload))
          .on('broadcast', { event: 'new-order' }, (p) => onRealtimeOrderEvent('new-order', p?.payload))
          .subscribe();

        liveSupabaseClient.channel(\`tables_\${restId}\`)
          .on('broadcast', { event: 'table-status-updated' }, (p) => onRealtimeTableEvent(p?.payload))
          .subscribe();

      } catch (err) {
        console.warn('[NOC Realtime] Init error:', err);
      }
    }

    async function syncLiveOrdersFromSupabase() {
      if (!liveSupabaseClient) return;
      try {
        const { data: activeOrders } = await liveSupabaseClient
          .from('orders')
          .select('id, table_name, status, total, order_batches(id, status)')
          .eq('restaurant_id', currentRestaurantId)
          .not('status', 'in', '(completed,cancelled)');

        if (activeOrders && activeOrders.length > 0) {
          activeOrders.forEach(ord => {
            const tName = (ord.table_name || '').trim();
            const matchingTable = liveTables.find(t => 
              t.id.toLowerCase() === tName.toLowerCase() || 
              tName.toLowerCase().includes(t.id.toLowerCase())
            );
            if (matchingTable) {
              matchingTable.status = ord.status === 'new' ? 'occupied' : ord.status;
              matchingTable.orderId = ord.id;
              matchingTable.amount = '₹' + Number(ord.total || 0).toLocaleString('en-IN');
            }
          });
          renderFloorGrid();
        }
      } catch (e) {
        console.warn('[NOC Sync] Error syncing active orders:', e);
      }
    }

    function onRealtimeOrderEvent(eventType, payload) {
      logDevEvent('REALTIME', eventType, JSON.stringify(payload || {}));
      const newStatus = payload?.newStatus || 'new';
      const orderId = payload?.orderId || payload?.updatedOrder?.id || '';
      const tableName = payload?.updatedOrder?.table_name || 'T-10';

      showToast(\`⚡ Realtime Event: \${tableName} ➔ \${newStatus.toUpperCase()}\`, 'info');

      // Update Live Floor card
      const matchingTable = liveTables.find(t => 
        t.id.toLowerCase() === tableName.toLowerCase() || 
        tableName.toLowerCase().includes(t.id.toLowerCase())
      );
      if (matchingTable) {
        matchingTable.status = newStatus === 'completed' ? 'available' : newStatus;
        if (payload?.updatedOrder?.total) {
          matchingTable.amount = '₹' + Number(payload.updatedOrder.total).toLocaleString('en-IN');
        }
        matchingTable.orderId = orderId;
        renderFloorGrid();
      }

      // Pulse corresponding node on the architecture diagram!
      pulseArchitectureNodeForStatus(newStatus);
    }

    function onRealtimeTableEvent(payload) {
      if (!payload) return;
      logDevEvent('REALTIME', 'table-status-updated', JSON.stringify(payload));
      const tId = payload.tableName || payload.tableId;
      const matchingTable = liveTables.find(t => t.id === tId);
      if (matchingTable) {
        matchingTable.status = payload.status || 'available';
        renderFloorGrid();
      }
    }

    function pulseArchitectureNodeForStatus(status) {
      let targetNodeId = 'order_new';
      let edgeId = 'edge-e_placement_to_new';

      if (status === 'accepted') {
        targetNodeId = 'order_accepted';
        edgeId = 'edge-e_kds_accept_to_order_accepted';
      } else if (status === 'preparing') {
        targetNodeId = 'order_preparing';
        edgeId = 'edge-e_kds_prep_to_order_prep';
      } else if (status === 'ready') {
        targetNodeId = 'order_ready';
        edgeId = 'edge-e_kds_ready_to_order_ready';
      } else if (status === 'served') {
        targetNodeId = 'order_served';
        edgeId = 'edge-e_waiter_serve_to_order_served';
      } else if (status === 'completed') {
        targetNodeId = 'bill_settlement';
        edgeId = 'edge-e_payment_to_settle';
      }

      centerOnNode(targetNodeId, 1.35);

      document.querySelectorAll('.node-group').forEach(g => g.classList.remove('flow-active'));
      document.querySelectorAll('.edge-path').forEach(ep => ep.classList.remove('flow-active'));

      const nodeEl = document.getElementById('node-' + targetNodeId);
      if (nodeEl) nodeEl.classList.add('flow-active');

      if (edgeId) {
        const edgeEl = document.getElementById(edgeId);
        if (edgeEl) edgeEl.classList.add('flow-active');
      }

      // Auto clear pulse after 4.5s
      setTimeout(() => {
        if (nodeEl) nodeEl.classList.remove('flow-active');
        if (edgeId) {
          const edgeEl = document.getElementById(edgeId);
          if (edgeEl) edgeEl.classList.remove('flow-active');
        }
      }, 4500);
    }`;

const upgradedNocBlock = `    // ─── UPGRADED HIGH-RESILIENT SUPABASE LIVE NOC ENGINE ───
    async function loadRealFloorTables() {
      if (!liveSupabaseClient) return;
      try {
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
        const { data: dbTables, error } = await liveSupabaseClient
          .from('tables')
          .select('id, name, table_number, status, capacity')
          .eq('restaurant_id', restId);

        if (dbTables && dbTables.length > 0) {
          liveTables = dbTables.map((t, idx) => ({
            id: t.name || \`T-\${t.table_number || idx + 1}\`,
            tableId: t.id,
            type: 'Dine In',
            seats: t.capacity || 4,
            status: t.status || 'available',
            orderId: '',
            amount: ''
          }));
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
                updatedOrder: ord
              });
            } else if (p.eventType === 'UPDATE') {
              const ord = p.new;
              onRealtimeOrderEvent('order-status-updated', {
                newStatus: ord.status,
                orderId: ord.id,
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
          // Tables Floor Plan Sync
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: \`restaurant_id=eq.\${restId}\` }, (p) => {
            logDevEvent('PG_TABLES', p.eventType, JSON.stringify(p.new || {}));
            if (p.new) {
              onRealtimeTableEvent({
                tableId: p.new.id,
                tableName: p.new.name,
                status: p.new.status
              });
            }
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

        // 5. Periodic 3-Second Background Auto-Sync
        setInterval(() => {
          syncLiveOrdersFromSupabase();
        }, 3000);

      } catch (err) {
        console.warn('[NOC Realtime] Init error:', err);
      }
    }

    async function syncLiveOrdersFromSupabase() {
      if (!liveSupabaseClient) return;
      try {
        const restId = currentRestaurantId || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
        const { data: activeOrders } = await liveSupabaseClient
          .from('orders')
          .select('id, table_name, table_id, status, total, order_batches(id, status)')
          .eq('restaurant_id', restId)
          .not('status', 'in', '(completed,cancelled)');

        // Reset tables to available first if they don't have active orders
        const activeTableNames = new Set();

        if (activeOrders && activeOrders.length > 0) {
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

      showToast(\`⚡ Order Event: \${tableName} ➔ \${newStatus.toUpperCase()}\`, 'info');

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
          if (payload?.updatedOrder?.total) {
            matchingTable.amount = '₹' + Number(payload.updatedOrder.total).toLocaleString('en-IN');
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
        pulseArchitectureNodes(['cust_qr_scan', 'cust_menu'], 'edge-e_qr_to_menu');
      } else if (eventType === 'cart_updated') {
        showToast(\`🛒 Item Added to Cart\`, 'info');
        pulseArchitectureNodes(['cust_cart'], 'edge-e_menu_to_cart');
      } else if (eventType === 'checkout_started') {
        showToast(\`💳 Checkout Started\`, 'info');
        pulseArchitectureNodes(['cust_checkout'], 'edge-e_cart_to_checkout');
      } else if (eventType === 'order_created') {
        showToast(\`⚡ New Order Placed!\`, 'success');
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
        nodeIds = ['kds_accept', 'order_accepted'];
        edgeId = 'edge-e_kds_accept_to_order_accepted';
      } else if (statusLower === 'preparing') {
        nodeIds = ['kds_preparing', 'order_preparing', 'inv_consumption'];
        edgeId = 'edge-e_kds_prep_to_order_prep';
      } else if (statusLower === 'ready') {
        nodeIds = ['kds_ready', 'order_ready', 'notif_waiter_alerts'];
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

if (html.includes(originalNocBlock)) {
  html = html.replace(originalNocBlock, upgradedNocBlock);
  console.log('Successfully replaced originalNocBlock with upgradedNocBlock');
} else {
  console.warn('Warning: exact originalNocBlock not matched, trying sliced replacement');
  const startIdx = html.indexOf('async function initSupabaseLiveNoc()');
  const endIdx = html.indexOf('// ─── DEV LOG FILTER HELPER', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    html = html.slice(0, startIdx) + upgradedNocBlock + '\n\n    ' + html.slice(endIdx);
    console.log('Successfully replaced sliced NOC block');
  } else {
    console.error('ERROR: Could not locate NOC block in HTML');
  }
}

// 4. Add exit function and ESC key listener
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
