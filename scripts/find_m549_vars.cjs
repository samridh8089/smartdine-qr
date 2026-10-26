const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

const m549Idx = bundle.indexOf('549,[');
const m549Start = bundle.lastIndexOf('__d(function', m549Idx);
const m549 = bundle.slice(m549Start, m549Idx);

const varIdx = m549.indexOf('c=_r(d[9])');
console.log('Position of c=_r(d[9]):', varIdx);
if (varIdx !== -1) {
  console.log(m549.slice(varIdx - 100, varIdx + 100));
}
