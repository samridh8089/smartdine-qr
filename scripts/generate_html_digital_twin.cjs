/**
 * scripts/generate_html_digital_twin.cjs
 * 
 * Generates docs/smartdine-master-system.html from the master JSON
 */

const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '../docs');
const jsonPath = path.join(docsDir, 'smartdine-master-system.json');
const htmlPath = path.join(docsDir, 'smartdine-master-system.html');

if (!fs.existsSync(jsonPath)) {
  console.error('[ERROR] master JSON not found. Run scripts/build_digital_twin.cjs first.');
  process.exit(1);
}

const masterData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const { modules, nodes, edges, metrics } = masterData;

console.log(`[HTML Generator] Loaded ${nodes.length} nodes and ${edges.length} edges.`);

// Canvas bounds
const CANVAS_WIDTH = 5400;
const CANVAS_HEIGHT = 4000;
const NODE_W = 220;
const NODE_H = 76;

// Module Box Layout specs
const MODULE_LAYOUTS = {
  customer_layer:        { x: 80,   y: 100,  w: 960,  h: 820, cols: 3 },
  order_engine:          { x: 1100, y: 100,  w: 1300, h: 820, cols: 4 },
  kitchen_kds:           { x: 2460, y: 100,  w: 1320, h: 820, cols: 4 },
  waiter_system:         { x: 3840, y: 100,  w: 1460, h: 820, cols: 4 },

  inventory_engine:      { x: 80,   y: 980,  w: 1320, h: 840, cols: 4 },
  notifications_service: { x: 1460, y: 980,  w: 1150, h: 840, cols: 3 },
  offline_engine:        { x: 2670, y: 980,  w: 1150, h: 840, cols: 3 },
  billing_system:        { x: 3880, y: 980,  w: 1420, h: 840, cols: 4 },

  owner_dashboard:       { x: 80,   y: 1880, w: 1320, h: 840, cols: 4 },
  reports_analytics:     { x: 1460, y: 1880, w: 1150, h: 840, cols: 3 },
  audit_system:          { x: 2670, y: 1880, w: 1150, h: 840, cols: 3 },
  auth_security:         { x: 3880, y: 1880, w: 1420, h: 840, cols: 4 },

  infrastructure_layer:  { x: 80,   y: 2780, w: 5220, h: 480, cols: 7 }
};

// Position nodes inside modules
const nodePosMap = new Map();
const nodesByModule = new Map();

nodes.forEach(n => {
  if (!nodesByModule.has(n.module)) nodesByModule.set(n.module, []);
  nodesByModule.get(n.module).push(n);
});

modules.forEach(mod => {
  const layout = MODULE_LAYOUTS[mod.id] || { x: 100, y: 100, w: 800, h: 600, cols: 3 };
  const modNodes = nodesByModule.get(mod.id) || [];
  const padX = 40;
  const padY = 80;
  const colWidth = (layout.w - padX * 2) / layout.cols;
  const rowHeight = 125;

  modNodes.forEach((node, idx) => {
    const col = idx % layout.cols;
    const row = Math.floor(idx / layout.cols);
    const nx = layout.x + padX + col * colWidth + (colWidth - NODE_W) / 2;
    const ny = layout.y + padY + row * rowHeight;
    nodePosMap.set(node.id, {
      x: Math.round(nx),
      y: Math.round(ny),
      cx: Math.round(nx + NODE_W / 2),
      cy: Math.round(ny + NODE_H / 2)
    });
  });
});

function computePath(fromNodeId, toNodeId) {
  const p1 = nodePosMap.get(fromNodeId);
  const p2 = nodePosMap.get(toNodeId);
  if (!p1 || !p2) return '';

  const dx = p2.cx - p1.cx;
  const dy = p2.cy - p1.cy;

  let sx, sy, tx, ty;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      sx = p1.x + NODE_W; sy = p1.cy;
      tx = p2.x;          ty = p2.cy;
    } else {
      sx = p1.x;          sy = p1.cy;
      tx = p2.x + NODE_W; ty = p2.cy;
    }
  } else {
    if (dy > 0) {
      sx = p1.cx; sy = p1.y + NODE_H;
      tx = p2.cx; ty = p2.y;
    } else {
      sx = p1.cx; sy = p1.y;
      tx = p2.cx; ty = p2.y + NODE_H;
    }
  }

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  return 'M ' + sx + ' ' + sy + ' C ' + mx + ' ' + sy + ', ' + mx + ' ' + ty + ', ' + tx + ' ' + ty;
}

