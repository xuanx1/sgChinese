/* global React, d3 */
/* ============================================================
   WorldDiasporaModal — fullscreen modal showing every figure
   plotted on their ancestral home. Two map modes (ROC 1911,
   PRC modern), zoom/pan, faint world backdrop with highlighted
   countries for the ones actually represented in the network.
   ============================================================ */
const { useEffect: useEffect_wm, useRef: useRef_wm, useState: useState_wm } = React;

function WorldDiasporaModal({ open, onClose, nodes, onSelect, selectedId }) {
  const ref = useRef_wm(null);
  const [mode, setMode] = useState_wm('roc');
  const [hover, setHover] = useState_wm(null);

  useEffect_wm(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  useEffect_wm(() => {
    if (!open || !ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const HT = window.__HOMETOWNS || {};
    const w = ref.current.clientWidth;
    const h = ref.current.clientHeight;

    // Pin the SVG's internal coordinate system to its rendered size so the
    // projection coordinates we compute (in px) map 1:1 to displayed pixels.
    svg.attr('width', w).attr('height', h)
       .attr('viewBox', `0 0 ${w} ${h}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');

    // Full-world Mercator centered on the equator/Greenwich. Scale chosen so
    // the map FILLS the larger modal dimension — for a landscape modal that
    // means 360° of longitude spans the full canvas width, with the polar
    // latitudes naturally cropped above/below since Mercator clipped to ±85°
    // is roughly square (2π × 2π in projection units).
    const baseScale = Math.max(w, h) / (2 * Math.PI);
    const projection = d3.geoMercator()
      .center([0, 0])
      .scale(baseScale)
      .translate([w / 2, h / 2]);
    const path = d3.geoPath().projection(projection);

    // Container <g> so zoom/pan transforms one element rather than re-drawing
    const root = svg.append('g').attr('class', 'world-root');

    // Background ocean — slate blue, very obviously not parchment.
    svg.insert('rect', ':first-child')
      .attr('width', w).attr('height', h).attr('fill', '#2a3a52');

    // === All 242 world countries (NE 50m) — drawn as flat warm wash ===
    // Pre-sorted by approximate polygon size so the GIANT countries (Russia
    // with antimeridian-wrapping rings, USA with Alaska, etc.) render FIRST
    // — putting them at the bottom of the stack so smaller countries draw
    // on top and remain visible.
    // === All 242 world countries (NE 50m) — OUTLINE ONLY ===
    // No fill — so antimeridian-wrapping rings (Russia, USA, France with
    // overseas territories) can't paint over smaller countries. Only thin
    // stroked outlines, drawn in document order against the dark ocean.
    // In ROC mode, swap to the 1900 historical world (British Raj, Ottoman
    // Empire, Austria-Hungary, Manchu Empire, etc.) so the diaspora reads
    // against the political world it actually moved through.
    const faintGeo = (mode === 'roc' && window.__ALL_COUNTRIES_1900)
      ? window.__ALL_COUNTRIES_1900
      : window.__ALL_COUNTRIES;
    if (faintGeo) {
      root.append('g').attr('class', 'layer-world-faint')
        .selectAll('path').data(faintGeo.features).enter()
        .append('path').attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#f0e7d2').attr('stroke-width', 0.7);
    }

    // === Highlighted countries — parchment fill matching the China layer,
    // so every nation actually represented in the network reads as warm
    // accented land against the dark ocean. China is excluded here because
    // it gets its own dedicated provinces layer below.
    // Natural Earth ships polygons with CW exterior rings, but d3-geo reads
    // GeoJSON spherically and expects CCW exteriors (RFC 7946). A wrong-
    // wound exterior is read as the *complement* of the country, projecting
    // onto Mercator as a fill covering the entire canvas. Rewind per
    // individual polygon (not per feature) so a MultiPolygon with mixed
    // winding across its sub-polygons still gets every sub-polygon corrected.
    const rewindPolygon = (rings) => {
      const probe = { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings } };
      return d3.geoArea(probe) > 2 * Math.PI
        ? rings.map(r => [...r].reverse())
        : rings;
    };
    const rewindFeature = (f) => {
      if (!f.geometry) return f;
      const g = f.geometry;
      if (g.type === 'Polygon') {
        return { ...f, geometry: { ...g, coordinates: rewindPolygon(g.coordinates) } };
      }
      if (g.type === 'MultiPolygon') {
        return { ...f, geometry: { ...g, coordinates: g.coordinates.map(rewindPolygon) } };
      }
      return f;
    };

    const drawHighlight = (geo, fillKey) => {
      if (!geo) return;
      // Rewind first, then sort biggest-first so wide-bounding features
      // render at the bottom of the stack and don't paint over neighbours.
      const fixed = geo.features.map(rewindFeature);
      const sorted = fixed.sort((a, b) => d3.geoArea(b) - d3.geoArea(a));
      root.append('g').attr('class', `layer-${fillKey}`)
        .selectAll('path').data(sorted).enter()
        .append('path').attr('d', path)
        .attr('fill', d => d.properties.name === 'China' ? 'none' : '#fff5dc')
        .attr('fill-opacity', 0.55)
        .attr('stroke', '#f0e7d2').attr('stroke-width', 1.4)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
    };
    // In ROC mode, swap to the 1900 political units: British Raj covers
    // India + Burma; Malaya covers Straits Settlements (incl. Singapore)
    // and British Borneo; Netherlands Indies covers Indonesia; Rattanakosin
    // Kingdom covers Siam. The China region is still drawn from the ROC
    // 1911 provinces layer below, so the Manchu Empire polygon doesn't get
    // a highlight fill here.
    const worldHL = (mode === 'roc' && window.__WORLD_1900_GEO) ? window.__WORLD_1900_GEO : window.__WORLD_GEO;
    const seaHL   = (mode === 'roc' && window.__SEA_1900_GEO)   ? window.__SEA_1900_GEO   : window.__SEA_GEO;
    drawHighlight(worldHL, 'world');
    drawHighlight(seaHL, 'sea');

    // China provinces — parchment fill at 0.55 so the China region reads as
    // accented but province borders still visible.
    const chinaGeo = (mode === 'roc' && window.__ROC_1911_GEO) ? window.__ROC_1911_GEO : window.__CHINA_GEO;
    if (chinaGeo) {
      root.append('g').attr('class', 'layer-china')
        .selectAll('path').data(chinaGeo.features).enter()
        .append('path').attr('d', path)
        .attr('fill', '#fff5dc').attr('fill-opacity', 0.55)
        .attr('stroke', '#f0e7d2').attr('stroke-width', 0.5)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
    }
    // China country outline drawn last on top — modern PRC border in PRC mode,
    // union-of-1911-provinces (with holes closed) in ROC mode.
    const countryOutline = (mode === 'roc' && window.__ROC_1911_OUTLINE)
      ? window.__ROC_1911_OUTLINE
      : (window.__ALL_COUNTRIES?.features.find(f => f.properties.name === 'China'));
    if (countryOutline) {
      root.append('path').attr('d', path(countryOutline))
        .attr('fill', 'none').attr('stroke', '#f0e7d2').attr('stroke-width', 1.4)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
    }

    // === Aggregate ancestral-home + birthplace points per coord ===
    // Each figure contributes up to two markers — origin (filled) and
    // birthplace (hollow). We bucket BY COORD so multiple figures from the
    // same place collapse into a single dot, with separate buckets for
    // origin vs birth so the visual distinction holds.
    const buckets = new Map(); // key = lon,lat,kind -> {coord, kind, persons[]}
    const migrationArcs = [];   // [{origin:[x,y], birth:[x,y], color, person}]
    for (const n of nodes) {
      const ht = n.originZh ? HT[n.originZh] : null;
      const bp = n.birthplaceZh ? HT[n.birthplaceZh] : null;
      if (ht?.coord) {
        const k = ht.coord.join(',') + ':origin';
        if (!buckets.has(k)) buckets.set(k, { coord: ht.coord, kind: 'origin', ht, persons: [] });
        buckets.get(k).persons.push(n);
      }
      if (bp?.coord && (!ht?.coord || ht.coord.join(',') !== bp.coord.join(','))) {
        const k = bp.coord.join(',') + ':birth';
        if (!buckets.has(k)) buckets.set(k, { coord: bp.coord, kind: 'birth', ht: bp, persons: [] });
        buckets.get(k).persons.push(n);
        // Record the migration arc for figures whose origin and birthplace differ
        if (ht?.coord) migrationArcs.push({ origin: ht.coord, birth: bp.coord, person: n });
      }
    }

    // === Diaspora arcs (migration lines: origin → birthplace) ===
    // Solid stroke. The colour is a userSpaceOnUse linearGradient running
    // along the arc direction with alternating bright/faded stops; an
    // animateTransform shifts the gradient one full period per cycle so
    // the eye reads it as light flowing from origin to birthplace. No
    // dasharray — the flow is purely colour, not a marching-ants pattern.
    const arcDefs = root.append('defs');
    const arcG = root.append('g').attr('class', 'migration-arcs');
    migrationArcs.forEach((arc, i) => {
      const a = projection(arc.origin);
      const b = projection(arc.birth);
      if (!a || !b || isNaN(a[0]) || isNaN(b[0])) return;
      const [x1, y1] = a, [x2, y2] = b;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const off = Math.min(60, len * 0.18);
      const cx = (x1 + x2) / 2 - (dy / len) * off;
      const cy = (y1 + y2) / 2 + (dx / len) * off;
      const color = window.dialectColor(arc.person);
      const gid = `arc-flow-${i}`;
      // Gradient period = 1/4 of arc length so the pattern tiles 4× across.
      const period = Math.max(40, len / 4);
      const ux = dx / len, uy = dy / len;
      const gx = ux * period, gy = uy * period;
      const grad = arcDefs.append('linearGradient')
        .attr('id', gid)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('spreadMethod', 'repeat')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x1 + gx).attr('y2', y1 + gy);
      grad.append('stop').attr('offset', '0').attr('stop-color', color).attr('stop-opacity', 0.2);
      grad.append('stop').attr('offset', '0.5').attr('stop-color', color).attr('stop-opacity', 1);
      grad.append('stop').attr('offset', '1').attr('stop-color', color).attr('stop-opacity', 0.2);
      grad.append('animateTransform')
        .attr('attributeName', 'gradientTransform')
        .attr('type', 'translate')
        .attr('from', '0 0')
        .attr('to', `${gx} ${gy}`)
        .attr('dur', '1.8s')
        .attr('repeatCount', 'indefinite');
      arcG.append('path')
        .attr('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`)
        .attr('fill', 'none').attr('stroke', `url(#${gid})`)
        .attr('stroke-width', 1.6)
        .attr('stroke-linecap', 'round');
    });

    // === Diaspora dot markers (origin discs + birthplace rings) ===
    const dotsG = root.append('g').attr('class', 'home-dots');
    const dots = [];
    for (const b of buckets.values()) {
      const [px, py] = projection(b.coord);
      if (isNaN(px)) continue;
      const dialectCount = {};
      for (const p of b.persons) {
        const k = p.dialectZh || '__';
        dialectCount[k] = (dialectCount[k] || 0) + 1;
      }
      const top = Object.entries(dialectCount).sort((a, b) => b[1] - a[1])[0];
      const repPerson = b.persons.find(p => p.dialectZh === top[0]) || b.persons[0];
      const color = window.dialectColor(repPerson);
      const r = Math.min(14, 3 + Math.sqrt(b.persons.length) * 2);
      const isSelectedHere = selectedId != null && b.persons.some(p => p.id === selectedId);
      dots.push({ px, py, r, color, bucket: b, isSelectedHere, kind: b.kind });
    }
    dots.sort((a, b) => b.r - a.r);
    for (const d of dots) {
      // Outer g translates with the map (so position scales with zoom).
      // Inner g receives an inverse-scale on every zoom event so the dot's
      // pixel size stays constant — overlapping dots at base zoom visually
      // separate as the user zooms in.
      const g = dotsG.append('g').attr('transform', `translate(${d.px},${d.py})`)
        .style('cursor', 'pointer');
      const inner = g.append('g').attr('class', 'dot-inner');
      if (d.kind === 'origin') {
        inner.append('circle').attr('r', d.r).attr('fill', d.color).attr('fill-opacity', 0.78)
          .attr('stroke', 'var(--bg-card)').attr('stroke-width', 1);
      } else {
        inner.append('circle').attr('r', d.r).attr('fill', 'var(--bg-card)').attr('fill-opacity', 0.9)
          .attr('stroke', d.color).attr('stroke-width', 1.6).attr('stroke-dasharray', '2 1.6');
        inner.append('circle').attr('r', Math.max(1.5, d.r * 0.3)).attr('fill', d.color).attr('opacity', 0.55);
      }
      if (d.isSelectedHere) {
        inner.append('circle').attr('r', d.r + 6).attr('fill', 'none')
          .attr('stroke', d.color).attr('stroke-width', 1.6).attr('opacity', 0.7);
      }
      g.on('mouseenter', () => setHover(d.bucket));
      g.on('mouseleave', () => setHover(null));
      g.on('click', () => {
        const focused = d.bucket.persons.find(p => p.focus);
        onSelect((focused || d.bucket.persons[0]).id);
        onClose();
      });
    }

    // === Zoom & pan behavior — start at identity each time ===
    // Min scale is 1 (the base fit). translateExtent is the projected
    // world's pixel bbox (a max(w,h)×max(w,h) square centered on the
    // canvas) — bigger than the viewport on the cropped axis, so the user
    // can pan to reveal the cropped polar regions at scale=1, and pan
    // within the world at higher scales. Without this, scale=1 has no
    // pannable slack and the map appears frozen.
    const worldHalf = baseScale * Math.PI;
    const worldBBox = [
      [w / 2 - worldHalf, h / 2 - worldHalf],
      [w / 2 + worldHalf, h / 2 + worldHalf],
    ];
    const zoom = d3.zoom()
      .scaleExtent([1, 12])
      .translateExtent(worldBBox)
      .extent([[0, 0], [w, h]])
      .on('zoom', (event) => {
        root.attr('transform', event.transform);
        const k = event.transform.k;
        // Inverse-scale each dot so it stays a constant screen-pixel size
        // regardless of map zoom — overlapping dots at base zoom visually
        // separate as the user zooms in.
        root.selectAll('.dot-inner').attr('transform', `scale(${1 / k})`);
        // Migration arc stroke scales inversely so a zoomed-in arc stays
        // visually thin. Gradient stops + animateTransform are in user
        // coords and follow the path through the zoom transform, so no
        // extra work is needed for the flow animation.
        root.selectAll('.migration-arcs path').attr('stroke-width', 1.6 / k);
      });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);  // reset to identity on (re-)open
    svg.on('dblclick.zoom', null);
  }, [open, mode, nodes, selectedId]);

  if (!open) return null;
  const HT = window.__HOMETOWNS || {};
  const hoveredLabel = hover && (() => {
    const ht = hover.ht;
    const focused = hover.persons.filter(p => p.focus);
    const samples = (focused.length ? focused : hover.persons).slice(0, 8);
    return {
      placeZh: mode === 'roc' ? ht.rocZh : ht.prcZh,
      placeEn: mode === 'roc' ? ht.rocEn : ht.prcEn,
      count: hover.persons.length,
      samples,
    };
  })();

  return (
    <div className="world-modal-backdrop" onClick={onClose}>
      <div className="world-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <div className="eyebrow">Singapore Biographical Database · 新华历史</div>
            <h2>新华历史人物列传</h2>
            <div className="latin">Every figure mentioned in Singapore Chinese historical figures</div>
            <div className="meta">
              {nodes.filter(n => n.originZh && HT[n.originZh]?.coord).length} of {nodes.length} figures geocoded · drag to pan, scroll to zoom
            </div>
          </div>
          <div className="modal-controls">
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>
            </button>
          </div>
        </header>
        <div className="world-map-host">
          <svg ref={ref} className="world-modal-map" />
          {/* Mode switcher + expanded description, anchored top-left of the
              map area. Description shown below the active tab. */}
          <div className="world-mode-panel">
            <div className="china-map-tabs">
              <button className={'tab' + (mode === 'roc' ? ' active' : '')} onClick={() => setMode('roc')}>
                ROC <span className="yr">1911</span>
              </button>
              <button className={'tab' + (mode === 'prc' ? ' active' : '')} onClick={() => setMode('prc')}>
                PRC <span className="yr">today</span>
              </button>
            </div>
            <div className="world-mode-note">
              {mode === 'roc' ? (
                <>
                  <b>ROC, 1911 · 中華民國</b>
                  <p>The Republic of China at its founding had <b>27 provinces</b> plus three commission-administered frontier regions. <b>Outer Mongolia</b> was the Wuliyasutai region — independence wasn't recognised until 1946. <b>Manchuria</b> was a single province, Fengtian (奉天), covering today's Liaoning, Jilin and Heilongjiang. <b>North China</b> was governed as Zhili (直隸), now Beijing / Tianjin / Hebei. <b>Tibet (Xizang)</b> was a single frontier region. <b>Hainan</b> was a circuit of Guangdong, not a province. There was no separate <b>Chongqing</b> (part of Sichuan), no <b>Ningxia</b> (part of Gansu), and no <b>Inner Mongolia AR</b>. <b>Taiwan</b> was a Japanese colony (1895–1945) — not part of China at all.</p>
                </>
              ) : (
                <>
                  <b>PRC, today · 中华人民共和国</b>
                  <p>The People's Republic has <b>31 provincial-level divisions</b> on the mainland: 22 provinces, 5 autonomous regions, and 4 direct-administered municipalities — plus Hong Kong and Macau as Special Administrative Regions. <b>Hainan</b> was split off Guangdong in 1988. <b>Chongqing</b> was carved out of Sichuan as a direct-administered municipality in 1997. <b>Ningxia</b> and <b>Inner Mongolia</b> were established as autonomous regions in 1958 and 1947. <b>Tibet AR</b> was formally constituted in 1965. <b>Outer Mongolia</b> is now the independent Republic of Mongolia. <b>Taiwan</b> is administered by the ROC and not part of the PRC.</p>
                </>
              )}
            </div>
          </div>
        </div>
        {hoveredLabel && (
          <div className="world-tip">
            <div className="place">
              <span className="zh">{hoveredLabel.placeZh}</span>
              <span className="en">{hoveredLabel.placeEn}</span>
            </div>
            <div className="count">{hoveredLabel.count} figure{hoveredLabel.count > 1 ? 's' : ''}</div>
            <div className="samples">
              {hoveredLabel.samples.map(p => (
                <span key={p.id} className="samp">{p.zh}{p.focus ? ' ◆' : ''}</span>
              ))}
              {hoveredLabel.count > hoveredLabel.samples.length && <span className="more">+ {hoveredLabel.count - hoveredLabel.samples.length} more</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.WorldDiasporaModal = WorldDiasporaModal;
