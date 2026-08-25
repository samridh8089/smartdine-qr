import fs from 'fs';
import path from 'path';

const resultsPath = path.resolve(process.cwd(), 'playwright-report/results.json');
if (!fs.existsSync(resultsPath)) {
  console.log('No results.json found.');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

let passed = 0;
let failed = 0;
let skipped = 0;
let total = 0;
const failures = [];

function processSuite(suite) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        total++;
        const status = test.status;
        if (status === 'expected') passed++;
        else if (status === 'unexpected') {
          failed++;
          failures.push({
            title: `${suite.title} > ${spec.title}`,
            error: test.results[0]?.error?.message || 'Unknown error',
            location: `${spec.file}:${spec.line}`
          });
        } else if (status === 'skipped') {
          skipped++;
        }
      }
    }
  }
  if (suite.suites) {
    for (const sub of suite.suites) {
      processSuite(sub);
    }
  }
}

for (const suite of data.suites || []) {
  processSuite(suite);
}

console.log('SUMMARY RESULTS:');
console.log(`Total: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Skipped: ${skipped}`);
console.log('FAILURES:', JSON.stringify(failures, null, 2));
