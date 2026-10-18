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

function element({ tag = 'div', classes = [], attrs = {}, parentElement = null } = {}) {
  const classNames = new Set(classes);
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    parentElement,
    classList: { contains: name => classNames.has(name) },
    hasAttribute(name) { return Object.hasOwn(attrs, name); },
    closest(selector) {
      const selectors = selector.split(',').map(value => value.trim());
      for (let node = this; node; node = node.parentElement) {
        if (selectors.some(value => {
          if (value.startsWith('.')) return node.classList.contains(value.slice(1));
          if (value.startsWith('[')) return node.hasAttribute(value.slice(1, -1).split('=')[0]);
          return node.tagName.toLowerCase() === value.toLowerCase();
        })) return node;
      }
      return null;
    },
  };
}

function fixture(target = element()) {
  const handlers = new Map();
  const opened = [];
  const area = {
    contains(node) { for (let current = node; current; current = current.parentElement) if (current === target || current.areaMember) return true; return false; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600 }; },
  };
  const view = {
    getViewType: () => 'horizontal-reader-view',
    viewport: area,
    cancelPaperGesture() {},
  };
  const leaf = { view };
  const bodyClasses = new Set(['is-mobile']);
  const body = {
    classList: { contains: name => bodyClasses.has(name) },
    matches: selector => selector.split(',').some(value => bodyClasses.has(value.trim().replace(/^\./, ''))),
  };
  const doc = {
    body,
    getSelection: () => ({ isCollapsed: true, anchorNode: target }),
    querySelector: () => null,
  };
  const oldDocument = global.document;
  global.document = doc;
  const plugin = Object.create(SupernoteSidebar.prototype);
  Object.assign(plugin, {
    app: { workspace: { activeLeaf: leaf } },
    registerDomEvent(_node, name, callback) { handlers.set(name, callback); },
    isReadingView: candidate => candidate === view,
    readingViewport: () => area,
    openDrawer(side) { opened.push(side); },
    closeDrawers() { opened.push('close'); },
  });
  plugin.installEdgeGestures();

  const fire = (name, eventTarget = target, touches = [], changedTouches = []) => {
    let prevented = 0, stopped = 0;
    handlers.get(name)({
      target: eventTarget, touches, changedTouches,
      preventDefault() { prevented++; },
      stopImmediatePropagation() { stopped++; },
    });
    return { prevented, stopped };
  };
  const touch = x => ({ clientX: x, clientY: 200 });
  const leftSwipe = () => {
    fire('touchstart', target, [touch(20)]);
    const moved = fire('touchmove', target, [touch(30)]);
    const ended = fire('touchend', target, [], [touch(100)]);
    return { moved, ended };
  };
  return {
    leftSwipe, opened, target,
    restore() { global.document = oldDocument; },
  };
}

test('a collapsed selection in unmarked Reader content does not block a normal edge swipe', () => {
  const content = element({ classes: ['hr-reader-content'] });
  const f = fixture(content);
  try {
    const result = f.leftSwipe();
    assert.deepEqual(result.moved, { prevented: 1, stopped: 1 });
    assert.deepEqual(result.ended, { prevented: 1, stopped: 1 });
    assert.deepEqual(f.opened, ['left']);
  } finally { f.restore(); }
});

test('Reader gesture exclusions independently block edge swipes, including SVG descendants of real controls', () => {
  for (const target of [
    element({ tag: 'button' }),
    element({ tag: 'svg', parentElement: element({ tag: 'button' }) }),
    element({ classes: ['hr-reader-selection-actions'] }),
    element({ tag: 'span', parentElement: element({ classes: ['hr-reader-selection-actions'] }) }),
    element({ attrs: { 'data-reader-gesture-ignore': '' } }),
    element({ tag: 'span', parentElement: element({ attrs: { 'data-reader-gesture-ignore': '' } }) }),
  ]) {
    const f = fixture(target);
    try {
      const result = f.leftSwipe();
      assert.deepEqual(result.moved, { prevented: 0, stopped: 0 });
      assert.deepEqual(result.ended, { prevented: 0, stopped: 0 });
      assert.deepEqual(f.opened, []);
    } finally { f.restore(); }
  }
});
