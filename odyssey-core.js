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
