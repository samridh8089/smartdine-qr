import fs from 'fs';
import path from 'path';

function getFolderStats(dirPath) {
  let total = 0;
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const full = path.join(dirPath, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          total += getFolderStats(full);
        } else {
          total += stat.size;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return total;
}

const target = 'C:\\Users\\DELL';
try {
  const topFolders = fs.readdirSync(target);
  for (const folder of topFolders) {
    const fullPath = path.join(target, folder);
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        const sizeGb = (getFolderStats(fullPath) / (1024 * 1024 * 1024)).toFixed(2);
        if (parseFloat(sizeGb) > 0.5) {
          console.log(`${folder}: ${sizeGb} GB`);
        }
      }
    } catch (e) {}
  }
} catch (e) {}
