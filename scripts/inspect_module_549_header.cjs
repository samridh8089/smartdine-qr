const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

const m549End = bundle.indexOf('549,[');
const m549Start = bundle.lastIndexOf('__d(function', m549End);
console.log('Module 549 header (first 500 chars):');
console.log(bundle.slice(m549Start, m549Start + 500));
