const { spawn } = require('child_process');

console.log('Triggering EAS production-aab build for Version 62...');

const proc = spawn('npx.cmd', [
  'eas-cli',
  'build',
  '--platform',
  'android',
  '--profile',
  'production-aab',
  '--non-interactive'
], {
  cwd: 'smartdine-mobile',
  shell: true,
  stdio: 'pipe'
});

proc.stdout.on('data', (d) => {
  process.stdout.write(d.toString());
});

proc.stderr.on('data', (d) => {
  process.stderr.write(d.toString());
});

proc.on('close', (code) => {
  console.log('\n[EAS Process Exited with code:', code, ']');
});
