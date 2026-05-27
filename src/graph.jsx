/* global React, d3 */
const { useRef, useEffect, useState, useMemo, useCallback } = React;

/* Dialect → CSS variable lookup */
const DIALECT_VAR = {
  '闽': '--c-hokkien',
  '潮': '--c-teochew',
  '粤': '--c-canton',
  '客': '--c-hakka',
  '琼': '--c-hainan',
  '三江': '--c-samkiang',
};
function dialectColor(d) {
  const v = DIALECT_VAR[d?.dialectZh] || '--c-unknown';
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#8a755a';
}
function relationClassColor(cls) {
  const map = {
    '三代以内直系血亲及夫妻': '--e-kin',
    '普通亲戚': '--e-relative',
    '密切伙伴': '--e-close',
    '普通伙伴': '--e-partner',
    '轻度社交': '--e-social',
  };
  const v = map[cls] || '--e-partner';
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#5a6677';
}

window.dialectColor = dialectColor;
window.relationClassColor = relationClassColor;

/* ============================================================
   ForceGraph — D3 simulation rendered to canvas, label overlay
   ============================================================ */
function ForceGraph({
  nodes, links,
  selectedId, hoverId,
  onSelect, onHover,
  filterDialects, focusOnly, nonChinaOnly,
  labelDensity = 40,
  linkStrength = 0.55,
  charge = -180,
  theme = 'parchment',
}) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const stageRef = useRef(null);
  const simRef = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const draggingRef = useRef(null);
  const drawRef = useRef(null);          // latest draw fn (avoid stale closures in d3 handlers)
  const renderLabelsRef = useRef(null);  // latest renderLabels fn
  const selectedIdRef = useRef(null);    // latest selectedId for mousemove (avoids stale closure)
  const [labelEls, setLabelEls] = useState([]);
  const [tooltipState, setTooltip] = useState(null);

  // index map id -> node object (mutated by sim with x,y)
  const nodeIndex = useMemo(() => {
    const m = new Map();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  // adjacency: id -> Set of neighbor ids; and id -> Set of link objects
  const { adj, edgesByNode, degree } = useMemo(() => {
    const adj = new Map();
    const edgesByNode = new Map();
    const degree = new Map();
    nodes.forEach(n => { adj.set(n.id, new Set()); edgesByNode.set(n.id, []); degree.set(n.id, 0); });
    links.forEach(l => {
      adj.get(l.s).add(l.t);
      adj.get(l.t).add(l.s);
      edgesByNode.get(l.s).push(l);
      edgesByNode.get(l.t).push(l);
      degree.set(l.s, (degree.get(l.s) || 0) + 1);
      degree.set(l.t, (degree.get(l.t) || 0) + 1);
    });
    return { adj, edgesByNode, degree };
  }, [nodes, links]);

  // Active node set (after filter). Edges that have both endpoints in active set.
  const { activeNodes, activeLinks, sourceLinkObjs } = useMemo(() => {
    const HT = window.__HOMETOWNS || {};
    const dialectOK = (n) => !filterDialects || filterDialects.size === 0 || filterDialects.has(n.dialectZh || '__null__');
    const focusOK = (n) => !focusOnly || n.focus;
    const nonChinaOK = (n) => {
      if (!nonChinaOnly) return true;
      const ht = n.originZh ? HT[n.originZh] : null;
      return ht && (ht.region === 'sea' || ht.region === 'world');
    };
    const allowed = new Set(
      nodes.filter(n => dialectOK(n) && focusOK(n) && nonChinaOK(n)).map(n => n.id)
    );
    const activeNodes = nodes.filter(n => allowed.has(n.id));
    const activeLinks = links.filter(l => allowed.has(l.s) && allowed.has(l.t));
    // for D3 we need link objects with source/target referencing node objects (or ids)
    const sourceLinkObjs = activeLinks.map(l => ({ ...l, source: l.s, target: l.t }));
    return { activeNodes, activeLinks, sourceLinkObjs };
  }, [nodes, links, filterDialects, focusOnly, nonChinaOnly]);

  // node radius derived from degree (only counting active edges)
  const radiusOf = useCallback((n) => {
    const d = degree.get(n.id) || 0;
    if (n.focus) return Math.min(16, 4.5 + Math.sqrt(d) * 1.8);
    return Math.max(2.2, 1.6 + Math.sqrt(d) * 0.6);
  }, [degree]);

  // build simulation
  useEffect(() => {
    const w = stageRef.current.clientWidth;
    const h = stageRef.current.clientHeight;
    const cx = w / 2, cy = h / 2;

    // give nodes initial position if missing (in a ring) so sim has a stable start
    activeNodes.forEach((n, i) => {
      if (n.x == null || n.y == null) {
        const a = (i / activeNodes.length) * 2 * Math.PI;
        const rad = 240 + ((degree.get(n.id) || 0) > 8 ? 0 : 80);
        n.x = cx + Math.cos(a) * rad;
        n.y = cy + Math.sin(a) * rad;
      }
    });

    const sim = d3.forceSimulation(activeNodes)
      .force('charge', d3.forceManyBody().strength((d) => d.focus ? charge : charge * 0.4).distanceMax(420))
      .force('link', d3.forceLink(sourceLinkObjs).id(d => d.id)
        .distance(l => (l.classZh && (l.classZh === '三代以内直系血亲及夫妻' || l.classZh === '密切伙伴')) ? 32 : 48)
        .strength(linkStrength))
      .force('center', d3.forceCenter(cx, cy).strength(0.04))
      .force('collide', d3.forceCollide().radius(d => radiusOf(d) + 2.4).iterations(2))
      .force('x', d3.forceX(cx).strength(0.02))
      .force('y', d3.forceY(cy).strength(0.02))
      .alpha(0.9).alphaDecay(0.025);

    simRef.current = sim;
    // Use drawRef so each tick renders with the LATEST draw closure (which
    // knows about the current selectedId/hoverId). Capturing draw directly
    // here would leave the canvas un-dimmed: tick after tick would re-render
    // using the sim-init-time draw, which knew nothing about the selection.
    sim.on('tick', () => { drawRef.current && drawRef.current(); });
    return () => sim.stop();
  // eslint-disable-next-line
  }, [activeNodes, sourceLinkObjs, linkStrength, charge]);

  // resize observer
  useEffect(() => {
    const handle = () => {
      const c = canvasRef.current; if (!c) return;
      const w = stageRef.current.clientWidth;
      const h = stageRef.current.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // adjust center force
      const sim = simRef.current;
      if (sim) {
        sim.force('center', d3.forceCenter(w/2, h/2).strength(0.04));
      }
      draw();
    };
    handle();
    const ro = new ResizeObserver(handle);
    ro.observe(stageRef.current);
    window.addEventListener('resize', handle);
    return () => { ro.disconnect(); window.removeEventListener('resize', handle); };
  }, []);

  // zoom + pan
  useEffect(() => {
    const c = d3.select(canvasRef.current);
    const zoom = d3.zoom()
      .scaleExtent([0.15, 6])
      .filter((event) => {
        // disable zoom on dblclick (we use it later); disable on drag-from-node
        return !event.button && !draggingRef.current;
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        // Always call the latest draw/renderLabels (the refs are updated on every
        // render). The previous closure-captured `draw` could be stale when
        // selectedId changed, leaving the canvas un-dimmed until next interaction.
        drawRef.current && drawRef.current();
        renderLabelsRef.current && renderLabelsRef.current();
      });
    c.call(zoom);
    c.on('dblclick.zoom', null);
    window.__zoomBehavior = zoom;
    return () => { c.on('.zoom', null); };
  }, [activeNodes]);

  // expose zoom methods
  useEffect(() => {
    window.__zoomBy = (k) => {
      d3.select(canvasRef.current).transition().duration(280)
        .call(window.__zoomBehavior.scaleBy, k);
    };
    window.__zoomReset = () => {
      d3.select(canvasRef.current).transition().duration(380)
        .call(window.__zoomBehavior.transform, d3.zoomIdentity);
    };
    window.__centerOn = (id) => {
      const n = nodeIndex.get(id); if (!n) return;
      const w = stageRef.current.clientWidth;
      const h = stageRef.current.clientHeight;
      // If the node was filtered out of the live simulation it has no position
      // yet — drop it in the middle so the centering still works visually.
      if (n.x == null || n.y == null) {
        n.x = w / 2; n.y = h / 2;
      }
      const k = Math.max(1.5, Math.min(2.2, transformRef.current.k * 1.05));
      const t = d3.zoomIdentity.translate(w/2 - n.x * k, h/2 - n.y * k).scale(k);
      d3.select(canvasRef.current).transition().duration(620)
        .call(window.__zoomBehavior.transform, t);
    };
  }, [nodeIndex]);

  // drag/click handler — attach ONCE so a mid-click re-render (from hover
  // state changes) doesn't tear down the listeners and forget the mousedown.
  // All cross-render state lives in refs.
  const hoverIdRef = useRef(null);
  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  const activeNodesRef = useRef(activeNodes);
  const radiusOfRef = useRef(radiusOf);
  useEffect(() => { hoverIdRef.current = hoverId; }, [hoverId]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { activeNodesRef.current = activeNodes; }, [activeNodes]);
  useEffect(() => { radiusOfRef.current = radiusOf; }, [radiusOf]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getXY = (event) => {
      const r = canvas.getBoundingClientRect();
      const x = event.clientX - r.left, y = event.clientY - r.top;
      const t = transformRef.current;
      return [(x - t.x) / t.k, (y - t.y) / t.k];
    };
    const findAt = (x, y) => {
      let best = null, bestR = Infinity;
      const t = transformRef.current;
      const pickR = 22 / t.k;
      const nodes = activeNodesRef.current;
      const rOf = radiusOfRef.current;
      for (const n of nodes) {
        if (n.x == null) continue;
        const dx = n.x - x, dy = n.y - y;
        const d2 = dx*dx + dy*dy;
        const r = rOf(n) + pickR;
        if (d2 < r * r && d2 < bestR) { best = n; bestR = d2; }
      }
      return best;
    };

    // downAt lives on a ref so the click→mouseup pair survives mid-flight
    // React re-renders (which previously detached the handlers).
    const downRef = { current: null };

    const onMove = (event) => {
      const [x, y] = getXY(event);
      if (draggingRef.current) {
        const n = draggingRef.current;
        n.fx = x; n.fy = y;
        const sim = simRef.current;
        if (sim) sim.alphaTarget(0.18).restart();
        return;
      }
      const hit = findAt(x, y);
      if (hit) {
        canvas.style.cursor = 'pointer';
        const sel = selectedIdRef.current;
        if (sel == null && hit.id !== hoverIdRef.current) onHoverRef.current(hit.id);
        if (sel == null) {
          const r = canvas.getBoundingClientRect();
          const t = transformRef.current;
          setTooltip({
            n: hit,
            x: hit.x * t.k + t.x,
            y: hit.y * t.k + t.y,
          });
        } else {
          setTooltip(null);
        }
      } else {
        canvas.style.cursor = 'grab';
        if (hoverIdRef.current) onHoverRef.current(null);
        setTooltip(null);
      }
    };
    const onDown = (event) => {
      if (event.button !== 0) return;
      const [x, y] = getXY(event);
      const hit = findAt(x, y);
      downRef.current = { x: event.clientX, y: event.clientY, hit };
      if (hit) {
        draggingRef.current = hit;
        hit.fx = hit.x; hit.fy = hit.y;
        canvas.classList.add('dragging');
        const sim = simRef.current;
        if (sim) sim.alphaTarget(0.2).restart();
      }
    };
    const onUp = (event) => {
      const wasDragging = draggingRef.current;
      if (wasDragging) {
        wasDragging.fx = null; wasDragging.fy = null;
        canvas.classList.remove('dragging');
        const sim = simRef.current;
        if (sim) sim.alphaTarget(0);
      }
      draggingRef.current = null;
      const downAt = downRef.current;
      if (downAt) {
        const dx = event.clientX - downAt.x, dy = event.clientY - downAt.y;
        const moved = dx*dx + dy*dy > 64;
        if (!moved) onSelectRef.current(downAt.hit ? downAt.hit.id : null);
      }
      downRef.current = null;
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
    // Intentionally empty deps — attach once, use refs for all state.
    // eslint-disable-next-line
  }, []);

  // ----- drawing -----
  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.clientWidth, h = c.clientHeight;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    const t = transformRef.current;
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    // Compute the highlight set. When the user has selected someone, hover
    // does not change the highlight — keeps the selection's ego network
    // sticky until they close the rail. (Otherwise mousing over a different
    // node would flicker the dimming, which feels glitchy.)
    const highlightId = selectedId != null ? selectedId : hoverId;
    const inFocus = highlightId ? new Set([highlightId, ...(adj.get(highlightId) || [])]) : null;

    // Edges first
    ctx.lineCap = 'round';
    for (const l of activeLinks) {
      const s = typeof l.s === 'object' ? l.s : nodeIndex.get(l.s);
      const tNode = typeof l.t === 'object' ? l.t : nodeIndex.get(l.t);
      // actually d3 mutates the link objects we passed to forceLink, so source/target refs
      // are on sourceLinkObjs not l. We'll look up by id.
      const src = nodeIndex.get(l.s), dst = nodeIndex.get(l.t);
      if (!src || !dst || src.x == null || dst.x == null) continue;
      const isFocusEdge = inFocus && (inFocus.has(src.id) && inFocus.has(dst.id) && (src.id === highlightId || dst.id === highlightId));
      const dim = inFocus && !isFocusEdge;
      ctx.strokeStyle = relationClassColor(l.classZh);
      ctx.globalAlpha = dim ? 0.04 : (isFocusEdge ? 0.95 : 0.22);
      const isDashed = l.classZh === '轻度社交';
      if (isDashed) ctx.setLineDash([3, 3]);
      ctx.lineWidth = isFocusEdge ? 1.4 : (l.classZh === '三代以内直系血亲及夫妻' ? 0.9 : 0.55);
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(dst.x, dst.y);
      ctx.stroke();
      if (isDashed) ctx.setLineDash([]);
    }

    // Nodes
    for (const n of activeNodes) {
      if (n.x == null) continue;
      const r = radiusOf(n);
      const dim = inFocus && !inFocus.has(n.id);
      ctx.globalAlpha = dim ? 0.12 : 1;
      ctx.fillStyle = dialectColor(n);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      // ring for focus characters
      if (n.focus) {
        ctx.globalAlpha = dim ? 0.18 : 0.85;
        ctx.strokeStyle = theme === 'midnight' ? 'rgba(255,240,210,0.5)' : 'rgba(28,22,17,0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      // outer halo on selected/hover
      if (n.id === highlightId) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = dialectColor(n);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }, [activeNodes, activeLinks, nodeIndex, radiusOf, hoverId, selectedId, adj, theme]);

  // re-draw on selection/hover/theme change
  useEffect(() => { draw(); renderLabels(); }, [hoverId, selectedId, theme, draw]);

  // Keep refs synced to latest draw/renderLabels/selectedId so d3-zoom and
  // canvas mousemove handlers (which capture closures at registration time)
  // always see the up-to-date version.
  useEffect(() => { drawRef.current = draw; }, [draw]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // ----- label overlay -----
  const renderLabels = useCallback(() => {
    const t = transformRef.current;
    const w = stageRef.current.clientWidth;
    const h = stageRef.current.clientHeight;
    const highlightId = selectedId != null ? selectedId : hoverId;
    const inFocus = highlightId ? new Set([highlightId, ...(adj.get(highlightId) || [])]) : null;

    // sort by importance (focus + degree) to choose top N labels at this zoom
    const k = t.k;
    const baseLimit = labelDensity;
    const zoomBoost = Math.max(0, Math.log2(k)) * 30;
    const limit = Math.min(activeNodes.length, Math.round(baseLimit + zoomBoost));

    const ranked = activeNodes
      .filter(n => n.x != null)
      .map(n => {
        const px = n.x * t.k + t.x;
        const py = n.y * t.k + t.y;
        const visible = px > -40 && px < w + 40 && py > -40 && py < h + 40;
        if (!visible) return null;
        let score = (degree.get(n.id) || 0) * (n.focus ? 1.5 : 0.4);
        if (n.id === selectedId) score += 1e6;
        if (n.id === hoverId) score += 1e5;
        if (inFocus && inFocus.has(n.id)) score += 1e4;
        return { n, px, py, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const picked = ranked.slice(0, limit);
    setLabelEls(picked.map(item => ({
      id: item.n.id,
      x: item.px,
      y: item.py - radiusOf(item.n) - 8,
      zh: item.n.zh,
      en: item.n.en,
      selected: item.n.id === selectedId,
      hover: item.n.id === hoverId,
      inFocus: inFocus ? inFocus.has(item.n.id) : true,
    })));
  }, [activeNodes, hoverId, selectedId, adj, degree, labelDensity, radiusOf]);

  useEffect(() => {
    let raf;
    const loop = () => {
      renderLabels();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [renderLabels]);

  // keep ref synced for d3-zoom callbacks
  useEffect(() => { renderLabelsRef.current = renderLabels; }, [renderLabels]);

  // when selection changes, center on it
  useEffect(() => {
    if (selectedId != null) {
      // wait a tick for sim positions
      setTimeout(() => window.__centerOn?.(selectedId), 60);
    }
  }, [selectedId]);

  // when sim params change, reheat
  useEffect(() => {
    const sim = simRef.current;
    if (sim) { sim.alpha(0.6).restart(); }
  }, [linkStrength, charge]);

  const hasHighlight = hoverId || selectedId;

  return (
    <div className="stage" ref={stageRef} data-highlight={hasHighlight ? 'true' : 'false'}>
      <canvas ref={canvasRef} />
      <div className="labels" ref={overlayRef}>
        {labelEls.map(L => (
          <div key={L.id}
               className={'label' + (L.selected ? ' selected' : '') + (L.hover ? ' hover' : '') + (L.inFocus ? ' in-focus' : '')}
               style={{ left: L.x, top: L.y }}>
            {L.zh}
            {L.en && (L.selected || L.hover) && <span className="en">{L.en}</span>}
          </div>
        ))}
      </div>
      {tooltipState && tooltipState.n.id !== selectedId && (
        <div className="tooltip" style={{ left: tooltipState.x, top: tooltipState.y - radiusOf(tooltipState.n) }}>
          <div>
            <span className="zh">{tooltipState.n.zh}</span>
            {tooltipState.n.en && <span className="en">{tooltipState.n.en}</span>}
          </div>
          {(tooltipState.n.yob || tooltipState.n.yod) && (
            <div className="meta">
              {tooltipState.n.yob || '?'} – {tooltipState.n.yod || '?'}
              {tooltipState.n.dialectEn && ` · ${tooltipState.n.dialectEn}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.ForceGraph = ForceGraph;
