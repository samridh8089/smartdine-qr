import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const brainDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain';
const currentConv = 'af631f2d-472c-4b1a-a400-9353bd6e2483';

console.log('Cleaning up old Gemini conversation folders and task logs...');

try {
  const folders = fs.readdirSync(brainDir);
  for (const f of folders) {
    if (f !== currentConv) {
      const p = path.join(brainDir, f);
      try {
        fs.rmSync(p, { recursive: true, force: true });
        console.log('Deleted old brain folder:', f);
      } catch (e) {}
    }
  }
} catch (e) {}

// Clean old tasks inside current conversation
try {
  const currentTasksDir = path.join(brainDir, currentConv, '.system_generated', 'tasks');
  if (fs.existsSync(currentTasksDir)) {
    const tasks = fs.readdirSync(currentTasksDir);
    for (const t of tasks) {
      try {
        fs.unlinkSync(path.join(currentTasksDir, t));
      } catch (e) {}
    }
    console.log('Cleaned old task logs!');
  }
} catch (e) {}

const out = execSync('powershell Get-PSDrive C').toString();
console.log('Updated C Drive Free Space:\n', out);
