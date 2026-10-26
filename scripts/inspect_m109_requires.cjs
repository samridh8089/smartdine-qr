const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

const m109End = bundle.indexOf(',109,[');
const m109Start = bundle.lastIndexOf('__d(function', m109End);
const code109 = bundle.slice(m109Start, m109End + 20);

console.log('Module 109 full code:');
console.log(code109);
console.log('\nLength of module 109:', code109.length);

// Where are the requires in module 109?
let idx = 0;
while (true) {
  const rIdx = code109.indexOf('r(d[', idx);
  if (rIdx === -1) break;
  console.log('Require at offset', rIdx, code109.slice(rIdx, rIdx + 20));
  idx = rIdx + 4;
}
