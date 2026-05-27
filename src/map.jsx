/* global React, d3 */
/* ============================================================
   ChinaMap — inline map showing a person's ancestral hometown.
   For China-region hometowns the toggle is ROC (1930s) ↔ PRC (today)
   and the map shows PRC provinces with ROC overlay cues.
   For Nanyang (Straits) and other non-China hometowns the toggle
   becomes Traditional 繁體 ↔ Simplified 简体, and the map uses
   high-resolution Natural Earth country boundaries.
   ============================================================ */
const { useRef: useRef_map, useEffect: useEffect_map, useState: useState_map } = React;

const PROVINCE_1930 = {
  '福建省':       { rocZh: '福建省', rocEn: 'Fukien', prcEn: 'Fujian' },
  '广东省':       { rocZh: '廣東省', rocEn: 'Kwangtung', prcEn: 'Guangdong' },
  '海南省':       { rocZh: '廣東省（海南道）', rocEn: 'Kwangtung (Hainan)', prcEn: 'Hainan' },
  '广西壮族自治区': { rocZh: '廣西省', rocEn: 'Kwangsi', prcEn: 'Guangxi Zhuang AR' },
  '江西省':       { rocZh: '江西省', rocEn: 'Kiangsi', prcEn: 'Jiangxi' },
  '湖南省':       { rocZh: '湖南省', rocEn: 'Hunan', prcEn: 'Hunan' },
  '湖北省':       { rocZh: '湖北省', rocEn: 'Hupeh', prcEn: 'Hubei' },
  '浙江省':       { rocZh: '浙江省', rocEn: 'Chekiang', prcEn: 'Zhejiang' },
  '江苏省':       { rocZh: '江蘇省', rocEn: 'Kiangsu', prcEn: 'Jiangsu' },
  '安徽省':       { rocZh: '安徽省', rocEn: 'Anhwei', prcEn: 'Anhui' },
  '云南省':       { rocZh: '雲南省', rocEn: 'Yunnan', prcEn: 'Yunnan' },
  '四川省':       { rocZh: '四川省', rocEn: 'Szechwan', prcEn: 'Sichuan' },
  '贵州省':       { rocZh: '貴州省', rocEn: 'Kweichow', prcEn: 'Guizhou' },
  '重庆市':       { rocZh: '四川省', rocEn: 'Szechwan (part)', prcEn: 'Chongqing' },
  '上海市':       { rocZh: '上海特別市', rocEn: 'Shanghai', prcEn: 'Shanghai' },
  '北京市':       { rocZh: '北平特別市', rocEn: 'Peiping', prcEn: 'Beijing' },
  '天津市':       { rocZh: '天津特別市', rocEn: 'Tientsin', prcEn: 'Tianjin' },
  '河北省':       { rocZh: '河北省', rocEn: 'Hopeh', prcEn: 'Hebei' },
  '河南省':       { rocZh: '河南省', rocEn: 'Honan', prcEn: 'Henan' },
  '山东省':       { rocZh: '山東省', rocEn: 'Shantung', prcEn: 'Shandong' },
  '山西省':       { rocZh: '山西省', rocEn: 'Shansi', prcEn: 'Shanxi' },
  '陕西省':       { rocZh: '陝西省', rocEn: 'Shensi', prcEn: 'Shaanxi' },
  '甘肃省':       { rocZh: '甘肅省', rocEn: 'Kansu', prcEn: 'Gansu' },
  '青海省':       { rocZh: '青海省', rocEn: 'Tsinghai', prcEn: 'Qinghai' },
  '宁夏回族自治区': { rocZh: '寧夏省', rocEn: 'Ningsia', prcEn: 'Ningxia Hui AR' },
  '内蒙古自治区':  { rocZh: '綏遠/察哈爾/熱河', rocEn: 'Suiyuan/Chahar/Jehol', prcEn: 'Inner Mongolia AR' },
  '辽宁省':       { rocZh: '遼寧省', rocEn: 'Liaoning (Fengtien)', prcEn: 'Liaoning' },
  '吉林省':       { rocZh: '吉林省', rocEn: 'Kirin', prcEn: 'Jilin' },
  '黑龙江省':     { rocZh: '黑龍江省', rocEn: 'Heilungkiang', prcEn: 'Heilongjiang' },
  '西藏自治区':   { rocZh: '西藏地方', rocEn: 'Tibet', prcEn: 'Tibet AR' },
  '新疆维吾尔自治区': { rocZh: '新疆省', rocEn: 'Sinkiang', prcEn: 'Xinjiang Uyghur AR' },
  '台湾省':       { rocZh: '臺灣省', rocEn: 'Taiwan', prcEn: 'Taiwan' },
};

