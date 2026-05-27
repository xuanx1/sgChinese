/* global React */
const { useMemo: useMemo_sb } = React;

// A figure counts as non-Chinese (for pinyin-suppression) when they have an
// English-name override in __CAUCASIAN_NAMES — these are the explicitly
// identified British, Indian, Malay, etc. figures in the chronicles whose
// only "Chinese name" is itself a transliteration.
function isCaucasian(person) {
  if (!person) return false;
  if (window.__CAUCASIAN_NAMES && window.__CAUCASIAN_NAMES[person.id]) return true;
  if (person.originZh === '英国') return true;
  return false;
}
window.isCaucasian = isCaucasian;

/* ============================================================
   Portrait — uses Wikipedia photo if available, NameSeal otherwise.
   ============================================================ */
function Portrait({ person, size = 56 }) {
  if (!person) return null;
  const photoUrl = window.__PHOTOS?.[person.id];
  if (photoUrl) {
    const dColor = window.dialectColor(person);
    return (
      <div className="photo-portrait" style={{ width: size, height: size }}>
        <img src={photoUrl} alt={person.zh}
             loading="lazy"
             onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <span className="dialect-band" style={{ background: dColor }} />
      </div>
    );
  }
  return <NameSeal person={person} size={size} />;
}
window.Portrait = Portrait;

/* ============================================================
   NameSeal — stylized 印章-style portrait placeholder
   Renders the surname character on a dialect-colored disk.
   ============================================================ */
