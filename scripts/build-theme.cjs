const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src', 'theme');
const output = path.join(root, 'dist', 'themes', 'Supernote Paper');
const files = ['Literata[opsz,wght].ttf', 'Literata-Italic[opsz,wght].ttf'];
let css = ['base.css', 'mobile.css', 'font.css']
  .map(name => fs.readFileSync(path.join(source, name), 'utf8')).join('\n\n');
for (const name of files) {
  const reference = `url("./fonts/${name}")`;
  if (!css.includes(reference)) throw Error('Missing font reference: ' + name);
  css = css.replaceAll(reference, `url("data:font/ttf;base64,${fs.readFileSync(path.join(source, 'fonts', name)).toString('base64')}")`);
}
fs.mkdirSync(path.join(output, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(output, 'theme.css'), css);
fs.copyFileSync(path.join(source, 'manifest.json'), path.join(output, 'manifest.json'));
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(output, 'LICENSE'));
for (const name of [...files, 'OFL-Literata.txt', 'FONT-ATTRIBUTION.txt']) {
  fs.copyFileSync(path.join(source, 'fonts', name), path.join(output, 'fonts', name));
}
fs.copyFileSync(path.join(source, 'Adjustments.css.example'), path.join(output, 'Adjustments.css.example'));
console.log('Built Supernote Paper with embedded offline Literata fonts.');
