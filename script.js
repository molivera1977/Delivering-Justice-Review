/* ═══════════════════════════════════════════════════════
   DELIVERING JUSTICE — Unit Review · script.js
   Timers: 30s instructions lock · 12s read lock · 6s next soak
   PIN: 9377 (Teacher override)
   Architecture: Math Module 16 upgrade port
═══════════════════════════════════════════════════════ */

/* ── CONFIG ─────────────────────────────────────────── */
const INSTRUCT_SECS = 30;   // instruction lock before choices appear
const READ_SECS     = 12;   // read lock after choices appear
const NEXT_SECS     = 6;    // soak before Next button activates
const STORAGE_KEY   = 'dj_review_session_v1';
const SCORES_KEY    = 'dj_review_scores_v1';
const SESSION_ID    = 'DJ-' + Math.random().toString(36).slice(2, 9).toUpperCase();

/* ── SHEET SUBMISSION (update URL as needed) ───────── */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzv8CWv1yyi8NeH04now9UxVL4IZm5yMqqsEGMcgGdrcAOWVB-aSp5siTvSSJXIUpzFMA/exec';

function attemptSessionId() {
  // Unique per section + attempt so attempt 2 never overwrites attempt 1 in the sheet
  const attempt = app.currentAttemptNum || 1;
  return SESSION_ID + '-' + (app.currentSection || 'x') + '-A' + attempt;
}

function submitScorePartial() {
  const pct = app.currentBank.length
    ? Math.round((app.score / app.currentBank.length) * 100) : 0;
  fetch(SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action:      'submit',
      game:        'dj_' + (app.currentSection || 'djreview'),
      sessionId:   attemptSessionId(),
      name:        app.studentName || 'Unknown',
      section:     app.currentSection || '?',
      score:       app.score,
      total:       app.currentBank.length,
      percent:     pct,
      status:      `In Progress (Q${app.currentIndex + 1}/${app.currentBank.length})`,
      done:        false,
      elapsed:     app.timerSeconds,
      timestamp:   new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    })
  }).catch(() => {});
}

function submitScoreFinal() {
  const pct = app.currentBank.length
    ? Math.round((app.score / app.currentBank.length) * 100) : 0;
  fetch(SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action:      'submit',
      game:        'dj_' + (app.currentSection || 'djreview'),
      sessionId:   attemptSessionId(),
      name:        app.studentName || 'Unknown',
      section:     app.currentSection || '?',
      attempt:     app.currentAttemptNum || 1,
      score:       app.score,
      total:       app.currentBank.length,
      percent:     pct,
      status:      'Complete',
      done:        true,
      elapsed:     app.timerSeconds,
      timestamp:   new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    })
  }).catch(() => {});
}

/* ── ROSTER ─────────────────────────────────────────── */
const ROSTER = [
  { name: 'Mr. O (Teacher)',           id: '9377'     },
  { name: 'Aquino-Perez, Steven',      id: '10048814' },
  { name: 'Camas-Alvarez, Mike',       id: '10060436' },
  { name: 'Earle, Jeremiah',           id: '10038362' },
  { name: 'Felix, Chloe',              id: '10065242' },
  { name: 'Flores Marcos, Cornelio',   id: '10037877' },
  { name: "Gardner, Zy'iere",          id: '10057389' },
  { name: 'Giraldo, Layla',            id: '10053382' },
  { name: 'Lawrence, Lennox',          id: '10045050' },
  { name: 'Michael, Mulan',            id: '10051762' },
  { name: 'Millet, Zion',              id: '10053340' },
  { name: 'Murillo Estrada, Kevin',    id: '10065967' },
  { name: 'Romaniello, Kaylib',        id: '10041081' },
  { name: 'Sanango-Quizhpi, Anthony',  id: '10065990' },
  { name: 'Santos-Bautista, Scarlet',  id: '10062436' },
  { name: 'Simpson, Jordyn',           id: '10045306' },
  { name: 'Torres, Aryana',            id: '10053178' },
  { name: 'Towns, Micah',              id: '10043892' },
  { name: 'Ulerio-Jimenez, Adrian',    id: '10061117' }
];

const GUEST_SLOTS = {
  '937701': 'Guest 1', '937702': 'Guest 2', '937703': 'Guest 3',
  '937704': 'Guest 4', '937705': 'Guest 5', '937706': 'Guest 6',
  '937707': 'Guest 7', '937708': 'Guest 8', '937709': 'Guest 9',
  '937710': 'Guest 10'
};

const SECTION_LABELS = { vocab: 'Vocabulary', comp: 'Comprehension', cloze: 'Cloze' };

/* ── BUILD DROPDOWN ─────────────────────────────────── */
(function buildRoster() {
  const sel = document.getElementById('name-select');
  ROSTER.forEach(s => {
    const o = document.createElement('option');
    o.value = s.name; o.textContent = s.name;
    sel.appendChild(o);
  });
  const div = document.createElement('option');
  div.disabled = true; div.textContent = '── Guest Slots ──';
  sel.appendChild(div);
  Object.entries(GUEST_SLOTS).forEach(([code, label]) => {
    const o = document.createElement('option');
    o.value = `GUEST:${code}`; o.textContent = `🙋 ${label}`;
    sel.appendChild(o);
  });
})();

/* ── STATE ──────────────────────────────────────────── */
let loggedInName    = '';
let unlockedSections = new Set();
let pinModalCallback = null;
let tabSwitchCount  = 0;
let activeSpeakBtn  = null;
let reviewMode      = false;
let reviewAutoRun   = false;

function stopActiveSpeech() {
  window.speechSynthesis.cancel();
  document.querySelectorAll('.wrd.hl').forEach(e => e.classList.remove('hl'));
  if (activeSpeakBtn) { activeSpeakBtn.textContent = '🔊'; activeSpeakBtn = null; }
}