function ChinaMap({ person, width = 340, height = 290, onExpand }) {
  const ref = useRef_map(null);
  // For china region, mode 'roc'|'prc'. For sea/world it acts as
  // 'trad' (繁體) | 'simp' (简体) — same field, repurposed.
  const [mode, setMode] = useState_map('roc');

  useEffect_map(() => {
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    if (!window.__CHINA_GEO) return;

    const dialect = window.dialectColor(person);
    const geo = window.__CHINA_GEO;
    const seaGeo = window.__SEA_GEO;
    const ht = person.originZh ? window.__HOMETOWNS?.[person.originZh] : null;
    const bp = person.birthplaceZh ? window.__HOMETOWNS?.[person.birthplaceZh] : null;
    const haveBoth = ht?.coord && bp?.coord && ht.coord.join(',') !== bp.coord.join(',');

    // ---------- Choose projection ----------
    // Two distinct strategies:
    //   • BOTH origin + birthplace exist → fitExtent tightly around the two
    //     points (just the journey, no continental context).
    //   • Only one point → region-tuned single-point centring so a single-
    //     hometown figure isn't absurdly zoomed in.
    const region = ht?.region || 'china';
    let projection = d3.geoMercator();
    if (haveBoth) {
      // Manual fit so we don't depend on d3's fitExtent handling of
      // MultiPoint (which has been quietly inconsistent in some past tests).
      // Step 1: build a scratch Mercator at scale 1, centred on the
      // midpoint of the two coords. Step 2: project both points through it
      // to get their offsets in projection units. Step 3: derive the scale
      // that fits the bigger axis span inside (canvas − padding), and the
      // translate that puts the midpoint at canvas centre.
      const pad = 60; // generous padding so the markers (10 px halo + 12 px ring) sit clearly inside the canvas, not pinned to the corners
      const midLon = (ht.coord[0] + bp.coord[0]) / 2;
      const midLat = (ht.coord[1] + bp.coord[1]) / 2;
      const scratch = d3.geoMercator().scale(1).translate([0, 0]).center([midLon, midLat]);
      const a = scratch(ht.coord);
      const b = scratch(bp.coord);
      const spanX = Math.max(Math.abs(a[0] - b[0]), 1e-4);
      const spanY = Math.max(Math.abs(a[1] - b[1]), 1e-4);
      const usableW = width - pad * 2;
      const usableH = height - pad * 2;
      const fitScale = Math.min(usableW / spanX, usableH / spanY);
      projection
        .center([midLon, midLat])
        .scale(fitScale)
        .translate([width / 2, height / 2]);
    } else {
      let center, scale;
      if (ht?.coord) {
        const [lon, lat] = ht.coord;
        if (region === 'sea')        { center = [lon, lat]; scale = 1500; }
        else if (region === 'world') { center = [lon, lat]; scale = 600;  }
        else if (lat < 21)           { center = [lon, lat + 0.5]; scale = 1400; }
        else if (lon > 116 && lat > 22 && lat < 27) { center = [lon, lat]; scale = 1700; }
        else if (lon < 116 && lat > 21 && lat < 25) { center = [lon + 1, lat]; scale = 1300; }
        else if (lat > 30)           { center = [lon, lat]; scale = 900;  }
        else                         { center = [lon, lat]; scale = 1500; }
      } else if (bp?.coord) {
        const [lon, lat] = bp.coord;
        const r = bp.region;
        center = [lon, lat];
        scale = r === 'world' ? 600 : r === 'sea' ? 1500 : 1500;
      } else {
        center = [114, 30]; scale = 550;
      }
      projection.center(center).scale(scale).translate([width / 2, height / 2]);
    }
    const path = d3.geoPath().projection(projection);

    // ---------- Polygon winding fix ----------
    // Natural Earth (and some CHGIS) features ship with CW exterior rings,
    // but d3-geo reads GeoJSON spherically and expects CCW exteriors
    // (RFC 7946). A wrong-wound ring is interpreted as the COMPLEMENT of
    // the country, which projects onto Mercator as a fill covering the
    // entire canvas — the classic antimeridian flood. Rewind per individual
    // polygon (not per feature) so MultiPolygons with mixed winding still
    // get every sub-polygon corrected. Identical logic to world-modal.jsx.
    const rewindPolygon = (rings) => {
      const probe = { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings } };
      return d3.geoArea(probe) > 2 * Math.PI ? rings.map(r => [...r].reverse()) : rings;
    };
    const rewindFeature = (f) => {
      if (!f.geometry) return f;
      const g = f.geometry;
      if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: rewindPolygon(g.coordinates) } };
      if (g.type === 'MultiPolygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map(rewindPolygon) } };
      return f;
    };

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'var(--bg-deep)');

    // ---------- World backdrop (all 242 countries) ----------
    // FILLED with the same parchment as the highlighted layers so every
    // country in view (Vietnam, Laos, Cambodia, Philippines, etc.) reads
    // as land at the same opacity. Per-polygon rewind protects against
    // the antimeridian flood (Natural Earth ships CW rings; d3-geo expects
    // CCW — wrong winding paints the COMPLEMENT of the country across the
    // whole canvas). In ROC mode this swaps to the 1900 political world.
    const isRoc = mode === 'roc';
    const allCountries = (isRoc && window.__ALL_COUNTRIES_1900)
      ? window.__ALL_COUNTRIES_1900
      : window.__ALL_COUNTRIES;
    if (allCountries) {
      const allG = svg.append('g').attr('class', 'map-all-countries');
      allCountries.features.map(rewindFeature).forEach(f => {
        allG.append('path')
          .attr('d', path(f))
          .attr('fill', 'var(--bg-card)')
          .attr('fill-opacity', 1)
          .attr('stroke', 'var(--ink)')
          .attr('stroke-width', 0.4)
          .attr('stroke-opacity', 0.4);
      });
    }

    // ---------- Home province (China only) ----------
    let homeProvinceName = null;
    if (region === 'china' && person.originZh) {
      // Robust matcher — look for ANY PRC-GeoJSON province name as a substring,
      // not just at the start. Handles records like:
      //   "祖先移居广东省番禺县而成番禺人" → 广东省
      //   "辽宁省沈阳市（民国后归籍广东省番禺县）" → 辽宁省 (first match wins)
      //   "海南" / "福建" province-level entries → 海南省 / 福建省
      //   "北京·紫禁城" → 北京市
      const PROVINCE_NAMES = geo.features.map(f => f.properties.name);
      // Try full names first; on miss, fall back to two-char short forms.
      const direct = PROVINCE_NAMES.find(p => person.originZh.includes(p));
      if (direct) {
        homeProvinceName = direct;
      } else {
        // Short-form fallback (海南 → 海南省, 福建 → 福建省, 北京 → 北京市, etc.)
        const SHORT_MAP = {
          '海南': '海南省', '福建': '福建省', '广东': '广东省', '广西': '广西壮族自治区',
          '江苏': '江苏省', '安徽': '安徽省', '江西': '江西省', '浙江': '浙江省',
          '湖南': '湖南省', '湖北': '湖北省', '四川': '四川省', '云南': '云南省',
          '贵州': '贵州省', '陕西': '陕西省', '甘肃': '甘肃省', '河南': '河南省',
          '河北': '河北省', '山东': '山东省', '山西': '山西省', '辽宁': '辽宁省',
          '吉林': '吉林省', '黑龙江': '黑龙江省', '台湾': '台湾省', '北京': '北京市',
          '上海': '上海市', '天津': '天津市', '重庆': '重庆市', '青海': '青海省',
          '西藏': '西藏自治区', '新疆': '新疆维吾尔自治区', '宁夏': '宁夏回族自治区',
          '内蒙古': '内蒙古自治区', '香港': '香港特别行政区', '澳门': '澳门特别行政区',
        };
        for (const [short, full] of Object.entries(SHORT_MAP)) {
          if (person.originZh.includes(short)) { homeProvinceName = full; break; }
        }
      }
    }
    const boundaryChange = ht && ht.boundaryChange;

    // ---------- Draw China provinces ----------
    // In ROC mode use the real 1911 CHGIS province polygons. The CHGIS layer
    // identifies provinces by simplified-Chinese `name` (福建, 廣東, etc.)
    // — same field-name as the PRC layer — so the same highlighting logic
    // works against both. We still match the home province by substring so
    // ROC short names (省 not always present) match the dataset's originZh.
    const useRoc1911 = mode === 'roc' && region === 'china' && window.__ROC_1911_GEO;
    const provincesGeo = useRoc1911 ? window.__ROC_1911_GEO : geo;
    const provinces = svg.append('g').attr('class', 'map-provinces');
    provincesGeo.features.map(rewindFeature).forEach(f => {
      const name = f.properties.name;
      let isHome = false, isHistoricalHome = false;
      if (useRoc1911) {
        // ROC: match by short Chinese name (e.g. dataset says "福建省海澄县"
        // → match feature whose name is "福建"). Also tolerate exact match
        // when the dataset has just "福建" / "广东".
        const shortName = name?.replace(/[省市道地方]$/g, '');
        if (person.originZh && (
          person.originZh.includes(name) ||
          (shortName && person.originZh.startsWith(shortName))
        )) isHome = true;
        // Hainan in dataset → highlight Guangdong in 1911 (Hainan was part of Kwangtung)
        if (boundaryChange && ht?.coord?.[1] < 21 && (name === '广东' || name === '廣東' || name === 'Guangdong')) isHistoricalHome = true;
      } else {
        if (homeProvinceName && name === homeProvinceName) isHome = true;
        if (boundaryChange && region === 'china' && ht?.coord?.[1] < 21) {
          if (name === '海南省') isHistoricalHome = true;
        }
      }
      const fill = (isHome || isHistoricalHome) ? dialect : 'var(--bg-card)';
      // Uniform fill-opacity across provinces — home stands out via dialect
      // colour, not via brighter alpha.
      provinces.append('path')
        .attr('d', path(f))
        .attr('fill', fill)
        .attr('fill-opacity', 1)
        .attr('stroke', 'var(--ink)')
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.7);
    });

    // ---------- Draw SEA + world country boundaries ----------
    // Render whenever EITHER the origin OR the birthplace falls outside
    // mainland China — without this, a figure with China origin + Singapore
    // birthplace would have the birthplace marker floating on bare ocean.
    // SEA + world layers are drawn together so Thailand (which lives in
    // __WORLD_GEO) appears next to Myanmar/Malaysia (in __SEA_GEO) instead
    // of being silently dropped.
    // Outlines and fill match the China-province style: ink stroke at low
    // alpha with the home country tinted by dialect colour at full opacity.
    const bpRegion = bp?.region;
    const drawCountryLayer = (geo, className, homeName) => {
      const g = svg.append('g').attr('class', className);
      geo.features.map(rewindFeature).forEach(f => {
        const name = f.properties.name;
        const isHome = homeName === name;
        // Same fill-opacity for every country in the layer — the home
        // country differs only by colour (dialect vs parchment).
        g.append('path')
          .attr('d', path(f))
          .attr('fill', isHome ? dialect : 'var(--bg-card)')
          .attr('fill-opacity', 1)
          .attr('stroke', 'var(--ink)')
          .attr('stroke-width', 0.5)
          .attr('stroke-opacity', 0.7);
      });
    };

    const showOutside = region === 'sea' || region === 'world' || bpRegion === 'sea' || bpRegion === 'world';
    if (showOutside) {
      // ROC mode swaps the highlighted SEA + world units to their 1900
      // political equivalents (Malaya, Netherlands Indies, Rattanakosin,
      // British Raj). The home-country matcher targets the historical
      // entity in that case (Straits Settlements → Malaya, etc.).
      const seaLayer = (isRoc && window.__SEA_1900_GEO) ? window.__SEA_1900_GEO : seaGeo;
      const worldLayer = (isRoc && window.__WORLD_1900_GEO) ? window.__WORLD_1900_GEO : window.__WORLD_GEO;
      const seaHomeCountry = (() => {
        if (region !== 'sea') return null;
        const malaysiaHosts = ['马六甲', '马六甲（其父世居马六甲）', '马六甲（1951从马六甲到新加坡）', '槟城', '吉隆坡', '柔佛', '柔佛州', '古晋', '吡叻州', '槟榔屿'];
        if (isRoc) {
          // Everything in pre-WWII British Malaya / Straits Settlements +
          // Singapore + Sarawak / North Borneo collapses into "Malaya" in
          // the 1900 dataset.
          if (malaysiaHosts.includes(person.originZh) || person.originZh === '新加坡') return 'Malaya';
          if (person.originZh === '三宝垅') return 'Netherlands Indies';
          if (person.originZh === '仰光') return 'British Raj';        // Burma was part of British India in 1900
          return null;
        }
        if (malaysiaHosts.includes(person.originZh)) return 'Malaysia';
        if (person.originZh === '新加坡') return 'Singapore';
        if (person.originZh === '仰光') return 'Myanmar';
        if (person.originZh === '三宝垅') return 'Indonesia';
        return null;
      })();
      const worldHome = region === 'world'
        ? (isRoc
            ? (ht?.country === 'India' ? 'British Raj' : 'United Kingdom of Great Britain and Ireland')
            : (ht?.country || 'United Kingdom'))
        : null;
      if (seaLayer) drawCountryLayer(seaLayer, 'map-sea', seaHomeCountry);
      if (worldLayer) drawCountryLayer(worldLayer, 'map-world', worldHome);
    }

    // The ROC 1911 GeoJSON above already shows Hainan inside Kwangtung and
    // Chongqing inside Sichuan (those provinces didn't exist yet in 1911), so
    // no merge-overlay or bridge curve is needed in ROC mode.

    // ---------- Draw India state boundaries (when person is from India) ----------
    if (region === 'world' && ht?.country === 'India' && window.__INDIA_STATES) {
      // Figure out which state the hometown sits in (rough containment via lon/lat)
      const indiaG = svg.append('g').attr('class', 'map-india-states');
      window.__INDIA_STATES.features.forEach(f => {
        indiaG.append('path')
          .attr('d', path(f))
          .attr('fill', 'transparent')
          .attr('stroke', 'var(--rule-strong)')
          .attr('stroke-width', 0.3)
          .attr('opacity', 0.7);
      });
    }

    // ---------- Hometown + Birthplace markers + migration line ----------
    // Origin = filled disc. Birthplace = hollow dashed ring. Curved dotted
    // line connects the two when they differ (the diaspora journey).
    const drawMarker = (coord, kind) => {
      const [px, py] = projection(coord);
      if (isNaN(px)) return null;
      const g = svg.append('g').attr('class', 'home-marker').attr('transform', `translate(${px},${py})`);
      if (kind === 'origin') {
        g.append('circle').attr('r', 12).attr('fill', 'none').attr('stroke', dialect).attr('stroke-width', 1).attr('opacity', 0.3);
        g.append('circle').attr('r', 7).attr('fill', 'var(--bg-card)').attr('stroke', dialect).attr('stroke-width', 1.8);
        g.append('circle').attr('r', 3).attr('fill', dialect);
      } else {
        g.append('circle').attr('r', 6).attr('fill', 'var(--bg-card)').attr('stroke', dialect).attr('stroke-width', 1.5).attr('stroke-dasharray', '2 1.6');
        g.append('circle').attr('r', 1.8).attr('fill', dialect).attr('opacity', 0.7);
      }
      return [px, py];
    };
    let originPt = null;
    if (ht && ht.coord) originPt = drawMarker(ht.coord, 'origin');
    if (bp && bp.coord && (!ht?.coord || ht.coord.join(',') !== bp.coord.join(','))) {
      const birthPt = drawMarker(bp.coord, 'birth');
      if (originPt && birthPt) {
        const [x1, y1] = originPt;
        const [x2, y2] = birthPt;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const off = Math.min(40, len * 0.18);
        const cx = (x1 + x2) / 2 - (dy / len) * off;
        const cy = (y1 + y2) / 2 + (dx / len) * off;
        // Solid line with an animated gradient flowing from origin to
        // birthplace. Defs live inside the svg root so the gradient's
        // coords are in the same user space as the path.
        const defs = svg.insert('defs', ':first-child');
        const gid = `inline-arc-flow-${person.id}`;
        const period = Math.max(24, len / 4);
        const ux = dx / len, uy = dy / len;
        const gx = ux * period, gy = uy * period;
        const grad = defs.append('linearGradient')
          .attr('id', gid)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('spreadMethod', 'repeat')
          .attr('x1', x1).attr('y1', y1)
          .attr('x2', x1 + gx).attr('y2', y1 + gy);
        grad.append('stop').attr('offset', '0').attr('stop-color', dialect).attr('stop-opacity', 0.25);
        grad.append('stop').attr('offset', '0.5').attr('stop-color', dialect).attr('stop-opacity', 1);
        grad.append('stop').attr('offset', '1').attr('stop-color', dialect).attr('stop-opacity', 0.25);
        grad.append('animateTransform')
          .attr('attributeName', 'gradientTransform')
          .attr('type', 'translate')
          .attr('from', '0 0')
          .attr('to', `${gx} ${gy}`)
          .attr('dur', '1.8s')
          .attr('repeatCount', 'indefinite');
        svg.insert('path', '.home-marker')
          .attr('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`)
          .attr('fill', 'none').attr('stroke', `url(#${gid})`)
          .attr('stroke-width', 1.5)
          .attr('stroke-linecap', 'round');
      }
    }

    // ---------- Region label ----------
    if (homeProvinceName && region === 'china') {
      const f = geo.features.find(ff => ff.properties.name === homeProvinceName);
      if (f && f.properties.cp) {
        const [lx, ly] = projection(f.properties.cp);
        if (!isNaN(lx)) {
          const info = PROVINCE_1930[homeProvinceName];
          const label = mode === 'roc' ? (info?.rocEn || homeProvinceName) : (info?.prcEn || homeProvinceName);
          svg.append('text')
            .attr('x', lx).attr('y', ly + 16).attr('text-anchor', 'middle')
            .attr('font-family', 'var(--font-ui)').attr('font-size', 9)
            .attr('font-weight', 600).attr('letter-spacing', '0.16em')
            .attr('fill', 'var(--ink)').attr('opacity', 0.7)
            .text(label.toUpperCase());
        }
      }
    } else if (region === 'sea') {
      svg.append('text')
        .attr('x', width / 2).attr('y', 18).attr('text-anchor', 'middle')
        .attr('font-family', 'var(--font-ui)').attr('font-size', 9)
        .attr('font-weight', 600).attr('letter-spacing', '0.18em')
        .attr('fill', 'var(--ink-soft)')
        .text('BRITISH MALAYA · STRAITS SETTLEMENTS');
    }
  }, [person, mode, width, height]);

  if (!person) return null;
  const ht = window.__HOMETOWNS?.[person.originZh];
  const region = ht?.region || 'china';

  // Tab labels depend on region — China is political (ROC/PRC), elsewhere
  // is purely script (繁體 / 简体), since the polity didn't really rename
  // Malacca or Singapore the way Beijing/Beiping flipped.
  const tabs = region === 'china'
    ? [{ key: 'roc', primary: 'ROC',     yr: '1930s' },
       { key: 'prc', primary: 'PRC',     yr: 'today' }]
    : [{ key: 'roc', primary: '繁',       yr: 'Traditional' },
       { key: 'prc', primary: '简',       yr: 'Simplified' }];

  // Era column in the caption also relabels for non-China.
  const eraLabel = region === 'china'
    ? (mode === 'roc' ? '1930s' : 'Today')
    : (mode === 'roc' ? '繁' : '简');

  // For SEA, the "Polity" line above used to say Province; rename to "Polity"
  // for SEA (Straits Settlements / Federal Territory).
  const polityHeader = region === 'china' ? 'Province' : 'Polity';

  return (
    <div className="china-map">
      <div className="china-map-head">
        <div className="china-map-title">
          {region === 'sea' ? 'Ancestral home · 祖籍 (Nanyang)'
            : region === 'world' ? 'Origin · ' + (ht?.rocEn || '')
            : 'Ancestral home · 祖籍'}
        </div>
        <div className="china-map-tabs">
          {tabs.map(t => (
            <button key={t.key}
                    className={'tab' + (mode === t.key ? ' active' : '')}
                    onClick={() => setMode(t.key)}>
              {t.primary} <span className="yr">{t.yr}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="china-map-svg-wrap">
        <svg ref={ref} width={width} height={height} className="china-map-svg" />
        {onExpand && (
          <button className="china-map-expand" onClick={onExpand} title="Open full diaspora map">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 5.5V2.5H5.5"/><path d="M11.5 5.5V2.5H8.5"/>
              <path d="M2.5 8.5V11.5H5.5"/><path d="M11.5 8.5V11.5H8.5"/>
            </svg>
          </button>
        )}
      </div>
      <div className="china-map-caption">
        {ht ? (
          <>
            <div className="loc-line">
              <span className="era">Ancestral home</span>
              <span className="loc-name">
                {mode === 'roc' ? (
                  <>
                    <span className="zh">{ht.province1930} · {ht.rocZh}</span>
                    <span className="en">{ht.rocEn}, {ht.province1930En}</span>
                  </>
                ) : (
                  <>
                    <span className="zh">{ht.provinceNow} · {ht.prcZh}</span>
                    <span className="en">{ht.prcEn}, {ht.provinceNowEn}</span>
                  </>
                )}
              </span>
            </div>
            {ht.boundaryChange && (
              <div className="boundary-note">
                {region === 'sea'
                  ? '⚠ Once a British dependency; now an independent state.'
                  : '⚠ Provincial boundaries changed between ROC and PRC eras.'}
              </div>
            )}
          </>
        ) : person.originZh ? (
          <div className="outside-label">
            <span className="loc-label">{person.originZh}</span>
            <span className="loc-detail">Location not in geocoded set.</span>
          </div>
        ) : null}
        {person.birthplaceZh && person.birthplaceZh !== person.originZh && (() => {
          const bpInfo = window.__HOMETOWNS?.[person.birthplaceZh];
          return (
            <div className="loc-line birthplace">
              <span className="era">Birthplace</span>
              <span className="loc-name">
                {bpInfo ? (
                  mode === 'roc'
                    ? <>
                        <span className="zh">{bpInfo.province1930 ? `${bpInfo.province1930} · ` : ''}{bpInfo.rocZh}</span>
                        <span className="en">{bpInfo.rocEn}{bpInfo.province1930En ? `, ${bpInfo.province1930En}` : ''}</span>
                      </>
                    : <>
                        <span className="zh">{bpInfo.provinceNow ? `${bpInfo.provinceNow} · ` : ''}{bpInfo.prcZh}</span>
                        <span className="en">{bpInfo.prcEn}{bpInfo.provinceNowEn ? `, ${bpInfo.provinceNowEn}` : ''}</span>
                      </>
                ) : (
                  <><span className="zh">{person.birthplaceZh}</span>{person.birthplaceEn && <span className="en">{person.birthplaceEn}</span>}</>
                )}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

window.ChinaMap = ChinaMap;
