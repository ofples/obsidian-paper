'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const installFileReuse = require('../src/sidebar/file-reuse.js');

const file = path => ({ path });

function createWorkspace(paths = [], { activeIndex = paths.length - 1, allocateOnFalse = false, deferred = {} } = {}) {
  const workspace = { rootSplit: {}, rootLeaves: [], activeLeaf: null, allocateOnFalse, nextId: 0 };
  const leafPrototype = {
    async openFile(openedFile, options) {
      this.openCalls = (this.openCalls || 0) + 1;
      if (this.workspace.openGate) await this.workspace.openGate;
      this.view.file = openedFile;
      this.view.deferredPath = null;
      this.view.type = options?.state ? 'markdown' : 'markdown';
      return this;
    },
  };
  const makeLeaf = (path = null, id = `leaf-${++workspace.nextId}`) => {
    const leaf = Object.assign(Object.create(leafPrototype), {
      id,
      workspace,
      parent: workspace.rootSplit,
      activeTime: 0,
      openCalls: 0,
      view: {
        file: path ? file(path) : null,
        deferredPath: deferred[id] || null,
        type: null,
        getViewType() { return this.type || (this.file || this.deferredPath ? 'markdown' : 'empty'); },
      },
      getRoot() { return this.parent ? workspace.rootSplit : null; },
      getViewState() {
        const path = this.view.deferredPath || this.view.file?.path;
        return { type: this.view.getViewType(), state: path ? { filePath: path } : {} };
      },
      async loadIfDeferred() {},
      async setEphemeralState(state) { this.ephemeralState = state; },
      detach() {
        this.parent = null;
        workspace.rootLeaves = workspace.rootLeaves.filter(item => item !== this);
        if (workspace.activeLeaf === this) workspace.activeLeaf = workspace.rootLeaves.at(-1) || null;
      },
    });
    workspace.rootLeaves.push(leaf);
    return leaf;
  };
  paths.forEach((path, index) => makeLeaf(path, `leaf-${index + 1}`));
  workspace.nextId = paths.length;
  workspace.activeLeaf = workspace.rootLeaves[activeIndex] || null;
  workspace.iterateRootLeaves = callback => {
    // Obsidian stops iteration when a callback returns truthy.
    for (const leaf of [...workspace.rootLeaves]) if (callback(leaf)) return leaf;
    return undefined;
  };
  workspace.revealLeaf = async leaf => { workspace.activeLeaf = leaf; };
  workspace.setActiveLeaf = leaf => { workspace.activeLeaf = leaf; };
  workspace.getLeaf = function (mode) {
    if (mode === true || ['tab', 'split', 'window'].includes(mode) || (!mode && this.allocateOnFalse)) {
      const leaf = makeLeaf();
      workspace.activeLeaf = leaf;
      return leaf;
    }
    return workspace.activeLeaf;
  };
  workspace.makeLeaf = makeLeaf;
  workspace.setReadyCallback = callback => { workspace.readyCallback = callback; };
  return workspace;
}

function install(workspace) {
  const cleanup = [];
  const plugin = {
    app: { workspace },
    closeDrawers() {},
    register(callback) { cleanup.push(callback); },
    unload() { for (const callback of cleanup.splice(0).reverse()) callback(); },
  };
  installFileReuse(plugin);
  return plugin;
}

test('ordinary open redirects to an existing file and preserves a pre-existing empty active tab', async () => {
  const workspace = createWorkspace(['Target.md', null, null], { activeIndex: 2 });
  const plugin = install(workspace);
  const existing = workspace.rootLeaves[0];
  const activeEmpty = workspace.activeLeaf;
  const before = workspace.rootLeaves.map(leaf => leaf.id);
  try {
    await workspace.getLeaf(false).openFile(file('Target.md'));
    assert.equal(workspace.activeLeaf, existing);
    assert.equal(plugin.findOpenFile('Target.md'), existing);
    assert.equal(activeEmpty.parent, workspace.rootSplit, 'an empty tab that existed before this open is retained');
    assert.deepEqual(workspace.rootLeaves.map(leaf => leaf.id), before, 'no root tab is added or removed');
  } finally { plugin.unload(); }
});

test('truthy-stopping root iteration finds matches beyond earlier leaves', () => {
  const workspace = createWorkspace(['Target.md', null, 'Target.md'], { activeIndex: 2 });
  const plugin = install(workspace);
  try {
    assert.equal(plugin.findOpenFile('Target.md'), workspace.rootLeaves[2], 'the active duplicate wins after scanning the full root iterator');
    const found = [];
    workspace.iterateRootLeaves(leaf => { if (leaf.view.file?.path === 'Target.md') found.push(leaf); });
    assert.equal(found.length, 2);
  } finally { plugin.unload(); }
});