/* ── HELPERS ────────────────────────────────────────── */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getFirstName(name) {
  if (!name) return 'Student';
  const parts = name.split(',');
  return parts.length > 1 ? parts[1].trim().split(' ')[0] : name.split(' ')[0];
}

// wrapWords: used ONLY on question text for read-aloud word highlighting.
// Splits on whitespace boundaries, preserves HTML tags, handles em-dashes.
function wrapWords(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let idx = 0;
  function walk(node) {
    if (node.nodeType === 3) {
      // Normalize em-dash spacing so words don't glue together
      const text = node.textContent.replace(/—/g, ' — ').replace(/  +/g, ' ');
      const words = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      words.forEach(part => {
        if (/\S/.test(part)) {
          const sp = document.createElement('span');
          sp.className = 'wrd';
          sp.dataset.wi = idx++;
          sp.textContent = part;
          frag.appendChild(sp);
        } else if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else {
      [...node.childNodes].forEach(walk);
    }
  }
  walk(tmp);
  return tmp.innerHTML;
}

// plainText: for choice buttons — no span wrapping needed, just safe HTML
function choiceHtml(text) {
  // Normalize em-dashes with spaces so they render cleanly
  return text.replace(/—/g, ' — ');
}

// Returns { vocab: 0|1|2, comp: 0|1|2, cloze: 0|1|2 } — number of completed attempts per section
function getSectionAttempts(name) {
  const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
  const counts = { vocab: 0, comp: 0, cloze: 0 };
  scores.filter(s => s.name === name && s.done).forEach(s => {
    if (counts[s.section] !== undefined) counts[s.section]++;
  });
  return counts;
}

// All 3 sections completed at least once?
function allSectionsCompletedOnce(name) {
  const a = getSectionAttempts(name);
  return a.vocab >= 1 && a.comp >= 1 && a.cloze >= 1;
}

function applyLocks(name) {
  const attempts  = getSectionAttempts(name);
  const allDone1  = allSectionsCompletedOnce(name);
  const qCounts   = { vocab: '30 questions', comp: '24 questions', cloze: '30 questions' };

  ['vocab', 'comp', 'cloze'].forEach(sec => {
    const btn = document.getElementById(`btn-${sec}`);
    if (!btn) return;
    const done = attempts[sec];

    if (done === 0) {
      // Not yet attempted — open
      btn.classList.remove('locked');
      btn.querySelector('.form-btn-sub').textContent = qCounts[sec];

    } else if (done === 1 && !allDone1) {
      // Completed once but other sections not yet done — locked until all done once
      btn.classList.add('locked');
      btn.querySelector('.form-btn-sub').textContent = '✅ Done · finish other sections to retry';

    } else if (done === 1 && allDone1) {
      // All done once, this one has 1 attempt — open for attempt 2
      btn.classList.remove('locked');
      btn.querySelector('.form-btn-sub').textContent = '🔁 Attempt 2 available';

    } else {
      // 2 attempts used — permanently locked (Teacher PIN to override)
      btn.classList.add('locked');
      btn.querySelector('.form-btn-sub').textContent = '🔒 2/2 attempts used';
    }
  });
}

/* ── SPEAK (directions) ─────────────────────────────── */
function speakDir(btn) {
  if (activeSpeakBtn === btn) { stopActiveSpeech(); return; }
  stopActiveSpeech();

  const p = btn.closest('.dir-section').querySelector('.dir-text');
  if (!p) return;

  if (!p.querySelector('.wrd')) p.innerHTML = wrapWords(p.innerHTML);

  const spans = Array.from(p.querySelectorAll('.wrd'));
  if (!spans.length) return;

  activeSpeakBtn = btn;
  btn.textContent = '⏹';

  const speechText = spans.map(s => s.textContent).join(' ');
  let hlIdx = 0;
  const u = new SpeechSynthesisUtterance(speechText);
  u.lang = 'en-US';
  u.rate = 0.92;

  u.onboundary = e => {
    if (e.name !== 'word') return;
    document.querySelectorAll('.dir-text .wrd.hl').forEach(el => el.classList.remove('hl'));
    if (spans[hlIdx]) spans[hlIdx].classList.add('hl');
    hlIdx++;
  };

  u.onend = () => {
    document.querySelectorAll('.dir-text .wrd.hl').forEach(el => el.classList.remove('hl'));
    if (activeSpeakBtn === btn) { btn.textContent = '🔊'; activeSpeakBtn = null; }
  };

  window.speechSynthesis.speak(u);
}

/* ══════════════════════════════════════════════════════
   APP OBJECT
══════════════════════════════════════════════════════ */
const app = {

  /* ── state ── */
  studentName:    '',
  currentSection: '',
  currentBank:    [],
  currentIndex:   0,
  score:          0,
  streak:         0,
  missedQuestions:[],
  currentAttemptNum: 1,
  selectedIndices:new Set(),
  questionLocked: false,
  timerSeconds:   0,
  timerInterval:  null,
  timerOn:        false,
  instructInterval: null,
  readInterval:   null,
  nextInterval:   null,

  /* ── screens ── */
  show(id) {
    ['start-screen','directions-screen','quiz-screen','end-screen','scoreboard-screen']
      .forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    window.speechSynthesis.cancel();
  },

  /* ── INIT ── */
  init() {
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.remove('hidden');
    document.getElementById('student-login-panel').classList.add('hidden');
  },

  /* ── DIRECTIONS ── */
  showDirections() {
    document.getElementById('welcome-panel').classList.add('hidden');
    this.show('directions-screen');
    // Start 30s lock on the I'm Ready button
    this.startInstructionsTimer();
  },

  showLogin() {
    // Stop instructions timer if still running
    if (this.instructInterval) { clearInterval(this.instructInterval); this.instructInterval = null; }
    // Stop any directions read-aloud and clear highlights
    window.speechSynthesis.cancel();
    document.querySelectorAll('.dir-text .wrd.hl').forEach(e => e.classList.remove('hl'));
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('student-login-panel').classList.remove('hidden');
    this.checkResume();
  },

  /* ── NAME SELECT ── */
  onNameSelect() {
    const val = document.getElementById('name-select').value;
    const pinSec = document.getElementById('pin-section');
    const guestSec = document.getElementById('guest-name-section');
    document.getElementById('login-error').textContent = '';
    if (!val) { pinSec.classList.add('hidden'); return; }
    pinSec.classList.remove('hidden');
    if (val.startsWith('GUEST:')) {
      guestSec.classList.remove('hidden');
      document.getElementById('pin-label').textContent = '🔒 Enter guest code:';
    } else {
      guestSec.classList.add('hidden');
      document.getElementById('pin-label').textContent = '🔒 Enter your student number:';
    }
    setTimeout(() => document.getElementById('student-pin').focus(), 80);
  },

  /* ── LOGIN ── */
  attemptLogin() {
    const selVal = document.getElementById('name-select').value;
    const pin    = document.getElementById('student-pin').value.trim();
    const errEl  = document.getElementById('login-error');
    errEl.textContent = '';

    if (!selVal) { errEl.textContent = '⚠️ Please select your name.'; return; }
    if (!pin)    { errEl.textContent = '⚠️ Please enter your student number.'; return; }

    let matched = false;
    let displayName = '';

    if (selVal.startsWith('GUEST:')) {
      const code = selVal.replace('GUEST:', '');
      if (GUEST_SLOTS[pin] !== undefined && pin === code) {
        const firstName = (document.getElementById('guest-display-name').value || '').trim();
        if (!firstName) { errEl.textContent = '⚠️ Please enter your first name.'; return; }
        matched = true;
        displayName = firstName + ' (Guest)';
      } else if (Object.values(GUEST_SLOTS).some((_, i) => Object.keys(GUEST_SLOTS)[i] === pin)) {
        matched = true;
        const firstName = (document.getElementById('guest-display-name').value || '').trim();
        displayName = (firstName || 'Guest') + ' (Guest)';
      } else {
        errEl.textContent = '❌ Incorrect guest code. Try again.'; return;
      }
    } else {
      const student = ROSTER.find(s => s.name === selVal);
      if (student && student.id === pin) {
        matched = true;
        displayName = selVal;
      } else {
        errEl.textContent = '❌ Incorrect student number. Try again.'; return;
      }
    }

    if (matched) {
      loggedInName       = displayName;
      this.studentName   = displayName;
      document.getElementById('section-select').classList.remove('hidden');
      document.getElementById('student-pin').value = '';
      document.getElementById('login-error').textContent = '';
      applyLocks(displayName);
      this.checkResume();
      // Show review mode button only for teacher
      const rmBtn = document.getElementById('review-mode-btn');
      if (rmBtn) rmBtn.classList.toggle('hidden', displayName !== 'Mr. O (Teacher)');
    }
  },

  /* ── ATTEMPT START (checks lock) ── */
  attemptStart(section) {
    const attempts = getSectionAttempts(this.studentName);
    const done     = attempts[section];
    const allDone1 = allSectionsCompletedOnce(this.studentName);
    const name1    = getFirstName(this.studentName);

    if (done === 0) {
      // First attempt — always open
      this.startSession(section);

    } else if (done === 1 && !allDone1) {
      // Completed once but other sections not finished — blocked
      alert(`⚠️ ${name1}, you need to finish all three sections before you can retry ${SECTION_LABELS[section]}. Complete the remaining sections first!`);

    } else if (done === 1 && allDone1) {
      // Eligible for attempt 2 — go straight in
      this.startSession(section);

    } else if (done >= 2 && !unlockedSections.has(section)) {
      // Both attempts used — Teacher PIN required
      this.showPinModal(
        `🔓 Unlock ${SECTION_LABELS[section]}`,
        `${name1} has already used both attempts for ${SECTION_LABELS[section]}. Enter Teacher PIN to allow an extra retry.`,
        () => { unlockedSections.add(section); this.startSession(section); }
      );
    } else {
      // Teacher-unlocked extra attempt
      this.startSession(section);
    }
  },

  /* ── TEACHER REVIEW MODE ── */
  promptTeacherReview() {
    const pin = prompt('Enter Teacher PIN to access Review Mode:');
    if (pin !== '9377') { if (pin !== null) alert('Incorrect PIN.'); return; }
    this.studentName = 'Mr. O (Teacher)';
    reviewMode = true;
    this._showReviewPicker();
  },

  _showReviewPicker() {
    const section = prompt('Choose a section to review:\n1 — Vocabulary\n2 — Comprehension\n3 — Cloze\n\nEnter 1, 2, or 3:');
    const map = { '1': 'vocab', '2': 'comp', '3': 'cloze' };
    if (!map[section]) { alert('Invalid choice.'); reviewMode = false; return; }
    const mode = prompt('Choose review mode:\n1 — Manual (you tap Next each question)\n2 — Auto-run (fully automatic)\n\nEnter 1 or 2:');
    if (mode !== '1' && mode !== '2') { alert('Invalid choice.'); reviewMode = false; return; }
    reviewAutoRun = (mode === '2');
    this.startSession(map[section]);
  },

  exitReviewMode() {
    reviewMode    = false;
    reviewAutoRun = false;
    this.stopTimerEngine();
    const banner = document.getElementById('review-mode-banner');
    if (banner) banner.classList.add('hidden');
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.remove('hidden');
    document.getElementById('student-login-panel').classList.add('hidden');
  },

  _autoAnswer() {
    const q = this.currentBank[this.currentIndex];
    const isMulti = Array.isArray(q.answer);
    const answers = isMulti ? q.answer : [q.answer];
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      if (answers.includes(i)) {
        this.selectedIndices.add(i);
        btn.classList.add('selected');
      }
    });
    setTimeout(() => this.confirmAnswer(), 600);
  },

  /* ── START SESSION ── */
  startSession(section) {
    const banner = document.getElementById('review-mode-banner');
    if (banner) {
      banner.classList.toggle('hidden', !reviewMode);
      const label = banner.querySelector('span');
      if (label) label.textContent = reviewAutoRun
        ? '🔍 Teacher Review Mode — auto-run'
        : '🔍 Teacher Review Mode — tap Next to advance';
    }
    localStorage.removeItem(STORAGE_KEY);
    this.currentSection = section;
    this.score          = 0;
    this.streak         = 0;
    this.missedQuestions= [];
    this.currentIndex   = 0;

    let rawBank;
    if (section === 'vocab')  rawBank = [...window.VOCAB_BANK];
    else if (section === 'comp') rawBank = [...window.COMP_BANK];
    else                      rawBank = [...window.CLOZE_BANK];

    // Helper: shuffle choices and remap answer index(es)
    const shuffleQ = q => {
      const isMulti = Array.isArray(q.answer);
      const indexed = q.choices.map((text, i) => ({ text, origIdx: i }));
      shuffle(indexed);
      const newAnswer = isMulti
        ? q.answer.map(a => indexed.findIndex(c => c.origIdx === a))
        : indexed.findIndex(c => c.origIdx === q.answer);
      return { id: q.id, q: q.q, choices: indexed.map(c => c.text), answer: newAnswer, pairRef: q.pairRef || null };
    };

    if (section === 'comp') {
      // Comprehension pairs must stay together and in order (inference Q then evidence Q).
      // Pairs: P13+P14, P15+P16, P17+P18, P19+P20, P21+P22, P23+P24
      // Story detail questions P01–P12 can shuffle freely.
      const details = rawBank.filter(q => /^P(0[1-9]|1[0-2])$/.test(q.id));
      const pairIds = [
        ['P13','P14'], ['P15','P16'], ['P17','P18'],
        ['P19','P20'], ['P21','P22'], ['P23','P24']
      ];
      const pairs = pairIds.map(([a,b]) => [
        rawBank.find(q => q.id === a),
        rawBank.find(q => q.id === b)
      ]).filter(p => p[0] && p[1]);

      // Shuffle details and pairs independently, then interleave: all details first, then pairs
      // (matches test structure: Part I details, Part II inference pairs)
      shuffle(details);
      shuffle(pairs);

      // Add a pairRef label to the evidence question so it references its own pair
      let pairNum = 0;
      const flatPairs = pairs.flatMap(([inf, ev]) => {
        pairNum++;
        const infQ = shuffleQ(inf);
        // Annotate the evidence Q to show which inference it references
        const evQ  = shuffleQ(ev);
        evQ.pairLabel = "(Refers to the inference question above it)";
        return [infQ, evQ];
      });

      this.currentBank = [...details.map(shuffleQ), ...flatPairs];

    } else {
      this.currentBank = rawBank.map(shuffleQ);
      shuffle(this.currentBank);
    }

    this.show('quiz-screen');
    this.startTimer();
    this.renderQuestion();
  },

  /* ── RESUME ── */
  checkResume() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const rc = document.getElementById('resume-container');
    if (saved && rc) {
      const data = JSON.parse(saved);
      if (data.studentName === this.studentName || !this.studentName) {
        rc.classList.remove('hidden');
        document.getElementById('resume-detail').textContent =
          `${SECTION_LABELS[data.currentSection]} — Question ${data.currentIndex + 1} of ${data.currentBank.length}`;
      } else {
        rc.classList.add('hidden');
      }
    } else if (rc) {
      rc.classList.add('hidden');
    }
  },

  resumeSession() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    this.studentName    = saved.studentName;
    this.currentSection = saved.currentSection;
    this.currentBank    = saved.currentBank;
    this.currentIndex   = saved.currentIndex;
    this.score          = saved.score;
    this.streak         = saved.streak || 0;
    this.missedQuestions= saved.missedQuestions || [];
    this.timerSeconds   = saved.timerSeconds || 0;
    this.show('quiz-screen');
    this.startTimer();
    this.renderQuestion();
  },

  saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      studentName:     this.studentName,
      currentSection:  this.currentSection,
      currentBank:     this.currentBank,
      currentIndex:    this.currentIndex,
      score:           this.score,
      streak:          this.streak,
      missedQuestions: this.missedQuestions,
      timerSeconds:    this.timerSeconds
    }));
  },

  discardProgress() {
    this.showPinModal(
      '🗑️ Discard Progress',
      'Enter Teacher PIN to clear the current in-progress session. The student will start fresh.',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        document.getElementById('resume-container').classList.add('hidden');
        applyLocks(this.studentName);
      }
    );
  },

  /* ── OVERALL TIMER ── */
  startTimer() {
    this.stopTimerEngine();
    this.timerOn = true;
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this._tickTimer();
      if (this.timerSeconds % 30 === 0) this.saveProgress();
    }, 1000);
  },

  stopTimerEngine() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.timerOn = false;
  },

  _tickTimer() {
    const m = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
    const s = String(this.timerSeconds % 60).padStart(2, '0');
    const el = document.getElementById('timer-display');
    if (el) el.textContent = `${m}:${s}`;
  },

  /* ── INSTRUCTIONS SCREEN 30s LOCK ── */
  startInstructionsTimer() {
    if (this.instructInterval) { clearInterval(this.instructInterval); this.instructInterval = null; }
    const btn   = document.getElementById('ready-btn');
    const fill  = document.getElementById('instruct-fill');
    const count = document.getElementById('instruct-count');
    if (!btn) return;
    if (reviewMode) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.textContent = "✅ I'm Ready — Let's Begin!"; return; }
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor  = 'not-allowed';
    if (fill)  fill.style.width = '100%';
    if (count) count.textContent = INSTRUCT_SECS;
    let remaining = INSTRUCT_SECS;
    this.instructInterval = setInterval(() => {
      remaining--;
      if (count) count.textContent = remaining;
      if (fill)  fill.style.width = (remaining / INSTRUCT_SECS * 100) + '%';
      if (remaining <= 0) {
        clearInterval(this.instructInterval);
        this.instructInterval = null;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
        btn.textContent   = "✅ I'm Ready — Let's Begin!";
      }
    }, 1000);
  },

  /* ── READING LOCK TIMER (12s) ── */
  startReadTimer() {
    if (this.readInterval) { clearInterval(this.readInterval); this.readInterval = null; }
    const bar   = document.getElementById('reading-timer-bar');
    const fill  = document.getElementById('reading-fill');
    const count = document.getElementById('reading-count');

    if (reviewMode) {
      bar.classList.add('hidden');
      document.querySelectorAll('.answer-btn').forEach(b => { b.classList.remove('locked-choice'); b.disabled = false; });
      setTimeout(() => this._autoAnswer(), 300);
      return;
    }

    bar.classList.remove('hidden');
    fill.style.width = '100%';
    count.textContent = READ_SECS;

    // Choices visible but locked
    document.querySelectorAll('.answer-btn').forEach(b => {
      b.classList.add('locked-choice');
      b.disabled = true;
    });

    let remaining = READ_SECS;
    this.readInterval = setInterval(() => {
      remaining--;
      count.textContent = remaining;
      fill.style.width = (remaining / READ_SECS * 100) + '%';
      if (remaining <= 0) {
        clearInterval(this.readInterval);
        this.readInterval = null;
        bar.classList.add('hidden');
        // Unlock choices
        document.querySelectorAll('.answer-btn').forEach(b => {
          b.classList.remove('locked-choice');
          b.disabled = false;
        });
        // Show confirm button
        document.getElementById('confirm-btn').classList.remove('hidden');
      }
    }, 1000);
  },

  /* ── NEXT SOAK TIMER (6s) ── */
  startNextTimer(onDone) {
    if (this.nextInterval) { clearInterval(this.nextInterval); this.nextInterval = null; }
    const bar   = document.getElementById('next-timer-bar');
    const fill  = document.getElementById('next-fill');
    const count = document.getElementById('next-count');

    if (reviewMode) {
      bar.classList.add('hidden');
      if (reviewAutoRun) {
        setTimeout(() => this.nextQuestion(), 800);
      } else {
        document.getElementById('next-btn').classList.remove('hidden');
      }
      return;
    }

    bar.classList.remove('hidden');
    fill.style.width = '100%';
    count.textContent = NEXT_SECS;

    let remaining = NEXT_SECS;
    this.nextInterval = setInterval(() => {
      remaining--;
      count.textContent = remaining;
      fill.style.width = (remaining / NEXT_SECS * 100) + '%';
      if (remaining <= 0) {
        clearInterval(this.nextInterval);
        this.nextInterval = null;
        bar.classList.add('hidden');
        document.getElementById('next-btn').classList.remove('hidden');
        if (onDone) onDone();
      }
    }, 1000);
  },

  /* ── RENDER QUESTION ── */
  renderQuestion() {
    const q      = this.currentBank[this.currentIndex];
    const total  = this.currentBank.length;
    const isMulti = Array.isArray(q.answer);

    // Badge + progress
    document.getElementById('progress-text').textContent =
      `Question ${this.currentIndex + 1} of ${total}`;
    document.getElementById('score-text').textContent =
      `Score: ${this.score}`;
    document.getElementById('progress-fill').style.width =
      `${(this.currentIndex / total) * 100}%`;

    // Streak
    this._renderStreak();

    // Question text (with optional TWO badge and pair reference)
    const qtEl = document.getElementById('question-text');
    const badge    = isMulti ? '<span class="two-answer-badge">Choose TWO</span>' : '';
    const pairNote = q.pairLabel
      ? '<div style="font-size:0.78rem;color:#7f8c8d;margin-top:6px;font-style:italic;">📎 ' + q.pairLabel + '</div>'
      : '';
    qtEl.innerHTML = wrapWords(q.q) + badge + pairNote;

    // Feedback reset
    const fb = document.getElementById('feedback');
    fb.className = 'feedback-box';
    fb.style.display = 'none';
    fb.textContent = '';

    // Buttons
    document.getElementById('confirm-btn').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('next-timer-bar').classList.add('hidden');

    // Build choices
    this.selectedIndices = new Set();
    this.questionLocked  = false;
    const wrap = document.getElementById('answers');
    wrap.innerHTML = '';

    q.choices.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'answer-row';

      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.innerHTML = `<strong>${['A','B','C','D','E'][i]}.</strong>&nbsp;<span class="choice-text">${choiceHtml(text)}</span>`;
      btn.onclick = () => this._selectChoice(i, btn, isMulti);

      const speakBtn = document.createElement('button');
      speakBtn.className = 'choice-speak-btn';
      speakBtn.textContent = '🔊';
      speakBtn.title = 'Read this choice aloud';
      speakBtn.onclick = (e) => {
        e.stopPropagation();
        if (activeSpeakBtn === speakBtn) { stopActiveSpeech(); return; }
        stopActiveSpeech();

        // Wrap choice words in spans on first speak
        const textSpan = btn.querySelector('.choice-text');
        if (textSpan && !textSpan.querySelector('.wrd')) {
          textSpan.innerHTML = wrapWords(textSpan.innerHTML);
        }
        const spans = textSpan ? Array.from(textSpan.querySelectorAll('.wrd')) : [];

        activeSpeakBtn = speakBtn;
        speakBtn.textContent = '⏹';

        // Speak only the choice text so boundary events align with word spans
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        let hlIdx = 0;
        u.onboundary = e => {
          if (e.name !== 'word') return;
          textSpan.querySelectorAll('.wrd.hl').forEach(el => el.classList.remove('hl'));
          if (spans[hlIdx]) spans[hlIdx].classList.add('hl');
          hlIdx++;
        };
        u.onend = () => {
          if (textSpan) textSpan.querySelectorAll('.wrd.hl').forEach(el => el.classList.remove('hl'));
          if (activeSpeakBtn === speakBtn) { speakBtn.textContent = '🔊'; activeSpeakBtn = null; }
        };
        window.speechSynthesis.speak(u);
      };

      row.appendChild(speakBtn);
      row.appendChild(btn);
      wrap.appendChild(row);
    });

    // Partial score submission every 5 questions
    if (this.currentIndex > 0 && this.currentIndex % 5 === 0) {
      submitScorePartial();
    }

    this.saveProgress();

    // Show choices immediately, then start 12s read lock
    document.getElementById('answers').classList.remove('hidden');
    this.startReadTimer();
  },

  _selectChoice(i, btn, isMulti) {
    if (this.questionLocked) return;
    if (isMulti) {
      if (this.selectedIndices.has(i)) {
        this.selectedIndices.delete(i);
        btn.classList.remove('selected');
      } else {
        this.selectedIndices.add(i);
        btn.classList.add('selected');
      }
    } else {
      document.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
      this.selectedIndices = new Set([i]);
      btn.classList.add('selected');
    }
  },

  _renderStreak() {
    const el = document.getElementById('streak-bar');
    if (this.streak >= 3) {
      el.textContent = '🔥'.repeat(Math.min(this.streak, 8)) + ` ${this.streak} in a row!`;
    } else {
      el.textContent = '';
    }
  },

  /* ── CONFIRM ANSWER ── */
  confirmAnswer() {
    if (this.selectedIndices.size === 0) return;
    this.questionLocked = true;

    const q      = this.currentBank[this.currentIndex];
    const isMulti = Array.isArray(q.answer);
    let correct  = false;

    if (isMulti) {
      correct = this.selectedIndices.size === q.answer.length &&
        [...this.selectedIndices].every(v => q.answer.includes(v));
    } else {
      correct = [...this.selectedIndices][0] === q.answer;
    }

    if (correct) {
      this.score++;
      this.streak++;
    } else {
      this.streak = 0;
      this.missedQuestions.push({ id: q.id, q: q.q });
    }

    // Mark buttons
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      btn.disabled = true;
      const isCorrect = isMulti ? q.answer.includes(i) : i === q.answer;
      if (isCorrect)                    btn.classList.add('correct');
      else if (this.selectedIndices.has(i)) btn.classList.add('incorrect');
    });

    // Feedback
    const fb = document.getElementById('feedback');
    fb.className = 'feedback-box ' + (correct ? 'correct' : 'incorrect');
    fb.style.display = 'block';
    fb.innerHTML = correct
      ? `✅ <strong>Correct!</strong>`
      : `❌ <strong>Not quite.</strong> The correct answer${isMulti ? 's are' : ' is'}: <strong>${
          (isMulti ? q.answer : [q.answer])
            .map(a => `${['A','B','C','D','E'][a]}. ${q.choices[a]}`).join(' &amp; ')
        }</strong>`;

    document.getElementById('confirm-btn').classList.add('hidden');
    document.getElementById('score-text').textContent = `Score: ${this.score}`;
    this._renderStreak();
    this.saveProgress();

    // Start next soak
    this.startNextTimer(null);
  },

  /* ── NEXT QUESTION ── */
  nextQuestion() {
    stopActiveSpeech();
    this.currentIndex++;

    if (this.currentIndex >= this.currentBank.length) {
      this._finishSession();
    } else {
      this.renderQuestion();
    }
  },

  /* ── FINISH SESSION ── */
  _finishSession() {
    this.stopTimerEngine();
    localStorage.removeItem(STORAGE_KEY);

    const total = this.currentBank.length;
    const pct   = Math.round((this.score / total) * 100);
    const date  = new Date();

    // Save to local scores — include attempt number BEFORE pushing this result
    const scores  = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    const prevDone = scores.filter(s => s.name === this.studentName && s.section === this.currentSection && s.done).length;
    const attemptNum = prevDone + 1;   // 1 or 2 (or 3+ if teacher-unlocked extra)
    this.currentAttemptNum = attemptNum;
    scores.push({
      name:    this.studentName,
      section: this.currentSection,
      attempt: attemptNum,
      score:   this.score,
      total,
      pct,
      elapsed: this.timerSeconds,
      date:    date.toLocaleDateString(),
      time:    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      done:    true
    });
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));

    submitScoreFinal();

    // Grade
    let letter = 'F', msg = "Let's study this again! 📚";
    if (pct >= 90) { letter = 'A'; msg = "Outstanding Work! 🌟"; }
    else if (pct >= 80) { letter = 'B'; msg = "Great Job! 👏"; }
    else if (pct >= 70) { letter = 'C'; msg = "Good Effort! 💪"; }
    else if (pct >= 60) { letter = 'D'; msg = "Keep Practicing! 🔄"; }

    this.show('end-screen');

    const reviewNextBtn = document.getElementById('review-next-btn');
    if (reviewNextBtn) reviewNextBtn.classList.toggle('hidden', !reviewMode);

    document.getElementById('final-score-sub').textContent =
      `${SECTION_LABELS[this.currentSection]} · Attempt ${attemptNum} · ${this.studentName}`;
    document.getElementById('final-msg').textContent = msg;

    const pctEl = document.getElementById('final-percent');
    pctEl.innerHTML =
      `${this.score}/${total}<br><small style="font-size:0.5em;color:${pct>=70?'var(--correct)':'var(--danger)'};">${pct}% · ${letter}</small>`;
    setTimeout(() => pctEl.classList.add('revealed'), 50);

    // Missed list
    const missedSec = document.getElementById('missed-section');
    if (this.missedQuestions.length) {
      missedSec.classList.remove('hidden');
      document.getElementById('missed-items').innerHTML =
        this.missedQuestions.map(m =>
          `<div class="missed-item"><div class="mi-label">${m.id}</div>${m.q}</div>`
        ).join('');
    } else {
      missedSec.classList.add('hidden');
    }

    if (pct >= 80) startConfetti();
  },

  /* ── SPEAK QUESTION (question text only — use per-choice buttons for choices) ── */
  speakQuestion() {
    const qBtn = document.getElementById('speak-q-btn');
    if (activeSpeakBtn === qBtn) { stopActiveSpeech(); return; }
    stopActiveSpeech();
    activeSpeakBtn = qBtn;
    qBtn.textContent = '⏹';

    const qtEl    = document.getElementById('question-text');
    const qtSpans = Array.from(qtEl.querySelectorAll('.wrd'));
    const qtText  = qtSpans.map(s => s.textContent).join(' ');

    const parts = [
      { text: qtText, spans: qtSpans }
    ];

    let pi = 0;
    const speakNext = () => {
      if (pi >= parts.length) {
        document.querySelectorAll('.wrd.hl').forEach(e => e.classList.remove('hl'));
        return;
      }
      const part = parts[pi];
      let hlIdx = 0;
      const u = new SpeechSynthesisUtterance(part.text);
      u.lang = 'en-US';
      u.rate = 0.9;

      u.onboundary = e => {
        if (e.name !== 'word') return;
        if (part.spans) {
          document.querySelectorAll('.wrd.hl').forEach(el => el.classList.remove('hl'));
          if (part.spans[hlIdx]) part.spans[hlIdx].classList.add('hl');
        }
        hlIdx++;
      };

      u.onend = () => {
        document.querySelectorAll('.wrd.hl').forEach(e => e.classList.remove('hl'));
        pi++;
        if (pi >= parts.length) {
          const qBtn = document.getElementById('speak-q-btn');
          if (activeSpeakBtn === qBtn) { qBtn.textContent = '🔊'; activeSpeakBtn = null; }
        }
        speakNext();
      };

      window.speechSynthesis.speak(u);
    };

    speakNext();
  },

  /* ── SCORES ── */
  showScores() {
    this.show('scoreboard-screen');
    const all    = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    const listEl = document.getElementById('score-list');
    const noEl   = document.getElementById('no-scores-msg');

    if (!all.length) {
      listEl.innerHTML = '';
      noEl.style.display = 'block';
      return;
    }
    noEl.style.display = 'none';

    const sections = ['vocab','comp','cloze'];
    listEl.innerHTML = sections.map(sec => {
      const rows = all.filter(s => s.section === sec);
      if (!rows.length) return '';

      // Separate attempt 1 vs attempt 2+
      const att1 = rows.filter(r => (r.attempt || 1) === 1);
      const att2 = rows.filter(r => (r.attempt || 1) >= 2);

      const buildTable = (attempts, label, headerColor) => {
        if (!attempts.length) return '';
        return `
          <div style="margin-bottom:14px;">
            <div style="display:inline-block;background:${headerColor};color:white;
                        font-size:0.72rem;font-weight:bold;letter-spacing:1px;
                        text-transform:uppercase;border-radius:6px;padding:3px 10px;
                        margin-bottom:6px;">${label}</div>
            <table class="scoreboard-table">
              <thead><tr><th>Name</th><th>Score</th><th>%</th><th>Time</th><th>Date</th></tr></thead>
              <tbody>
                ${attempts.map(r => {
                  const cls = r.pct >= 80 ? 'score-good' : r.pct >= 60 ? 'score-ok' : 'score-bad';
                  return `<tr>
                    <td>${r.name||'—'}</td>
                    <td>${r.score}/${r.total}</td>
                    <td class="${cls}">${r.pct}%</td>
                    <td>${r.time||'—'}</td>
                    <td>${r.date}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;
      };

      return `
        <h3 style="color:var(--primary);margin:22px 0 8px;border-bottom:2px solid #e0e0e0;padding-bottom:6px;">
          ${SECTION_LABELS[sec]}
        </h3>
        ${buildTable(att1, 'Attempt 1', '#1a3a6b')}
        ${buildTable(att2, 'Attempt 2', '#c9a227')}`;
    }).join('');
  },

  clearScores() {
    const panel = document.getElementById('clear-confirm-panel');
    panel.classList.remove('hidden');
    document.getElementById('clear-pin-input').value = '';
    document.getElementById('clear-pin-error').textContent = '';
    setTimeout(() => document.getElementById('clear-pin-input').focus(), 80);
  },

  confirmClearScores() {
    const pin = document.getElementById('clear-pin-input').value.trim();
    if (pin === '9377') {
      localStorage.removeItem(SCORES_KEY);
      document.getElementById('clear-confirm-panel').classList.add('hidden');
      this.showScores();
    } else {
      document.getElementById('clear-pin-error').textContent = '❌ Incorrect PIN. Try again.';
      document.getElementById('clear-pin-input').value = '';
      document.getElementById('clear-pin-input').focus();
    }
  },

  cancelClearScores() {
    document.getElementById('clear-confirm-panel').classList.add('hidden');
  },

  printResults() {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    if (!all.length) {
      alert('No scores to print yet!');
      return;
    }
    const sections = ['vocab','comp','cloze'];
    const rows = sections.flatMap(sec =>
      all.filter(s => s.section === sec).map(r => {
        const cc  = r.pct >= 80 ? 'good' : r.pct >= 60 ? 'ok' : 'bad';
        const att = r.attempt || 1;
        const attLabel = att === 1 ? 'Attempt 1' : `Attempt ${att}`;
        const attStyle = att === 1
          ? 'background:#1a3a6b;color:white;padding:2px 7px;border-radius:4px;font-size:0.8em;'
          : 'background:#c9a227;color:#3a2800;padding:2px 7px;border-radius:4px;font-size:0.8em;';
        return `<tr>
          <td>${r.name||'—'}</td>
          <td>${SECTION_LABELS[r.section]}</td>
          <td><span style="${attStyle}">${attLabel}</span></td>
          <td>${r.score}/${r.total}</td>
          <td class="${cc}">${r.pct}%</td>
          <td>${r.time||'—'}</td>
          <td>${r.date}</td>
        </tr>`;
      })
    ).join('');

    const html = `<html><head><title>Delivering Justice Scores</title>
      <style>body{font-family:Arial;padding:20px;}h2{color:#1a3a6b;}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      th,td{border:1px solid #ccc;padding:8px 12px;text-align:center;}
      th{background:#1a3a6b;color:white;}
      .good{color:green;font-weight:bold;}.ok{color:orange;font-weight:bold;}.bad{color:red;font-weight:bold;}</style>
      </head><body>
      <h2>⚖️ Delivering Justice — Score Report</h2>
      <p>Printed: ${new Date().toLocaleString()}</p>
      <table><tr><th>Name</th><th>Section</th><th>Attempt</th><th>Score</th><th>%</th><th>Time</th><th>Date</th></tr>${rows}</table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  },

  /* ── END SCREEN ACTIONS ── */
  tryAgain() {
    stopConfetti();
    this.timerSeconds = 0;
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('student-login-panel').classList.remove('hidden');
    applyLocks(this.studentName);
    this.checkResume();
  },

  restart() {
    stopConfetti();
    this.stopTimerEngine();
    this.timerSeconds   = 0;
    this.studentName    = '';
    loggedInName        = '';
    unlockedSections    = new Set();
    document.getElementById('name-select').value = '';
    document.getElementById('student-pin').value = '';
    document.getElementById('pin-section').classList.add('hidden');
    document.getElementById('section-select').classList.add('hidden');
    document.getElementById('resume-container').classList.add('hidden');
    document.getElementById('login-error').textContent = '';
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.remove('hidden');
    document.getElementById('student-login-panel').classList.add('hidden');
  },

  /* ── GLOBAL PIN MODAL ── */
  showPinModal(title, msg, onSuccess) {
    pinModalCallback = onSuccess;
    document.getElementById('pin-modal-title').textContent = title;
    document.getElementById('pin-modal-msg').textContent   = msg;
    document.getElementById('pin-modal-input').value       = '';
    document.getElementById('pin-modal-error').textContent = '';
    document.getElementById('pin-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('pin-modal-input').focus(), 80);
  },

  confirmPinModal() {
    const pin = document.getElementById('pin-modal-input').value.trim();
    if (pin === '9377') {
      document.getElementById('pin-modal').classList.add('hidden');
      const cb = pinModalCallback;
      pinModalCallback = null;
      if (cb) cb();
    } else {
      document.getElementById('pin-modal-error').textContent = '❌ Incorrect PIN. Try again.';
      document.getElementById('pin-modal-input').value = '';
      document.getElementById('pin-modal-input').focus();
    }
  },

  cancelPinModal() {
    document.getElementById('pin-modal').classList.add('hidden');
    pinModalCallback = null;
  }
};

/* ── VISIBILITY / UNLOAD (timer freeze) ─────────────── */
document.addEventListener('visibilitychange', () => {
  if (!app.timerOn) return;
  if (document.hidden) {
    tabSwitchCount++;
    app.stopTimerEngine();
    app.saveProgress();
    // Freeze instruction/read timers too
    if (app.instructInterval) { clearInterval(app.instructInterval); }
    if (app.readInterval)     { clearInterval(app.readInterval); }
  } else {
    app.timerInterval = setInterval(() => {
      app.timerSeconds++;
      app._tickTimer();
      if (app.timerSeconds % 30 === 0) app.saveProgress();
    }, 1000);
    app.timerOn = true;
  }
});

window.addEventListener('beforeunload', () => {
  if (app.timerOn) app.saveProgress();
});

/* ── CONFETTI ────────────────────────────────────────── */
const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas.getContext('2d');
let particles = [], animId = null;

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

function startConfetti() {
  particles = [];
  const cols = ['#1a3a6b','#c9a227','#2ecc71','#3498db','#e74c3c','#9b59b6'];
  for (let i = 0; i < 160; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      c: cols[~~(Math.random() * cols.length)],
      s: Math.random() * 5 + 3,
      d: Math.random() * 5 + 2,
      r: Math.random() * Math.PI * 2
    });
  }
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r += 0.05);
    ctx.fillStyle = p.c; ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
    ctx.restore();
    p.y += p.d; p.x += Math.sin(p.r) * 1.5;
    if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
  });
  animId = requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
  if (animId) cancelAnimationFrame(animId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  animId = null;
}

/* ── BOOT ────────────────────────────────────────────── */
app.init();
