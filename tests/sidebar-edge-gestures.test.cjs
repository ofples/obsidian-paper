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
          if (value.startsWith('[')) return node.hasAttribute(value.slice(1, -1).split('=')[0].replaceAll('"', '').trim());
          return node.tagName.toLowerCase() === value.toLowerCase();
        })) return node;
      }
      return null;
    },
  };
}

function fixture(target = element(), options = {}) {
  const handlers = new Map();
  const opened = [];
  const area = {
    contains(node) { for (let current = node; current; current = current.parentElement) if (current === target || current.areaMember) return true; return false; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600 }; },
  };
  const view = {
    getViewType: () => 'horizontal-reader-view',
    viewport: area,
    isSelectionGestureActive: () => options.contentPointerHeld === true,
    isTextSelectionActive: () => options.textSelectionActive === true,
    cancelPaperGesture() { view.cancelCount++; },
    cancelCount: 0,
  };
  const leaf = { view };
  const workspace = { activeLeaf: leaf };
  const bodyClasses = new Set(['is-mobile']);
  const body = {
    classList: { contains: name => bodyClasses.has(name) },
    matches: selector => selector.split(',').some(value => bodyClasses.has(value.trim().replace(/^\./, ''))),
  };
  const doc = {
    body,
    getSelection: () => options.selected ? ({ isCollapsed: false, anchorNode: target }) : ({ isCollapsed: true, anchorNode: target }),
    querySelector: selector => (options.menu && selector.includes('.menu')) || (options.modal && selector.includes('.modal-container')) ? {} : null,
  };
  const oldDocument = global.document;
  global.document = doc;
  const commands = [];
  const plugin = Object.create(SupernoteSidebar.prototype);
  Object.assign(plugin, {
    app: { workspace, commands: { executeCommandById(id) { commands.push(id); } } },
    registerDomEvent(_node, name, callback) { handlers.set(name, callback); },
    isReadingView: candidate => candidate === view,
    readingViewport: () => area,
    openDrawer(side) { opened.push(side); },
    closeDrawers() { opened.push('close'); },
  });
  plugin.installEdgeGestures();

  const fire = (name, eventTarget = target, touches = [], changedTouches = [], timeStamp) => {
    let prevented = 0, stopped = 0;
    handlers.get(name)({
      target: eventTarget, touches, changedTouches, timeStamp,
      preventDefault() { prevented++; },
      stopImmediatePropagation() { stopped++; },
    });
    return { prevented, stopped };
  };
  const touch = (identifier, x, y = 200, touchTarget = target, touchType = 'direct') => ({ identifier, clientX: x, clientY: y, target: touchTarget, touchType });
  const leftSwipe = () => {
    fire('touchstart', target, [touch(1,20)], [touch(1,20)]);
    const moved = fire('touchmove', target, [touch(1,30)]);
    const ended = fire('touchend', target, [], [touch(1,100)]);
    return { moved, ended };
  };
  return {
    leftSwipe, opened, commands, target, view, handlers, fire, touch, bodyClasses, workspace,
    setSelection(value) { options.selected = value; },
    setMenu(value) { options.menu = value; },
    setTextSelectionActive(value) { options.textSelectionActive = value; },
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

test('a deliberate two-finger downward drag from the top opens Quick Switcher and cancels Reader paging once claimed', () => {
  const f = fixture(undefined, {contentPointerHeld:true});
  try {
    const first = f.touch(1,100,20), second = f.touch(2,200,22);
    f.fire('touchstart', first.target, [first], [first], 0);
    f.fire('touchstart', second.target, [first,second], [second], 35);
    const claim = f.fire('touchmove', first.target, [f.touch(1,100,46),f.touch(2,200,48)], [], 100);
    assert.deepEqual(claim, { prevented: 1, stopped: 1 });
    assert.equal(f.view.cancelCount, 1, 'Reader paging is cancelled only after the downward direction is established');
    f.fire('touchmove', first.target, [f.touch(1,100,92),f.touch(2,200,94)], [], 190);
    f.fire('touchend', first.target, [f.touch(2,200,94)], [f.touch(1,100,92)], 240);
    f.fire('touchend', second.target, [], [f.touch(2,200,94)], 270);
    assert.deepEqual(f.commands, ['switcher:open']);
    let prevented = 0, stopped = 0;
    f.handlers.get('click')({
      target: second.target, clientX:200, clientY:94, detail:1,
      sourceCapabilities:{firesTouchEvents:true},
      preventDefault() { prevented++; }, stopImmediatePropagation() { stopped++; },
    });
    assert.deepEqual({prevented,stopped}, {prevented:1,stopped:1}, 'the consumed gesture click is suppressed');

    const switcherButton = element({ tag:'button' });
    f.fire('touchstart', switcherButton, [f.touch(3,200,94,switcherButton)], [f.touch(3,200,94,switcherButton)], 300);
    let freshPrevented = 0, freshStopped = 0;
    f.handlers.get('click')({
      target:switcherButton, clientX:200, clientY:94, detail:1,
      sourceCapabilities:{firesTouchEvents:true},
      preventDefault() { freshPrevented++; }, stopImmediatePropagation() { freshStopped++; },
    });
    assert.deepEqual({prevented:freshPrevented,stopped:freshStopped}, {prevented:0,stopped:0}, 'a fresh Quick Switcher tap is not mistaken for the old ghost click');
  } finally { f.restore(); }
});

test('two-finger candidates do not claim middle starts, staggered starts, pinch movement, or pen contacts', () => {
  const cases = [
    { name:'second finger starts below the top strip', secondY:100, secondAt:30 },
    { name:'second finger arrives too late', secondY:22, secondAt:150 },
    { name:'pen contact', secondY:22, secondAt:30, secondType:'stylus' },
    { name:'form target', secondY:22, secondAt:30, target:element({tag:'form'}) },
    { name:'non-collapsed selection', secondY:22, secondAt:30, selected:true },
    { name:'active Reader text selection with collapsed DOM selection', secondY:22, secondAt:30, textSelectionActive:true },
    { name:'open menu', secondY:22, secondAt:30, menu:true },
    { name:'open modal', secondY:22, secondAt:30, modal:true },
    { name:'open drawer', secondY:22, secondAt:30, drawer:true },
  ];
  for (const scenario of cases) {
    const f = fixture(scenario.target || element(), scenario);
    try {
      if (scenario.drawer) f.bodyClasses.add('sn-left-open');
      const first = f.touch(1,100,20), second = f.touch(2,200,scenario.secondY, f.target, scenario.secondType || 'direct');
      f.fire('touchstart', first.target, [first], [first], 0);
      f.fire('touchstart', second.target, [first,second], [second], scenario.secondAt);
      const delta = 80;
      f.fire('touchmove', f.target, [f.touch(1,100,20+delta),f.touch(2,200,scenario.secondY+delta)], [], 200);
      f.fire('touchend', f.target, [f.touch(2,200,scenario.secondY+delta)], [f.touch(1,100,20+delta)], 250);
      f.fire('touchend', f.target, [], [f.touch(2,200,scenario.secondY+delta)], 280);
      assert.deepEqual(f.commands, [], scenario.name);
      assert.equal(f.view.cancelCount, 0, scenario.name);
    } finally { f.restore(); }
  }

  const pinch = fixture();
  try {
    const first = pinch.touch(1,100,20), second = pinch.touch(2,200,20);
    pinch.fire('touchstart', first.target, [first], [first], 0);
    pinch.fire('touchstart', second.target, [first,second], [second], 30);
    const moved = pinch.fire('touchmove', pinch.target, [pinch.touch(1,100,45),pinch.touch(2,230,45)], [], 80);
    assert.deepEqual(moved, { prevented:0, stopped:0 }, 'pinch spacing change remains with Reader');
    assert.equal(pinch.view.cancelCount, 0);
    assert.deepEqual(pinch.commands, []);
  } finally { pinch.restore(); }

  const horizontal = fixture();
  try {
    const first = horizontal.touch(1,100,20), second = horizontal.touch(2,200,20);
    horizontal.fire('touchstart', first.target, [first], [first], 0);
    horizontal.fire('touchstart', second.target, [first,second], [second], 30);
    const moved = horizontal.fire('touchmove', horizontal.target, [horizontal.touch(1,125,50),horizontal.touch(2,225,50)], [], 80);
    assert.deepEqual(moved, { prevented:0, stopped:0 }, 'horizontal drift remains with Reader');
    assert.equal(horizontal.view.cancelCount, 0);
    assert.deepEqual(horizontal.commands, []);
  } finally { horizontal.restore(); }

  const ignoredContact = fixture();
  try {
    const ignored = element({attrs:{'data-reader-gesture-ignore':''}});
    const normal = ignoredContact.target;
    const first = ignoredContact.touch(1,100,20,ignored), second = ignoredContact.touch(2,200,20,normal);
    ignoredContact.fire('touchstart', ignored, [first], [first], 0);
    ignoredContact.fire('touchstart', normal, [first,second], [second], 30);
    const moved = ignoredContact.fire('touchmove', normal, [ignoredContact.touch(1,100,100,ignored),ignoredContact.touch(2,200,100,normal)], [], 120);
    ignoredContact.fire('touchend', normal, [ignoredContact.touch(2,200,100,normal)], [ignoredContact.touch(1,100,100,ignored)], 150);
    ignoredContact.fire('touchend', normal, [], [ignoredContact.touch(2,200,100,normal)], 180);
    assert.deepEqual(moved, {prevented:0,stopped:0});
    assert.equal(ignoredContact.view.cancelCount, 0, 'either contact exclusion rejects the pair');
    assert.deepEqual(ignoredContact.commands, []);
  } finally { ignoredContact.restore(); }
});

test('an active Reader text selection with collapsed DOM selection also protects the one-finger palette path', () => {
  const f = fixture();
  try {
    const first = f.touch(1,150,20);
    f.fire('touchstart', first.target, [first], [first], 0);
    f.setTextSelectionActive(true);
    const moved = f.fire('touchmove', f.target, [f.touch(1,150,35)], [], 30);
    f.fire('touchend', f.target, [], [f.touch(1,150,100)], 80);
    assert.deepEqual(moved, {prevented:0,stopped:0});
    assert.equal(f.view.cancelCount, 0);
    assert.deepEqual(f.commands, []);
  } finally { f.restore(); }
});

test('claimed downward drags are cancelled but consumed through all lifts after a third finger, selection, drawer, or touchcancel', () => {
  for (const cancel of [
    (f,a,b) => {
      const third = f.touch(3,250,25);
      const result = f.fire('touchstart', third.target, [a,b,third], [third], 140);
      assert.deepEqual(result, {prevented:1,stopped:1});
      f.fire('touchend', third.target, [a,b], [third], 160);
    },
    (f,a,b) => { f.setSelection(true); f.fire('touchmove', f.target, [a,b], [], 140); },
    (f,a,b) => { f.bodyClasses.add('sn-right-open'); f.fire('touchmove', f.target, [a,b], [], 140); },
    (f,a,b) => { f.fire('touchcancel', f.target, [a,b], [], 140); },
    (f,a,b) => { f.workspace.activeLeaf = {view:{}}; f.fire('touchmove', f.target, [a,b], [], 140); },
    (f,a,b) => { f.setMenu(true); f.fire('touchmove', f.target, [a,b], [], 140); },
    (f,a,b) => { f.setTextSelectionActive(true); f.fire('touchmove', f.target, [a,b], [], 140); },
  ]) {
    const options = {};
    const f = fixture(undefined, options);
    try {
      const first = f.touch(1,100,20), second = f.touch(2,200,20);
      f.fire('touchstart', first.target, [first], [first], 0);
      f.fire('touchstart', second.target, [first,second], [second], 30);
      f.fire('touchmove', f.target, [f.touch(1,100,50),f.touch(2,200,50)], [], 80);
      cancel(f,f.touch(1,100,50),f.touch(2,200,50));
      const move = f.fire('touchmove', f.target, [f.touch(1,100,100),f.touch(2,200,100)], [], 170);
      assert.deepEqual(move, {prevented:1,stopped:1}, 'claimed contacts remain consumed after cancellation');
      f.fire('touchend', f.target, [f.touch(2,200,100)], [f.touch(1,100,100)], 210);
      f.fire('touchend', f.target, [], [f.touch(2,200,100)], 230);
      assert.deepEqual(f.commands, [], 'cancelled drags never open Quick Switcher');
    } finally { f.restore(); }
  }
});

test('claimed drags that exceed the time limit or release fingers too far apart do not open Quick Switcher', () => {
  for (const lateRelease of [false,true]) {
    const f = fixture();
    try {
      const first = f.touch(1,100,20), second = f.touch(2,200,20);
      f.fire('touchstart', first.target, [first], [first], 0);
      f.fire('touchstart', second.target, [first,second], [second], 30);
      f.fire('touchmove', f.target, [f.touch(1,100,50),f.touch(2,200,50)], [], 80);
      f.fire('touchmove', f.target, [f.touch(1,100,90),f.touch(2,200,90)], [], lateRelease ? 120 : 1250);
      f.fire('touchend', f.target, [f.touch(2,200,90)], [f.touch(1,100,90)], lateRelease ? 200 : 1260);
      f.fire('touchend', f.target, [], [f.touch(2,200,90)], lateRelease ? 301 : 1270);
      assert.deepEqual(f.commands, [], lateRelease ? 'staggered release' : 'gesture exceeded 1200 ms');
      assert.equal(f.view.cancelCount, 1);
    } finally { f.restore(); }
  }
});

test('one-finger top palette swipe and two-finger taps away from the top remain available', () => {
  const palette = fixture();
  try {
    palette.fire('touchstart', palette.target, [palette.touch(1,150,20)], [palette.touch(1,150,20)], 0);
    palette.fire('touchmove', palette.target, [palette.touch(1,150,30)], [], 20);
    palette.fire('touchend', palette.target, [], [palette.touch(1,150,100)], 100);
    assert.deepEqual(palette.commands, ['command-palette:open']);
  } finally { palette.restore(); }

  const middle = fixture();
  try {
    const first = middle.touch(1,100,200), second = middle.touch(2,200,200);
    middle.fire('touchstart', first.target, [first], [first], 0);
    middle.fire('touchstart', second.target, [first,second], [second], 30);
    const move = middle.fire('touchmove', middle.target, [middle.touch(1,100,250),middle.touch(2,200,250)], [], 80);
    assert.deepEqual(move, {prevented:0,stopped:0}, 'a pair beginning in the reading area body is not claimed');
    assert.deepEqual(middle.commands, []);
  } finally { middle.restore(); }
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
