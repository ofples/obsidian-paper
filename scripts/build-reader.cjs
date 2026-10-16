const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist','plugins','md-reader');
fs.mkdirSync(output,{recursive:true});
let src=fs.readFileSync(path.join(root,'vendor','md-reader','main.js'),'utf8').replace(/\r\n/g,'\n');
const oldTouch="if (x < w * 0.3) this.prev();\n        else if (x > w * 0.7) this.next();\n        else this.toggleControls();";
const newTouch="this.handlePaperTap(tc.clientX, tc.clientY);";
const oldClick="if (x < w * 0.3) this.prev();\n      else if (x > w * 0.7) this.next();\n      else this.toggleControls();";
const newClick="this.handlePaperTap(e.clientX, e.clientY);";
for(const [old,next] of [[oldTouch,newTouch],[oldClick,newClick],["this.content.style.transform = 'translateX(' + (-this.page * this.pageStride + dx) + 'px)';","this.applyTransform(); // Supernote: no live page dragging on e-ink"]]){if(!src.includes(old))throw Error('Upstream gesture source changed');src=src.replace(old,next)}
src=src.replace("this.viewport = vp;",`this.viewport = vp;
    vp.classList.add('hr-hide-ui', 'sn-gesture-reader');
    this.pageIndicator = vp.createDiv({cls:'sn-page-indicator',attr:{role:'status','aria-live':'polite'}});
    this.pageIndicator.hidden = true;`);
if(!src.includes("vp.classList.add('hr-hide-ui', 'sn-gesture-reader')"))throw Error('Missing viewport initialization');
const editorHook = 'openInEditor() {';
if(!src.includes(editorHook))throw Error('Upstream editor method changed');
src=src.replace(editorHook, editorHook+"\n    const controls = this.app.plugins.plugins['supernote-sidebar'];\n    if (controls?.edit) { controls.edit(this.leaf); return; } // Use the same note tab and preserve the current passage.");
const focusHook='getViewType() { return VIEW_TYPE_READER; }';
if(!src.includes(focusHook))throw Error('Upstream reader class changed');
src=src.replace(focusHook,focusHook+`
  async waitForPaperFonts() {
    const content = this.content;
    if (!content?.isConnected) return;
    const doc = content.ownerDocument;
    const fonts = doc.fonts;
    const style = doc.defaultView.getComputedStyle(content);
    if (!fonts?.load || !style.fontFamily.includes('Supernote Literata')) return;
    const sample = 'Aa ā ī ṛ ś ṣ ṇ ṃ';
    const descriptors = ['400 ', 'italic 400 ', '700 ', 'italic 700 ']
      .map(prefix => prefix + style.fontSize + ' "Supernote Literata"');
    if (descriptors.every(font => fonts.check(font, sample))) return;
    let timer;
    try {
      // Embedded local fonts usually resolve immediately. Bound the wait so
      // a font error cannot prevent a note opening; loadingdone remeasures later.
      await Promise.race([
        Promise.all(descriptors.map(font => fonts.load(font, sample))),
        new Promise(resolve => { timer = window.setTimeout(resolve, 2000); })
      ]);
    } catch (error) { console.warn('Supernote Reader font unavailable', error); }
    finally { window.clearTimeout(timer); }
  }
  focus() { this.viewport?.focus({preventScroll:true}); }
  cancelPaperGesture() { this._snAbortDrag?.(); this._lastTouch = Date.now(); }
  togglePageIndicator() {
    if (this.pageIndicator) this.pageIndicator.hidden = !this.pageIndicator.hidden;
  }
  handlePaperTap(clientX, clientY) {
    const r = this.viewport.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    if (x < r.width * 0.3) this.prev();
    else if (x > r.width * 0.7) this.next();
    else if (y >= r.height - 48) this.togglePageIndicator();
    else if (y < 48) this.openNavMenu();
  }`);
function patch(old,next) {
  if(!src.includes(old)) throw Error('Upstream source changed: '+old.slice(0,100));
  src=src.replace(old,next);
}
patch(`    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      if (gen !== this._renderGen || !this.content || !this.content.isConnected) return;`,
`    await this.waitForPaperFonts();
    if (gen !== this._renderGen || !this.content?.isConnected) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      if (gen !== this._renderGen || !this.content || !this.content.isConnected) return;`);
