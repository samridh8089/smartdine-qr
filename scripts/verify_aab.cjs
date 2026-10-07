const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const state = JSON.parse(fs.readFileSync('C:/Users/hp/.expo/state.json', 'utf8'));
const token = state.auth.sessionSecret;
const buildId = process.argv[2] || "bf0d5653-d714-43b5-98de-3ee27bc5b655";

async function queryBuild() {
  const query = `query {
    builds {
      byId(buildId: "${buildId}") {
        id
        status
        createdAt
        updatedAt
        enqueuedAt
        error {
          message
          errorCode
        }
        artifacts {
          buildUrl
        }
      }
    }
  }`;
  try {
    const res = await fetch('https://api.expo.dev/graphql', {
      method: 'POST',
      headers: {
        'expo-session': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    return data.data?.builds?.byId;
  } catch (err) {
    console.warn('Transient network error querying build, will retry:', err.message);
    return null;
  }
}

async function waitForBuild() {
  console.log(`Monitoring build: ${buildId}...`);
  while (true) {
    const build = await queryBuild();
    if (!build) {
      console.log(`[${new Date().toLocaleTimeString()}] Retrying build query...`);
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }
    console.log(`[${new Date().toLocaleTimeString()}] Status: ${build.status}`);
    if (build.status === 'FINISHED') {
      return build;
    }
    if (build.status === 'ERRORED' || build.status === 'CANCELED') {
      console.error('Build failed with error:', JSON.stringify(build.error, null, 2));
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 15000));
  }
}

async function downloadFile(url, dest) {
  console.log(`Downloading ${url} to ${dest}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  console.log(`Downloaded ${buffer.length} bytes.`);
}

function verifyAab(aabPath) {
  console.log(`\n=== VERIFYING AAB: ${aabPath} ===`);
  const outDir = path.resolve('scratch_aab_check');
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Unzip base/manifest/AndroidManifest.xml and META-INF/*
  execSync(`tar -xf "${aabPath}" -C "${outDir}" base/manifest/AndroidManifest.xml META-INF`, { stdio: 'inherit' });

  // 1. Verify Manifest
  const manifestBuf = fs.readFileSync(path.join(outDir, 'base/manifest/AndroidManifest.xml'));
  const manifestStr = manifestBuf.toString('binary');
  
  // Package
  const hasCleverOps = manifestStr.includes('cleverops.app.in');
  const hasHelloWorld = manifestStr.includes('com.helloworld');
  const hasSmartdineMobile = manifestStr.includes('com.smartdine.mobile');
  
  console.log(`Package "cleverops.app.in" present: ${hasCleverOps}`);
  console.log(`Legacy "com.helloworld" present: ${hasHelloWorld}`);
  console.log(`Legacy "com.smartdine.mobile" present: ${hasSmartdineMobile}`);

  // targetSdkVersion and compileSdkVersion
  const targetSdkIdx = manifestStr.indexOf('targetSdkVersion');
  let targetSdkVal = 'unknown';
  if (targetSdkIdx >= 0) {
    const hex = manifestBuf.subarray(targetSdkIdx, targetSdkIdx + 30).toString('hex');
    // Check if contains "36" (hex 3336)
    if (hex.includes('3336')) targetSdkVal = '36';
    else if (hex.includes('3335')) targetSdkVal = '35';
    else if (hex.includes('3334')) targetSdkVal = '34';
  }
  console.log(`Detected targetSdkVersion: ${targetSdkVal}`);

  const compileSdkIdx = manifestStr.indexOf('compileSdkVersion');
  let compileSdkVal = 'unknown';
  if (compileSdkIdx >= 0) {
    const hex = manifestBuf.subarray(compileSdkIdx, compileSdkIdx + 30).toString('hex');
    if (hex.includes('3336')) compileSdkVal = '36';
    else if (hex.includes('3335')) compileSdkVal = '35';
    else if (hex.includes('3334')) compileSdkVal = '34';
  }
  console.log(`Detected compileSdkVersion: ${compileSdkVal}`);

  // versionCode
  const vcIdx = manifestStr.indexOf('versionCode');
  let vcVal = 'unknown';
  if (vcIdx >= 0) {
    const hex = manifestBuf.subarray(vcIdx, vcIdx + 30).toString('hex');
    if (hex.includes('3231')) vcVal = '21';
    else if (hex.includes('3230')) vcVal = '20';
  }
  console.log(`Detected versionCode: ${vcVal}`);

  // 2. Verify Signing Certificate
  const metaDir = path.join(outDir, 'META-INF');
  const files = fs.readdirSync(metaDir);
  const certFile = files.find(f => f.endsWith('.RSA') || f.endsWith('.DSA') || f.endsWith('.EC'));
  if (!certFile) {
    console.error('No certificate file found in META-INF!');
    return false;
  }
  
  const certPath = path.join(metaDir, certFile);
  const keytoolPath = path.resolve('tools/jre/bin/keytool.exe');
  const keytoolOut = execSync(`"${keytoolPath}" -printcert -file "${certPath}"`, { encoding: 'utf8' });
  console.log('\nCertificate Output:\n' + keytoolOut);

  const expectedSha1 = '7A:77:86:10:0D:F6:90:EF:E2:24:24:7D:17:81:4F:C4:95:C7:30:5B';
  const sha1Match = keytoolOut.includes(expectedSha1);
  console.log(`SHA-1 Matches Expected (${expectedSha1}): ${sha1Match}`);

  const allPass = hasCleverOps && !hasHelloWorld && sha1Match && targetSdkVal === '36';
  if (allPass) {
    console.log('\n>>> VERIFICATION SUCCESSFUL: AAB TARGETS API 36 AND IS READY FOR PLAY STORE! <<<');
    return true;
  } else {
    console.error('\n>>> VERIFICATION FAILED! <<<');
    return false;
  }
}

async function main() {
  const build = await waitForBuild();
  const buildUrl = build.artifacts?.buildUrl;
  if (!buildUrl) {
    console.error('No buildUrl found in build artifacts!');
    process.exit(1);
  }

  const destAab = path.resolve('cleverops.app.in.aab');
  await downloadFile(buildUrl, destAab);

  // Also copy to public/
  const publicDir = path.resolve('public');
  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(destAab, path.join(publicDir, 'cleverops.app.in.aab'));
  }

  const ok = verifyAab(destAab);
  if (!ok) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
