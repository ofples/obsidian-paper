'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const installFullscreenDoubleTap = require('../src/sidebar/fullscreen-double-tap.js');

function makeElement({ tag = 'div', classes = [], attrs = {}, parentElement = null, insideArea = true } = {}) {
  const classNames = new Set(classes);
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    insideArea,
    attrs,
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

function fixture(options = {}) {
  const {
    enabled = true, viewType = 'horizontal-reader-view', blocked = false,
    blockedMarker = null, selected = false, collapsedSelection = false, root = true,
  } = options;
  const handlers = new Map();
  const timers = new Map();
  let nextTimer = 1;
  let toggles = 0;
  let target;
  const makeTarget = (isBlocked = false, insideArea = true) => makeElement({
    tag: isBlocked ? 'button' : 'div',
    insideArea,
  });
  if (blockedMarker) {
    const dock = makeElement({
      tag: 'div', insideArea: true,
      classes: blockedMarker === '.hr-reader-selection-actions' ? ['hr-reader-selection-actions'] : [],
      attrs: blockedMarker === '[data-reader-gesture-ignore]' ? { 'data-reader-gesture-ignore': '' } : {},
    });
    target = makeElement({ tag: 'svg', parentElement: dock, insideArea: true });
  } else target = makeTarget(blocked);
  const area = {
    isConnected: true,
    contains(node) { return node === this || node?.insideArea === true || node === target; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 600 }; },
  };
  const view = {
    getViewType: () => viewType,
    getMode: () => 'preview',
    isSelectionGestureActive: () => options.contentPointerHeld === true,
    isTextSelectionActive: () => options.textSelectionActive === true,
    viewport: area,
    containerEl: { querySelector: () => area },
  };
  const leaf = { view, getRoot: () => root ? workspace.rootSplit : {}, getViewState: () => ({}) };
  const workspace = { rootSplit: {}, activeLeaf: leaf };
  const bodyClasses = new Set(['is-mobile']);
  const body = { classList: { contains: name => bodyClasses.has(name) }, matches: selector => selector.split(',').some(x => bodyClasses.has(x.trim().replace(/^\./, ''))) };
  const doc = {
    body,
    getSelection: () => selected ? { isCollapsed: false, anchorNode: target } : collapsedSelection ? { isCollapsed: true, anchorNode: target } : null,
    querySelector: selector => selector.split(',').some(x => bodyClasses.has(x.trim().replace(/^\./, ''))) ? {} : null,
    elementFromPoint: () => target,
  };
  const oldDocument = global.document;
  const oldWindow = global.window;
  global.document = doc;
  global.window = {
    setTimeout(fn) { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const plugin = {
    settings: { fullscreenDoubleTap: enabled },
    app: { workspace },
    registerDomEvent(_node, name, fn) { handlers.set(name, fn); },
    register(fn) { plugin.cleanup = fn; },
    toggleFullscreen() { toggles++; },
  };
  installFullscreenDoubleTap(plugin);

  const fire = (name, touches = [], changedTouches = [], timeStamp = 0, options = {}) => {
    let prevented = 0;
    let stopped = 0;
    const event = {
      target: options.target || target,
      touches,
      changedTouches,
      timeStamp,
      clientX: options.clientX ?? 34,
      clientY: options.clientY ?? 20,
      detail: options.detail ?? 1,
      sourceCapabilities: options.sourceCapabilities,
      preventDefault() { prevented++; },
      stopImmediatePropagation() { stopped++; },
    };
    handlers.get(name)(event);
    return { prevented, stopped };
  };
  const touch = (identifier, x = identifier === 2 ? 34 : 20, y = 20, touchTarget = target) => ({
    identifier, clientX: x, clientY: y, target: touchTarget,
  });
  const tapPair = start => {
    const first = touch(1), second = touch(2);
    fire('touchstart', [first], [], start);
    fire('touchstart', [first, second], [], start + 50);
    fire('touchend', [second], [first], start + 90);
    fire('touchend', [], [second], start + 120);
  };
  return {
    plugin, handlers, timers, fire, touch, tapPair, target, makeTarget, area, leaf, bodyClasses,
    setTextSelectionActive(value) { options.textSelectionActive = value; },
    get toggles() { return toggles; },
    flush() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } },
    restore() {
      plugin.cleanup?.();
      global.document = oldDocument;
      global.window = oldWindow;
    },
  };
}

test('ordinary finger pointers can still double-tap fullscreen while Reader reports held content pointers', () => {
  const f = fixture({ contentPointerHeld:true });
  try {
    assert.deepEqual(f.fire('touchstart', [f.touch(1)], [], 0), { prevented: 0, stopped: 0 }, 'gesture listener observes rather than consumes touch input');
    f.fire('touchcancel', [], [], 5);
    f.tapPair(0);
    assert.equal(f.toggles, 0, 'one pair is only a candidate');
    f.tapPair(300);
    assert.equal(f.toggles, 0, 'toggle is deferred until the click-cancel window passes');
    f.flush();
    assert.equal(f.toggles, 1);
    assert.deepEqual(f.fire('click', [], [], 450, { clientX: 34, clientY: 20, sourceCapabilities: { firesTouchEvents: true } }), { prevented: 1, stopped: 1 });
  } finally { f.restore(); }
});