patch(`    this.registerEvent(this.app.workspace.on('css-change', repaginate));`,
`    const paperFonts = this.content?.ownerDocument?.fonts;
    if (paperFonts) this.registerDomEvent(paperFonts, 'loadingdone', () => {
      if (this.content?.isConnected && this.content.ownerDocument.defaultView
          .getComputedStyle(this.content).fontFamily.includes('Supernote Literata')) repaginate();
    });
    this.registerEvent(this.app.workspace.on('css-change', repaginate));`);
patch(`if (e.touches.length === 2) {
        abortDrag();
        pinch = { d0: touchDist(e.touches), base: this.plugin.settings.fontSize };
        return;
      }`,`if (e.touches.length >= 2) {
        abortDrag();
        pinch = true; // Consume all multi-touch until every contact is released.
        e.stopPropagation();
        return;
      }`);
patch(`if (pinch) {
        if (e.touches.length < 2) return;
        e.stopPropagation();
        e.preventDefault();
        if (pinch.d0 > 0) this.previewFontSize(pinch.base * (touchDist(e.touches) / pinch.d0));
        return;
      }`,`if (pinch) {
        // Two-finger fullscreen taps belong to the companion plugin. Consume
        // multi-touch here to prevent browser zoom and accidental page turns.
        e.stopPropagation();
        e.preventDefault();
        return;
      }`);
patch(`if (pinch) {
        // палец оторвали — жест кончился, теперь можно сохранить размер на диск
        if (e.touches.length < 2) { pinch = null; this._lastTouch = Date.now(); this.plugin.commitFontSize(); }
        return;
      }`,`if (pinch) {
        // Keep the gesture consumed until every finger is lifted. Font size is
        // controlled by Appearance and the reader settings, never by a pinch.
        if (e.touches.length === 0) { pinch = null; this._lastTouch = Date.now(); }
        return;
      }`);
patch("const pct = Math.round(frac * 100);",`const pct = Math.round(frac * 100);
    if (this.pageIndicator) this.pageIndicator.setText(multi ? pct + '%' : (this.page + 1) + ' / ' + this.totalPages + ' · ' + pct + '%');`);
patch('c.style.paddingBottom = `max(${padY + 0.6}em, ${barH + 4}px)`;',"c.style.paddingBottom = padY + 'em'; // Ordinary page margin, no footer reserve.");
patch('horizontal = false;\n    let pinch', 'horizontal = false;\n    let bottomStart = false, menuSwipe = false;\n    let pinch');
patch("this.registerDomEvent(vp, 'touchstart',", "this._snAbortDrag = abortDrag;\n    this.registerDomEvent(vp, 'touchstart',");
patch('dragging = false; decided = false; horizontal = false;', 'dragging = false; decided = false; horizontal = false; bottomStart = false; menuSwipe = false;');
patch('dragging = true; decided = false; horizontal = false;',`dragging = true; decided = false; horizontal = false; menuSwipe = false;
      bottomStart = tc.clientY >= vp.getBoundingClientRect().bottom - 64 && !interactive(e.target);`);
patch('if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }',`if (Math.abs(dy) > Math.abs(dx)) {
          if (!bottomStart || dy >= 0) { abortDrag(); return; }
          decided = true; menuSwipe = true;
        } else { decided = true; horizontal = true; }`);
// Do not turn a claimed vertical gesture into a horizontal page drag.
patch('        decided = true; horizontal = true;\n      }\n      if (horizontal)', `      }
      if (menuSwipe) { e.stopPropagation(); e.preventDefault(); return; }
      if (horizontal)`);
