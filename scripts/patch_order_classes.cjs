const fs = require('fs');
const p = 'src/app/(dashboard)/dashboard/orders/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const t1 = `                  {/* Collapsible Order & Batch Lifecycle Timeline */}
                  <div className="space-y-3">`;
const r1 = `                  {/* Collapsible Order & Batch Lifecycle Timeline */}
                  <div className="space-y-3 order-5 md:order-none">`;

const t1CRLF = `                  {/* Collapsible Order & Batch Lifecycle Timeline */}\r\n                  <div className="space-y-3">`;
const r1CRLF = `                  {/* Collapsible Order & Batch Lifecycle Timeline */}\r\n                  <div className="space-y-3 order-5 md:order-none">`;

if (c.includes(t1CRLF)) {
  c = c.replace(t1CRLF, r1CRLF);
  console.log('Applied timeline order-5 (CRLF)');
} else if (c.includes(t1)) {
  c = c.replace(t1, r1);
  console.log('Applied timeline order-5 (LF)');
}

const t2 = `<div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Activity Log</h4>`;
const r2 = `<div className="space-y-2 order-6 md:order-none">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Activity Log</h4>`;

const t2CRLF = `<div className="space-y-2">\r\n                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Activity Log</h4>`;
const r2CRLF = `<div className="space-y-2 order-6 md:order-none">\r\n                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Activity Log</h4>`;

if (c.includes(t2CRLF)) {
  c = c.replace(t2CRLF, r2CRLF);
  console.log('Applied activity log order-6 (CRLF)');
} else if (c.includes(t2)) {
  c = c.replace(t2, r2);
  console.log('Applied activity log order-6 (LF)');
}

fs.writeFileSync(p, c, 'utf8');
console.log('Done!');
