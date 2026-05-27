/* global React, ReactDOM */
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

/* ============================================================
   App — orchestrates state, layout, tweaks
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "parchment",
  "focusOnly": false,
  "nonChinaOnly": false,
  "labelDensity": 36,
  "linkStrength": 0.55,
  "charge": -180,
  "showLegend": true
}/*EDITMODE-END*/;

function App() {
  const data = window.__GRAPH;
  // Merge enrichment overlay (sparse-node supplements + extra historically
  // attested links). Mutates the data once on app mount.
  React.useMemo(() => {
    const enr = window.__ENRICHMENT;
    if (!enr || data.__enriched) return;
    if (enr.nodes) {
      for (const n of data.nodes) {
        const o = enr.nodes[n.id];
        if (!o) continue;
        for (const k of Object.keys(o)) {
          if (k.startsWith('_')) continue; // _note etc are documentation
          if (o[k] != null && o[k] !== '') n[k] = o[k];
        }
      }
    }
    if (enr.links) {
      // Avoid duplicating an enrichment edge if it already exists in the raw
      // data (by s+t+edgeZh).
      const sig = new Set(data.links.map(l => l.s + '-' + l.t + '-' + l.edgeZh));
      for (const l of enr.links) {
        const k1 = l.s + '-' + l.t + '-' + l.edgeZh;
        const k2 = l.t + '-' + l.s + '-' + l.edgeZh;
        if (!sig.has(k1) && !sig.has(k2)) data.links.push(l);
      }
    }
    data.__enriched = true;
  }, []);
  const nodes = data.nodes;
  const links = data.links;

  // Replacement for the removed TweaksPanel scaffolding — a tiny useState
  // wrapper so the (kept) legend controls can still update theme/focusOnly,
  // and the graph still reads its layout defaults from TWEAK_DEFAULTS.
  const [tweaks, setTweaks] = useStateApp(TWEAK_DEFAULTS);
  const setTweak = React.useCallback((key, val) => setTweaks(t => ({ ...t, [key]: val })), []);

  const [selectedId, _setSelectedId] = useStateApp(null);
  const [history, setHistory] = useStateApp([]); // stack of previously selected ids
  const [hoverId, setHoverId] = useStateApp(null);
  const [filterDialects, setFilterDialects] = useStateApp(() => new Set());
  const [query, setQuery] = useStateApp('');
  const [legendCollapsed, setLegendCollapsed] = useStateApp(false);
  const [worldModalOpen, setWorldModalOpen] = useStateApp(false);

  // We track current selection in a ref too so the history updater can read
  // it without racing the state setter (calling one setState inside another's
  // updater is fragile in StrictMode).
  const selectedRef = React.useRef(null);
  const historyRef = React.useRef([]);
  React.useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  React.useEffect(() => { historyRef.current = history; }, [history]);

  // Push current id onto history before navigating to a new one.
  const selectId = React.useCallback((id) => {
    const prev = selectedRef.current;
    if (prev != null && prev !== id) {
      setHistory((h) => [...h.slice(-19), prev]);
    }
    _setSelectedId(id);
  }, []);
  const goBack = React.useCallback(() => {
    const h = historyRef.current;
    if (!h || h.length === 0) {
      _setSelectedId(null);
      return;
    }
    const prev = h[h.length - 1];
    setHistory(h.slice(0, -1));
    _setSelectedId(prev);
  }, []);
  const closeRail = React.useCallback(() => {
    _setSelectedId(null);
    setHistory([]);
  }, []);

  // theme
  useEffectApp(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
  }, [tweaks.theme]);

  // ESC clears selection
  useEffectApp(() => {
    const h = (e) => { if (e.key === 'Escape') { closeRail(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Dialect counts (across all nodes)
  const dialectCounts = useMemoApp(() => {
    const m = new Map();
    for (const n of nodes) {
      const k = n.dialectZh || '__null__';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [nodes]);

  // Stats
  const stats = useMemoApp(() => {
    const focused = nodes.filter(n => n.focus).length;
    return {
      figures: nodes.length,
      focused,
      ties: links.length,
    };
  }, [nodes, links]);

  const toggleDialect = (key) => {
    setFilterDialects(prev => {
      const n = new Set(prev);
      // empty = all shown. clicking a chip ENABLES exclusive filter mode where only checked are shown.
      // Simpler UX: chip click TOGGLES that group's visibility. Treat empty set as 'all visible'.
      // Implement: if empty, start with all-but-clicked; if has set, toggle clicked.
      const allKeys = ['闽','潮','粤','客','三江','琼','__null__'];
      if (n.size === 0) {
        // currently all visible; clicking turns OFF that one => add all others to filter
        allKeys.forEach(k => { if (k !== key) n.add(k); });
      } else {
        if (n.has(key)) {
          n.delete(key);
          if (n.size === 0) {
            // if removing makes it empty — that means user filtered IN nothing visible, restore to all
            // Actually n empty = all visible. The user clicked an unmuted one.
          }
        } else {
          n.add(key);
        }
      }
      // If user filtered everything OUT (set covers all keys present), reset to empty.
      if (n.size >= allKeys.filter(k => dialectCounts.get(k)).length) {
        return new Set();
      }
      return n;
    });
  };

  const selectedPerson = useMemoApp(
    () => selectedId != null ? nodes.find(n => n.id === selectedId) : null,
    [selectedId, nodes]
  );

  return (
    <>
      <div className="chrome">
        <div className="title-block">
          <div className="eyebrow">Singapore Biographical Database · 新华历史</div>
          <h1>新华历史人物列传网络图</h1>
          <div className="latin">A Network of Singapore Chinese Historical Figures</div>
          <div className="meta">
            <span><b>{stats.figures}</b> figures</span>
            <span><b>{stats.focused}</b> biographies</span>
            <span><b>{stats.ties}</b> ties</span>
          </div>
        </div>
      </div>

      <window.ForceGraph
        nodes={nodes} links={links}
        selectedId={selectedId} hoverId={hoverId}
        onSelect={selectId} onHover={setHoverId}
        filterDialects={filterDialects.size === 0 ? null : filterDialects}
        focusOnly={tweaks.focusOnly}
        nonChinaOnly={tweaks.nonChinaOnly}
        labelDensity={tweaks.labelDensity}
        linkStrength={tweaks.linkStrength}
        charge={tweaks.charge}
        theme={tweaks.theme}
      />

      <window.BiographyCard
        person={selectedPerson}
        onClose={closeRail}
        onBack={history.length > 0 ? goBack : null}
        historyDepth={history.length}
        allNodes={nodes}
        allLinks={links}
        onSelect={selectId}
        onExpandMap={() => setWorldModalOpen(true)}
      />

      {window.WorldDiasporaModal && (
        <window.WorldDiasporaModal
          open={worldModalOpen}
          onClose={() => setWorldModalOpen(false)}
          nodes={nodes}
          onSelect={selectId}
          selectedId={selectedId}
        />
      )}

      <div className={'zoom-ctl' + (!selectedPerson ? ' full' : '')}>
        <button onClick={() => window.__zoomBy(1.4)} title="Zoom in">+</button>
        <button onClick={() => window.__zoomBy(1/1.4)} title="Zoom out">−</button>
        <button onClick={() => window.__zoomReset()} title="Reset view" style={{fontSize:11}}>⌂</button>
      </div>

      <div className="legend-stack">
        <window.SearchBar
          nodes={nodes}
          value={query}
          onChange={setQuery}
          onSelect={(id) => { selectId(id); }}
        />
        {tweaks.showLegend && (
          <window.Legend
            dialectCounts={dialectCounts}
            filterDialects={filterDialects}
            onToggleDialect={toggleDialect}
            collapsed={legendCollapsed}
            onToggleCollapse={() => setLegendCollapsed(c => !c)}
            theme={tweaks.theme}
            onSetTheme={v => setTweak('theme', v)}
            focusOnly={tweaks.focusOnly}
            onToggleFocusOnly={v => setTweak('focusOnly', v)}
            nonChinaOnly={tweaks.nonChinaOnly}
            onToggleNonChinaOnly={v => setTweak('nonChinaOnly', v)}
          />
        )}
      </div>

    </>
  );
}

window.App = App;