patch('const dx = tc.clientX - x0, dy = tc.clientY - y0, dt = Date.now() - t0;',`const dx = tc.clientX - x0, dy = tc.clientY - y0, dt = Date.now() - t0;
      const selection = vp.ownerDocument.getSelection();
      if (selection && !selection.isCollapsed && this.content.contains(selection.anchorNode)) {
        decided = false; horizontal = false; menuSwipe = false; this.applyTransform(); return;
      }
      if (menuSwipe) {
        const open = dy <= -SWIPE && Math.abs(dy) > Math.abs(dx) * 1.5;
        decided = false; horizontal = false; menuSwipe = false; bottomStart = false;
        this.applyTransform(); if (open) this.openNavMenu(); return;
      }`);
const escapeHook='onEscape() {';
if(!src.includes(escapeHook))throw Error('Upstream escape handler changed');
src=src.replace(escapeHook,escapeHook+"\n    if (this._snReaderMenuOpen || document.querySelector('.menu,.modal-container')) return; // Dismiss overlays before acting on the note.\n    const controls = this.app.plugins.plugins['supernote-sidebar'];\n    if (controls && document.body.matches('.sn-left-open,.sn-right-open')) { controls.closeDrawers(); return; }\n    if (controls?.isFullscreen?.()) { controls.toggleFullscreen(); return; }");
const menuHook="openNavMenu(evt) {\n    const menu = new Menu();";
if(!src.includes(menuHook))throw Error('Upstream reader menu changed');
src=src.replace(menuHook,`openNavMenu(evt = {clientX:window.innerWidth,clientY:0}) {
    this.focus();
    const menu = new Menu();
    this._snReaderMenuOpen = true;
    let selected = false;
    let closing = false;
    const focusRef = this.app.workspace.on('active-leaf-change',active => {
      if (!closing || active === this.leaf) return;
      this.app.workspace.offref(focusRef);
      if (!selected && this.leaf.parent && this.leaf.view === this &&
          !['markdown',VIEW_TYPE_READER].includes(active?.view.getViewType())) {
        this.app.workspace.setActiveLeaf(this.leaf,{focus:true});
        this.focus();
      }
    });
    const key = event => {if (event.key === 'Enter') selected = true;};
    document.addEventListener('keydown',key,true);
    menu.onHide(() => {
      closing = true;
      // Native workspace activation is debounced after menu dismissal.
      window.setTimeout(() => this.app.workspace.offref(focusRef),250);
      document.removeEventListener('keydown',key,true);
      // Let native menu focus restoration and workspace activation finish.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        this._snReaderMenuOpen = false;
        // Native mobile menu dismissal may activate an old sidebar leaf.
        // Keep intentional note/action navigation; restore only lost focus.
        const active = this.app.workspace.activeLeaf;
        if (!selected && this.leaf.parent && this.leaf.view === this &&
            !['markdown',VIEW_TYPE_READER].includes(active?.view.getViewType())) {
          this.app.workspace.setActiveLeaf(this.leaf,{focus:false});
          this.focus();
        }
      }));
    });
    const panel = menu.dom;
    if (panel) {
      panel.addClass('sn-reader-menu');
      // The native floating menu scrolls on mouse hover. In a fixed sheet this
      // moves another action under the pointer between pointing and tapping.
      panel.querySelector('.menu-scroll')?.addEventListener('mousemove',event=>event.stopImmediatePropagation(),true);
      panel.addEventListener('click',event=>{if(event.target.closest('.menu-item'))selected=true;},true);
      const header = panel.createDiv({cls:'sn-reader-menu-header'});
      header.createSpan({text:'Reader menu'});
      const close = header.createEl('button',{cls:'sn-reader-menu-close',text:'×',attr:{'aria-label':'Close reader menu'}});
      close.addEventListener('click',event=>{event.stopPropagation();menu.hide();});
      panel.insertBefore(header,panel.firstChild);
    }`);
