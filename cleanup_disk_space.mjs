import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function removeFolderContent(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const curPath = path.join(dirPath, file);
      try {
        if (fs.statSync(curPath).isDirectory()) {
          fs.rmSync(curPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(curPath);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

const userHome = process.env.USERPROFILE || 'C:\\Users\\DELL';

console.log('Cleaning up temporary files and caches to free up disk space...');
removeFolderContent(path.join(userHome, '.gradle', 'daemon'));
removeFolderContent(path.join(userHome, 'AppData', 'Local', 'Temp'));
removeFolderContent('c:\\smartdine\\smartdine-qr-main first\\smartdine-qr-main\\.next');
removeFolderContent('c:\\smartdine\\smartdine-qr-main first\\smartdine-qr-main\\smartdine-mobile\\.expo');
removeFolderContent('c:\\smartdine\\smartdine-qr-main first\\smartdine-qr-main\\smartdine-mobile\\android\\app\\build\\intermediates');
removeFolderContent('c:\\smartdine\\smartdine-qr-main first\\smartdine-qr-main\\smartdine-mobile\\android\\app\\build\\tmp');

console.log('Disk cleanup finished!');
const out = execSync('powershell Get-PSDrive C').toString();
console.log('Updated C Drive Free Space:\n', out);
