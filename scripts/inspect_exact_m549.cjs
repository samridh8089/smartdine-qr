const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

// Find module 549: ,549,[
const tag = ',549,[';
const m549End = bundle.indexOf(tag);
console.log('m549End tag pos:', m549End);

// Find start of module 549
const m549Start = bundle.lastIndexOf('__d(function', m549End);
console.log('m549Start pos:', m549Start);

const m549Code = bundle.slice(m549Start, m549End);
console.log('m549Code length:', m549Code.length);

// Check if m549Start has any other modules
console.log('Header of module 549 (first 300 chars):');
console.log(m549Code.slice(0, 300));

// Check return statement inside module 549
const retTarget = '(0,U.jsxs)(D,{children:[(0,U.jsx)(v.StatusBar,{style:"auto"}),(0,U.jsx)(p.NavigationContainer';
const retIdx = m549Code.indexOf(retTarget);
console.log('Return target pos inside module 549:', retIdx);
