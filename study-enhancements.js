(() => {
  const AUTH_KEY = 'dailyEnglishOS.auth.v1';
  const TEST_KEY = 'dailyEnglishOS.tests.v1';
  const RESTART_KEY = 'dailyEnglishOS.restartDay.v1';
  const PROGRESS_KEY = 'dailyEnglishOS.progress.v1';
  const EXPECTED_USER = 'Trần Ngọc Lương';
  const EXPECTED_PASSWORD_SHA256 = '7e5136c128568fdcc8b0c143f6328daaf048132d607a2bc8df9a88a8beaeb393';
  let lessonIndex = null;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  document.addEventListener('DOMContentLoaded', async () => {
    initAuth();
    bindDataControls();
    await loadIndex();
    waitForBaseApp();
  });

  function initAuth() {
    const overlay = q('#loginGate');
    const form = q('#loginForm');
    const user = q('#loginUser');
    const pass = q('#loginPassword');
    const error = q('#loginError');
    const authenticated = localStorage.getItem(AUTH_KEY) === 'ok';
    document.body.classList.toggle('authenticated', authenticated);
    overlay?.classList.toggle('hidden', authenticated);
    if (q('#profileName')) q('#profileName').textContent = EXPECTED_USER;

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const hash = await sha256(pass.value);
      const ok = user.value.trim() === EXPECTED_USER && hash === EXPECTED_PASSWORD_SHA256;
      if (!ok) {
        error.textContent = 'Tên đăng nhập hoặc mật khẩu chưa đúng.';
        error.classList.remove('hidden');
        pass.select();
        return;
      }
      localStorage.setItem(AUTH_KEY, 'ok');
      document.body.classList.add('authenticated');
      overlay.classList.add('hidden');
      error.classList.add('hidden');
      pass.value = '';
    });

    q('#logoutBtn')?.addEventListener('click', () => {
      localStorage.removeItem(AUTH_KEY);
      location.reload();
    });
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function loadIndex() {
    try {
      const res = await fetch('assets/daily-vocab.json', { cache: 'no-store' });
      lessonIndex = await res.json();
      renderJournalSummary();
    } catch (e) {
      console.error('Could not load daily index', e);
    }
  }

  function waitForBaseApp() {
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const day = Number(q('#dayNumber')?.textContent || 0);
      if (day > 0 && typeof window.openPublishedLesson === 'function') {
        clearInterval(timer);
        const restartDay = Number(localStorage.getItem(RESTART_KEY) || 0);
        if (restartDay && restartDay !== day) await window.openPublishedLesson(restartDay);
        renderLearningMode();
        await renderTestForVisibleDay();
        observeDayChanges();
        hookCompleteButton();
      } else if (tries > 50) clearInterval(timer);
    }, 120);
  }

  function observeDayChanges() {
    const node = q('#dayNumber');
    if (!node) return;
    new MutationObserver(() => {
      renderLearningMode();
      renderTestForVisibleDay();
    }).observe(node, { childList: true, characterData: true, subtree: true });
  }

  function hookCompleteButton() {
    q('#completeToday')?.addEventListener('click', () => {
      const restartDay = Number(localStorage.getItem(RESTART_KEY) || 0);
      if (!restartDay || !lessonIndex) return;
      const maxPublished = Math.max(...lessonIndex.lessons.map(x => x.day));
      if (restartDay < maxPublished) {
        localStorage.setItem(RESTART_KEY, String(restartDay + 1));
        setTimeout(() => toast(`Restart journey: Day ${restartDay + 1} will open next time.`), 180);
      }
    });
  }

  function renderLearningMode() {
    const restartDay = Number(localStorage.getItem(RESTART_KEY) || 0);
    const badge = q('#learningModeBadge');
    const live = q('#goLiveBtn');
    if (!badge) return;
    badge.textContent = restartDay ? `RESTART MODE · DAY ${restartDay}` : 'LIVE ROADMAP';
    badge.classList.toggle('restart', Boolean(restartDay));
    live?.classList.toggle('hidden', !restartDay);
  }

  async function renderTestForVisibleDay() {
    if (!lessonIndex) return;
    const day = Number(q('#dayNumber')?.textContent || 0);
    const meta = lessonIndex.lessons.find(x => x.day === day);
    const root = q('#dailyTestRoot');
    if (!meta || !root) return;
    const testPath = meta.testPath || `assets/tests/${meta.date}.json`;
    try {
      const res = await fetch(testPath, { cache: 'no-store' });
      if (!res.ok) throw new Error('No test');
      const test = await res.json();
      renderTest(test);
    } catch {
      root.innerHTML = `<div class="empty-test"><b>Diagnostic chưa được publish cho ngày này.</b><span>Từ Day 1 trở đi, mỗi ngày mới sẽ có test/rubric đi cùng lesson.</span></div>`;
    }
  }

  function renderTest(test) {
    const root = q('#dailyTestRoot');
    const store = getTests();
    const attempts = store[test.date]?.attempts || [];
    const best = attempts.length ? Math.max(...attempts.map(a => a.percent)) : null;
    root.innerHTML = `
      <div class="test-headline"><div><span class="eyebrow gold">DAILY DIAGNOSTIC · DAY ${test.day}</span><h3>${esc(test.title)}</h3><p>${esc(test.purpose || '')}</p></div><div class="score-orb"><small>BEST</small><b>${best == null ? '—' : best + '%'}</b></div></div>
      <form id="diagnosticForm" class="diagnostic-form">
        ${(test.questions || []).map((item, qi) => `<fieldset class="question-card"><legend><span>${String(qi + 1).padStart(2,'0')}</span>${esc(item.prompt)}</legend><small class="skill-tag">${esc(item.skill || 'English')}</small><div class="option-list">${item.options.map((opt, oi) => `<label><input type="radio" name="${esc(item.id)}" value="${oi}"><span>${esc(opt)}</span></label>`).join('')}</div><div class="answer-explanation hidden" data-explain="${esc(item.id)}"></div></fieldset>`).join('')}
        ${test.spokenChallenge ? `<section class="spoken-rubric"><span class="eyebrow violet">SPOKEN OUTPUT</span><h4>Prove it with your voice.</h4><p>${esc(test.spokenChallenge.prompt)}</p><div class="rubric-grid">${test.spokenChallenge.rubric.map(r => `<label>${esc(r.criterion)}<select name="spoken-${esc(r.criterion)}"><option value="0">0 · chưa làm được</option><option value="1">1 · có nhưng chưa ổn</option><option value="2">2 · làm được tự nhiên</option></select></label>`).join('')}</div></section>` : ''}
        <div class="test-actions"><button class="btn primary" type="submit">Grade this attempt <span>→</span></button><span>Pass target: ${test.passPercent || 80}% · Điểm dùng để tìm lỗ hổng, không phải để gây áp lực.</span></div>
      </form>
      <div id="testResultNow"></div>
      <div class="attempt-history" id="attemptHistory"></div>`;
    q('#diagnosticForm')?.addEventListener('submit', e => gradeTest(e, test));
    renderAttempts(test.date);
  }

  function gradeTest(event, test) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    let correct = 0;
    const answers = {};
    (test.questions || []).forEach(item => {
      const chosenRaw = data.get(item.id);
      const chosen = chosenRaw == null ? null : Number(chosenRaw);
      answers[item.id] = chosen;
      const isCorrect = chosen === item.answer;
      if (isCorrect) correct++;
      const explain = q(`[data-explain="${cssEsc(item.id)}"]`);
      if (explain) {
        explain.classList.remove('hidden');
        explain.classList.toggle('correct', isCorrect);
        explain.innerHTML = `<b>${isCorrect ? '✓ Correct' : '↻ Review'}</b><span>${esc(item.explanation || '')}</span>`;
      }
    });
    const total = (test.questions || []).length;
    const percent = total ? Math.round(correct / total * 100) : 0;
    let spokenScore = 0;
    if (test.spokenChallenge) test.spokenChallenge.rubric.forEach(r => { spokenScore += Number(data.get(`spoken-${r.criterion}`) || 0); });
    const result = { completedAt: new Date().toISOString(), correct, total, percent, spokenScore, spokenMax: test.spokenChallenge?.maxScore || 0, answers };
    const store = getTests();
    if (!store[test.date]) store[test.date] = { day: test.day, attempts: [] };
    store[test.date].attempts.push(result);
    localStorage.setItem(TEST_KEY, JSON.stringify(store));
    q('#testResultNow').innerHTML = `<div class="result-banner ${percent >= (test.passPercent || 80) ? 'pass' : 'review'}"><div><small>${percent >= (test.passPercent || 80) ? 'READY TO MOVE ON' : 'REVIEW ONCE MORE'}</small><b>${percent}%</b></div><p>${correct}/${total} knowledge checks · spoken self-score ${spokenScore}/${result.spokenMax}. ${percent >= (test.passPercent || 80) ? 'Good retrieval. Now use it in real speech.' : 'Revisit the weak cards, then retry without memorizing answer positions.'}</p></div>`;
    renderAttempts(test.date);
    renderJournalSummary();
    toast(`Diagnostic saved · ${percent}%`);
  }

  function renderAttempts(date) {
    const root = q('#attemptHistory'); if (!root) return;
    const attempts = getTests()[date]?.attempts || [];
    root.innerHTML = attempts.length ? `<h4>Attempt history</h4>${[...attempts].reverse().map((a, i) => `<div><span>${new Date(a.completedAt).toLocaleString('vi-VN')}</span><b>${a.percent}%</b><small>${a.correct}/${a.total} · speaking ${a.spokenScore}/${a.spokenMax}</small></div>`).join('')}` : `<p class="muted">Chưa có attempt nào. Học xong rồi test khi không nhìn lại bài.</p>`;
  }

  function renderJournalSummary() {
    const root = q('#journalMetrics'); if (!root || !lessonIndex) return;
    const tests = getTests();
    const attempts = Object.values(tests).flatMap(d => d.attempts || []);
    const avg = attempts.length ? Math.round(attempts.reduce((s,a) => s + a.percent, 0) / attempts.length) : 0;
    const progress = parse(PROGRESS_KEY, {});
    root.innerHTML = `<article><small>Published days</small><b>${lessonIndex.lessons.length}<span>/90</span></b></article><article><small>Tests taken</small><b>${attempts.length}</b></article><article><small>Average score</small><b>${attempts.length ? avg + '%' : '—'}</b></article><article><small>Words mastered</small><b>${Object.keys(progress.masteredWords || {}).length}</b></article>`;
  }

  function bindDataControls() {
    q('#resetLearningBtn')?.addEventListener('click', () => q('#resetModal')?.classList.remove('hidden'));
    q('#cancelReset')?.addEventListener('click', () => q('#resetModal')?.classList.add('hidden'));
    q('#confirmReset')?.addEventListener('click', () => {
      if ((q('#resetConfirmText')?.value || '').trim().toUpperCase() !== 'RESET') { toast('Type RESET to confirm.'); return; }
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(TEST_KEY);
      localStorage.setItem(RESTART_KEY, '1');
      location.reload();
    });
    q('#goLiveBtn')?.addEventListener('click', () => { localStorage.removeItem(RESTART_KEY); location.reload(); });
    q('#exportAllBtn')?.addEventListener('click', exportAll);
    q('#importDataInput')?.addEventListener('change', importAll);
  }

  function exportAll() {
    const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), user: EXPECTED_USER, progress: parse(PROGRESS_KEY, {}), tests: getTests(), restartDay: Number(localStorage.getItem(RESTART_KEY) || 0) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `daily-english-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function importAll(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
      if (data.tests) localStorage.setItem(TEST_KEY, JSON.stringify(data.tests));
      if (data.restartDay) localStorage.setItem(RESTART_KEY, String(data.restartDay)); else localStorage.removeItem(RESTART_KEY);
      toast('Learning backup imported. Reloading…'); setTimeout(() => location.reload(), 500);
    } catch { toast('Invalid backup JSON.'); }
  }

  function getTests() { return parse(TEST_KEY, {}); }
  function parse(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
  function esc(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function cssEsc(v='') { return window.CSS?.escape ? CSS.escape(v) : String(v).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }
  function toast(message) { if (typeof window.showToast === 'function') window.showToast(message); else console.log(message); }
})();