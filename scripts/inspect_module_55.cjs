const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

// Find module 55 definition to see what it exports
const m55Idx = bundle.indexOf('__d(function(g,r,i,a,m,e,d){');
let idx = 0;
while (true) {
  const next = bundle.indexOf(',55,[', idx);
  if (next === -1) break;
  console.log('Found module 55 at', next);
  // Find where module 55 starts
  const start = bundle.lastIndexOf('__d(function', next);
  console.log('Module 55 code:', bundle.slice(start, start + 300));
  idx = next + 1;
}