// Build SVG parts
const modulesSvg = modules.map(mod => {
  const l = MODULE_LAYOUTS[mod.id];
  if (!l) return '';
  return '<g id="mod-group-' + mod.id + '" class="module-container">' +
    '<rect class="module-box" x="' + l.x + '" y="' + l.y + '" width="' + l.w + '" height="' + l.h + '" style="stroke:' + mod.color + ';" />' +
    '<text class="module-label" x="' + (l.x + 24) + '" y="' + (l.y + 36) + '">' + mod.name + '</text>' +
    '<text class="module-badge" x="' + (l.x + l.w - 140) + '" y="' + (l.y + 36) + '" onclick="toggleModule(\'' + mod.id + '\')">[Toggle Module]</text>' +
    '</g>';
}).join('\n');

const edgesSvg = edges.map(e => {
  const d = computePath(e.from, e.to);
  return '<path id="edge-' + e.id + '" class="edge-path ' + e.type + '" d="' + d + '" marker-end="url(#arrow-' + e.type + ')" ' +
    'onclick="selectEdge(\'' + e.id + '\')" data-from="' + e.from + '" data-to="' + e.to + '">' +
    '<title>' + e.label + '</title>' +
    '</path>';
}).join('\n');

const nodesSvg = nodes.map(n => {
  const pos = nodePosMap.get(n.id);
  if (!pos) return '';
  const mod = modules.find(m => m.id === n.module) || { color: '#64748b' };
  const baseFile = path.basename(n.filePath || '');
  const tagText = n.functionName ? n.functionName.substring(0, 24) : n.type;
  return '<g id="node-' + n.id + '" class="node-group" transform="translate(' + pos.x + ', ' + pos.y + ')" onclick="selectNode(\'' + n.id + '\')">' +
    '<rect class="node-rect" width="' + NODE_W + '" height="' + NODE_H + '" />' +
    '<rect class="node-type-stripe" width="6" height="' + NODE_H + '" fill="' + mod.color + '" />' +
    '<text class="node-title" x="14" y="24">' + n.label.substring(0, 22) + '</text>' +
    '<text class="node-file" x="14" y="44">' + baseFile + '</text>' +
    '<text class="node-tag" x="14" y="62">' + tagText + '</text>' +
    '</g>';
}).join('\n');

const minimapModulesSvg = modules.map(mod => {
  const l = MODULE_LAYOUTS[mod.id];
  if (!l) return '';
  return '<rect x="' + l.x + '" y="' + l.y + '" width="' + l.w + '" height="' + l.h + '" fill="' + mod.color + '" opacity="0.3" />';
}).join('\n');

