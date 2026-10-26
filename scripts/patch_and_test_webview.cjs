const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

async function main() {
  console.log('=== 1. RESTORING CLEAN BUNDLE ===');
  execSync('git checkout dist-android/index.android.bundle', { cwd: 'smartdine-mobile', stdio: 'inherit' });
  let bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

  const modHeader = '__d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]);Object.defineProperty(_e,"__esModule",{value:!0}),_e.default=function(){';
  const mIdx = bundle.indexOf(modHeader);
  if (mIdx === -1) throw new Error('modHeader not found');
  console.log('Found modHeader at:', mIdx);

  const mEnd = bundle.indexOf('},549,[', mIdx);
  if (mEnd === -1) throw new Error('Module 549 end not found');
  console.log('Found mEnd at:', mEnd);

  let modCode = bundle.substring(mIdx, mEnd);

  // 1. Rename shadowed variable c = s[0] to _msg = s[0]
  if (!modCode.includes('s=(0,t.default)(l,2),c=s[0];')) {
    throw new Error('Shadowed variable pattern not found!');
  }
  modCode = modCode.replace('s=(0,t.default)(l,2),c=s[0];', 's=(0,t.default)(l,2),_msg=s[0];');
  modCode = modCode.replace('(0,U.jsx)($,{message:c})', '(0,U.jsx)($,{message:_msg})');

  // 2. Insert registration of RNCWebViewMessagingModule right at the start of module 549
  const regCode = `var _rn=_r(d[9]);try{_rn.registerCallableModule('RNCWebViewMessagingModule',{onShouldStartLoadWithRequest:function(e){console.log('[RNCWebView] onShouldStartLoadWithRequest',JSON.stringify(e));try{var l=(e&&e.nativeEvent&&e.nativeEvent.lockIdentifier)||(e&&e.lockIdentifier);if(l&&_rn.NativeModules&&_rn.NativeModules.RNCWebViewModule&&_rn.NativeModules.RNCWebViewModule.shouldStartLoadWithLockIdentifier){_rn.NativeModules.RNCWebViewModule.shouldStartLoadWithLockIdentifier(!0,l)}}catch(err){console.log('[RNCWebView] unlock error',err.message)}},onMessage:function(e){console.log('[RNCWebView] onMessage',JSON.stringify(e))}})}catch(e){console.log('[RNCWebView] reg error',e.message)}`;

  modCode = modCode.replace(
    '__d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]);Object.defineProperty(_e,"__esModule",{value:!0}),_e.default=function(){',
    `__d(function(g,_r,_i,a,m,_e,d){var e=_r(d[0]);${regCode}Object.defineProperty(_e,"__esModule",{value:!0}),_e.default=function(){`
  );

  // 3. Find and replace the return statement with WebView container
  const ncIdx = modCode.indexOf('return(0,U.jsxs)(D');
  const endComp = modCode.indexOf(',_e.navigationRef=void 0');
  if (ncIdx === -1 || endComp === -1) {
    throw new Error('Return bounds not found!');
  }

  const oldReturn = modCode.substring(ncIdx, endComp);
  console.log('Found oldReturn, length:', oldReturn.length);

  const newReturn = `return(0,U.jsxs)(c.SafeAreaView,{style:{flex:1,backgroundColor:"#0f172a"},children:[(0,U.jsx)(v.StatusBar,{style:"light"}),(0,U.jsx)(c.requireNativeComponent("RNCWebView"),{style:{flex:1,backgroundColor:"#0f172a"},source:{uri:"https://cleverops.in/login"},messagingModuleName:"RNCWebViewMessagingModule",messagingEnabled:!0,javaScriptEnabled:!0,domStorageEnabled:!0,allowsInlineMediaPlayback:!0,mediaPlaybackRequiresUserAction:!1,startInLoadingState:!0})]})}`;

  modCode = modCode.replace(oldReturn, newReturn);

  // Reassemble bundle
  const newBundle = bundle.substring(0, mIdx) + modCode + bundle.substring(mEnd);
  console.log('Validating bundle syntax with vm.Script...');
  new vm.Script(newBundle);
  console.log('Bundle syntax is 100% VALID!');

  fs.writeFileSync('smartdine-mobile/dist-android/index.android.bundle', newBundle);
  console.log('Bundle written successfully!');
}

main().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});
