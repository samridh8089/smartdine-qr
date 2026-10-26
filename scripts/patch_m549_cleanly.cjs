const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
let bundle = fs.readFileSync(bundlePath, 'utf8');

const m549Start = bundle.lastIndexOf('__d(function', bundle.indexOf(',549,['));
let m549 = bundle.slice(m549Start, bundle.indexOf(',549,['));

// 1. In m549, rename 'c=s[0]' to '_msg=s[0]' so 'c' is not shadowed
m549 = m549.replace(',s=(0,t.default)(l,2),c=s[0];', ',s=(0,t.default)(l,2),_msg=s[0];');
m549 = m549.replace('return(0,U.jsx)($,{message:c})', 'return(0,U.jsx)($,{message:_msg})');

// 2. Replace the return statement
const oldReturn = '(0,U.jsxs)(D,{children:[(0,U.jsx)(v.StatusBar,{style:"auto"}),(0,U.jsx)(p.NavigationContainer';
const endReturn = '})})]})';
const rStart = m549.indexOf(oldReturn);
const rEnd = m549.indexOf(endReturn, rStart);

if (rStart === -1 || rEnd === -1) {
  throw new Error('Could not find return in m549');
}

// In the return, let's create WebView using c.requireNativeComponent("RNCWebView")
const newReturn = '(console.log("[PHONE_TEST] c is:", typeof c, "requireNativeComponent is:", typeof c.requireNativeComponent, "RNCWebView is:", typeof c.requireNativeComponent("RNCWebView")),(0,U.jsxs)(c.SafeAreaView,{style:{flex:1,backgroundColor:"#0f172a"},children:[(0,U.jsx)(v.StatusBar,{style:"light"}),(0,U.jsx)(c.requireNativeComponent("RNCWebView"),{style:{flex:1,backgroundColor:"#0f172a"},source:{uri:"https://cleverops.in/login"},javaScriptEnabled:!0,domStorageEnabled:!0,allowsInlineMediaPlayback:!0,mediaPlaybackRequiresUserAction:!1,startInLoadingState:!0})]}))';

m549 = m549.slice(0, rStart) + newReturn + m549.slice(rEnd + endReturn.length);

bundle = bundle.slice(0, m549Start) + m549 + bundle.slice(bundle.indexOf(',549,['));
fs.writeFileSync(bundlePath, bundle);
console.log('Successfully patched m549 cleanly at offset', m549Start);