// Styles and client scripts
const styles = `
    :root {
      --bg-primary: #090d16;
      --bg-secondary: #0f172a;
      --bg-card: #1e293b;
      --bg-card-hover: #27354f;
      --border-color: #334155;
      --border-focus: #38bdf8;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-main: #f59e0b;
      --accent-data: #10b981;
      --accent-realtime: #8b5cf6;
      --accent-security: #06b6d4;
      --accent-audit: #64748b;
      --accent-alternate: #f43f5e;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    [data-theme="light"] {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-card: #ffffff;
      --bg-card-hover: #f1f5f9;
      --border-color: #e2e8f0;
      --border-focus: #0284c7;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --accent-main: #d97706;
      --accent-data: #059669;
      --accent-realtime: #7c3aed;
      --accent-security: #0891b2;
      --accent-audit: #475569;
      --accent-alternate: #e11d48;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    header {
      height: 60px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: white;
      font-size: 16px;
      letter-spacing: -1px;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .simulation-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sim-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .sim-btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-focus);
      transform: translateY(-1px);
    }

    .sim-btn.primary {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #ffffff;
      border: none;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }

    .tool-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-input {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      width: 180px;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      width: 240px;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s ease;
    }

    .icon-btn:hover {
      color: var(--text-primary);
      background: var(--bg-card-hover);
      border-color: var(--border-focus);
    }

    .workspace {
      position: relative;
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .side-panel-left {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      z-index: 50;
    }

    .panel-header {
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metrics-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .metric-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .metric-value {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .metric-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseAnimation 1.5s infinite;
    }

    @keyframes pulseAnimation {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .canvas-container {
      flex: 1;
      position: relative;
      background-color: var(--bg-primary);
      background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
      background-size: 24px 24px;
      overflow: hidden;
      cursor: grab;
    }

    .canvas-container:active {
      cursor: grabbing;
    }

    #master-svg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
    }

    .module-box {
      fill: var(--bg-secondary);
      fill-opacity: 0.65;
      stroke: var(--border-color);
      stroke-width: 1.5;
      rx: 16;
      transition: all 0.3s ease;
    }

    .module-label {
      font-size: 15px;
      font-weight: 800;
      fill: var(--text-primary);
      letter-spacing: -0.2px;
    }

    .module-badge {
      font-size: 11px;
      font-weight: 600;
      fill: var(--text-muted);
      cursor: pointer;
    }

    .module-badge:hover {
      fill: var(--border-focus);
    }

    .node-group {
      cursor: pointer;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .node-group:hover .node-rect {
      fill: var(--bg-card-hover);
      stroke: var(--border-focus);
      stroke-width: 2;
      filter: drop-shadow(0 6px 16px rgba(56, 189, 248, 0.25));
    }

    .node-rect {
      fill: var(--bg-card);
      stroke: var(--border-color);
      stroke-width: 1.2;
      rx: 10;
      transition: all 0.2s ease;
    }

    .node-type-stripe {
      rx: 10;
    }

    .node-title {
      font-size: 12px;
      font-weight: 700;
      fill: var(--text-primary);
    }

    .node-file {
      font-size: 10px;
      font-family: var(--font-mono);
      fill: var(--text-muted);
    }

    .node-tag {
      font-size: 9px;
      font-weight: 600;
      fill: var(--text-secondary);
    }

    .edge-path {
      fill: none;
      stroke-width: 1.8;
      cursor: pointer;
      transition: stroke-width 0.2s, stroke 0.2s;
    }

    .edge-path:hover {
      stroke-width: 3.5 !important;
      filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.8));
    }

    .edge-path.main { stroke: var(--accent-main); }
    .edge-path.data { stroke: var(--accent-data); stroke-dasharray: 4, 3; }
    .edge-path.realtime { stroke: var(--accent-realtime); stroke-dasharray: 6, 3; }
    .edge-path.security { stroke: var(--accent-security); }
    .edge-path.audit { stroke: var(--accent-audit); stroke-dasharray: 2, 3; }
    .edge-path.alternate { stroke: var(--accent-alternate); stroke-dasharray: 5, 4; }

    .flow-particle {
      fill: #ffffff;
      stroke: #f59e0b;
      stroke-width: 2.5;
      filter: drop-shadow(0 0 10px #f59e0b) drop-shadow(0 0 20px #ef4444);
      pointer-events: none;
    }

    .side-panel-right {
      width: 300px;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      z-index: 50;
    }

    .timeline-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .timeline-item {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-left: 3px solid #3b82f6;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .timeline-item:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-focus);
      transform: translateX(2px);
    }

    .timeline-time {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
    }

    .timeline-title {
      font-weight: 700;
      color: var(--text-primary);
    }

    .timeline-detail {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .inspector-drawer {
      position: absolute;
      bottom: 20px;
      left: 280px;
      right: 320px;
      max-height: 280px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-focus);
      border-radius: 12px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.4);
      z-index: 80;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .inspector-header {
      padding: 10px 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .inspector-title {
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .inspector-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      padding: 14px 16px;
      overflow-y: auto;
      font-size: 11px;
    }

    .inspector-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--bg-card);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }

    .field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .field-value {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-primary);
      word-break: break-all;
    }

    .mini-map-box {
      position: absolute;
      bottom: 20px;
      right: 320px;
      width: 180px;
      height: 135px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      z-index: 60;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }

    #minimap-svg {
      width: 100%;
      height: 100%;
    }

    .minimap-view-rect {
      fill: rgba(56, 189, 248, 0.15);
      stroke: var(--border-focus);
      stroke-width: 1.5;
    }

    body.presentation-mode header,
    body.presentation-mode .side-panel-left,
    body.presentation-mode .side-panel-right,
    body.presentation-mode .mini-map-box {
      display: none !important;
    }
`;

