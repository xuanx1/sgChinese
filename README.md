# [Singapore Chinese Historical Network](https://xuanx1.github.io/sgChinese/)

An [visualisation](https://xuanx1.github.io/sgChinese/) of **784 figures** and **1,200+ relationships** drawn from the **Singapore Biographical Database (SBDB)** at NUS and the *新华历史人物列传* chronicles published by the National Library Board. Coloured by dialect group (Hokkien · Teochew · Canton · Hakka · Sam Kiang · Hainan), sized by number of ties, clicking a node  opens a biography card on the right panel.

<img width="1920" height="916" alt="Screenshot 2026-05-28 000201" src="https://github.com/user-attachments/assets/eae70e65-ff18-4461-8a3c-613b70ddda23" />

[Straits Times Variant](https://xuanx1.github.io/sgChinese/index-st.html)
<img width="1920" height="4521" alt="screencapture-xuanx1-github-io-sgChinese-index-st-html-2026-05-28-00_05_06" src="https://github.com/user-attachments/assets/150a4034-0fbe-45f0-9889-3ee07b747ba2" />

**Biography rail** for each figure:
- Real photo (23 figures — Wikimedia thumbnails downloaded locally to `assets/photos/`) or a generated **name-seal portrait** otherwise
- Dialect, tie count, and an **inline ancestral-home / birthplace map** with a ROC ↔ PRC toggle (see "Maps" below). The map's caption combines province + place into a single "Ancestral home" line and shows the "Birthplace" beneath when the figure was born away from their ancestral home. When both points exist, the projection auto-fits both so the diaspora arc is always visible.
- Full list of ties, sorted family → close partner → social
- Source links (NLB Linked Data, 列传, etc.)
- Back button maintains a navigation history; Esc closes

**Diaspora modal** (expand-icon at the bottom-left of every inline map): full-screen Mercator world map showing every figure plotted on their ancestral home and birthplace, joined by colour-graduated migration arcs (dialect colour at the origin → cream at the birthplace). Pan with drag (the projection's translate-extent is the world's bbox so cropped polar regions remain pannable), scroll to zoom; dot and arc stroke widths are inversely scaled with zoom so overlapping dots visually separate as you zoom in. The **ROC / PRC tab + expanded mode description** is integrated as a single panel at the top-left of the map. ROC mode swaps the entire world to 1900-era boundaries (British Raj, Netherlands Indies, Malaya, Siam, Manchu Empire) using [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps); PRC mode shows modern Natural Earth boundaries. The China provinces layer is always drawn from the 1911 CHGIS data in ROC mode and from Natural Earth in PRC mode.


## Maps

Each ancestral-home map has two modes — accurate, surveyed boundary data in both:

| Mode | Source | What it shows |
|---|---|---|
| **ROC 1911** (`src/roc-1911-geo.js`) | CHGIS v6 1911 province shapefile (Harvard Yenching / Fudan), Xian 1980 Gauss-Kruger Zone 19 inverse-projected to WGS84 via proj4js | 27 first-level divisions of the late Qing / early Republic. Wuliyasutai (Outer Mongolia), Fengtian (Liaoning), Zhili (Hebei), Xizang as a single region, Hainan inside Guangdong, no separate Chongqing / Ningxia / Inner Mongolia AR, Taiwan under Japanese rule. |
| **PRC today** (`src/china-geo.js`) | Natural Earth admin-1 @ 50m | 31 first-level divisions of the modern PRC. |

Both files use the same `eps=0.04` simplification and 2-decimal coordinate precision so visual fidelity matches.

Additional layers in the diaspora modal:
- `src/sea-geo.js` — Malaysia and Singapore (Natural Earth admin-0 @ 50m, filtered) — modern PRC mode
- `src/world-geo.js` — UK, India, Thailand (filtered Natural Earth) — modern PRC mode
- `src/india-states-geo.js` — 36 Indian states (Natural Earth admin-1, for Gandhi / Nehru / Tagore)
- `src/all-countries-geo.js` — all 177 world countries at low detail (Natural Earth 110m) — modern PRC mode backdrop
- `src/world-1900-geo.js` — 1900-era political units from [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) (CC-BY-SA). Loaded as `window.__ALL_COUNTRIES_1900` plus pre-filtered subsets `__WORLD_1900_GEO` (UK + British Raj) and `__SEA_1900_GEO` (Rattanakosin Kingdom + Netherlands Indies + Malaya). Drives the ROC-mode world.

---

## Data

The original SBDB export sits in `uploads/` as `.xlsx` files. The processed normalized form is at `data/graph.json` (784 nodes, 1,204 raw links).

Enrichment overlay at `src/enrichment.js` adds:
- Birth/death years, dialect groups, ancestral homes, English names for historically major sparse figures that arrived in the export with empty fields — 光绪皇帝 (Emperor Guangxu), 康有为 (Kang Youwei), 梁启超 (Liang Qichao), 莱佛士 (Stamford Raffles), Sultan Abu Bakar of Johor, all British royals, Gandhi / Nehru / Tagore, Yusof bin Ishak, David Marshall, Yuan Shikai, etc.
- Historically attested ties not in the raw data (e.g. Lim Boon Keng sheltering Kang Youwei in Singapore in 1899; Kang ↔ Liang teacher-student tie; Tan Kim Ching ↔ Sultan Abu Bakar friendship)

`src/caucasian-names.js` maps node id → real English name for figures whose `en` field in the dataset is "Nil" or a Chinese transliteration.

**Geocoding coverage**: all 528 figures with a recorded ancestral home are geocoded — 67% of the total dataset. The remaining 256 have no ancestral home in the source data.
