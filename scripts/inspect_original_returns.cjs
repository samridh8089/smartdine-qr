const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

// Find module 549
const m549End = bundle.indexOf('549,[');
const m549Start = bundle.lastIndexOf('__d(function', m549End);
const m549Code = bundle.slice(m549Start, m549End + 50);

console.log('Original module 549 length:', m549Code.length);
// Find the return statements inside module 549
let idx = 0;
while (true) {
  const next = m549Code.indexOf('return(', idx);
  const next2 = m549Code.indexOf('return (', idx);
  let pos = -1;
  if (next !== -1 && next2 !== -1) pos = Math.min(next, next2);
  else if (next !== -1) pos = next;
  else if (next2 !== -1) pos = next2;
  else break;

  console.log('Return statement at pos', pos, ':', m549Code.slice(pos, pos + 250));
  idx = pos + 10;
}
