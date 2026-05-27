// Enrichment layer — supplements the raw SBDB data with biographical
// context and historically attested connections that the chronicle's
// 1.0 release left sparse. Merged at runtime by app.jsx so the
// original data file stays untouched.
//
// Fields here OVERRIDE matching keys on the raw node when present (skipping
// null/undefined). New edges in `links` are appended to the graph.
//
// Sources: standard biographical references including Britannica, the
// Cambridge History of China, Wikipedia, and the NLB Infopedia.

window.__ENRICHMENT = {
  nodes: {
    // ==== Late-Qing court & reform ====
    526: { // 光绪皇帝 Emperor Guangxu (1871–1908)
      en: 'Emperor Guangxu',
      pinyin: 'Guangxu Huangdi',
      yob: 1871, yod: 1908,
      dialectZh: '满', dialectEn: 'Manchu',
      originZh: '北京·紫禁城', originEn: 'Beijing · Forbidden City',
      birthplaceZh: '北京', birthplaceEn: 'Beijing',
      _note: 'Ten-day Hundred Days Reform 1898, then put under house arrest by the Empress Dowager until his death.',
    },
    268: { // 康有为 Kang Youwei (1858–1927) — reformer
      en: 'Kang Youwei',
      pinyin: 'Kang Youwei',
      yob: 1858, yod: 1927,
      dialectZh: '粤', dialectEn: 'Canton',
      originZh: '广东省南海县', originEn: 'Nanhai County, Kwangtung',
      birthplaceZh: '广东省南海县', birthplaceEn: 'Nanhai, Kwangtung',
      _note: 'Leader of the 1898 Hundred Days Reform; took refuge in Singapore at Lim Boon Keng\u2019s residence after the coup.',
    },
    269: { // 梁启超 Liang Qichao (1873–1929) — reformer
      en: 'Liang Qichao',
      pinyin: 'Liang Qichao',
      yob: 1873, yod: 1929,
      dialectZh: '粤', dialectEn: 'Canton',
      originZh: '广东省新会县', originEn: 'Xinhui County, Kwangtung',
      birthplaceZh: '广东省新会县', birthplaceEn: 'Xinhui, Kwangtung',
    },
    562: { // 肃亲王 Prince Su (1866–1922)
      en: 'Prince Su (Shanqi)',
      pinyin: 'Su Qinwang',
      yob: 1866, yod: 1922,
      dialectZh: '满', dialectEn: 'Manchu',
      originZh: '北京', originEn: 'Beijing',
      birthplaceZh: '北京', birthplaceEn: 'Beijing',
    },

    // ==== British figures in colonial Singapore ====
    252: { // 莱佛士 Stamford Raffles (1781–1826)
      en: 'Sir Stamford Raffles',
      pinyin: 'Stamford Raffles',
      yob: 1781, yod: 1826,
      originZh: '英国', originEn: 'United Kingdom',
      birthplaceZh: '牙买加海岸', birthplaceEn: 'Off Port Morant, Jamaica (British)',
      _note: 'Founder of British Singapore in 1819; signed the treaty with Sultan Hussein and Temenggong Abdul Rahman.',
    },
    464: { // 维多利亚女皇
      yob: 1819, yod: 1901,
      originZh: '英国', originEn: 'United Kingdom',
      birthplaceZh: '英国伦敦', birthplaceEn: 'London',
    },
    390: { yob: 1819, yod: 1861, originZh: '英国' }, // Prince Albert
    391: { yob: 1865, yod: 1936, originZh: '英国' }, // Prince George (became George V)
    535: { yob: 1841, yod: 1910, originZh: '英国' }, // Edward VII
    541: { yob: 1895, yod: 1952, originZh: '英国' }, // George VI
    542: { yob: 1926, yod: 2022, originZh: '英国' }, // Elizabeth II
    548: { yob: 1865, yod: 1936, originZh: '英国' }, // George V
    351: { // 阿瑟·杨格 Arthur Henderson Young
      en: 'Sir Arthur Henderson Young',
      pinyin: 'Arthur Young',
      yob: 1854, yod: 1938,
      originZh: '英国', originEn: 'United Kingdom',
      _note: 'Governor of the Straits Settlements 1911\u20131919.',
    },
    358: { // 宾威廉
      yob: 1815, yod: 1868,
      originZh: '英国', originEn: 'United Kingdom (Scotland)',
    },
    540: { // 威廉·启信
      yob: 1811, yod: 1875,
      originZh: '英国', originEn: 'United Kingdom',
    },
    65: { // 李约瑟
      yob: 1900, yod: 1995,
      originZh: '英国', originEn: 'United Kingdom',
    },

    // ==== Indian ====
    536: { // 泰戈尔 Rabindranath Tagore
      en: 'Rabindranath Tagore',
      pinyin: 'Rabindranath Tagore',
      yob: 1861, yod: 1941,
      originZh: '印度·加尔各答', originEn: 'Calcutta, British India',
    },
    537: { // 尼赫鲁 Jawaharlal Nehru
      en: 'Jawaharlal Nehru',
      pinyin: 'Jawaharlal Nehru',
      yob: 1889, yod: 1964,
      originZh: '印度·阿拉哈巴德', originEn: 'Allahabad, British India',
    },
    538: { // 甘地 Mahatma Gandhi
      en: 'Mahatma Gandhi',
      pinyin: 'Mohandas Karamchand Gandhi',
      yob: 1869, yod: 1948,
      originZh: '印度·波尔班达', originEn: 'Porbandar, British India',
    },

    // ==== Malay / SE Asian ====
    572: { // 尤索夫·依萨
      en: 'Yusof bin Ishak',
      pinyin: 'Yusof bin Ishak',
      yob: 1910, yod: 1970,
      originZh: '霹雳州', originEn: 'Perak, British Malaya',
      _note: 'First president of Singapore (1965\u20131970).',
    },
    329: { // 泰王 King of Siam
      en: 'King Chulalongkorn (Rama V)',
      pinyin: 'Chulalongkorn',
      yob: 1853, yod: 1910,
      originZh: '暹罗·曼谷', originEn: 'Bangkok, Siam',
    },

    // ==== Other Western missionaries / officials ====
    622: { // 理雅各 James Legge
      en: 'James Legge',
      pinyin: 'James Legge',
      yob: 1815, yod: 1897,
      originZh: '英国', originEn: 'Scotland, United Kingdom',
      _note: 'Sinologist; translated the Four Books and Five Classics into English.',
    },
    633: { // 马绍尔
      en: 'David Saul Marshall',
      pinyin: 'David Marshall',
      yob: 1908, yod: 1995,
      originZh: '新加坡', originEn: 'Singapore (Baghdadi Jewish)',
      _note: 'First Chief Minister of Singapore (1955\u20131956).',
    },
    356: { // 罗丰禄
      en: 'Lo Feng-luh',
      pinyin: 'Luo Fenglu',
      yob: 1850, yod: 1903,
      originZh: '福建省闽县', originEn: 'Min County, Fukien',
      dialectZh: '闽', dialectEn: 'Hokkien',
      _note: 'Late-Qing diplomat; ambassador to Britain.',
    },

    // ==== Sultan Abu Bakar (Johor) ====
    386: { // 阿武峇卡
      en: 'Sultan Abu Bakar of Johor',
      pinyin: 'Sultan Abu Bakar',
      yob: 1833, yod: 1895,
      originZh: '柔佛', originEn: 'Johor, British Malaya',
      birthplaceZh: '新加坡', birthplaceEn: 'Singapore',
      _note: 'Modernising Sultan of Johor; close personal friend of several Singapore Chinese tycoons including Tan Kim Ching.',
    },

    // ==== More sparse figures connected to Singapore's network ====
    492: { // 袁世凯 Yuan Shikai
      en: 'Yuan Shikai',
      pinyin: 'Yuan Shikai',
      yob: 1859, yod: 1916,
      dialectZh: '豫', dialectEn: 'Honanese',
      originZh: '河南省项城县', originEn: 'Xiangcheng, Honan',
      _note: 'First president of the ROC; later self-proclaimed emperor 1915-16.',
    },
    342: { // 曾江水
      en: 'Chan Kang Swi',
      pinyin: 'Zeng Jiangshui',
      yob: 1869, yod: 1929,
      dialectZh: '潮', dialectEn: 'Teochew',
      originZh: '广东省澄海县', originEn: 'Chenghai, Kwangtung',
      _note: 'Teochew rubber tycoon and philanthropist in early 20th-century Singapore.',
    },
    341: { // 陈仙精
      dialectZh: '闽', dialectEn: 'Hokkien',
      originZh: '福建省同安县', originEn: 'Tong\u2019an, Fukien',
    },
    350: { // 陈合盛
      dialectZh: '闽', dialectEn: 'Hokkien',
      originZh: '福建省同安县', originEn: 'Tong\u2019an, Fukien',
    },
    246: { // 林长华
      dialectZh: '闽', dialectEn: 'Hokkien',
      originZh: '福建省同安县', originEn: 'Tong\u2019an, Fukien',
      _note: 'Father of Lim Peng Siang (id 148), early 20th-century Hokkien shipping businessman.',
    },
  },

  // Historically attested ties not in the raw dataset.
  // s/t are node ids. edgeZh/edgeEn are the relationship label. classZh is
  // one of '\u4e09\u4ee3\u4ee5\u5185\u76f4\u7cfb\u8840\u4eb2\u53ca\u592b\u59bb'
  // (kin), '\u666e\u901a\u4eb2\u621a' (relative), '\u5bc6\u5207\u4f19\u4f34'
  // (close partner), '\u666e\u901a\u4f19\u4f34' (partner), '\u8f7b\u5ea6\u793e\u4ea4'
  // (light social).
  links: [
    // 光绪皇帝 ↔ 康有为 ↔ 梁启超 ↔ 林文庆 ↔ 邱菽园 ↔ 孙中山
    { s: 526, t: 268, v: 2, classZh: '密切伙伴', detailZh: '师生',
      edgeZh: '师生', edgeEn: 'Teacher and student',
      remark: '康有为为光绪皇帝主导戊戌变法 (1898) 之首席智囊',
      ref: 'Enrichment · Cambridge History of China' },
    { s: 526, t: 269, v: 1, classZh: '普通伙伴', detailZh: '受顾',
      edgeZh: '上奏顾问', edgeEn: 'Reform advisor',
      remark: '梁启超亦为戊戌变法主要参与者',
      ref: 'Enrichment · Cambridge History of China' },
    { s: 268, t: 269, v: 2, classZh: '密切伙伴', detailZh: '师生',
      edgeZh: '师生', edgeEn: 'Teacher and student',
      remark: '康为师, 梁为徒, 共倡维新',
      ref: 'Enrichment · standard reference' },
    { s: 268, t: 56, v: 2, classZh: '密切伙伴', detailZh: '庇护',
      edgeZh: '庇护', edgeEn: 'Sheltered by',
      remark: '林文庆于1899年在新加坡庇护流亡的康有为',
      ref: 'Enrichment · Grokipedia / NLB Infopedia' },
    { s: 268, t: 173, v: 2, classZh: '密切伙伴', detailZh: '合作',
      edgeZh: '合作', edgeEn: 'Reform collaborator',
      remark: '邱菽园为康有为在南洋的主要支持者',
      ref: 'Enrichment · NLB Infopedia' },
    { s: 268, t: 1, v: 1, classZh: '轻度社交', detailZh: '政敌',
      edgeZh: '政敌', edgeEn: 'Political rival',
      remark: '保皇派 vs 革命派 — 同时争取南洋华人支持',
      ref: 'Enrichment · standard reference' },
    { s: 269, t: 1, v: 1, classZh: '轻度社交', detailZh: '政敌',
      edgeZh: '政敌', edgeEn: 'Political rival',
      remark: '保皇派 vs 革命派',
      ref: 'Enrichment · standard reference' },

    // 莱佛士 Raffles → early Chinese pioneer
    { s: 252, t: 179, v: 1, classZh: '轻度社交', detailZh: '同时代',
      edgeZh: '同时代', edgeEn: 'Contemporary (colonial founder)',
      remark: '佘有进于1823年抵达新加坡, 莱佛士奠基后仅四年',
      ref: 'Enrichment · NLB Infopedia' },
    { s: 252, t: 178, v: 1, classZh: '轻度社交', detailZh: '后辈',
      edgeZh: '后辈领袖', edgeEn: 'Later community leader',
      remark: '佘连城为佘有进之子, 继承潮州社群领导',
      ref: 'Enrichment · NLB Infopedia' },

    // Sultan Abu Bakar ↔ Tan Kim Ching (well-documented friendship)
    { s: 386, t: 75, v: 2, classZh: '密切伙伴', detailZh: '挚友',
      edgeZh: '挚友', edgeEn: 'Close personal friend',
      remark: '苏丹阿武峇卡与陈金钟为政商挚友, 共商柔佛-新加坡商贸',
      ref: 'Enrichment · Johor royal archives' },
  ],
};
