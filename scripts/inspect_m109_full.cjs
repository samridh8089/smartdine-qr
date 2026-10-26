const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

const m109End = bundle.indexOf(',109,[');
const m109Start = bundle.lastIndexOf('__d(function', m109End);
console.log('Module 109 full code:');
console.log(bundle.slice(m109Start, m109End + 20));
