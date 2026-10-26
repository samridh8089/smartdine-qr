const fs = require('fs');
const path = require('path');
const vm = require('vm');

function patchBundle() {
  const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
  let code = fs.readFileSync(bundlePath, 'utf8');

  // Verify it starts with clean bundle
  const m549Idx = code.indexOf('549,[');
  if (m549Idx === -1) throw new Error('Cannot find 549,[');
  const m549Start = code.lastIndexOf('__d(function', m549Idx);

  console.log('Found module 549 at offset', m549Start);

  // 1. In module 549 header:
  // Original header:
  // __d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]);Object.defineProperty(_e,"__esModule",{value:!0})
  const oldHeader = '__d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]);Object.defineProperty(_e,"__esModule",{value:!0})';
  const newHeader = '__d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]),RN=_r(d[9]),RNCWebView=RN.requireNativeComponent("RNCWebView");Object.defineProperty(_e,"__esModule",{value:!0})';

  if (!code.includes(oldHeader)) {
    throw new Error('Could not find oldHeader in bundle');
  }
  code = code.replace(oldHeader, newHeader);
  console.log('Successfully injected RN and RNCWebView in module 549 header!');

  // 2. In module 549 return statement:
  // Original return target:
  const oldReturn = '(0,U.jsxs)(D,{children:[(0,U.jsx)(v.StatusBar,{style:"auto"}),(0,U.jsx)(p.NavigationContainer';
  const oldReturnIdx = code.indexOf(oldReturn);
  if (oldReturnIdx === -1) throw new Error('Could not find oldReturn target');

  // Find the end of this return statement: '})})]})'
  const endReturn = '})})]})';
  const endIdx = code.indexOf(endReturn, oldReturnIdx);
  if (endIdx === -1) throw new Error('Could not find end of return statement');

  const newReturn = '(0,U.jsxs)(RN.SafeAreaView,{style:{flex:1,backgroundColor:"#0f172a"},children:[(0,U.jsx)(v.StatusBar,{style:"light"}),(0,U.jsx)(RNCWebView,{style:{flex:1,backgroundColor:"#0f172a"},source:{uri:"https://cleverops.in/login"},javaScriptEnabled:!0,domStorageEnabled:!0,allowsInlineMediaPlayback:!0,mediaPlaybackRequiresUserAction:!1,startInLoadingState:!0})]})';

  code = code.substring(0, oldReturnIdx) + newReturn + code.substring(endIdx + endReturn.length);
  console.log('Successfully replaced return statement with RNCWebView!');

  // Save the patched bundle
  fs.writeFileSync(bundlePath, code);
  console.log('Saved patched bundle to:', bundlePath);

  // Validate JavaScript syntax using vm.Script
  console.log('Validating bundle syntax with vm.Script...');
  try {
    new vm.Script(code);
    console.log('[PASS] Bundle JavaScript syntax is 100% valid!');
  } catch (err) {
    console.error('[FAIL] Syntax error in patched bundle:', err);
    throw err;
  }
}

patchBundle();
