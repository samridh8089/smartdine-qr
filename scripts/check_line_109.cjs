const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');
const lines = bundle.split('\n');
console.log('Total lines in bundle:', lines.length);
if (lines[108]) { // 0-indexed line 108 is line 109
  console.log('Line 109 length:', lines[108].length);
  console.log('Line 109 around column 51:');
  console.log(lines[108].slice(0, 200));
}
