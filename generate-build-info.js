const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let commitHash = process.env.VERCEL_GIT_COMMIT_SHA || '';
if (!commitHash) {
  try {
    commitHash = execSync('git rev-parse HEAD').toString().trim();
  } catch (err) {
    commitHash = 'unknown';
  }
}

const buildTime = new Date().toISOString();
const env = process.env.VERCEL_ENV || 'production';
const schemaVersion = '20260628000000_activity_log_and_cancellation';

const buildInfo = {
  commit: commitHash,
  buildTime,
  env,
  schemaVersion
};

fs.writeFileSync(
  path.join(__dirname, 'src/lib/build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);
console.log('SUCCESS: Generated build-info.json:', buildInfo);
