const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src', 'sidebar');
const output = path.join(root, 'dist', 'plugins', 'supernote-sidebar');
let main = fs.readFileSync(path.join(source, 'main.js'), 'utf8');
const inline = (name, declaration) => fs.readFileSync(path.join(source, name), 'utf8')
  .replace('module.exports = ' + declaration, declaration).replace(/;\s*$/, '');
const reuse = inline('file-reuse.js', 'function installFileReuse(plugin)');
const fullscreen = inline('fullscreen-double-tap.js', 'function installFullscreenDoubleTap(plugin)');
main = main.replace("const READER = 'horizontal-reader-view';", "const READER = 'horizontal-reader-view';\n" + reuse + '\n' + fullscreen);
if (!main.includes('installFileReuse(this);')) throw Error('Missing file reuse initialization');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'main.js'), main);
fs.copyFileSync(path.join(source, 'manifest.json'), path.join(output, 'manifest.json'));
fs.copyFileSync(path.join(source, 'styles.css'), path.join(output, 'styles.css'));
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(output, 'LICENSE'));
console.log('Built Supernote Sidebar.');
