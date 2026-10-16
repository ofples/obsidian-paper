const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
for (const name of ['build-theme.cjs', 'build-sidebar.cjs', 'build-reader.cjs']) {
  execFileSync(process.execPath, [path.join(__dirname, name)], { cwd: root, stdio: 'inherit' });
}
