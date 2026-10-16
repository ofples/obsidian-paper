'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './file-reuse.js' || request === './fullscreen-double-tap.js') return () => {};
  if (request === 'obsidian') {
    return {
      Plugin: class Plugin {}, Modal: class Modal {}, PluginSettingTab: class PluginSettingTab {},
      Setting: class Setting {}, Notice: class Notice {}, setIcon() {},
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
let SupernoteSidebar;
try { SupernoteSidebar = require('../src/sidebar/main.js'); }
finally { Module._load = originalLoad; }

async function withDocument(body, callback) {
  const previous = global.document;
  global.document = { body, querySelector: () => null };
  try { return await callback(); }
  finally { global.document = previous; }
}

function makePlugin({ reader = false, mode = 'pages' } = {}) {
  const plugin = Object.create(SupernoteSidebar.prototype);
  plugin.settings = { readingMode: mode, fullscreenReading: false, fullscreenDoubleTap: true };
  plugin.app = {
    plugins: { plugins: reader ? { 'md-reader': {} } : {} },
    workspace: {
      activeLeaf: null,
      async revealLeaf(leaf) { this.activeLeaf = leaf; },
      setActiveLeaf(leaf) { this.activeLeaf = leaf; },
    },
  };
  plugin.switching = false;
  plugin.closeDrawers = () => {};
  plugin.decorate = () => {};
  plugin.syncFullscreen = () => {};
  plugin.saveData = async data => { plugin.saved = { ...data }; };
  return plugin;
}

function makeLeaf({ type = 'markdown', mode = 'source' } = {}) {
  const leaf = {
    parent: {},
    view: {
      file: { path: 'Note.md' },
      type,
      mode,
      getViewType() { return this.type; },
      getMode() { return this.mode; },
    },
    async setViewState(state) {
      this.state = state;
      this.view.type = state.type;
      this.view.mode = state.state.mode;
    },
    async loadIfDeferred() {},
  };
  return leaf;
}

test('Read note falls back to native Markdown Preview without MD Reader and keeps the saved pages preference', async () => {
  const plugin = makePlugin();
  const leaf = makeLeaf();
  plugin.app.workspace.activeLeaf = leaf;
  const body = { classList: { matches: () => false } };

  await withDocument(body, async () => {
    await plugin.read(leaf);
    assert.deepEqual(leaf.state, {
      type: 'markdown', state: { file: 'Note.md', mode: 'preview' }, active: true,
    });
    assert.equal(plugin.settings.readingMode, 'pages');
    assert.equal(plugin.saved, undefined, 'the temporary fallback does not overwrite the user preference');
  });
});

test('mode action alternates between edit and scrolling when MD Reader is unavailable', async () => {
  const plugin = makePlugin();
  const preview = makeLeaf({ mode: 'preview' });
  let edits = 0;
  plugin.edit = async () => { edits++; };
  await plugin.cycleReadingMode(preview);
  assert.equal(edits, 1, 'the action exits native preview instead of requesting unavailable pages');

  const source = makeLeaf({ mode: 'source' });
  let requestedMode;
  plugin.read = async (_leaf, mode) => { requestedMode = mode; };
  await plugin.cycleReadingMode(source);
  assert.equal(requestedMode, 'scroll');

  const label = { value: null, icon: null, getAttribute() { return this.value; }, setAttribute(_key, value) { this.value = value; } };
  plugin.modeButtons = new WeakMap([[preview.view, label]]);
  plugin.updateMode(preview.view);
  assert.equal(label.value, 'Edit note');
  assert.equal(plugin.settings.readingMode, 'pages');
});

test('automatic page routing stays idle without MD Reader instead of reopening Preview on every interval', async () => {
  const plugin = makePlugin();
  const leaf = makeLeaf({ mode: 'preview' });
  plugin.app.workspace.activeLeaf = leaf;
  let reads = 0;
  plugin.updateMode = () => {};
  plugin.read = () => { reads++; };
  await withDocument({ body: { classList: { matches: () => false } } }, () => plugin.routeReading());
  assert.equal(reads, 0);
});

test('automatic routing uses Pages when Reader is available, then falls back if Reader disappears', async () => {
  const plugin = makePlugin({ reader: true });
  const leaf = makeLeaf({ mode: 'preview' });
  plugin.app.workspace.activeLeaf = leaf;
  plugin.updateMode = () => {};
  let transition;
  plugin.read = (...args) => {
    transition = SupernoteSidebar.prototype.read.call(plugin, ...args);
    return transition;
  };
  const body = { classList: { matches: () => false } };

  await withDocument(body, async () => {
    plugin.routeReading();
    await transition;
    assert.deepEqual(leaf.state, {
      type: 'horizontal-reader-view', state: { filePath: 'Note.md' }, active: true,
    });

    plugin.app.plugins.plugins = {};
    leaf.view.type = 'markdown';
    leaf.view.mode = 'preview';
    await plugin.read(leaf);
    assert.deepEqual(leaf.state, {
      type: 'markdown', state: { file: 'Note.md', mode: 'preview' }, active: true,
    });
    assert.equal(plugin.settings.readingMode, 'pages', 'capability loss does not overwrite the saved preference');
  });
});

test('native mode control decoration is removed when its view unloads', () => {
  const plugin = makePlugin();
  delete plugin.decorate;
  const classes = new Set();
  const nativeMode = {
    hasClass: name => classes.has(name),
    addClass: name => classes.add(name),
    removeClass: name => classes.delete(name),
  };
  const fileToggle = { addEventListener() {}, addClass() {}, remove() {} };
  const left = { createEl: () => fileToggle, prepend() {} };
  const modeAction = {
    getAttribute: () => null,
    setAttribute() {},
    addClass() {},
    remove() {},
  };
  const view = {
    headerEl: {
      querySelector: () => left,
      querySelectorAll: () => [nativeMode],
    },
    getViewType: () => 'markdown',
    getMode: () => 'source',
    addAction: () => modeAction,
    register(callback) { this.cleanup = callback; },
  };
  const leaf = { view };
  plugin.app.workspace.getLeavesOfType = type => type === 'markdown' ? [leaf] : [];
  plugin.seen = new WeakSet();
  plugin.modeButtons = new WeakMap();
  plugin.decorations = new Set();

  plugin.decorate();
  assert.equal(classes.has('sn-native-mode'), true);
  view.cleanup();
  assert.equal(classes.has('sn-native-mode'), false);
});

test('Sidebar active body class is removed on unload', async () => {
  const classes = new Set();
  const body = { classList: {
    add: value => classes.add(value),
    remove: (...values) => values.forEach(value => classes.delete(value)),
    toggle: (value, on) => on ? classes.add(value) : classes.delete(value),
    contains: value => classes.has(value),
  } };
  const previousDocument = global.document;
  const previousWindow = global.window;
  const previousInstallReuse = global.installFileReuse;
  const previousInstallGesture = global.installFullscreenDoubleTap;
  global.document = { body };
  global.window = { setInterval: () => 1 };
  global.installFileReuse = () => {};
  global.installFullscreenDoubleTap = () => {};
  const plugin = Object.create(SupernoteSidebar.prototype);
  Object.assign(plugin, {
    loadData: async () => ({}), addSettingTab() {}, addCommand() {},
    addRibbonIcon: () => ({ addClass() {} }),
    registerEvent() {}, registerInterval() {}, registerDomEvent() {},
    installFileReuse() {}, installFullscreenDoubleTap() {}, installEdgeGestures() {},
    app: { workspace: { onLayoutReady() {}, on() { return {}; } } },
    decorations: new Set(), closeDrawers() {},
  });
  try {
    await plugin.onload();
    assert.equal(classes.has('sn-sidebar-active'), true);
    plugin.onunload();
    assert.equal(classes.has('sn-sidebar-active'), false);
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
    if (previousInstallReuse === undefined) delete global.installFileReuse;
    else global.installFileReuse = previousInstallReuse;
    if (previousInstallGesture === undefined) delete global.installFullscreenDoubleTap;
    else global.installFullscreenDoubleTap = previousInstallGesture;
  }
});
