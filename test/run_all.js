const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const testDir = __dirname;
const files = fs.readdirSync(testDir).filter(f => f.startsWith('test_') && f.endsWith('.js'));

console.log(`Discovered ${files.length} test suites.`);
let passed = 0;
let failed = 0;

for (const file of files) {
  process.stdout.write(`Running ${file}... `);
  try {
    cp.execSync(`node "${path.join(testDir, file)}"`, { stdio: 'pipe' });
    console.log('PASS');
    passed++;
  } catch (err) {
    console.log('FAIL');
    console.error(err.stdout ? err.stdout.toString() : '');
    console.error(err.stderr ? err.stderr.toString() : '');
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${files.length}`);
if (failed > 0) process.exit(1);
