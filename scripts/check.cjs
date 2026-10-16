const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
let syntax = 0;
for (const folder of ['src', 'scripts', 'tests', 'vendor', 'dist']) {
  for (const file of walk(path.join(root, folder))) {
    if (/\.(?:js|cjs)$/.test(file)) { new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file }); syntax++; }
    if (/\.json$/.test(file)) JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}
const release = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'accepted-artifacts.json')));
const current = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
if (release.version !== current.version) throw Error('Update the accepted artifact record for this release.');
for (const [relative, accepted] of Object.entries(release.files)) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist', relative))).digest('hex');
  if (hash !== accepted) throw Error('Accepted runtime bytes differ: ' + relative);
}
const theme = fs.readFileSync(path.join(root, 'dist', 'themes', 'Supernote Paper', 'theme.css'), 'utf8');
if ((theme.match(/data:font\/ttf;base64,/g) || []).length !== 2 || theme.includes('url("./fonts/')) throw Error('Both offline font payloads must be embedded.');
const defaults = JSON.parse(fs.readFileSync(path.join(root, 'src', 'reader', 'defaults.json')));
if (Object.keys(defaults).some(key => ['positions', 'library', 'perf', 'sidebarPrev'].includes(key))) throw Error('Fresh defaults must not include saved reading state.');
for (const file of walk(path.join(root, 'dist'))) {
  if (/^(?:data|appearance|workspace(?:-mobile)?)\.json$/.test(path.basename(file))) throw Error('Saved vault data in distribution: ' + file);
}
console.log(`Checked ${syntax} JavaScript files; all ${Object.keys(release.files).length} accepted runtime hashes match.`);