patch("contentEl.addClass('hr-ap');", "contentEl.addClass('hr-ap');\n    this.modalEl.addClass('sn-reader-settings');");
patch("b.toggleClass('is-active', p.settings.tint === name);", "b.setText(t(TINT_LABEL[name]));\n      b.toggleClass('is-active', p.settings.tint === name);");
patch("this.titleEl.setText(t('libTitle'));", "this.titleEl.setText(t('libTitle'));\n    this.modalEl.addClass('sn-reader-settings');");
patch("    if (Platform.isDesktop) {\n      menu.addSeparator();\n      const doc = this.contentEl.ownerDocument;", `    const controls = this.app.plugins.plugins['supernote-sidebar'];
    menu.addItem(i => i.setTitle('Go to start').setIcon('skip-back').onClick(() => this.goToBookEdge(0)));
    if (controls?.toggleFullscreen) {
      menu.addItem(i => i.setTitle('Read with scrolling').setIcon('book-open').onClick(() => controls.read(this.leaf,'scroll')));
      menu.addSeparator();
      menu.addItem(i => i.setTitle(controls.isFullscreen() ? 'Exit fullscreen reading' : 'Enter fullscreen reading')
        .setIcon(controls.isFullscreen() ? 'minimize' : 'maximize').onClick(() => controls.toggleFullscreen()));
    } else if (Platform.isDesktop) {
      menu.addSeparator();
      const doc = this.contentEl.ownerDocument;`);
patch('  async openReader(file) {', `  async openReader(file) {
    const controls = this.app.plugins.plugins['supernote-sidebar'];
    const existing = controls?.findOpenFile?.(file.path);
    if (existing) {
      await existing.loadIfDeferred?.();
      if (existing.view.getViewType() !== VIEW_TYPE_READER) await controls.read(existing,'pages');
      await this.app.workspace.revealLeaf(existing);
      this.app.workspace.setActiveLeaf(existing,{focus:true});
      return;
    }`);
patch('  goTo(p) {\n    const np', `  goTo(p) {
    // Explicit navigation supersedes any restoration queued by an earlier
    // resize, keyboard or media load, even when the new page number is equal.
    this._pendingAnchor = null;
    this._pendingFraction = 0;
    this._pendingHeading = null;
    this._pendingFind = null;
    const np`);
patch('  goToHeading(el) {\n    if (!el || !this.content || !this.pageStride) return;\n    this.goTo(this.pageOfRect(el.getBoundingClientRect()));\n  }', `  anchorForHeading(el) {
    const index = this.textIndex();
    if (!el || !index || !index.text) return null;
    // Locate the heading's first normalized character by DOM order, including
    // formatted/repeated heading text without confusing an earlier occurrence.
    let lo = 0, hi = index.text.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const range = index.rangeAt(mid) || index.rangeAt(mid + 1);
      if (range && !el.contains(range.startContainer) &&
          (el.compareDocumentPosition(range.startContainer) & 2)) lo = mid + 1;
      else hi = mid;
    }
    while (lo < index.text.length && (!index.rangeAt(lo) || index.text[lo] === ' ')) lo++;
    const range = index.rangeAt(lo);
    if (!range || !el.contains(range.startContainer)) return null;
    return {v:1,quote:index.text.slice(lo,lo+96),prefix:index.text.slice(Math.max(0,lo-48),lo),
      hint:((this.charsBefore[this.chapterIndex] || 0) + lo / index.text.length * this.chapterChars[this.chapterIndex]) / (this.totalChars || 1)};
  }

  goToHeading(el) {
    if (!el || !this.content || !this.pageStride) return;
    this.goTo(this.pageOfRect(el.getBoundingClientRect()));
    this._readingAnchor = this.anchorForHeading(el) || this.captureAnchor();
    this.savePos();
  }`);
patch('if (el) this.page = this.pageOfRect(el.getBoundingClientRect());\n      if (!mediaLoading) this._pendingHeading = null;', `if (el) {
        this.page = this.pageOfRect(el.getBoundingClientRect());
        this._readingAnchor = this.anchorForHeading(el) || this.captureAnchor();
      }
      if (!mediaLoading) this._pendingHeading = null;`);
fs.writeFileSync(path.join(output,'main.js'),src);
for(const name of ['styles.css','manifest.json','LICENSE'])fs.copyFileSync(path.join(root,'vendor','md-reader',name),path.join(output,name));
fs.copyFileSync(path.join(root,'src','reader','defaults.json'),path.join(output,'Supernote defaults.json'));
console.log('Built the pinned MD Reader Supernote adaptation.');
