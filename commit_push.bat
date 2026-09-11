@echo off
cd /d c:\Users\admin\smartdine-qr
git add .
git commit -m "fix(super-admin): fix TS2352 type cast, use profiles for staff, remove invalid columns, restaurant switcher demo fallback"
git push origin main
