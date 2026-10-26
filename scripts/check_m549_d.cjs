const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

const m549Idx = bundle.indexOf('549,[');
const dStr = bundle.slice(m549Idx + 4, bundle.indexOf(']', m549Idx) + 1);
const d = JSON.parse(dStr);
console.log('Module 549 d array length:', d.length);
console.log('d[9] is:', d[9]);
d.forEach((modId, idx) => {
  console.log(`d[${idx}] = ${modId}`);
});
