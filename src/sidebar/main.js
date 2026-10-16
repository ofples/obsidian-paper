const {Plugin, Modal, PluginSettingTab, Setting, Notice, setIcon} = require('obsidian');
const READER = 'horizontal-reader-view';

function rootLeafFilePath(leaf) {
  const state = leaf?.getViewState?.();
  const value = state?.state?.filePath || state?.state?.file || state?.state?.path || leaf?.view?.file?.path;
  return typeof value === 'string' ? value : value?.path || null;
}

class SearchScreen extends Modal {
  async onOpen() {
    this.modalEl.addClass('sn-search-screen');
    this.previous = this.app.workspace.activeLeaf;
    this.leaf = this.app.workspace.getLeaf('tab');
    await this.leaf.setViewState({type:'search', state:{query:''}});
    await this.leaf.loadIfDeferred?.();
    this.contentEl.appendChild(this.leaf.view.containerEl);
    this.leaf.view.searchComponent?.inputEl?.focus();
    this.resultClick = event => {
      if (!event.target.closest('.search-result-hover-button') && event.target.closest('.search-result-file-match,.search-result-file-title')) {
        this.openedFile = true;
        // A result for the already-open note need not emit file-open.
        window.setTimeout(() => this.close(),0);
      }
    };
    this.contentEl.addEventListener('click',this.resultClick);
    this.off = this.app.workspace.on('file-open', file => {
      if (file) { this.openedFile = file; this.close(); }
    });
  }
  onClose() {
    if (this.resultClick) this.contentEl.removeEventListener('click',this.resultClick);
    if (this.off) this.app.workspace.offref(this.off);
    if (this.leaf?.view.getViewType() === 'search') this.leaf.detach();
    if (!this.openedFile && this.previous) this.app.workspace.setActiveLeaf(this.previous, {focus:true});
  }
}

class OpenNotes extends Modal {
  constructor(app,plugin) {
    super(app); this.plugin = plugin;
    this.modalEl.addClass('sn-open-notes'); this.setTitle('Open notes');
  }
  onOpen() {
    this.closeAllPending = false;
    const active = this.app.workspace.activeLeaf;
    const groups = new Map();
    this.app.workspace.iterateRootLeaves(leaf => {
      const path = rootLeafFilePath(leaf);
      if (!path) return;
      const group = groups.get(path) || {path,leaves:[]};
      group.leaves.push(leaf); groups.set(path,group);
    });
    const names = new Map();
    for (const {path} of groups.values()) {
      const name = path.split('/').pop().replace(/\.[^.]+$/,'');
      names.set(name,(names.get(name)||0)+1);
    }
    for (const group of groups.values()) {
      const selected = group.leaves.includes(active);
      const leaf = selected ? active : group.leaves.reduce((a,b) => (b.activeTime||0)>(a.activeTime||0)?b:a);
      const name = group.path.split('/').pop().replace(/\.[^.]+$/,'');
      const row = this.contentEl.createEl('button',{cls:'sn-note-row'+(selected?' is-active':''),attr:{'aria-label':name,...(selected?{'aria-current':'page'}:{})}});
      const label = row.createSpan({cls:'sn-note-label'});
      label.createSpan({text:name});
      if (names.get(name)>1) label.createSpan({cls:'sn-note-folder',text:group.path.slice(0,group.path.lastIndexOf('/'))||'Vault root'});
      const mark = row.createSpan({cls:'sn-note-mark'}); if (selected) setIcon(mark,'check');
      row.addEventListener('click',async()=>{
        this.close(); await leaf.loadIfDeferred?.();
        await this.app.workspace.revealLeaf(leaf);
        this.app.workspace.setActiveLeaf(leaf,{focus:true});
        this.plugin.routeReading();
      });
    }
    if (!groups.size) this.contentEl.createEl('p',{cls:'sn-notes-empty',text:'No notes open.'});
    const footer = this.modalEl.createEl('div',{cls:'sn-open-notes-footer'});
    const closeAll = footer.createEl('button',{cls:'sn-close-all-notes',attr:{'aria-label':'Close all note tabs'}});
    setIcon(closeAll,'x'); closeAll.createSpan({text:'Close all tabs'});
    closeAll.addEventListener('click', async event => {
      event.preventDefault(); event.stopPropagation();
      if (this.closeAllPending) return;
      this.closeAllPending = true; closeAll.disabled = true;
      const leaves = [];
      this.app.workspace.iterateRootLeaves(leaf => {
        if (rootLeafFilePath(leaf)) leaves.push(leaf);
      });
      try {
        const saveResults = await Promise.allSettled(leaves.map(async leaf => {
          await leaf.loadIfDeferred?.();
          await leaf.view?.save?.();
        }));
        const failed = saveResults.find(result => result.status === 'rejected');
        if (failed) throw failed.reason;
      } catch (error) {
        console.error('Supernote: could not save tabs before closing',error);
        new Notice('Could not save every open tab. No tabs were closed.');
        this.closeAllPending = false; closeAll.disabled = false;
        return;
      }
      for (const leaf of leaves) leaf.detach();
      this.close();
    });
    (this.contentEl.querySelector('.is-active')||this.contentEl.querySelector('button'))?.focus();
  }
  onClose() { this.contentEl.empty(); this.modalEl.querySelector('.sn-open-notes-footer')?.remove(); }
}

