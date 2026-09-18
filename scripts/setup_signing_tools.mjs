import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const TOOLS_DIR = path.resolve('tools');
const JRE_ZIP = path.join(TOOLS_DIR, 'jre.zip');
const JRE_EXTRACT = path.join(TOOLS_DIR, 'jre');
const SIGNER_JAR = path.join(TOOLS_DIR, 'uber-apk-signer.jar');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} -> ${dest}`);
    const file = fs.createWriteStream(dest);
    
    function get(currentUrl) {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed with status ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }
    
    get(url);
  });
}

async function run() {
  const jreUrl = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jre_x64_windows_hotspot_17.0.20.1_1.zip';
  const signerUrl = 'https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar';

  if (!fs.existsSync(SIGNER_JAR)) {
    console.log('Downloading uber-apk-signer...');
    await download(signerUrl, SIGNER_JAR);
    console.log('Downloaded uber-apk-signer successfully!');
  } else {
    console.log('uber-apk-signer already exists.');
  }

  const javaExe = path.join(JRE_EXTRACT, 'bin', 'java.exe');
  if (!fs.existsSync(javaExe)) {
    console.log('Downloading Temurin 17 JRE...');
    await download(jreUrl, JRE_ZIP);
    console.log('Extracting JRE zip...');
    
    // Use PowerShell Expand-Archive
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${JRE_ZIP}' -DestinationPath '${TOOLS_DIR}\\temp_jre' -Force"`, { stdio: 'inherit' });
    
    // Find inner jdk/jre dir
    const subdirs = fs.readdirSync(path.join(TOOLS_DIR, 'temp_jre'));
    const innerDir = path.join(TOOLS_DIR, 'temp_jre', subdirs[0]);
    if (fs.existsSync(JRE_EXTRACT)) {
      fs.rmSync(JRE_EXTRACT, { recursive: true, force: true });
    }
    fs.renameSync(innerDir, JRE_EXTRACT);
    fs.rmSync(path.join(TOOLS_DIR, 'temp_jre'), { recursive: true, force: true });
    fs.unlinkSync(JRE_ZIP);
    console.log('JRE extracted successfully to', JRE_EXTRACT);
  } else {
    console.log('JRE already exists.');
  }

  console.log('Testing java and uber-apk-signer...');
  const ver = execSync(`"${javaExe}" -jar "${SIGNER_JAR}" --version`, { encoding: 'utf-8' });
  console.log('Result:', ver.trim());
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