test('a newly auto-allocated empty leaf is discarded after redirecting to an existing file', async () => {
  const workspace = createWorkspace(['Target.md', null], { activeIndex: 1, allocateOnFalse: true });
  const plugin = install(workspace);
  const before = workspace.rootLeaves.map(leaf => leaf.id);
  try {
    const allocated = workspace.getLeaf(false);
    await allocated.openFile(file('Target.md'));
    assert.equal(workspace.activeLeaf, workspace.rootLeaves[0]);
    assert.equal(allocated.parent, null);
    assert.deepEqual(workspace.rootLeaves.map(leaf => leaf.id), before);
  } finally { plugin.unload(); }
});

test('explicit new-tab intent preserves a deliberate duplicate copy', async () => {
  const workspace = createWorkspace(['Target.md']);
  const plugin = install(workspace);
  try {
    const original = workspace.rootLeaves[0];
    const copy = workspace.getLeaf('tab');
    await copy.openFile(file('Target.md'));
    assert.equal(original.view.file.path, 'Target.md');
    assert.equal(copy.view.file.path, 'Target.md');
    assert.equal(copy.parent, workspace.rootSplit);
    assert.equal(workspace.rootLeaves.filter(leaf => leaf.view.file?.path === 'Target.md').length, 2);
  } finally { plugin.unload(); }
});

test('five concurrent ordinary opens of a previously unopened file produce one file leaf', async () => {
  const workspace = createWorkspace([null], { activeIndex: 0, allocateOnFalse: true });
  let releaseOpen;
  workspace.openGate = new Promise(resolve => { releaseOpen = resolve; });
  const plugin = install(workspace);
  const originalIds = workspace.rootLeaves.map(leaf => leaf.id);
  try {
    const requests = Array.from({ length: 5 }, () => {
      const leaf = workspace.getLeaf(false);
      return leaf.openFile(file('Concurrent.md'));
    });
    await new Promise(resolve => setImmediate(resolve));
    releaseOpen();
    await Promise.all(requests);
    const matches = workspace.rootLeaves.filter(leaf => leaf.view.file?.path === 'Concurrent.md');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].openCalls, 1, 'only the reserved leaf performs the actual file load');
    assert.equal(workspace.rootLeaves.length, originalIds.length + 1, 'all unused auto-allocated blanks are removed');
    assert(originalIds.every(id => workspace.rootLeaves.some(leaf => leaf.id === id)), 'original leaves remain intact');
    assert.equal(plugin.findOpenFile('Concurrent.md'), matches[0]);
  } finally { plugin.unload(); }
});

test('deferred root leaves participate in lookup through their saved file state', () => {
  const workspace = createWorkspace([null, null, null], { activeIndex: 2, deferred: { 'leaf-3': 'Deferred.md' } });
  const plugin = install(workspace);
  try {
    const deferred = workspace.rootLeaves[2];
    assert.equal(deferred.view.file, null);
    assert.equal(plugin.findOpenFile('Deferred.md'), deferred);
  } finally { plugin.unload(); }
});

test('startup before the first root leaf defers safely, and unload cancels deferred installation', () => {
  const workspace = createWorkspace([]);
  workspace.activeLeaf = null;
  const originalGetLeaf = workspace.getLeaf;
  const callbacks = [];
  workspace.onLayoutReady = callback => { callbacks.push(callback); };
  const plugin = install(workspace);
  assert.equal(workspace.getLeaf, originalGetLeaf, 'no prototype is patched before an active leaf exists');
  const active = workspace.makeLeaf(null, 'ready-leaf');
  workspace.activeLeaf = active;
  callbacks.shift()();
  const wrappedGetLeaf = workspace.getLeaf;
  assert.notEqual(wrappedGetLeaf, originalGetLeaf, 'layout-ready installs the wrapper once a root leaf exists');
  plugin.unload();
  assert.equal(workspace.getLeaf, originalGetLeaf, 'unload restores the original workspace method');

  const lateWorkspace = createWorkspace([]);
  lateWorkspace.activeLeaf = null;
  const lateOriginalGetLeaf = lateWorkspace.getLeaf;
  const lateCallbacks = [];
  lateWorkspace.onLayoutReady = callback => { lateCallbacks.push(callback); };
  const latePlugin = install(lateWorkspace);
  latePlugin.unload();
  lateWorkspace.activeLeaf = lateWorkspace.makeLeaf(null, 'late-leaf');
  lateCallbacks.shift()();
  assert.equal(lateWorkspace.getLeaf, lateOriginalGetLeaf, 'a ready callback after unload cannot install wrappers');
});

test('unload restores wrapped methods and later calls use the original implementation', async () => {
  const workspace = createWorkspace(['Other.md']);
  const prototype = Object.getPrototypeOf(workspace.activeLeaf);
  const originalGetLeaf = workspace.getLeaf;
  const originalOpenFile = prototype.openFile;
  const plugin = install(workspace);
  assert.notEqual(workspace.getLeaf, originalGetLeaf);
  assert.notEqual(prototype.openFile, originalOpenFile);
  plugin.unload();
  assert.equal(workspace.getLeaf, originalGetLeaf);
  assert.equal(prototype.openFile, originalOpenFile);
  const blank = workspace.makeLeaf();
  await blank.openFile(file('Ordinary.md'));
  assert.equal(blank.view.file.path, 'Ordinary.md');
});
