@echo off
cd /d c:\Users\admin\smartdine-qr
git add src/app/(dashboard)/dashboard/page.tsx
git add src/app/api/admin/bulk-operations/route.ts
git commit -m "fix(broadcast): overhaul announcement banner design, Lucide Megaphone icon, high contrast light/dark mode, exact text rendering, and unique broadcast ID"
git push origin main

