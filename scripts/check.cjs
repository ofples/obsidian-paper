const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { readReaderSnapshot } = require('./reader-artifact.cjs');
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
if (current.license !== 'MIT') throw Error('Original project source must declare the selected MIT license.');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'bundle-lock.json')));
if (lock.schemaVersion !== 1 || lock.version !== current.version) throw Error('Bundle lock schema/version mismatch.');
const directories = { paper: 'themes/Supernote Paper', sidebar: 'plugins/supernote-sidebar', reader: 'plugins/md-reader' };
for (const [name, directory] of Object.entries(directories)) {
  const pin = lock.components[name];
  if (pin.directory !== directory || pin.optional !== true) throw Error('Invalid optional component: ' + name);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist', directory, 'manifest.json')));
  if (manifest.version !== pin.version || (pin.id && manifest.id !== pin.id) || (pin.name && manifest.name !== pin.name)) {
    throw Error('Component manifest differs from lock: ' + name);
  }
}
const ownLicense = fs.readFileSync(path.join(root, 'LICENSE'));
for (const [name, source] of [['paper', 'theme'], ['sidebar', 'sidebar']]) {
  const pin = lock.components[name];
  for (const directory of [path.join(root, 'src', source), path.join(root, 'dist', pin.directory)]) {
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json')));
    if (pin.license !== 'MIT' || manifest.license !== 'MIT') throw Error('Missing original-source MIT metadata: ' + name);
    if (!fs.readFileSync(path.join(directory, 'LICENSE')).equals(ownLicense)) throw Error('Original-source license copy differs: ' + directory);
  }
}
for (const name of ['OFL-Literata.txt', 'FONT-ATTRIBUTION.txt']) {
  const source = fs.readFileSync(path.join(root, 'src', 'theme', 'fonts', name));
  const output = fs.readFileSync(path.join(root, 'dist', 'themes', 'Supernote Paper', 'fonts', name));
  if (!source.equals(output)) throw Error('Bundled font license or attribution differs: ' + name);
}
const reader = lock.components.reader;
if (!/^[a-f0-9]{40}$/.test(reader.source.commit)) throw Error('Reader must pin an exact source commit.');
readReaderSnapshot(path.join(root, 'vendor', 'md-reader'), reader);
readReaderSnapshot(path.join(root, 'dist', 'plugins', 'md-reader'), reader);
if (!fs.existsSync(path.join(root, 'dist', 'plugins', 'supernote-sidebar', 'styles.css'))) {
  throw Error('Sidebar must ship its independent stylesheet.');
}
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