const clientJs = `
    const NODES = ${JSON.stringify(nodes)};
    const EDGES = ${JSON.stringify(edges)};
    const MODULES = ${JSON.stringify(modules)};

    const nodeMap = new Map(NODES.map(n => [n.id, n]));
    const edgeMap = new Map(EDGES.map(e => [e.id, e]));

    const container = document.getElementById('canvas-container');
    const svg = document.getElementById('master-svg');
    const minimapView = document.getElementById('minimap-view');

    let scale = 0.35;
    let pointX = 60;
    let pointY = 40;
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
      svg.style.transform = 'translate(' + pointX + 'px, ' + pointY + 'px) scale(' + scale + ')';
      const cw = container.clientWidth / scale;
      const ch = container.clientHeight / scale;
      minimapView.setAttribute('x', Math.max(0, -pointX / scale));
      minimapView.setAttribute('y', Math.max(0, -pointY / scale));
      minimapView.setAttribute('width', Math.min(${CANVAS_WIDTH}, cw));
      minimapView.setAttribute('height', Math.min(${CANVAS_HEIGHT}, ch));
    }

    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.node-group') || e.target.closest('.edge-path') || e.target.closest('.inspector-drawer')) return;
      isPanning = true;
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      pointX = e.clientX - startX;
      pointY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => { isPanning = false; });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const xs = (e.clientX - pointX) / scale;
      const ys = (e.clientY - pointY) / scale;
      const delta = -e.deltaY;
      if (delta > 0) scale *= 1.15;
      else scale /= 1.15;
      scale = Math.min(Math.max(0.15, scale), 2.5);
      pointX = e.clientX - xs * scale;
      pointY = e.clientY - ys * scale;
      updateTransform();
    });

    function zoom(factor) {
      const cx = container.clientWidth / 2;
      const cy = container.clientHeight / 2;
      const xs = (cx - pointX) / scale;
      const ys = (cy - pointY) / scale;
      scale = Math.min(Math.max(0.15, scale * factor), 2.5);
      pointX = cx - xs * scale;
      pointY = cy - ys * scale;
      updateTransform();
    }

    function resetView() {
      scale = 0.35;
      pointX = 60;
      pointY = 40;
      updateTransform();
    }

    function focusNode(nodeId) {
      const nodeEl = document.getElementById('node-' + nodeId);
      if (!nodeEl) return;
      const bbox = nodeEl.getBBox();
      const cx = container.clientWidth / 2;
      const cy = container.clientHeight / 2;
      scale = 0.95;
      pointX = cx - (bbox.x + bbox.width / 2) * scale;
      pointY = cy - (bbox.y + bbox.height / 2) * scale;
      updateTransform();
      selectNode(nodeId);
    }

    const inspector = document.getElementById('inspector');
    const inspTitle = document.getElementById('insp-title');
    const inspContent = document.getElementById('insp-content');

    function closeInspector() {
      inspector.style.display = 'none';
      clearHighlights();
    }

    function selectEdge(edgeId) {
      const edge = edgeMap.get(edgeId);
      if (!edge) return;
      highlightEdge(edgeId);

      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);

      inspTitle.innerHTML = '🔗 Connection: <span style="color:#f59e0b">' + (fromNode ? fromNode.label : edge.from) + '</span> → <span style="color:#10b981">' + (toNode ? toNode.label : edge.to) + '</span>';
      inspContent.innerHTML = 
        '<div class="inspector-field"><span class="field-label">File Path</span><span class="field-value">' + (edge.filePath || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Calling Function</span><span class="field-value">' + (edge.callingFunction || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Called Function</span><span class="field-value">' + (edge.calledFunction || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">API Route</span><span class="field-value">' + (edge.apiRoute || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Database Table</span><span class="field-value">' + (edge.databaseTable || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Realtime Channel</span><span class="field-value">' + (edge.realtimeChannel || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Audit Event</span><span class="field-value">' + (edge.auditEvent || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Idempotency Key</span><span class="field-value">' + (edge.idempotencyKey || 'N/A') + '</span></div>';
      inspector.style.display = 'flex';
    }

    function selectNode(nodeId) {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      highlightNode(nodeId);

      inspTitle.innerHTML = '📦 Node: <span style="color:#38bdf8">' + node.label + '</span> (' + node.module + ')';
      inspContent.innerHTML = 
        '<div class="inspector-field"><span class="field-label">File Path</span><span class="field-value">' + node.filePath + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Function Name</span><span class="field-value">' + node.functionName + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">API Route</span><span class="field-value">' + (node.apiRoute || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Database Table</span><span class="field-value">' + (node.databaseTable || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Event Trigger</span><span class="field-value">' + (node.trigger || 'N/A') + '</span></div>' +
        '<div class="inspector-field"><span class="field-label">Realtime Channel</span><span class="field-value">' + (node.realtimeChannel || 'N/A') + '</span></div>' +
        '<div class="inspector-field" style="grid-column: span 2;"><span class="field-label">Technical Description</span><span class="field-value" style="font-family:var(--font-sans);">' + node.description + '</span></div>';
      inspector.style.display = 'flex';
    }

    function clearHighlights() {
      document.querySelectorAll('.node-rect').forEach(r => r.style.stroke = '');
      document.querySelectorAll('.edge-path').forEach(p => p.style.strokeWidth = '');
    }

    function highlightEdge(edgeId) {
      clearHighlights();
      const p = document.getElementById('edge-' + edgeId);
      if (p) p.style.strokeWidth = '4.5px';
    }

    function highlightNode(nodeId) {
      clearHighlights();
      const nodeEl = document.getElementById('node-' + nodeId);
      if (nodeEl) {
        const r = nodeEl.querySelector('.node-rect');
        if (r) r.style.stroke = '#38bdf8';
      }
    }

    function onSearch(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        document.querySelectorAll('.node-group').forEach(n => n.style.opacity = '1');
        return;
      }
      let firstMatch = null;
      NODES.forEach(n => {
        const match = n.label.toLowerCase().includes(q) ||
                      n.id.toLowerCase().includes(q) ||
                      (n.databaseTable && n.databaseTable.toLowerCase().includes(q)) ||
                      (n.apiRoute && n.apiRoute.toLowerCase().includes(q)) ||
                      (n.functionName && n.functionName.toLowerCase().includes(q));
        const el = document.getElementById('node-' + n.id);
        if (el) el.style.opacity = match ? '1' : '0.15';
        if (match && !firstMatch) firstMatch = n.id;
      });
      if (firstMatch) focusNode(firstMatch);
    }

    let isSimulating = false;
    const packet = document.getElementById('flow-packet');
    const timelineList = document.getElementById('timeline-list');

    const FLOW_PATHS = {
      full: [
        'cust_qr_scan', 'cust_menu', 'cust_cart', 'cust_checkout', 'cust_order_placement',
        'order_new', 'kds_dashboard', 'kds_accept', 'order_accepted', 'kds_preparing',
        'order_preparing', 'inv_consumption', 'kds_ready', 'order_ready', 'waiter_pickup',
        'waiter_serve', 'order_served', 'bill_generation', 'bill_payment', 'bill_settlement'
      ],
      reject: [
        'cust_order_placement', 'order_new', 'kds_dashboard', 'kds_reject', 'order_reject', 'inv_reversal'
      ],
      cancel: [
        'order_accepted', 'order_cancel', 'inv_reversal'
      ],
      refund: [
        'bill_payment', 'bill_refund', 'infra_edge_functions'
      ],
      reverse_inventory: [
        'order_cancel', 'inv_reversal', 'inv_stock_lookup', 'inv_audit'
      ]
    };

    function addTimelineEvent(title, detail) {
      const timeStr = new Date().toLocaleTimeString('en-GB') + ' IST';
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = '<div class="timeline-time">' + timeStr + '</div>' +
                       '<div class="timeline-title">' + title + '</div>' +
                       '<div class="timeline-detail">' + detail + '</div>';
      timelineList.prepend(item);
    }

    function clearTimeline() {
      timelineList.innerHTML = '';
    }

    async function runFlowSimulation(flowType = 'full') {
      if (isSimulating) return;
      isSimulating = true;
      const sequence = FLOW_PATHS[flowType] || FLOW_PATHS.full;

      packet.style.display = 'block';
      addTimelineEvent('[Simulation Started]', 'Traversing ' + sequence.length + ' nodes for ' + flowType.toUpperCase() + ' flow');

      for (let i = 0; i < sequence.length - 1; i++) {
        const fromId = sequence[i];
        const toId = sequence[i + 1];
        const fromNode = nodeMap.get(fromId);
        const toNode = nodeMap.get(toId);

        focusNode(fromId);
        addTimelineEvent('Step ' + (i+1) + ': ' + (fromNode ? fromNode.label : fromId), 'Transitioning to ' + (toNode ? toNode.label : toId));

        const edge = EDGES.find(e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId));
        if (edge) highlightEdge(edge.id);

        await animatePacketBetween(fromId, toId);
      }

      const finalNode = nodeMap.get(sequence[sequence.length - 1]);
      focusNode(sequence[sequence.length - 1]);
      addTimelineEvent('[Simulation Complete]', 'Final status reached: ' + (finalNode ? finalNode.label : ''));
      packet.style.display = 'none';
      isSimulating = false;
    }

    function animatePacketBetween(fromId, toId) {
      return new Promise(resolve => {
        const edgePath = document.querySelector('path[data-from="' + fromId + '"][data-to="' + toId + '"]') ||
                         document.querySelector('path[data-from="' + toId + '"][data-to="' + fromId + '"]');
        if (!edgePath) {
          setTimeout(resolve, 400);
          return;
        }

        const pathLen = edgePath.getTotalLength();
        const duration = 650;
        const startTime = performance.now();

        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const pt = edgePath.getPointAtLength(progress * pathLen);
          packet.setAttribute('cx', pt.x);
          packet.setAttribute('cy', pt.y);

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });
    }

    function toggleModule(modId) {
      const container = document.getElementById('mod-group-' + modId);
      const modNodes = NODES.filter(n => n.module === modId);
      const isHidden = container.getAttribute('data-collapsed') === 'true';

      container.setAttribute('data-collapsed', !isHidden);
      modNodes.forEach(n => {
        const el = document.getElementById('node-' + n.id);
        if (el) el.style.display = isHidden ? 'block' : 'none';
      });
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('smartdine-theme', next);
    }

    function togglePresentation() {
      document.body.classList.toggle('presentation-mode');
    }

    function exportSVG() {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartdine-master-system.svg';
      a.click();
    }

    function exportPNG() {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = 3840;
      canvas.height = 2160;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'smartdine-master-system.png';
        a.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    updateTransform();
`;

