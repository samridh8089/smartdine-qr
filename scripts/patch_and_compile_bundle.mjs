import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const bundleJs = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
const bundleHbc = path.resolve('smartdine-mobile/dist-android/index.android.bundle.hbc');
const hermescExe = path.resolve('smartdine-mobile/node_modules/react-native/sdks/hermesc/win64-bin/hermesc.exe');

const REAL_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

console.log('Reading Metro bundle...');
let code = fs.readFileSync(bundleJs, 'utf8');

const countBefore = (code.match(/mock-anon-key/g) || []).length;
console.log(`Occurrences of 'mock-anon-key' before: ${countBefore}`);

code = code.replaceAll("'mock-anon-key'", `'${REAL_KEY}'`);
code = code.replaceAll('"mock-anon-key"', `"${REAL_KEY}"`);

const countAfter = (code.match(/mock-anon-key/g) || []).length;
const realKeyCount = (code.match(new RegExp(REAL_KEY, 'g')) || []).length;
console.log(`Occurrences of 'mock-anon-key' after: ${countAfter}`);
console.log(`Occurrences of REAL_KEY after: ${realKeyCount}`);

fs.writeFileSync(bundleJs, code);
console.log('Saved patched index.android.bundle');

console.log('Compiling to Hermes Bytecode v96...');
execSync(`"${hermescExe}" -emit-binary -O -output-source-map -out "${bundleHbc}" "${bundleJs}"`, { stdio: 'inherit' });

const hbcBuf = fs.readFileSync(bundleHbc);
console.log(`HBC compiled! Size: ${(hbcBuf.length / 1024 / 1024).toFixed(2)} MB, Magic: ${hbcBuf.subarray(0, 8).toString('hex')}`);