test('disabled setting, selection, controls, wrong view, or non-root leaf cannot toggle', () => {
  for (const options of [
    { enabled: false }, { selected: true }, { blocked: true }, { root: false },
    { viewType: 'markdown-source' },
  ]) {
    const f = fixture(options);
    try {
      f.tapPair(0); f.tapPair(200); f.flush();
      assert.equal(f.toggles, 0, JSON.stringify(options));
    } finally { f.restore(); }
  }
});

test('Reader text-selection hook blocks fullscreen gestures with collapsed DOM selection and cancels a pending toggle', () => {
  const atStart = fixture({ collapsedSelection:true, contentPointerHeld:true, textSelectionActive:true });
  try {
    atStart.tapPair(0); atStart.tapPair(300); atStart.flush();
    assert.equal(atStart.toggles, 0, 'an active Reader selection blocks gesture starts even when the DOM selection is collapsed');
  } finally { atStart.restore(); }

  const pending = fixture({ collapsedSelection:true, contentPointerHeld:true });
  try {
    pending.tapPair(0); pending.tapPair(300);
    assert.equal(pending.toggles, 0, 'fullscreen toggle remains deferred');
    pending.setTextSelectionActive(true);
    pending.flush();
    assert.equal(pending.toggles, 0, 'selection activation invalidates the deferred toggle');
  } finally { pending.restore(); }
});

test('Reader selection controls and marked gesture-ignore elements block fullscreen taps through nested SVG targets', () => {
  for (const blockedMarker of ['[data-reader-gesture-ignore]', '.hr-reader-selection-actions']) {
    const f = fixture({ blockedMarker });
    try {
      f.tapPair(0); f.tapPair(200); f.flush();
      assert.equal(f.toggles, 0, `${blockedMarker} on an ancestor blocks its SVG child`);
    } finally { f.restore(); }
  }

  const button = fixture({ blocked: true });
  try {
    button.tapPair(0); button.tapPair(200); button.flush();
    assert.equal(button.toggles, 0, 'a touch on a button is blocked');
  } finally { button.restore(); }
});

test('native Markdown Preview is eligible, while an outside-pane contact is rejected', () => {
  const f = fixture({ viewType: 'markdown' });
  try {
    f.tapPair(0); f.tapPair(200); f.flush();
    assert.equal(f.toggles, 1);
  } finally { f.restore(); }

  const outside = fixture({ viewType: 'markdown' });
  try {
    const a = outside.touch(1), b = outside.touch(2, 34, 20, outside.makeTarget(false, false));
    outside.fire('touchstart', [a], [], 0);
    outside.fire('touchstart', [a, b], [], 50);
    outside.fire('touchend', [b], [a], 90);
    outside.fire('touchend', [], [b], 120);
    outside.tapPair(300); outside.flush();
    assert.equal(outside.toggles, 0);
  } finally { outside.restore(); }
});

test('movement, third contact, or staggered releases invalidate the tap candidate', () => {
  {
    const f = fixture();
    try {
      const a = f.touch(1), b = f.touch(2);
      f.fire('touchstart', [a], [], 0); f.fire('touchstart', [a, b], [], 40);
      f.fire('touchmove', [f.touch(1, 40), b], [], 60);
      f.fire('touchend', [b], [f.touch(1, 40)], 70); f.fire('touchend', [], [b], 80);
      f.tapPair(200); f.flush();
      assert.equal(f.toggles, 0, 'pinch-like movement is not mistaken for a tap');
    } finally { f.restore(); }
  }
  {
    const f = fixture();
    try {
      const a = f.touch(1), b = f.touch(2), c = f.touch(3, 48);
      f.fire('touchstart', [a], [], 0); f.fire('touchstart', [a, b], [], 40); f.fire('touchstart', [a, b, c], [], 50);
      f.tapPair(200); f.flush();
      assert.equal(f.toggles, 0, 'more than two contacts discard the candidate');
    } finally { f.restore(); }
  }
  {
    const f = fixture();
    try {
      const a = f.touch(1), b = f.touch(2);
      f.fire('touchstart', [a], [], 0); f.fire('touchstart', [a, b], [], 40);
      f.fire('touchend', [b], [a], 70); f.fire('touchend', [], [b], 200);
      f.tapPair(300); f.flush();
      assert.equal(f.toggles, 0, 'release spread beyond the permitted interval is rejected');
    } finally { f.restore(); }
  }
});

test('cancel, view replacement, drawer opening, and unload clear pending toggles', () => {
  for (const action of [
    f => f.fire('touchcancel', [], [], 150),
    f => { f.leaf.view = {}; },
    f => { f.area.isConnected = false; },
    f => { f.plugin.app.workspace.activeLeaf = {}; },
    f => { f.bodyClasses.add('sn-right-open'); },
  ]) {
    const f = fixture();
    try {
      f.tapPair(0); action(f); f.tapPair(200); f.flush();
      assert.equal(f.toggles, 0);
    } finally { f.restore(); }
  }

  const unloaded = fixture();
  try {
    unloaded.tapPair(0); unloaded.tapPair(200);
    unloaded.plugin.cleanup(); unloaded.flush();
    assert.equal(unloaded.toggles, 0, 'unload cancels the queued toggle');
  } finally { unloaded.restore(); }
});