const fullHtml = '<!DOCTYPE html>\n' +
  '<html lang="en" data-theme="dark">\n' +
  '<head>\n' +
  '  <meta charset="UTF-8">\n' +
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
  '  <title>SmartDine Master Digital Twin Architecture</title>\n' +
  '  <style>' + styles + '</style>\n' +
  '</head>\n' +
  '<body>\n' +
  '  <header>\n' +
  '    <div class="brand-section">\n' +
  '      <div class="brand-logo">SD</div>\n' +
  '      <div class="brand-title">\n' +
  '        SmartDine Master Digital Twin\n' +
  '        <span class="badge-pill">77 Nodes • 92 Edges</span>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '    <div class="simulation-controls">\n' +
  '      <button class="sim-btn primary" id="btn-run-full-flow" onclick="runFlowSimulation(\'full\')">\n' +
  '        ▶ Order Flow (New → Served)\n' +
  '      </button>\n' +
  '      <button class="sim-btn" onclick="runFlowSimulation(\'reject\')">⚠ Reject Flow</button>\n' +
  '      <button class="sim-btn" onclick="runFlowSimulation(\'cancel\')">✕ Cancel Flow</button>\n' +
  '      <button class="sim-btn" onclick="runFlowSimulation(\'refund\')">↺ Refund Flow</button>\n' +
  '      <button class="sim-btn" onclick="runFlowSimulation(\'reverse_inventory\')">⚡ Reverse Inventory</button>\n' +
  '    </div>\n' +
  '    <div class="tool-group">\n' +
  '      <input type="text" id="search-box" class="search-input" placeholder="Search node, table, API..." oninput="onSearch(this.value)">\n' +
  '      <button class="icon-btn" title="Zoom In" onclick="zoom(1.25)">+</button>\n' +
  '      <button class="icon-btn" title="Zoom Out" onclick="zoom(0.8)">-</button>\n' +
  '      <button class="icon-btn" title="Reset View" onclick="resetView()">⟲</button>\n' +
  '      <button class="icon-btn" id="btn-theme" title="Toggle Theme" onclick="toggleTheme()">🌓</button>\n' +
  '      <button class="icon-btn" title="Presentation Mode" onclick="togglePresentation()">📺</button>\n' +
  '      <button class="icon-btn" title="Export PNG" onclick="exportPNG()">📷</button>\n' +
  '      <button class="icon-btn" title="Export SVG" onclick="exportSVG()">⬇</button>\n' +
  '    </div>\n' +
  '  </header>\n' +
  '  <div class="workspace">\n' +
  '    <aside class="side-panel-left" id="panel-left">\n' +
  '      <div class="panel-header">\n' +
  '        Live Metrics\n' +
  '        <div class="pulse-dot" title="Realtime Connected"></div>\n' +
  '      </div>\n' +
  '      <div class="metrics-scroll">\n' +
  '        <div class="metric-card">\n' +
  '          <div class="metric-title">Active Orders</div>\n' +
  '          <div class="metric-value"><span id="metric-active-orders">14</span> <span style="font-size:12px;color:#10b981;">● Live</span></div>\n' +
  '          <div class="metric-sub">Across 14 active tables</div>\n' +
  '        </div>\n' +
  '        <div class="metric-card">\n' +
  '          <div class="metric-title">Kitchen Load (KDS)</div>\n' +
  '          <div class="metric-value"><span id="metric-kitchen-load">4</span> <span style="font-size:12px;color:#f59e0b;">Prep / 2 Queued</span></div>\n' +
  '          <div class="metric-sub">Avg Prep: 8m 42s</div>\n' +
  '        </div>\n' +
  '        <div class="metric-card">\n' +
  '          <div class="metric-title">Waiter Service Calls</div>\n' +
  '          <div class="metric-value"><span id="metric-waiter-calls">3</span> <span style="font-size:12px;color:#8b5cf6;">Pending</span></div>\n' +
  '          <div class="metric-sub">Tables: T-02, T-05, T-12</div>\n' +
  '        </div>\n' +
  '        <div class="metric-card">\n' +
  '          <div class="metric-title">Inventory Health</div>\n' +
  '          <div class="metric-value"><span id="metric-stock-status">2</span> <span style="font-size:12px;color:#ef4444;">Low Stock</span></div>\n' +
  '          <div class="metric-sub">Pineapple Syrup, Basmati Rice</div>\n' +
  '        </div>\n' +
  '        <div class="metric-card">\n' +
  '          <div class="metric-title">Settled Revenue Today</div>\n' +
  '          <div class="metric-value"><span id="metric-revenue">₹24,850.00</span></div>\n' +
  '          <div class="metric-sub">GST Collected: ₹1,242.50</div>\n' +
  '        </div>\n' +
  '        <div class="metric-card">\n' +
  '          <div class="metric-title">Frozen Inventory Engine</div>\n' +
  '          <div class="metric-value" style="font-size: 13px; color: #10b981;">100% PROTECTED</div>\n' +
  '          <div class="metric-sub">Exact-once consumption locked</div>\n' +
  '        </div>\n' +
  '      </div>\n' +
  '    </aside>\n' +
  '    <main class="canvas-container" id="canvas-container">\n' +
  '      <svg id="master-svg" viewBox="0 0 ' + CANVAS_WIDTH + ' ' + CANVAS_HEIGHT + '">\n' +
  '        <defs>\n' +
  '          <marker id="arrow-main" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
  '            <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />\n' +
  '          </marker>\n' +
  '          <marker id="arrow-data" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
  '            <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />\n' +
  '          </marker>\n' +
  '          <marker id="arrow-realtime" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
  '            <path d="M 0 1 L 9 5 L 0 9 z" fill="#8b5cf6" />\n' +
  '          </marker>\n' +
  '          <marker id="arrow-security" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
  '            <path d="M 0 1 L 9 5 L 0 9 z" fill="#06b6d4" />\n' +
  '          </marker>\n' +
  '          <marker id="arrow-audit" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
  '            <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748b" />\n' +
  '          </marker>\n' +
  '          <marker id="arrow-alternate" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
  '            <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />\n' +
  '          </marker>\n' +
  '        </defs>\n' +
  '        <g id="modules-group">' + modulesSvg + '</g>\n' +
  '        <g id="edges-group">' + edgesSvg + '</g>\n' +
  '        <g id="nodes-group">' + nodesSvg + '</g>\n' +
  '        <circle id="flow-packet" class="flow-particle" r="9" cx="-100" cy="-100" style="display:none;" />\n' +
  '      </svg>\n' +
  '      <div id="inspector" class="inspector-drawer">\n' +
  '        <div class="inspector-header">\n' +
  '          <div class="inspector-title" id="insp-title">Connection Details</div>\n' +
  '          <button class="icon-btn" onclick="closeInspector()">✕</button>\n' +
  '        </div>\n' +
  '        <div class="inspector-grid" id="insp-content"></div>\n' +
  '      </div>\n' +
  '      <div class="mini-map-box">\n' +
  '        <svg id="minimap-svg" viewBox="0 0 ' + CANVAS_WIDTH + ' ' + CANVAS_HEIGHT + '">\n' +
  minimapModulesSvg +
  '          <rect id="minimap-view" class="minimap-view-rect" x="0" y="0" width="1200" height="800" />\n' +
  '        </svg>\n' +
  '      </div>\n' +
  '    </main>\n' +
  '    <aside class="side-panel-right" id="panel-right">\n' +
  '      <div class="panel-header">\n' +
  '        Live Event Timeline\n' +
  '        <span style="font-size:10px;color:var(--text-muted);cursor:pointer;" onclick="clearTimeline()">Clear</span>\n' +
  '      </div>\n' +
  '      <div class="timeline-list" id="timeline-list">\n' +
  '        <div class="timeline-item" onclick="focusNode(\'order_new\')">\n' +
  '          <div class="timeline-time">12:41:02 IST</div>\n' +
  '          <div class="timeline-title">New Order Received</div>\n' +
  '          <div class="timeline-detail">Table Maharaja (T-12) • 8 ACTIVE Reservations</div>\n' +
  '        </div>\n' +
  '        <div class="timeline-item" onclick="focusNode(\'order_accepted\')">\n' +
  '          <div class="timeline-time">12:42:15 IST</div>\n' +
  '          <div class="timeline-title">KDS Order Accepted</div>\n' +
  '          <div class="timeline-detail">Chef accepted_at timestamp recorded</div>\n' +
  '        </div>\n' +
  '        <div class="timeline-item" onclick="focusNode(\'inv_consumption\')">\n' +
  '          <div class="timeline-time">12:43:00 IST</div>\n' +
  '          <div class="timeline-title">Inventory Consumed</div>\n' +
  '          <div class="timeline-detail">Exact-Once Deduction (8 ledger items)</div>\n' +
  '        </div>\n' +
  '        <div class="timeline-item" onclick="focusNode(\'order_ready\')">\n' +
  '          <div class="timeline-time">12:47:30 IST</div>\n' +
  '          <div class="timeline-title">Order Ready</div>\n' +
  '          <div class="timeline-detail">Pass Chime Fired • Waiter Pick-up Alert</div>\n' +
  '        </div>\n' +
  '        <div class="timeline-item" onclick="focusNode(\'order_served\')">\n' +
  '          <div class="timeline-time">12:48:15 IST</div>\n' +
  '          <div class="timeline-title">Food Served</div>\n' +
  '          <div class="timeline-detail">Table Maharaja • Zero additional stock deduct</div>\n' +
  '        </div>\n' +
  '      </div>\n' +
  '    </aside>\n' +
  '  </div>\n' +
  '  <script>' + clientJs + '</script>\n' +
  '</body>\n' +
  '</html>';

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log(`[PASS] docs/smartdine-master-system.html generated successfully (${(fs.statSync(htmlPath).size / 1024).toFixed(1)} KB).`);
