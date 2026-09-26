import https from 'https';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip';
const zipPath = path.resolve('tools/platform-tools.zip');
const toolsDir = path.resolve('tools');

console.log('Downloading platform-tools...');
const file = fs.createWriteStream(zipPath);

function download(u) {
  https.get(u, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return download(res.headers.location);
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('Extracting platform-tools...');
        execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${toolsDir}' -Force"`, { stdio: 'inherit' });
        fs.unlinkSync(zipPath);
        console.log('Platform-tools installed successfully!');
      });
    });
  }).on('error', err => {
    console.error('Download failed:', err);
  });
}

download(url);
