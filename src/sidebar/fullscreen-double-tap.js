// Optional two-finger double-tap to toggle reading fullscreen. This observes
// touch input without cancelling it, so page turns, scrolling, and pinch zoom
// continue to belong to the active view.
module.exports = function installFullscreenDoubleTap(plugin) {
  const doc = document;
  const blockedSelector = [
    'a','button','input','textarea','select','[contenteditable]','[role="button"]',
    '.clickable-icon','.view-action','.workspace-tab-header','.hr-ui','.hr-scrub',
    '.hr-fn','.hr-fn-pop','.sn-exit-fullscreen','video','audio'
  ].join(',');
  let current = null;
  let firstTap = null;
  let clickGuard = null;
  let toggleTimer = null;
  let alive = true;

  // MD Reader consults this before applying its pinch-to-zoom font-size step.
  // A small amount of e-ink touch jitter is ignored while the pair can still
  // be a tap; once movement crosses the thresholds below, ordinary pinching
  // resumes immediately.
  const shouldHoldReaderPinch = view => Boolean(current && current.pairStartedAt !== null &&
    current.view === view && candidateIsCurrent(current) && withinMovement(current));
  plugin.shouldHoldReaderPinch = shouldHoldReaderPinch;

  const now = event => Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now();
  const list = touchList => Array.from(touchList || []);
  const eventTarget = event => {
    const target = event?.target;
    return target?.nodeType === 1 ? target : target?.parentElement || null;
  };
  const contactTarget = (touch,event) => {
    const target=touch?.target;
    if (target?.nodeType===1) return target;
    const hit=doc.elementFromPoint?.(touch?.clientX,touch?.clientY);
    return hit?.nodeType===1 ? hit : hit?.parentElement || eventTarget(event);
  };
  const isBlocked = target => Boolean(target?.closest?.(blockedSelector));
  const hasSelection = area => {
    const selection = doc.getSelection?.();
    return Boolean(selection && !selection.isCollapsed && (!area || area.contains(selection.anchorNode)));
  };
  const isRoot = leaf => leaf?.getRoot?.() === plugin.app.workspace.rootSplit;
  const readingContext = target => {
    const leaf = plugin.app.workspace.activeLeaf;
    const view = leaf?.view;
    if (!leaf || !view || !isRoot(leaf)) return null;
    const type = view.getViewType?.();
    if (type === 'horizontal-reader-view') {
      const area = view.viewport || view.containerEl?.querySelector('.hr-viewport');
      return area?.contains(target) ? {leaf,view,area} : null;
    }
    if (type === 'markdown' && view.getMode?.() === 'preview') {
      const area = view.containerEl?.querySelector('.markdown-preview-view');
      return area?.contains(target) ? {leaf,view,area} : null;
    }
    return null;
  };
  const point = (touch,target) => ({id:touch.identifier,x:touch.clientX,y:touch.clientY,target});
  const centerOf = points => ({
    x:(points[0].x + points[1].x) / 2,
    y:(points[0].y + points[1].y) / 2
  });
  const selectedFor = candidate => hasSelection(candidate?.area);
  const invalidate = (clearFirst=true) => {
    current = null;
    if (clearFirst) firstTap = null;
  };
  const startAllowed = (event, context, target=eventTarget(event)) => {
    return Boolean(doc.body?.classList?.contains('is-mobile') &&
      plugin.settings.fullscreenDoubleTap && context && !isBlocked(target) && !selectedFor(context) &&
      !doc.querySelector('.menu,.modal-container') &&
      !doc.body.matches('.sn-left-open,.sn-right-open'));
  };
  const pointById = (touches, id) => list(touches).find(touch => touch.identifier === id);
  const candidateIsCurrent = candidate => alive && plugin.settings.fullscreenDoubleTap &&
    plugin.app.workspace.activeLeaf === candidate.leaf && isRoot(candidate.leaf) &&
    candidate.leaf?.view === candidate.view && candidate.area?.isConnected !== false && !plugin.switching &&
    !doc.querySelector('.menu,.modal-container') &&
    !doc.body.matches('.sn-left-open,.sn-right-open') && !selectedFor(candidate);
  const withinMovement = candidate => {
    const points = [...candidate.points.values()];
    if (points.length !== 2) return false;
    for (const p of points) if (Math.hypot(p.x-p.startX,p.y-p.startY) > 10) return false;
    const distance = Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    return candidate.startDistance > 0 && Math.abs(distance-candidate.startDistance) <= 12;
  };
  const beginPair = (context, contacts, startedAt) => {
    const pair = contacts.map(contact=>point(contact.touch,contact.target));
    if (pair.length !== 2 || pair[0].id === pair[1].id) return false;
    const center = centerOf(pair);
    current = {
      leaf:context.leaf, view:context.view, area:context.area,
      startedAt, pairStartedAt:startedAt,
      startDistance:Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y),
      center,
      points:new Map(pair.map(p=>[p.id,{...p,startX:p.x,startY:p.y,releasedAt:null}]))
    };
    return current.startDistance > 0 && !selectedFor(current);
  };
  const completePair = (candidate, releaseAt, endpoint) => {
    if (!candidateIsCurrent(candidate) || !withinMovement(candidate)) { invalidate(); return; }
    const releaseTimes = [...candidate.points.values()].map(p=>p.releasedAt);
    const duration = releaseAt - candidate.startedAt;
    if (releaseTimes.some(value=>value === null) || Math.max(...releaseTimes)-Math.min(...releaseTimes) > 100 || duration > 250) {
      invalidate(); return;
    }
    const completed = {
      leaf:candidate.leaf, view:candidate.view, area:candidate.area,
      startedAt:candidate.startedAt, endedAt:releaseAt, center:candidate.center
    };
    current = null;
    // A completed two-finger tap can emit a browser click in addition to touchend.
    // Guard that endpoint even for the first tap so it cannot turn a page.
    clickGuard = {x:endpoint.x,y:endpoint.y,at:releaseAt,target:endpoint.target,area:completed.area};
    const gap = completed.startedAt - (firstTap?.endedAt ?? -Infinity);
    const spatialMatch = firstTap && Math.hypot(completed.center.x-firstTap.center.x,completed.center.y-firstTap.center.y) <= 32;
    if (firstTap && firstTap.leaf === completed.leaf && firstTap.view === completed.view &&
        firstTap.area === completed.area && gap >= 0 && gap <= 350 && spatialMatch) {
      firstTap = null;
      toggleTimer = window.setTimeout(() => {
        toggleTimer = null;
        if (candidateIsCurrent(completed)) plugin.toggleFullscreen();
      },0);
      return;
    }
    firstTap = completed;
  };

  plugin.registerDomEvent(doc,'touchstart',event=>{
    const touches=list(event.touches);
    if (touches.length > 2 || !plugin.settings.fullscreenDoubleTap) { invalidate(); return; }
    if (touches.length === 1) {
      const target=contactTarget(touches[0],event), context=readingContext(target);
      if (!startAllowed(event,context,target)) { invalidate(); return; }
      const t=point(touches[0],target), startedAt=now(event);
      current={leaf:context.leaf,view:context.view,area:context.area,startedAt,pairStartedAt:null,startDistance:0,center:null,
        points:new Map([[t.id,{...t,startX:t.x,startY:t.y,releasedAt:null}]])};
      if (firstTap && (startedAt-firstTap.endedAt > 350 || firstTap.leaf !== context.leaf || firstTap.view !== context.view)) firstTap=null;
      return;
    }
    if (touches.length!==2) {invalidate();return;}
    const contacts=touches.map(touch=>({touch,target:contactTarget(touch,event)}));
    const contexts=contacts.map(contact=>readingContext(contact.target));
    const [context,secondContext]=contexts;
    if (!startAllowed(event,context,contacts[0].target) || !startAllowed(event,secondContext,contacts[1].target) ||
        context.leaf!==secondContext.leaf || context.view!==secondContext.view || context.area!==secondContext.area) {
      invalidate();return;
    }
    const startedAt=now(event);
    if (!current) {
      if (!beginPair(context,contacts,startedAt)) invalidate();
      return;
    }
    if (current.points.size!==1 || current.pairStartedAt!==null) {invalidate();return;}
    const elapsed=startedAt-current.startedAt;
    const original=[...current.points.values()][0];
    const originalTouch=pointById(touches,original.id);
    if (context.leaf!==current.leaf || context.view!==current.view || context.area!==current.area ||
        elapsed<0 || elapsed>100 || !originalTouch ||
        Math.hypot(originalTouch.clientX-original.startX,originalTouch.clientY-original.startY)>10) {
      invalidate(); return;
    }
    const firstStartedAt=current.startedAt;
    if (!beginPair(context,contacts,firstStartedAt)) invalidate();
  },{capture:true,passive:true});

  plugin.registerDomEvent(doc,'touchmove',event=>{
    if (!current) return;
    const touches=list(event.touches);
    if (touches.length>2 || !candidateIsCurrent(current)) { invalidate(); return; }
    if (current.points.size===1 && current.pairStartedAt===null) {
      const touch=touches[0],p=current.points.get(touch?.identifier);
      if (!p) {invalidate();return;}
      p.x=touch.clientX;p.y=touch.clientY;
      if (Math.hypot(p.x-p.startX,p.y-p.startY)>10) invalidate();
      return;
    }
    for (const touch of touches) {
      const p=current.points.get(touch.identifier);
      if (!p) { invalidate(); return; }
      p.x=touch.clientX; p.y=touch.clientY;
    }
    if (!withinMovement(current)) invalidate();
  },{capture:true,passive:true});

  plugin.registerDomEvent(doc,'touchend',event=>{
    if (!current) return;
    const endedAt=now(event);
    for (const touch of list(event.changedTouches)) {
      const p=current.points.get(touch.identifier);
      if (p) { p.x=touch.clientX; p.y=touch.clientY; p.releasedAt=endedAt; }
    }
    if (current.points.size===1) { invalidate(); return; }
    if (list(event.touches).length===0) {
      const lastTouch=event.changedTouches[0];
      const endpoint={x:lastTouch?.clientX ?? current.center.x,y:lastTouch?.clientY ?? current.center.y,target:contactTarget(lastTouch,event)};
      completePair(current,endedAt,endpoint);
    }
  },{capture:true,passive:true});

  plugin.registerDomEvent(doc,'touchcancel',()=>{
    invalidate(); clickGuard=null;
    if (toggleTimer!==null) window.clearTimeout(toggleTimer);
    toggleTimer=null;
  },{capture:true,passive:true});
  plugin.registerDomEvent(doc,'click',event=>{
    const guard=clickGuard; clickGuard=null;
    if (!guard || now(event)-guard.at>350) return;
    const target=eventTarget(event);
    const near=Math.abs(event.clientX-guard.x)<=12 && Math.abs(event.clientY-guard.y)<=12;
    const touchGenerated=event.sourceCapabilities?.firesTouchEvents===true;
    if (target === guard.target && guard.area?.contains(target) && !isBlocked(target) && near && (touchGenerated || event.detail!==0)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  },{capture:true});

  plugin.register(()=>{
    alive=false; invalidate(); clickGuard=null;
    if (toggleTimer!==null) window.clearTimeout(toggleTimer);
    toggleTimer=null;
    if (plugin.shouldHoldReaderPinch === shouldHoldReaderPinch) delete plugin.shouldHoldReaderPinch;
  });
};
