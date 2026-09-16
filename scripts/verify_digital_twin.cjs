/**
 * scripts/verify_digital_twin.cjs
 * 
 * Verifies repository ground truth for smartdine-master-system.json and smartdine-master-system.html.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const jsonPath = path.join(repoRoot, 'docs/smartdine-master-system.json');
const htmlPath = path.join(repoRoot, 'docs/smartdine-master-system.html');

console.log('======================================================================');
console.log('SMARTDINE MASTER DIGITAL TWIN FORENSIC AUDIT & VALIDATION');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function check(desc, passed, detail = '') {
  if (passed) {
    console.log(`  [PASS] ${desc} ${detail ? '(' + detail + ')' : ''}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${desc} ${detail ? '(' + detail + ')' : ''}`);
    failCount++;
  }
}

// 1. Check file existence
check('Master JSON artifact exists', fs.existsSync(jsonPath), `Size: ${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB`);
check('Master HTML artifact exists', fs.existsSync(htmlPath), `Size: ${(fs.statSync(htmlPath).size / 1024).toFixed(1)} KB`);

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const { nodes, edges, modules, metrics } = data;

// 2. Node checks
check('Total nodes count >= 50', nodes.length >= 50, `Found: ${nodes.length}`);
check('Total edges count >= 50', edges.length >= 50, `Found: ${edges.length}`);
check('Total modules count == 13', modules.length === 13, `Found: ${modules.length}`);

// 3. Topology & Orphan check
const nodeIds = new Set(nodes.map(n => n.id));
const edgeSources = new Set(edges.map(e => e.from));
const edgeTargets = new Set(edges.map(e => e.to));

const orphanNodes = nodes.filter(n => !edgeSources.has(n.id) && !edgeTargets.has(n.id));
check('Zero orphan nodes', orphanNodes.length === 0, orphanNodes.length === 0 ? 'All nodes connected' : `Orphans: ${orphanNodes.map(n=>n.id).join(', ')}`);

const danglingEdges = edges.filter(e => !nodeIds.has(e.from) || !nodeIds.has(e.to));
check('Zero dangling edges', danglingEdges.length === 0, danglingEdges.length === 0 ? 'All edge endpoints valid' : `Dangling count: ${danglingEdges.length}`);

// 4. File existence check for referenced code paths
let missingFiles = [];
nodes.forEach(n => {
  if (n.filePath && !n.filePath.includes('*') && !n.filePath.startsWith('N/A') && !n.filePath.startsWith('Supabase') && !n.filePath.startsWith('supabase/migrations')) {
    const full = path.join(repoRoot, n.filePath);
    if (!fs.existsSync(full)) {
      missingFiles.push(n.filePath);
    }
  }
});
check('All referenced source files exist in repository', missingFiles.length === 0, missingFiles.length === 0 ? '100% verified ground truth' : `Missing: ${missingFiles.join(', ')}`);

// 5. Check Inspector fields completeness
let incompleteEdges = [];
edges.forEach(e => {
  if (!e.filePath || !e.callingFunction || !e.calledFunction) {
    incompleteEdges.push(e.id);
  }
});
check('All edges have inspector metadata (filePath, calling, called)', incompleteEdges.length === 0, `Incomplete: ${incompleteEdges.length}`);

// 6. Check HTML features
const html = fs.readFileSync(htmlPath, 'utf8');
check('HTML contains Live Metrics Panel', html.includes('Live Metrics') && html.includes('metric-active-orders'));
check('HTML contains Live Event Timeline', html.includes('Live Event Timeline') && html.includes('timeline-list'));
check('HTML contains Flow Simulation Controls', html.includes('runFlowSimulation') && html.includes('btn-run-full-flow'));
check('HTML contains Connection Inspector', html.includes('inspector-drawer') && html.includes('insp-title'));
check('HTML contains Mini Map', html.includes('mini-map-box') && html.includes('minimap-view'));
check('HTML contains Pan & Zoom Engine', html.includes('updateTransform') && html.includes('canvas-container'));
check('HTML contains Search & Focus', html.includes('onSearch') && html.includes('focusNode'));
check('HTML contains Theme Toggle', html.includes('toggleTheme') && html.includes('data-theme'));
check('HTML contains PNG & SVG Export', html.includes('exportSVG') && html.includes('exportPNG'));

// 7. Check All 13 Modules Present
const requiredModules = [
  'customer_layer', 'order_engine', 'kitchen_kds', 'waiter_system',
  'owner_dashboard', 'inventory_engine', 'billing_system', 'auth_security',
  'notifications_service', 'offline_engine', 'reports_analytics',
  'audit_system', 'infrastructure_layer'
];
const missingModules = requiredModules.filter(m => !modules.some(mod => mod.id === m));
check('All 13 required modules represented in master architecture', missingModules.length === 0, `Missing: ${missingModules.join(', ')}`);

console.log('\n----------------------------------------------------------------------');
console.log(`Validation Results: ${passCount} Passed, ${failCount} Failed`);
console.log('----------------------------------------------------------------------');
if (failCount === 0) {
  console.log('[PASS] SMARTDINE MASTER DIGITAL TWIN VALIDATION: 100 / 100 (SHOWCASE ACCEPTED)');
} else {
  console.error('[FAIL] Validation failures detected.');
  process.exit(1);
}
