const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

[69, 443, 455, 108, 109].forEach(id => {
  const mEnd = bundle.indexOf(',' + id + ',[');
  if (mEnd !== -1) {
    const mStart = bundle.lastIndexOf('__d(function', mEnd);
    console.log(`=== Module ${id} ===`);
    console.log(bundle.slice(mStart, mStart + 250));
    const dStr = bundle.slice(mEnd + (',' + id + ',[').length - 1, bundle.indexOf(']', mEnd) + 1);
    console.log(`Module ${id} d:`, dStr);
  }
});
