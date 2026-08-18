/* Odyssey Core — shared, login-free progress tracking.
   Everything lives in the visitor's own browser via localStorage.
   No server, no accounts — just real numbers instead of placeholder ones. */

window.Odyssey = (function () {
  var LEXICON_KEY = 'odyssey_lexicon';
  var VISITS_KEY = 'odyssey_visit_dates';

  var SUBJECT_LABELS = {
    'biology.html':      { en: 'Biology',          ko: '생물학',        zh: '生物学',   es: 'Biología' },
    'chemistry.html':    { en: 'Chemistry',         ko: '화학',          zh: '化学',     es: 'Química' },
    'economics.html':    { en: 'Economics',         ko: '경제학',        zh: '经济学',   es: 'Economía' },
    'english.html':      { en: 'Advanced English',  ko: '심화 영어',     zh: '高级英语', es: 'Inglés avanzado' },
    'geometry.html':      { en: 'Geometry',          ko: '기하학',        zh: '几何学',   es: 'Geometría' },
    'history.html':       { en: 'U.S. History',      ko: '미국사',        zh: '美国历史', es: 'Historia de EE. UU.' },
    'physics.html':       { en: 'Physics',           ko: '물리학',        zh: '物理学',   es: 'Física' },
    'trigonometry.html':  { en: 'Trigonometry',      ko: '삼각함수',      zh: '三角函数', es: 'Trigonometría' },
    'school-life.html':   { en: 'School Life',       ko: '학교·기숙사 생활', zh: '校园生活', es: 'Vida escolar' }
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayStr() {
    return dateKey(new Date());
  }

  function readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage full or unavailable — fail silently */ }
  }

  function recordVisit() {
    var visits = readJSON(VISITS_KEY, []);
    var t = todayStr();
    if (visits.indexOf(t) === -1) {
      visits.push(t);
      writeJSON(VISITS_KEY, visits);
    }
  }

  function getStreak() {
    var visits = readJSON(VISITS_KEY, []);
    var set = {};
    visits.forEach(function (v) { set[v] = true; });
    var streak = 0;
    var cursor = new Date();
    while (set[dateKey(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function getDaysActive() {
    return readJSON(VISITS_KEY, []).length;
  }

  function getLexicon() {
    return readJSON(LEXICON_KEY, []);
  }

  function isSaved(en) {
    return getLexicon().some(function (w) { return w.en === en; });
  }

  function saveWord(word) {
    var list = getLexicon();
    if (list.some(function (w) { return w.en === word.en; })) return list;
    var entry = Object.assign({ savedAt: Date.now() }, word);
    list.unshift(entry);
    writeJSON(LEXICON_KEY, list);
    return list;
  }

  function removeWord(en) {
    var list = getLexicon().filter(function (w) { return w.en !== en; });
    writeJSON(LEXICON_KEY, list);
    return list;
  }

  // Returns true if the word ended up saved, false if it ended up removed.
  function toggleWord(word) {
    if (isSaved(word.en)) {
      removeWord(word.en);
      return false;
    }
    saveWord(word);
    return true;
  }

  function subjectLabel(file, lang) {
    var entry = SUBJECT_LABELS[file];
    if (!entry) return file || '';
    return entry[lang] || entry.en;
  }

  return {
    recordVisit: recordVisit,
    getStreak: getStreak,
    getDaysActive: getDaysActive,
    getLexicon: getLexicon,
    isSaved: isSaved,
    saveWord: saveWord,
    removeWord: removeWord,
    toggleWord: toggleWord,
    subjectLabel: subjectLabel,
    todayStr: todayStr
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  Odyssey.recordVisit();
});

/* ---------- Global Search ---------- */
(function () {
  var GS_SUBJECT_FILES = [
    { file: 'biology.html',      json: 'data/biology_vocab_4lang.json',      names: { en: 'Biology',           ko: '생물학',      zh: '生物学',   es: 'Biología' } },
    { file: 'chemistry.html',    json: 'data/chemistry_vocab_4lang.json',    names: { en: 'Chemistry',         ko: '화학',        zh: '化学',     es: 'Química' } },
    { file: 'economics.html',    json: 'data/economics_vocab_4lang.json',    names: { en: 'Economics',         ko: '경제학',      zh: '경제학',   es: 'Economía' } },
    { file: 'english.html',      json: 'data/english_vocab_4lang.json',      names: { en: 'Advanced English',  ko: '심화 영어',   zh: '高级英语', es: 'Inglés avanzado' } },
    { file: 'geometry.html',     json: 'data/geometry_vocab_4lang.json',     names: { en: 'Geometry',          ko: '기하학',      zh: '几何学',   es: 'Geometría' } },
    { file: 'history.html',      json: 'data/history_vocab_4lang.json',      names: { en: 'U.S. History',      ko: '미국사',      zh: '美国历史', es: 'Historia de EE. UU.' } },
    { file: 'physics.html',      json: 'data/physics_vocab_4lang.json',      names: { en: 'Physics',           ko: '물리학',      zh: '物理学',   es: 'Física' } },
    { file: 'trigonometry.html', json: 'data/trigonometry_vocab_4lang.json', names: { en: 'Trigonometry',      ko: '삼각함수',    zh: '三角函数', es: 'Trigonometría' } }
  ];
  var GS_LANGS = ['en', 'ko', 'zh', 'es'];

  var gsAllTerms = null;
  var gsLoading = null;

  function gsLoadAllTerms() {
    if (gsAllTerms) return Promise.resolve(gsAllTerms);
    if (gsLoading) return gsLoading;
    gsLoading = Promise.allSettled(
      GS_SUBJECT_FILES.map(function (s) { return fetch(s.json).then(function (r) { return r.json(); }); })
    ).then(function (results) {
      var terms = [];
      results.forEach(function (res, i) {
        if (res.status === 'fulfilled') {
          (res.value.categories || []).forEach(function (cat) {
            (cat.terms || []).forEach(function (t) {
              terms.push(Object.assign({}, t, { file: GS_SUBJECT_FILES[i].file, subjectNames: GS_SUBJECT_FILES[i].names }));
            });
          });
        }
      });
      gsAllTerms = terms;
      return terms;
    });
    return gsLoading;
  }

  function gsCurrentLang() {
    return localStorage.getItem('selectedLanguage') || 'en';
  }

  function gsEscapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function gsMatchedLang(fields, q) {
    for (var i = 0; i < GS_LANGS.length; i++) {
      var lang = GS_LANGS[i];
      var val = fields[lang];
      if (val && val.toLowerCase().indexOf(q) !== -1) return lang;
    }
    return null;
  }

  function gsRenderResults(query) {
    var box = document.getElementById('globalSearchResults');
    if (!box) return;
    var q = query.trim().toLowerCase();
    if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    if (!gsAllTerms) { return; }

    var subjectMatches = [];
    GS_SUBJECT_FILES.forEach(function (s) {
      var lang = gsMatchedLang(s.names, q);
      if (lang) subjectMatches.push({ type: 'subject', file: s.file, matchedLang: lang, matchedText: s.names[lang], names: s.names });
    });
    subjectMatches = subjectMatches.slice(0, 3);

    var termMatches = [];
    gsAllTerms.forEach(function (t) {
      var lang = gsMatchedLang(t, q);
      if (lang) termMatches.push({ type: 'term', term: t, matchedLang: lang, matchedText: t[lang] });
    });
    termMatches = termMatches.slice(0, 8 - subjectMatches.length);

    var results = subjectMatches.concat(termMatches);

    if (!results.length) {
      box.innerHTML = '<div class="px-4 py-3 text-sm text-on-surface-variant">No terms found</div>';
      box.classList.remove('hidden');
      return;
    }

    var displayLang = gsCurrentLang();

    box.innerHTML = results.map(function (r) {
      if (r.type === 'subject') {
        var label = r.names[displayLang] || r.names.en;
        return '<a href="' + r.file + '?lang=' + r.matchedLang + '" class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-highest transition-colors border-b border-outline-variant last:border-0 bg-surface-container-high/50">' +
          '<span class="material-symbols-outlined text-primary text-lg">folder_open</span>' +
          '<span class="flex flex-col">' +
            '<span class="text-sm font-semibold text-on-surface">' + gsEscapeHtml(label) + '</span>' +
            '<span class="text-xs text-on-surface-variant">View all terms</span>' +
          '</span>' +
        '</a>';
      }
      var t = r.term;
      var subjectLabel = t.subjectNames[displayLang] || t.subjectNames.en;
      var translation = (displayLang !== 'en' && t[displayLang]) ? '<span class="text-xs text-primary block">' + gsEscapeHtml(t[displayLang]) + '</span>' : '';
      return '<a href="' + t.file + '?q=' + encodeURIComponent(r.matchedText) + '&lang=' + r.matchedLang + '" class="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-container-highest transition-colors border-b border-outline-variant last:border-0">' +
        '<span class="flex flex-col">' +
          '<span class="text-sm font-medium text-on-surface">' + gsEscapeHtml(t.en) + '</span>' +
          translation +
        '</span>' +
        '<span class="text-xs text-on-surface-variant shrink-0">' + gsEscapeHtml(subjectLabel) + '</span>' +
        '</a>';
    }).join('');
    box.classList.remove('hidden');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('globalSearchInput');
    var box = document.getElementById('globalSearchResults');
    var toggleBtn = document.getElementById('globalSearchToggleBtn');
    var searchWrap = document.getElementById('global-search-wrap');
    if (!input || !box) return;

    if (toggleBtn && searchWrap) {
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        searchWrap.classList.toggle('hidden');
        if (!searchWrap.classList.contains('hidden')) {
          input.focus();
        }
      });
    }

    input.addEventListener('focus', function () {
      gsLoadAllTerms().then(function () { gsRenderResults(input.value); });
    });
    input.addEventListener('input', function () {
      gsLoadAllTerms().then(function () { gsRenderResults(input.value); });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#global-search-wrap') && !e.target.closest('#globalSearchToggleBtn')) {
        box.classList.add('hidden');
        if (toggleBtn && window.innerWidth < 768) {
          searchWrap.classList.add('hidden');
        }
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = box.querySelector('a');
        if (first) window.location.href = first.getAttribute('href');
      }
    });
  });
})();
