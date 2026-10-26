const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

// Find definition of module 549: __d(function(..., 549, [...])
const m549Header = bundle.indexOf('__d(function(');
let idx = 0;
while (true) {
  const next = bundle.indexOf('549,[', idx);
  if (next === -1) break;
  console.log('Found 549,[ at', next, bundle.slice(next - 50, next + 100));
  idx = next + 1;
}
