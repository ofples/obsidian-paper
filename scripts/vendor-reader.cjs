'use strict';

// Explicit maintainer operation. No build step downloads or updates a Reader.
const fs = require('node:fs');
const path = require('node:path');
const { copyReaderSnapshot } = require('./reader-artifact.cjs');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--from' || !args[1]) {
  throw Error('Usage: npm run reader:vendor -- --from <reviewed canonical artifact directory>');
}
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'bundle-lock.json'), 'utf8'));
if (lock.schemaVersion !== 1) throw Error('Unsupported bundle lock version');
copyReaderSnapshot(path.resolve(args[1]), path.join(root, 'vendor', 'md-reader'), lock.components.reader);
console.log(`Imported verified MD Reader ${lock.components.reader.version}; no vault settings changed.`);