class InterfaceSettings extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    new Setting(this.containerEl).setName('Reading mode')
      .setDesc('Choose the reading mode used by the Read note command. Page appearance is configured in MD Reader.')
      .addDropdown(d => d.addOption('pages','Pages').addOption('scroll','Continuous scrolling')
        .setValue(this.plugin.settings.readingMode).onChange(async value => {
          this.plugin.settings.readingMode = value;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.applyReadingPreference();
        }));
    new Setting(this.containerEl).setName('Fullscreen reading')
      .setDesc('Hide Obsidian controls while reading. Toggle this from the view menu or command.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.fullscreenReading)
        .onChange(async value => {
          this.plugin.settings.fullscreenReading = value;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.syncFullscreen();
        }));
    new Setting(this.containerEl).setName('Two-finger fullscreen gesture')
      .setDesc('Double-tap with two fingers in a reading view to toggle fullscreen. Keeps the menu and Escape exits available.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.fullscreenDoubleTap)
        .onChange(async value => {
          this.plugin.settings.fullscreenDoubleTap = value;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.syncFullscreenExitButton();
        }));
  }
}

module.exports = class SupernoteSidebar extends Plugin {
  async onload() {
    this.settings = Object.assign({readingMode:'pages',fullscreenReading:false,fullscreenDoubleTap:true}, await this.loadData());
    this.seen = new WeakSet();
    this.modeButtons = new WeakMap();
    this.decorations = new Set();
    this.switching = false;
    this.addSettingTab(new InterfaceSettings(this.app, this));
    const close = this.addRibbonIcon('panel-left-close','Close Files sidebar', () => this.closeDrawers());
    close.addClass('sn-close-files');
    this.addRibbonIcon('search','Search notes', () => this.openSearch());
    this.addRibbonIcon('layers','Open notes', () => this.openNotes());
    this.addRibbonIcon('bookmark','Bookmarks', () => this.openBookmarks());
    this.addCommand({id:'open-notes',name:'Open notes',callback:()=>this.openNotes()});
    this.addCommand({id:'full-screen-search', name:'Search notes in full screen', callback:() => this.openSearch()});
    this.addCommand({id:'open-files', name:'Open Files sidebar', callback:() => this.openDrawer('left')});
    this.addCommand({id:'close-sidebars', name:'Close sidebars', callback:() => this.closeDrawers()});
    this.addCommand({id:'open-backlinks', name:'Open Backlinks sidebar', callback:() => this.openDrawer('right')});
    this.addCommand({id:'open-bookmarks', name:'Open Bookmarks sidebar', callback:() => this.openBookmarks()});
    this.addCommand({id:'reader-menu', name:'Open reader menu', checkCallback:checking => {
      const view = this.app.workspace.activeLeaf?.view;
      if (view?.getViewType() !== READER) return false;
      if (!checking) view.openNavMenu();
      return true;
    }});
    this.addCommand({id:'read-note', name:'Read note', callback:() => this.read(this.app.workspace.activeLeaf)});
    this.addCommand({id:'edit-note', name:'Edit note', callback:() => this.edit(this.app.workspace.activeLeaf)});
    this.addCommand({id:'toggle-fullscreen-reading', name:'Toggle fullscreen reading', checkCallback:checking => {
      if (!this.isReadingView(this.app.workspace.activeLeaf?.view)) return false;
      if (!checking) this.toggleFullscreen();
      return true;
    }});
    this.observedDrawers = new WeakSet();
    const update = () => { this.observeDrawers(); this.decorate(); this.installRightClose(); this.syncBacklinks(); this.routeReading(); };
    this.app.workspace.onLayoutReady(() => {
      this.closeDrawers(); update();
      // Custom deferred views have a generic tab label until loaded.
      for (const leaf of this.app.workspace.getLeavesOfType(READER)) {
        Promise.resolve(leaf.loadIfDeferred?.()).then(() => this.decorate()).catch(error => console.error('Supernote tab:',error));
      }
    });
    this.registerEvent(this.app.workspace.on('layout-change', update));
    this.registerEvent(this.app.workspace.on('active-leaf-change', update));
    this.registerEvent(this.app.workspace.on('file-open', file => { if (file) this.closeDrawers(); update(); }));
    // Native Reading-view switches do not consistently emit file-open.
    this.registerInterval(window.setInterval(() => this.routeReading(), 350));
    this.registerDomEvent(document, 'click', event => {
      if (event.target.closest('.sn-files-toggle,.sn-close-drawer,.sn-close-files')) return;
      if (event.target.closest('.workspace-drawer a,.workspace-drawer .nav-file-title,.workspace-drawer .search-result-file-match') ||
          event.target.closest('.workspace-drawer-backdrop,.mod-root .view-content')) this.closeDrawers();
    });
    this.registerDomEvent(document, 'keydown', event => {
      if (event.key !== 'Escape') return;
      if (document.body.matches('.sn-left-open,.sn-right-open')) {
        this.closeDrawers(); event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (document.querySelector('.menu,.modal-container')) return;
      const view = this.app.workspace.activeLeaf?.view;
      if (this.isFullscreen() && view?.getViewType?.() === 'markdown' && view.getMode?.() === 'preview') {
        event.preventDefault(); event.stopImmediatePropagation(); this.toggleFullscreen();
      }
    });
    this.registerDomEvent(document,'click',event=>{
      if (event.target.closest('.workspace-tab-header-tab-list')) {
        event.preventDefault(); event.stopImmediatePropagation(); this.openNotes();
      }
    },{capture:true});
    installFileReuse(this);
    installFullscreenDoubleTap(this);
    this.installEdgeGestures();
  }
  installEdgeGestures() {
    let gesture = null;
    const drawerOpen = () => document.body.matches('.sn-left-open,.sn-right-open');
    const outside = target => target.closest('.mod-root .view-content,.workspace-drawer-backdrop,.sn-exit-fullscreen');
    const blocked = target => target.closest('a,button,input,textarea,select,[contenteditable="true"],.clickable-icon,.view-action,.workspace-tab-header,.hr-fn-pop,video,audio');
    const selected = () => { const s = document.getSelection(); return s && !s.isCollapsed; };
    const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
    this.registerDomEvent(document,'touchstart',event => {
      gesture = null;
      if (!document.body.classList.contains('is-mobile') || event.touches.length !== 1 || document.querySelector('.menu,.modal-container')) return;
      if (drawerOpen() && outside(event.target)) {
        gesture = {kind:'dismiss'}; consume(event); return;
      }
      if (selected() || blocked(event.target) || drawerOpen()) return;
      const view = this.app.workspace.activeLeaf?.view;
      if (!this.isReadingView(view)) return;
      const area = this.readingViewport(view);
      if (!area?.contains(event.target) && !view.headerEl?.contains(event.target)) return;
      const point = event.touches[0], rect = area.getBoundingClientRect();
      const top = view.viewport?.getBoundingClientRect().top || view.headerEl?.getBoundingClientRect().bottom || rect.top;
      const left = point.clientX >= rect.left + 12 && point.clientX <= rect.left + 48;
      const right = point.clientX <= rect.right - 12 && point.clientX >= rect.right - 48;
      const down = point.clientY >= Math.max(rect.top,12) && point.clientY <= top + 48;
      if (left || right || down) gesture = {view, x:point.clientX, y:point.clientY, at:Date.now(), left, right, down, kind:null};
    },{capture:true,passive:false});
    this.registerDomEvent(document,'touchmove',event => {
      if (!gesture) return;
      if (gesture.kind === 'dismiss') { consume(event); return; }
      if (event.touches.length !== 1 || selected()) { if (gesture.kind) consume(event); gesture = null; return; }
      const point = event.touches[0], dx = point.clientX - gesture.x, dy = point.clientY - gesture.y;
      if (!gesture.kind) {
        if (Math.max(Math.abs(dx),Math.abs(dy)) < 8) return;
        if (gesture.down && dy > 0 && dy > Math.abs(dx) * 1.5) gesture.kind = 'palette';
        else if (gesture.left && dx > 0 && dx > Math.abs(dy) * 1.5) gesture.kind = 'files';
        else if (gesture.right && dx < 0 && -dx > Math.abs(dy) * 1.5) gesture.kind = 'backlinks';
        else { gesture = null; return; }
        gesture.view.cancelPaperGesture?.();
      }
      consume(event);
    },{capture:true,passive:false});
    this.registerDomEvent(document,'touchend',event => {
      const g = gesture; gesture = null;
      if (!g?.kind) return;
      const touchPoint = event.changedTouches[0];
      this.consumedTouchEndpoint = touchPoint ? {
        x:touchPoint.clientX, y:touchPoint.clientY, at:Date.now(), target:event.target
      } : null;
      consume(event);
      if (g.kind === 'dismiss') { this.closeDrawers(); return; }
      const point = event.changedTouches[0];
      if (!point || selected() || Date.now() - g.at > 1200 || this.app.workspace.activeLeaf?.view !== g.view) return;
      const dx = point.clientX - g.x, dy = point.clientY - g.y;
      if (g.kind === 'palette' && dy >= 60 && dy > Math.abs(dx) * 1.5) {
        this.closeDrawers(); g.view.focus?.();
        this.app.commands.executeCommandById('command-palette:open');
      } else if (g.kind === 'files' && dx >= 60 && dx > Math.abs(dy) * 1.5) this.openDrawer('left');
      else if (g.kind === 'backlinks' && dx <= -60 && -dx > Math.abs(dy) * 1.5) this.openDrawer('right');
    },{capture:true,passive:false});
    this.registerDomEvent(document,'touchcancel',() => { gesture = null; },{capture:true});
    this.registerDomEvent(document,'click',event => {
      const endpoint = this.consumedTouchEndpoint;
      this.consumedTouchEndpoint = null;
      if (endpoint && Date.now() - endpoint.at <= 500) {
        const touchGenerated = event.sourceCapabilities?.firesTouchEvents === true;
        const nearEndpoint = Math.abs(event.clientX - endpoint.x) <= 12 && Math.abs(event.clientY - endpoint.y) <= 12;
        if (touchGenerated || (event.detail !== 0 && nearEndpoint)) { consume(event); return; }
      }
      if (drawerOpen() && outside(event.target)) { consume(event); this.closeDrawers(); }
    },{capture:true});
  }
  observeDrawers() {
    for (const side of ['left','right']) {
      const drawer = this.app.workspace[side+'Split'];
      if (!drawer || this.observedDrawers.has(drawer)) continue;
      this.observedDrawers.add(drawer);
      const observer = new MutationObserver(() => {
        document.body.classList.toggle('sn-'+side+'-open', !drawer.collapsed);
      });
      observer.observe(drawer.containerEl, {attributes:true, attributeFilter:['class','style']});
      this.register(() => observer.disconnect());
    }
  }
  closeDrawers() {
    for (const side of ['left','right']) this.closeDrawer(side);
  }
  closeDrawer(side) {
      const drawer = this.app.workspace[side+'Split'];
      if (side === 'right') document.body.classList.remove('sn-right-fullscreen');
      if (!drawer) return;
      if (drawer.isPinned) drawer.setPinned(false);
      if (!drawer.collapsed) drawer.collapse();
      document.body.classList.remove('sn-'+side+'-open');
  }
  openSearch() {
    this.closeDrawers(); this.notesModal?.close(); this.searchModal?.close();
    this.searchModal = new SearchScreen(this.app); this.searchModal.open();
  }
  openNotes() {
    this.closeDrawers(); this.searchModal?.close(); this.notesModal?.close();
    this.notesModal = new OpenNotes(this.app,this); this.notesModal.open();
  }
  async openDrawer(side) {
    this.notesModal?.close(); this.searchModal?.close();
    const drawer = this.app.workspace[side+'Split'];
    if (!drawer) return;
    const wasOpen = !drawer.collapsed;
    this.closeDrawers();
    if (wasOpen) return;
    if (side === 'left') {
      const files = this.app.workspace.getLeavesOfType('file-explorer')[0];
      if (files) { await files.loadIfDeferred?.(); await this.app.workspace.revealLeaf(files); }
    }
    drawer.expand();
    document.body.classList.add('sn-'+side+'-open');
    this.installRightClose();
    if (side === 'right') this.syncBacklinks();
  }
  async openBookmarks() {
    this.notesModal?.close(); this.searchModal?.close(); this.closeDrawer('right');
    const leaf = this.app.workspace.getLeavesOfType('bookmarks')[0] || this.app.workspace.getLeftLeaf(false);
    await leaf.setViewState({type:'bookmarks',state:{}});
    await leaf.loadIfDeferred?.();
    await this.app.workspace.revealLeaf(leaf);
    this.app.workspace.leftSplit.expand();
    document.body.classList.add('sn-left-open');
  }
  syncBacklinks() {
    if (!this.app.workspace.rightSplit || this.app.workspace.rightSplit.collapsed) return;
    let note = this.app.workspace.activeLeaf;
    if (!['markdown',READER].includes(note?.view.getViewType()) || !note.view.file) {
      note = null;
      this.app.workspace.iterateRootLeaves(leaf => {
        if (['markdown',READER].includes(leaf.view.getViewType()) && leaf.view.file &&
            (!note || leaf.activeTime > note.activeTime)) note = leaf;
      });
    }
    const file = note?.view.file;
    const view = this.app.workspace.getLeavesOfType('backlink')[0]?.view;
    // The core pane follows FileView; MD Reader is an ItemView. Supply its
    // note through the core pane's own file-open handler while visible.
    if (file && view && view.file !== file) view.onFileOpen?.(file);
  }
  installRightClose() {
    const header = this.app.workspace.rightSplit?.activeTabHeaderEl?.querySelector('.workspace-tab-header-inner');
    if (!header) return;
    if (!header.querySelector('.sn-toggle-right-fullscreen')) {
      const toggle = header.createEl('button',{cls:'sn-toggle-right-fullscreen clickable-icon',attr:{'aria-label':'Toggle right sidebar fullscreen','title':'Toggle right sidebar fullscreen'}});
      setIcon(toggle,'maximize');
      toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.toggleRightFullscreen();});
      this.register(()=>toggle.remove());
    }
    const fullscreenToggle = header.querySelector('.sn-toggle-right-fullscreen');
    if (fullscreenToggle && header.firstElementChild !== fullscreenToggle) header.prepend(fullscreenToggle);
    if (!header.querySelector('.sn-close-drawer')) {
      const close = header.createEl('button', {cls:'sn-close-drawer',attr:{'aria-label':'Close right sidebar'}});
      setIcon(close,'x');
      close.addEventListener('click', event => {event.stopPropagation(); this.closeDrawers();});
      this.register(() => close.remove());
    }
  }
  toggleRightFullscreen() { document.body.classList.toggle('sn-right-fullscreen'); }
  decorate() {
    for (const type of ['markdown',READER]) for (const leaf of this.app.workspace.getLeavesOfType(type)) {
      const view = leaf.view;
      if (type === READER && view.file && view.titleEl) view.titleEl.setText(view.file.basename);
      this.updateMode(view);
      if (this.seen.has(view) || !view.addAction || !view.headerEl) continue;
      this.seen.add(view);
      const cleanups = [];
      // Keep the reader's native non-navigable behavior: opening another
      // note gets its own tab. Read/edit transitions still use this leaf.
      const left = view.headerEl.querySelector('.view-header-left');
      if (left) {
        const button = left.createEl('button',{cls:'clickable-icon sn-files-toggle',attr:{'aria-label':'Open Files sidebar'}});
        setIcon(button,'panel-left'); left.prepend(button);
        button.addEventListener('click', () => this.openDrawer('left'));
        cleanups.push(() => button.remove());
      }
      const mode = view.addAction('book-open','Read with scrolling',() => this.cycleReadingMode(leaf));
      this.modeButtons.set(view,mode);
      this.updateMode(view);
      mode.addClass('sn-mode-action'); cleanups.push(() => mode.remove());
      for (const button of view.headerEl.querySelectorAll('[aria-label^="Current view:"]')) button.addClass('sn-native-mode');
      const original = view.onPaneMenu;
      const plugin = this;
      view.onPaneMenu = function(menu, ...args) {
        original?.call(this,menu,...args);
        menu.addSeparator();
        menu.addItem(item => item.setTitle('Open notes').setIcon('layers').onClick(() => plugin.openNotes()));
        menu.addItem(item => item.setTitle('Backlinks').setIcon('links-coming-in').onClick(() => plugin.openDrawer('right')));
        if (this.getViewType() === READER) menu.addItem(item => item.setTitle('Reader menu').setIcon('list').onClick(() => this.openNavMenu()));
        if (plugin.isReadingView(this)) menu.addItem(item => item.setTitle(plugin.isFullscreen() ? 'Exit fullscreen reading' : 'Enter fullscreen reading')
          .setIcon(plugin.isFullscreen() ? 'minimize' : 'maximize').onClick(() => plugin.toggleFullscreen()));
      };
      cleanups.push(() => {view.onPaneMenu = original;});
      const dispose = () => {for (const cleanup of cleanups) cleanup(); this.decorations.delete(dispose);};
      this.decorations.add(dispose); view.register(dispose);
    }
  }
  routeReading() {
    const leaf = this.app.workspace.activeLeaf;
    if (leaf?.view) this.updateMode(leaf.view);
    this.syncFullscreen();
    if (this.switching || this.settings.readingMode !== 'pages' || document.querySelector('.modal-container')) return;
    if (leaf?.view.getViewType() === 'markdown' && leaf.view.file && leaf.view.getMode() === 'preview') {
      this.read(leaf).catch(error => console.error('Supernote reader:',error));
    }
  }
  updateMode(view) {
    const button = this.modeButtons.get(view);
    if (!button) return;
    const type = view.getViewType();
    const reading = type === READER || (type === 'markdown' && view.getMode?.() === 'preview');
    const label = type === READER ? 'Edit note' : reading ? 'Read with pages' : 'Read with scrolling';
    const icon = type === READER ? 'pencil' : reading ? 'columns-2' : 'book-open';
    if (button.getAttribute('aria-label') !== label) {
      button.setAttribute('aria-label',label); button.setAttribute('title',label); setIcon(button,icon);
    }
  }
  async cycleReadingMode(leaf) {
    const view = leaf?.view;
    if (view?.getViewType() === READER) return this.edit(leaf);
    if (view?.getViewType() === 'markdown' && view.getMode?.() === 'preview') return this.read(leaf,'pages');
    return this.read(leaf,'scroll');
  }
  async read(leaf, mode=this.settings.readingMode) {
    const file = leaf?.view.file;
    if (!file || !leaf.parent || this.switching) return;
    if (mode === 'pages' && !this.app.plugins.plugins['md-reader']) return;
    this.switching = true;
    try {
      if (arguments.length > 1) {
        this.settings.readingMode = mode;
        await this.saveData(this.settings);
      }
      if (!leaf.parent) return;
      this.closeDrawers();
      await leaf.setViewState(mode === 'pages'
        ? {type:READER,state:{filePath:file.path},active:true}
        : {type:'markdown',state:{file:file.path,mode:'preview'},active:true});
      if (!leaf.parent) return;
      await leaf.loadIfDeferred?.();
      if (!leaf.parent) return;
      await this.app.workspace.revealLeaf(leaf);
      this.app.workspace.setActiveLeaf(leaf,{focus:true});
    } finally { this.switching = false; this.decorate(); this.syncFullscreen(); }
  }
  async edit(leaf) {
    const view = leaf?.view, file = view?.file;
    if (!file || !leaf.parent || this.switching) return;
    this.switching = true;
    try {
      const anchor = view.captureAnchor?.(); view.savePos?.();
      let line = 0;
      if (anchor?.quote) {
        const source = await this.app.vault.cachedRead(file);
        const words = anchor.quote.split(/\s+/);
        for (let length = Math.min(words.length,8); length >= 3; length--) {
          const index = source.indexOf(words.slice(0,length).join(' '));
          if (index >= 0) {line = source.slice(0,index).split('\n').length-1; break;}
        }
      }
      this.closeDrawers();
      if (!leaf.parent) return;
      await leaf.setViewState({type:'markdown',state:{file:file.path,mode:'source',source:false},active:true});
      if (!leaf.parent) return;
      await leaf.loadIfDeferred?.();
      if (!leaf.parent) return;
      await this.app.workspace.revealLeaf(leaf);
      this.app.workspace.setActiveLeaf(leaf,{focus:true});
      leaf.view.editor?.setCursor({line,ch:0});
      leaf.view.editor?.scrollIntoView({from:{line,ch:0},to:{line,ch:0}},true);
    } finally { this.switching = false; this.decorate(); this.syncFullscreen(); }
  }
  async applyReadingPreference() {
    const leaf = this.app.workspace.activeLeaf;
    if (this.settings.readingMode === 'scroll' && leaf?.view.getViewType() === READER) await this.read(leaf);
    else this.routeReading();
  }
  isReadingView(view) {
    return view?.getViewType?.() === READER ||
      (view?.getViewType?.() === 'markdown' && view.getMode?.() === 'preview');
  }
  readingViewport(view) {
    if (view?.getViewType?.() === READER) return view.viewport || view.containerEl?.querySelector('.hr-pages,.hr-page-container,.view-content') || view.containerEl;
    return view?.containerEl?.querySelector('.markdown-preview-view');
  }
  readingLeaf() {
    const active = this.app.workspace.activeLeaf;
    if (this.isReadingView(active?.view)) return active;
    if (document.body.matches('.sn-left-open,.sn-right-open') || document.querySelector('.modal-container')) {
      let latest = null;
      this.app.workspace.iterateRootLeaves(leaf => {
        if (this.isReadingView(leaf.view) && (!latest || (leaf.activeTime || 0) > (latest.activeTime || 0))) latest = leaf;
      });
      return latest;
    }
    return null;
  }
  isFullscreen() { return document.body.classList.contains('sn-fullscreen'); }
  syncFullscreenExitButton() {
    if (!this.exitFullscreenButton) return;
    const gestureReplacesButton = document.body.classList.contains('is-mobile') && this.settings.fullscreenDoubleTap;
    if (this.isFullscreen() && gestureReplacesButton) this.exitFullscreenButton.hide();
    else if (this.isFullscreen()) this.exitFullscreenButton.show();
    else this.exitFullscreenButton.hide();
  }
  setFullscreen(on) {
    const enabled = Boolean(on && this.readingLeaf());
    document.body.classList.toggle('sn-fullscreen', enabled);
    if (enabled) {
      if (!this.exitFullscreenButton) {
        const button = document.body.createEl('button',{cls:'sn-exit-fullscreen clickable-icon',attr:{'aria-label':'Exit fullscreen reading','title':'Exit fullscreen reading'}});
        setIcon(button,'minimize');
        button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.settings.fullscreenReading=false;this.saveData(this.settings);this.setFullscreen(false);});
        this.exitFullscreenButton = button;
      }
    }
    this.syncFullscreenExitButton();
  }
  toggleFullscreen() {
    const on = !this.isFullscreen();
    this.settings.fullscreenReading = on;
    this.setFullscreen(on);
    this.saveData(this.settings);
  }
  syncFullscreen() {
    if (this.switching || document.body.matches('.sn-left-open,.sn-right-open') || document.querySelector('.modal-container')) return;
    const active = this.app.workspace.activeLeaf?.view;
    if (!this.isReadingView(active)) { this.setFullscreen(false); return; }
    this.setFullscreen(this.settings.fullscreenReading);
  }
  onunload() {
    this.searchModal?.close(); this.notesModal?.close(); this.closeDrawers();
    this.exitFullscreenButton?.remove(); document.body.classList.remove('sn-fullscreen','sn-right-fullscreen');
    for (const dispose of this.decorations || []) dispose();
  }
};
