import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const userHome = process.env.USERPROFILE || 'C:\\Users\\DELL';
const gradleCaches = path.join(userHome, '.gradle', 'caches');

console.log('Performing deep cleanup of old Gradle transforms and build caches...');

try {
  const transforms = path.join(gradleCaches, 'transforms-3');
  if (fs.existsSync(transforms)) {
    fs.rmSync(transforms, { recursive: true, force: true });
    console.log('Removed old transforms-3 cache!');
  }
} catch (e) {}

try {
  const tmp = path.join(userHome, 'AppData', 'Local', 'Temp');
  if (fs.existsSync(tmp)) {
    const files = fs.readdirSync(tmp);
    for (const f of files) {
      try {
        fs.rmSync(path.join(tmp, f), { recursive: true, force: true });
      } catch (e) {}
    }
    console.log('Cleared Temp directory!');
  }
} catch (e) {}

console.log('Cleanup finished!');
const out = execSync('powershell Get-PSDrive C').toString();
console.log('Updated C Drive Free Space:\n', out);
