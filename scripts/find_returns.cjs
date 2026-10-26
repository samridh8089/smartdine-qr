const fs = require('fs');
let bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');
const modHeader = '__d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]);Object.defineProperty(_e,"__esModule",{value:!0}),_e.default=function(){';
const mIdx = bundle.indexOf(modHeader);
const mEnd = bundle.indexOf('},549,[', mIdx);
const modCode = bundle.substring(mIdx, mEnd);
const endComp = modCode.indexOf(',_e.navigationRef=void 0');
console.log('50 chars before endComp:');
console.log(JSON.stringify(modCode.substring(endComp - 50, endComp + 50)));