function NameSeal({ person, size = 56 }) {
  if (!person) return null;
  const color = window.dialectColor(person);
  const name = person.zh || '';
  // Use the first character (surname) — for two-character compound names
  // (欧阳, 司马, 诸葛, 上官, etc.) take both. Detect via known list.
  const compound = ['欧阳','司马','诸葛','上官','夏侯','令狐','慕容','尉迟','长孙','宇文','皇甫','西门','闾丘'];
  const head = compound.find(c => name.startsWith(c)) || name.charAt(0);
  const charCount = head.length;
  const fontSize = charCount === 1 ? size * 0.52 : size * 0.32;
  const subdued = !person.focus;
  return (
    <div className="name-seal" style={{
      width: size, height: size,
      background: color,
      opacity: subdued ? 0.78 : 1,
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <pattern id={`seal-grain-${person.id}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="transparent"/>
            <circle cx="1" cy="1" r="0.3" fill="rgba(255,255,255,0.06)"/>
            <circle cx="3" cy="3" r="0.3" fill="rgba(0,0,0,0.06)"/>
          </pattern>
        </defs>
        <rect width={size} height={size} fill={`url(#seal-grain-${person.id})`} />
        <text x="50%" y="52%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="'Noto Serif SC', serif"
              fontWeight="600"
              fontSize={fontSize}
              fill="rgba(255, 248, 232, 0.96)"
              style={{letterSpacing: charCount === 1 ? '0' : '-0.05em'}}>
          {head}
        </text>
      </svg>
    </div>
  );
}
window.NameSeal = NameSeal;

/* ============================================================
   BiographyCard — right rail
   ============================================================ */
function BiographyCard({ person, onClose, onBack, historyDepth = 0, allNodes, allLinks, onSelect, onExpandMap }) {
  // Hooks must run unconditionally — collect connections even if person is null.
  const connections = useMemo_sb(() => {
    if (!person) return [];
    const me = person.id;
    const out = [];
    for (const l of allLinks) {
      if (l.s === me) {
        const other = allNodes.find(n => n.id === l.t);
        if (other) out.push({ other, rel: l, direction: 'out' });
      } else if (l.t === me) {
        const other = allNodes.find(n => n.id === l.s);
        if (other) out.push({ other, rel: l, direction: 'in' });
      }
    }
    const order = ['三代以内直系血亲及夫妻', '普通亲戚', '密切伙伴', '普通伙伴', '轻度社交'];
    out.sort((a, b) => {
      const oa = order.indexOf(a.rel.classZh);
      const ob = order.indexOf(b.rel.classZh);
      if (oa !== ob) return oa - ob;
      return (a.other.zh || '').localeCompare(b.other.zh || '');
    });
    return out;
  }, [person, allLinks, allNodes]);

  const dColor = person ? window.dialectColor(person) : 'transparent';
  const isEmpty = !person;

  // Compute top-degree focused figures for the empty-state featured list.
  const featured = useMemo_sb(() => {
    if (!isEmpty) return [];
    const deg = new Map();
    for (const l of allLinks) {
      deg.set(l.s, (deg.get(l.s) || 0) + 1);
      deg.set(l.t, (deg.get(l.t) || 0) + 1);
    }
    return allNodes
      .filter(n => n.focus)
      .map(n => ({ n, d: deg.get(n.id) || 0 }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 10);
  }, [isEmpty, allNodes, allLinks]);

  return (
    <aside className={'rail' + (isEmpty ? ' empty' : '')}>
      <div className="rail-header">
        {!isEmpty && (
          <div className="rail-nav">
            {onBack && (
              <button className="rail-back" onClick={onBack} title={`Back · ${historyDepth} previous`}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 1.5L2.5 5.5L6.5 9.5"/></svg>
                <span>Back</span>
              </button>
            )}
            <button className="rail-close" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>
            </button>
          </div>
        )}
        <div className="seal">
          {isEmpty ? (
            <>Biography</>
          ) : (
            <>
              <span className="dot" style={{ background: dColor }} />
              {person.focus ? '核心人物 · Focused' : '相关人物 · Related'}
              {person.dialectEn && <span style={{marginLeft:'auto', color:'var(--ink-soft)'}}>{person.dialectZh} / {person.dialectEn}</span>}
            </>
          )}
        </div>
        {!isEmpty && (
          <div className="bio-headline">
            <Portrait person={person} size={68} />
            <div className="bio-titles">
              <h2>{person.zh}</h2>
              {/* Prefer the real English name for Caucasian figures (Queen
                  Elizabeth II rather than just the Chinese transliteration
                  伊丽莎白二世). Falls back to whatever's in the dataset. */}
              {(() => {
                const realEn = window.__CAUCASIAN_NAMES?.[person.id];
                const en = realEn || person.en;
                return en ? <div className="en-name">{en}</div> : null;
              })()}
              {/* Pinyin is only meaningful for Chinese names — suppress it
                  for Caucasian figures. */}
              {person.pinyin && !isCaucasian(person) && <div className="pinyin">{person.pinyin}</div>}
            </div>
          </div>
        )}
        {isEmpty && (
          <h2 style={{opacity: 0.18, fontSize: 22, fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontWeight: 400, marginTop: 6}}>
            No figure selected
          </h2>
        )}
        {!isEmpty && (person.yob || person.yod) && (
          <div className="years">
            {person.yob || '?'}<span className="sep">—</span>{person.yod || '?'}
            {(person.yob && person.yod) && <span style={{marginLeft:10, fontSize:12, color:'var(--ink-mute)'}}>· {person.yod - person.yob} years</span>}
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="rail-body">
          <p style={{fontFamily:'var(--font-serif)', fontSize:14, fontStyle:'italic', color:'var(--ink-soft)', lineHeight:1.55, margin:'0 0 22px'}}>
            Click any node in the network to read a biographical card — dialect group,
            ancestral home, ties to other figures, and original sources from
            <i> 新华历史人物列传 </i>and the SBDB archive.
          </p>
          <div className="section-head">Featured biographies</div>
          <div className="featured-list">
            {featured.map(({n, d}) => {
              return (
                <div key={n.id} className="featured-item" onClick={() => onSelect(n.id)}>
                  <Portrait person={n} size={44} />
                  <div className="info">
                    <div className="name">
                      <span className="zh">{n.zh}</span>
                      {(() => {
                        const en = window.__CAUCASIAN_NAMES?.[n.id] || n.en;
                        return en ? <span className="en">{en}</span> : null;
                      })()}
                    </div>
                    <div className="meta">
                      {n.yob || '?'}–{n.yod || '?'} · {d} ties · {n.dialectEn || 'unrecorded'}
                    </div>
                  </div>
                  <span className="chev">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 1l4 4-4 4"/></svg>
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:24, padding:'14px 16px', background:'var(--bg-deep)', borderLeft:'2px solid var(--rule-strong)', fontSize:12, lineHeight:1.55, color:'var(--ink-mute)', fontFamily:'var(--font-serif)', fontStyle:'italic'}}>
            Source data: <a href="https://sbdb.nus.edu.sg/" target="_blank" rel="noreferrer" style={{color:'var(--accent)', textDecoration:'none', borderBottom:'1px solid currentColor'}}>Singapore Biographical Database (NUS)</a> and <i>新华历史人物列传</i>, courtesy of the NLB digital collection.
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="rail-body">
          <Field label="Dialect" zh={person.dialectZh} en={person.dialectEn} inline />
          <Field label="Connections" value={`${connections.length}`} />

          {/* Ancestral home map — Republican-era + present-day. The map's
              caption now carries both origin AND birthplace, replacing the
              separate Field rows above. When origin isn't geocoded, fall
              back to plain Field rows so the data isn't lost. */}
          {person.originZh && window.__HOMETOWNS?.[person.originZh] && window.ChinaMap ? (
            <window.ChinaMap person={person} onExpand={onExpandMap} />
          ) : (
            <>
              <Field label="Ancestral home" zh={person.originZh} en={person.originEn} />
              <Field label="Birthplace" zh={person.birthplaceZh} en={person.birthplaceEn} />
            </>
          )}

          {connections.length > 0 && (
            <>
              <div className="section-head">
                Ties <span className="count">{connections.length}</span>
              </div>
              <div className="connections">
                {connections.map((c, i) => {
                  return (
                    <div key={i} className="connection" onClick={() => onSelect(c.other.id)}>
                      <NameSeal person={c.other} size={36} />
                      <div className="info">
                        <div className="name">
                          {c.other.zh}
                          {(() => {
                            const en = window.__CAUCASIAN_NAMES?.[c.other.id] || c.other.en;
                            return en ? <span className="en">{en}</span> : null;
                          })()}
                        </div>
                        <div className="rel">
                          <span style={{color: window.relationClassColor(c.rel.classZh), fontStyle: 'normal', fontWeight: 500, fontSize: 11, fontFamily: 'var(--font-ui)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 6}}>
                            {c.rel.edgeEn}
                          </span>
                          · {c.rel.edgeZh}
                        </div>
                        {c.rel.remark && <div className="remark">{c.rel.remark}</div>}
                      </div>
                      <span className="chev">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 1l4 4-4 4"/></svg>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="section-head">Sources</div>
          <div className="refs">
            {person.ref1 && (
              <div className="ref">
                {person.ref1Link
                  ? <a href={person.ref1Link} target="_blank" rel="noreferrer">{person.ref1}</a>
                  : person.ref1}
              </div>
            )}
            {person.ref2 && (
              <div className="ref">
                {person.ref2Link
                  ? <a href={person.ref2Link} target="_blank" rel="noreferrer">{person.ref2}</a>
                  : person.ref2}
                {person.ref2Index && <div className="index">{person.ref2Index}</div>}
              </div>
            )}
            {person.nlb && (
              <div className="ref">
                <a href={person.nlb} target="_blank" rel="noreferrer">NLB Linked Data Entry ↗</a>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function Field({ label, zh, en, value, inline }) {
  const hasAny = (zh && zh !== 'null') || en || value;
  if (!hasAny) return null;
  return (
    <div className="field">
      <div className="label">{label}</div>
      <div className="value">
        {value
          ? <span>{value}</span>
          : (
            <>
              {zh && zh !== 'null' && <span className="zh">{zh}</span>}
              {en && (inline
                ? <span className="en">{' '}{en}</span>
                : <><br/><span className="en">{en}</span></>)}
            </>
          )}
      </div>
    </div>
  );
}

window.BiographyCard = BiographyCard;

/* ============================================================
   Legend (bottom-left)
   ============================================================ */
function Legend({
  dialectCounts, filterDialects, onToggleDialect,
  collapsed, onToggleCollapse,
  theme, onSetTheme,
  focusOnly, onToggleFocusOnly,
  nonChinaOnly, onToggleNonChinaOnly,
}) {
  const dialects = [
    { zh: '闽', en: 'Hokkien' },
    { zh: '潮', en: 'Teochew' },
    { zh: '粤', en: 'Canton' },
    { zh: '客', en: 'Hakka' },
    { zh: '三江', en: 'Sam Kiang' },
    { zh: '琼', en: 'Hainan' },
    { zh: null, en: 'Unrecorded' },
  ];
  const edges = [
    { cls: '三代以内直系血亲及夫妻', label: 'Direct kin / spouse' },
    { cls: '普通亲戚', label: 'Relative' },
    { cls: '密切伙伴', label: 'Close partner' },
    { cls: '普通伙伴', label: 'Partner' },
    { cls: '轻度社交', label: 'Social contact', dotted: true },
  ];
  const total = Array.from(dialectCounts.values()).reduce((a,b)=>a+b,0);
  return (
    <div className={'legend' + (collapsed ? ' collapsed' : '')}>
      <div className="legend-title" onClick={onToggleCollapse}>
        <span>Legend &amp; Filters</span>
        <span className="toggle">{collapsed ? '▸' : '▾'}</span>
      </div>
      <div className="legend-body">
        <div className="legend-section">
          <div className="legend-section-title">Dialect group · click to filter</div>
          {dialects.map(d => {
            const key = d.zh || '__null__';
            const count = dialectCounts.get(key) || 0;
            if (count === 0) return null;
            const isFiltered = filterDialects && filterDialects.size > 0 && !filterDialects.has(key);
            return (
              <div key={key} className={'item' + (isFiltered ? ' muted' : '')}
                   onClick={() => onToggleDialect(key)}>
                <span className="dot" style={{background: window.dialectColor({dialectZh: d.zh})}} />
                <span className="label">
                  {d.zh && <span className="zh">{d.zh}</span>}
                  <span className="en">{d.en}</span>
                </span>
                <span className="count">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="legend-section">
          <div className="legend-section-title">Tie classification</div>
          {edges.map(e => (
            <div key={e.cls} className={'edge-item' + (e.dotted ? ' dotted' : '')}
                 style={{color: window.relationClassColor(e.cls)}}>
              <span className="swatch" />
              <span style={{color: 'var(--ink-soft)'}}>{e.label}</span>
            </div>
          ))}
        </div>
        <div className="legend-section">
          <div className="legend-section-title">Settings</div>
          <div className="legend-setting">
            <span className="label">Theme</span>
            <div className="seg">
              <button
                className={'seg-btn' + (theme === 'parchment' ? ' active' : '')}
                onClick={() => onSetTheme && onSetTheme('parchment')}
              >Parchment</button>
              <button
                className={'seg-btn' + (theme === 'midnight' ? ' active' : '')}
                onClick={() => onSetTheme && onSetTheme('midnight')}
              >Midnight</button>
            </div>
          </div>
          <div className="legend-setting toggle-row" onClick={() => onToggleFocusOnly && onToggleFocusOnly(!focusOnly)}>
            <span className="label">Focused figures only</span>
            <span className={'switch' + (focusOnly ? ' on' : '')}>
              <span className="thumb" />
            </span>
          </div>
          <div className="legend-setting toggle-row" onClick={() => onToggleNonChinaOnly && onToggleNonChinaOnly(!nonChinaOnly)}>
            <span className="label">Non-China ancestral home</span>
            <span className={'switch' + (nonChinaOnly ? ' on' : '')}>
              <span className="thumb" />
            </span>
          </div>
        </div>
        <div className="help">
          <div>Click node to open biography.</div>
          <div>Drag to reposition. Scroll to zoom.</div>
          <div style={{marginTop: 6}}><kbd>Esc</kbd> clears selection</div>
        </div>
      </div>
    </div>
  );
}

window.Legend = Legend;

/* ============================================================
   SearchBar
   ============================================================ */
function SearchBar({ nodes, onSelect, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);

  const results = React.useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    const matches = [];
    const caucasianNames = window.__CAUCASIAN_NAMES || {};
    for (const n of nodes) {
      const extraEn = caucasianNames[n.id] || '';
      const hay = (
        (n.zh || '') + ' ' + (n.en || '') + ' ' + (n.pinyin || '') + ' ' + extraEn
      ).toLowerCase();
      if (hay.includes(q)) matches.push(n);
      if (matches.length > 30) break;
    }
    matches.sort((a, b) => {
      // focus first, then degree-ish via name length proxy
      if (a.focus !== b.focus) return a.focus ? -1 : 1;
      const ai = a.zh?.indexOf(value) ?? -1;
      const bi = b.zh?.indexOf(value) ?? -1;
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return matches.slice(0, 12);
  }, [value, nodes]);

  const onKey = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIdx]) { onSelect(results[activeIdx].id); setOpen(false); onChange(''); }
    } else if (e.key === 'Escape') { setOpen(false); onChange(''); }
  };

  return (
    <div className="search">
      <span className="icon">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="6" r="4.2"/><path d="M9.2 9.2L12 12"/></svg>
      </span>
      <input
        placeholder="Search by name · 汉字 / English / pīnyīn"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKey}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((r, i) => (
            <div key={r.id}
                 className={'search-result' + (i === activeIdx ? ' active' : '')}
                 onMouseDown={() => { onSelect(r.id); onChange(''); setOpen(false); }}
                 onMouseEnter={() => setActiveIdx(i)}>
              <span className="dialect-dot" style={{background: window.dialectColor(r)}} />
            <div className="names">
              <span className="zh">{r.zh}{r.focus && <span style={{color:'var(--accent)', marginLeft:6, fontSize:10, fontFamily:'var(--font-ui)', letterSpacing:'0.18em'}}>◆</span>}</span>
              {(() => {
                const realEn = window.__CAUCASIAN_NAMES?.[r.id];
                const en = realEn || r.en || r.pinyin;
                return en ? <span className="en">{en}</span> : null;
              })()}
            </div>
              <div className="years">
                {r.yob || '?'}–{r.yod || '?'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.SearchBar = SearchBar;
