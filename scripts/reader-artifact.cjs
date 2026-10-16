'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const READER_ID = 'md-reader';
const FILE_NAMES = ['main.js', 'styles.css', 'manifest.json', 'LICENSE'];
const SHA256_RE = /^[a-f0-9]{64}$/i;

function validatePin(pin) {
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) {
    throw new TypeError('Reader pin must be an object');
  }
  if (pin.id !== READER_ID) throw new Error(`Reader pin id must be ${READER_ID}`);
  if (typeof pin.version !== 'string' || pin.version.trim() === '') {
    throw new Error('Reader pin version must be a nonempty string');
  }
  if (!pin.files || typeof pin.files !== 'object' || Array.isArray(pin.files)) {
    throw new TypeError('Reader pin files must be an object');
  }

  const names = Object.keys(pin.files);
  if (names.length !== FILE_NAMES.length || FILE_NAMES.some(name => !Object.hasOwn(pin.files, name))) {
    throw new Error(`Reader pin files must contain exactly: ${FILE_NAMES.join(', ')}`);
  }
  for (const name of FILE_NAMES) {
    if (typeof pin.files[name] !== 'string' || !SHA256_RE.test(pin.files[name])) {
      throw new Error(`Reader pin has an invalid SHA-256 for ${name}`);
    }
  }
}

function readReaderSnapshot(directory, pin) {
  validatePin(pin);
  if (typeof directory !== 'string' || directory.length === 0) {
    throw new TypeError('Reader source directory must be a nonempty path');
  }
  const source = path.resolve(directory);
  const sourceInfo = fs.statSync(source);
  if (!sourceInfo.isDirectory()) throw new Error(`Reader source is not a directory: ${source}`);

  const files = {};
  for (const name of FILE_NAMES) {
    const filePath = path.join(source, name);
    const info = fs.lstatSync(filePath);
    if (!info.isFile()) throw new Error(`Reader artifact must be a regular file: ${name}`);
    const bytes = fs.readFileSync(filePath);
    const actual = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actual !== pin.files[name].toLowerCase()) {
      throw new Error(`Reader artifact hash mismatch: ${name}`);
    }
    files[name] = bytes;
  }

  let manifest;
  try {
    manifest = JSON.parse(files['manifest.json'].toString('utf8'));
  } catch (error) {
    throw new Error('Reader manifest is not valid JSON', { cause: error });
  }
  if (manifest?.id !== pin.id) throw new Error('Reader manifest id does not match the pin');
  if (manifest?.version !== pin.version) throw new Error('Reader manifest version does not match the pin');

  return { id: pin.id, version: pin.version, files };
}

function copyReaderSnapshot(directory, output, pin) {
  // Validate and hash every source file before creating or changing the output.
  const snapshot = readReaderSnapshot(directory, pin);
  if (typeof output !== 'string' || output.length === 0) {
    throw new TypeError('Reader output directory must be a nonempty path');
  }
  const destination = path.resolve(output);
  fs.mkdirSync(destination, { recursive: true });
  for (const name of FILE_NAMES) fs.writeFileSync(path.join(destination, name), snapshot.files[name]);
  return snapshot;
}

module.exports = { readReaderSnapshot, copyReaderSnapshot };
