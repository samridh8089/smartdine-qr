const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

// Find module 55 in bundle
const m55End = bundle.indexOf(',55,[');
const m55Start = bundle.lastIndexOf('__d(function', m55End);
console.log('Module 55 exports:');
console.log(bundle.slice(m55Start, m55End + 50));
