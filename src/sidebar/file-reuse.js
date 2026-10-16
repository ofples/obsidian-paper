// Scoped wrappers around Obsidian's file-opening APIs. Reuse an existing
// document without closing user tabs; explicit new-tab/split/window requests
// keep their native meaning. Restored when the companion unloads.
module.exports = function installFileReuse(plugin) {
  const workspace = plugin.app.workspace;
  // Plugin onload can run before Obsidian creates its first root leaf.
  // Defer prototype discovery without preventing gesture installation.
  if (!workspace.activeLeaf) {
    let alive = true;
    plugin.register(() => { alive = false; });
    workspace.onLayoutReady(() => { if (alive) installFileReuse(plugin); });
    return;
  }
  const leafPrototype = Object.getPrototypeOf(workspace.activeLeaf);
  const originalGetLeaf = workspace.getLeaf;
  const originalOpenFile = leafPrototype.openFile;
  const allocations = new WeakMap();
  const pending = new Map();
  const busyLeaves = new WeakMap();
  let enabled = true;
  const isRoot = leaf => leaf?.getRoot?.() === workspace.rootSplit;
  const filePath = leaf => {
    const state = leaf.getViewState();
    return state.state?.filePath || state.state?.file || leaf.view.file?.path;
  };
  const openLeaves = path => {
    const matches = [];
    workspace.iterateRootLeaves(leaf => { if (filePath(leaf) === path) matches.push(leaf); });
    return matches;
  };
  plugin.findOpenFile = path => openLeaves(path).sort((a,b) =>
    (b === workspace.activeLeaf) - (a === workspace.activeLeaf) || (b.activeTime || 0) - (a.activeTime || 0))[0];
  const discardAllocation = (leaf, allocation) => {
    // Never detach a tab that was present before this opening request, or one
    // that has acquired content while an asynchronous target was loading.
    if (allocation?.created && !allocation.explicit && isRoot(leaf) && leaf.view.getViewType() === 'empty') leaf.detach();
  };
  const reveal = async (leaf, file, options) => {
    await leaf.loadIfDeferred?.();
    if (!enabled || !isRoot(leaf)) return;
    if (options?.state && Object.keys(options.state).length) {
      await originalOpenFile.call(leaf,file,options);
    } else if (options?.eState) {
      const view = leaf.view, subpath = options.eState.subpath;
      if (view.getViewType() === 'horizontal-reader-view' && subpath?.startsWith('#') && !subpath.startsWith('#^')) {
        const normalize = value => String(value).replace(/[*_`]/g,'').trim().normalize('NFC').toLocaleLowerCase();
        let heading = subpath.slice(1);
        try { heading = decodeURIComponent(heading); } catch {}
        const entry = view.getHeadings().find(entry => normalize(entry.text) === normalize(heading));
        if (entry) view.goToTocEntry(entry);
      } else leaf.setEphemeralState(options.eState);
    }
    if (!enabled || !isRoot(leaf)) return;
    if (options?.active !== false) {
      await workspace.revealLeaf(leaf);
      if (!enabled || !isRoot(leaf)) return;
      workspace.setActiveLeaf(leaf,{focus:true});
    }
    if (options?.active !== false) plugin.closeDrawers();
  };
  function getLeaf(...args) {
    if (!enabled || this !== workspace) return originalGetLeaf.apply(this,args);
    const before = new Set(); workspace.iterateRootLeaves(leaf => { before.add(leaf); });
    const explicit = args[0] === true || ['tab','split','window'].includes(args[0]);
    // An automatic opening cannot race a different file already loading in
    // this tab. Same-file callers will reuse its pending reservation below.
    let leaf = originalGetLeaf.apply(this,args);
    if (!explicit && busyLeaves.has(leaf)) leaf = originalGetLeaf.call(this,'tab');
    if (isRoot(leaf)) allocations.set(leaf,{
      created:!before.has(leaf),
      explicit
    });
    return leaf;
  }
  async function openFile(file, options, ...args) {
    if (!enabled || this.workspace !== workspace || !isRoot(this) || !file?.path) return originalOpenFile.call(this,file,options,...args);
    const allocation = allocations.get(this); allocations.delete(this);
    if (allocation?.explicit) return originalOpenFile.call(this,file,options,...args);
    const request = pending.get(file.path);
    let target = request?.leaf || plugin.findOpenFile(file.path);
    if (target) {
      if (request) await request.promise;
      if (!enabled) return;
      // An explicit request can have detached its own target while loading.
      if (!isRoot(target)) return openFile.call(this,file,options,...args);
      if (target !== this) discardAllocation(this,allocation);
      await reveal(target,file,options);
      return;
    }
    const reservation = {leaf:this,promise:null};
    busyLeaves.set(this,reservation);
    try {
      const promise = originalOpenFile.call(this,file,options,...args);
      reservation.promise=promise; pending.set(file.path,reservation);
      return await promise;
    }
    finally {
      if (pending.get(file.path) === reservation) pending.delete(file.path);
      if (busyLeaves.get(this) === reservation) busyLeaves.delete(this);
    }
  }
  workspace.getLeaf = getLeaf;
  leafPrototype.openFile = openFile;
  plugin.register(() => {
    enabled = false;
    if (workspace.getLeaf === getLeaf) workspace.getLeaf = originalGetLeaf;
    if (leafPrototype.openFile === openFile) leafPrototype.openFile = originalOpenFile;
    pending.clear();
  });
};
