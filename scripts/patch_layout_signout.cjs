const fs = require('fs');
const p = 'src/app/(dashboard)/layout.tsx';
let c = fs.readFileSync(p, 'utf8');

const targetCRLF = `    clearActiveUserCache();\r\n    await supabase.auth.signOut();`;
const repCRLF = `    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView?.postMessage) {
      try { (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'SIGN_OUT' })); } catch (_) {}
    }
    clearActiveUserCache();
    await supabase.auth.signOut();`;

const targetLF = `    clearActiveUserCache();\n    await supabase.auth.signOut();`;
const repLF = `    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView?.postMessage) {
      try { (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'SIGN_OUT' })); } catch (_) {}
    }
    clearActiveUserCache();
    await supabase.auth.signOut();`;

if (c.includes(targetCRLF)) {
  c = c.replace(targetCRLF, repCRLF);
  fs.writeFileSync(p, c, 'utf8');
  console.log('Applied ReactNativeWebView postMessage to layout.tsx (CRLF)');
} else if (c.includes(targetLF)) {
  c = c.replace(targetLF, repLF);
  fs.writeFileSync(p, c, 'utf8');
  console.log('Applied ReactNativeWebView postMessage to layout.tsx (LF)');
} else {
  console.error('Target not found in layout.tsx');
}
