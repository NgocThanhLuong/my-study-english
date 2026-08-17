const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEY = 'dailyEnglishOS.progress.v1';
const THEME_KEY = 'dailyEnglishOS.theme';

const defaultProgress = {
  masteredWords: {},
  completedLessons: {},
  speakingReps: 0,
  sessionDates: [],
  lastVisit: null,
};

const state = {
  curriculum: null,
  vocabData: null,
  lesson: null,
  activeSection: 0,
  vocabFilter: 'all',
  shadowIndex: 0,
  progress: loadProgress(),
};

function loadProgress() {
  try {
    return { ...defaultProgress, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...defaultProgress };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  renderStats();
}

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(dateLike, options = { day: '2-digit', month: 'short' }) {
  const date = new Date(`${dateLike}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function loadData() {
  try {
    const [curriculumRes, vocabRes] = await Promise.all([
      fetch('assets/curriculum.json', { cache: 'no-store' }),
      fetch('assets/daily-vocab.json', { cache: 'no-store' }),
    ]);
    if (!curriculumRes.ok || !vocabRes.ok) throw new Error('Content files unavailable');
    state.curriculum = await curriculumRes.json();
    state.vocabData = await vocabRes.json();
    state.lesson = resolveLesson(state.vocabData.lessons || []);
    boot();
  } catch (error) {
    console.error(error);
    $('#lessonPanel').innerHTML = `
      <span class="lesson-kicker">CONTENT ERROR</span>
      <h3>Lesson data could not be loaded.</h3>
      <p class="lesson-intro">Please refresh the page. If you opened index.html directly, serve the folder through a local web server or GitHub Pages so JSON files can load.</p>`;
  }
}

function resolveLesson(lessons) {
  const today = todayISO();
  const available = lessons
    .filter(item => item.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return available.at(-1) || lessons[0];
}

function boot() {
  if (!state.lesson || !state.curriculum) return;
  markVisit();
  setTheme(localStorage.getItem(THEME_KEY) || 'dark');
  renderHero();
  renderLessonRail();
  renderLessonPanel();
  renderVocabulary();
  renderShadowing();
  renderLanguageLab();
  renderPhases();
  renderRoadmap();
  renderHistory();
  renderCalendar();
  renderStats();
  bindEvents();
}

function markVisit() {
  const today = todayISO();
  state.progress.lastVisit = today;
  if (!state.progress.sessionDates.includes(today)) state.progress.sessionDates.push(today);
  saveProgress();
}

function renderHero() {
  const lesson = state.lesson;
  $('#lessonTitle').textContent = lesson.title;
  $('#lessonSubtitle').textContent = lesson.subtitle;
  $('#dayNumber').textContent = String(lesson.day).padStart(2, '0');
  $('#lessonDate').textContent = formatDate(lesson.date, { day: '2-digit', month: 'short', year: 'numeric' });
  $('#journeyPercent').textContent = `${Math.min(100, Math.max(1, Math.round((lesson.day / 90) * 100)))}%`;
  $('#journeyBar').style.width = `${Math.min(100, Math.max(1, (lesson.day / 90) * 100))}%`;
  $('#journeyCaption').textContent = `Day ${lesson.day} of 90 · ${lesson.phase}`;
  $('#footerDate').textContent = `Day ${lesson.day} · ${lesson.date}`;
}

function renderLessonRail() {
  $('#lessonRail').innerHTML = state.lesson.sections.map((section, index) => `
    <button class="rail-btn ${index === state.activeSection ? 'active' : ''}" data-section="${index}" type="button">
      <span class="rail-num">${String(index + 1).padStart(2, '0')}</span>
      <span class="rail-label">${escapeHtml(section.label)}</span>
      <span class="rail-min">${escapeHtml(section.minutes || '')}</span>
    </button>
  `).join('');

  $$('.rail-btn').forEach(button => button.addEventListener('click', () => {
    state.activeSection = Number(button.dataset.section);
    renderLessonRail();
    renderLessonPanel();
  }));
}

function renderLessonPanel() {
  const section = state.lesson.sections[state.activeSection];
  const blocks = (section.blocks || []).map(renderBlock).join('');
  $('#lessonPanel').innerHTML = `
    <span class="lesson-kicker">${escapeHtml(section.kicker || section.label)}</span>
    <h3>${escapeHtml(section.title)}</h3>
    <p class="lesson-intro">${escapeHtml(section.intro || '')}</p>
    ${blocks}
  `;
}

function renderBlock(block) {
  switch (block.type) {
    case 'concept':
      return `<div class="concept-card"><h4>${escapeHtml(block.title)}</h4><p>${rich(block.body)}</p></div>`;
    case 'compare':
      return `<div class="compare-box">
        <div class="compare-side"><small>${escapeHtml(block.leftLabel || 'Vietnamese instinct')}</small><b>${escapeHtml(block.left)}</b></div>
        <div class="compare-arrow">→</div>
        <div class="compare-side"><small>${escapeHtml(block.rightLabel || 'English instinct')}</small><b>${escapeHtml(block.right)}</b></div>
      </div>`;
    case 'list':
      return `<ul class="lesson-list">${(block.items || []).map(item => `<li>${rich(item)}</li>`).join('')}</ul>`;
    case 'examples':
      return `<div class="example-stack">${(block.items || []).map(item => `<div class="example-line"><b>${escapeHtml(item.en)}</b><span>${escapeHtml(item.vi || '')}</span></div>`).join('')}</div>`;
    case 'action':
      return `<div class="action-box"><b>${escapeHtml(block.title)}</b><p>${rich(block.body)}</p></div>`;
    default:
      return '';
  }
}

function renderVocabulary() {
  const grid = $('#vocabGrid');
  let words = state.lesson.vocabulary || [];
  if (state.vocabFilter === 'new') words = words.filter(word => !state.progress.masteredWords[word.word]);
  if (state.vocabFilter === 'mastered') words = words.filter(word => state.progress.masteredWords[word.word]);

  if (!words.length) {
    grid.innerHTML = `<div class="concept-card"><h4>No words in this filter.</h4><p>Keep going — mastery is built one useful chunk at a time.</p></div>`;
    return;
  }

  grid.innerHTML = words.map(word => {
    const mastered = Boolean(state.progress.masteredWords[word.word]);
    return `<article class="vocab-card">
      <div class="vocab-top">
        <div><div class="word">${escapeHtml(word.word)}</div><div class="ipa">${escapeHtml(word.ipa)} · ${escapeHtml(word.pos)}</div></div>
        <button class="audio-mini" type="button" data-speak="${encodeURIComponent(word.word)}" aria-label="Listen to ${escapeHtml(word.word)}">♪</button>
      </div>
      <div class="meaning">${escapeHtml(word.meaning)}</div>
      <p class="usage">${escapeHtml(word.usage)}</p>
      <span class="chunk">${escapeHtml(word.chunk)}</span>
      <div class="vocab-bottom"><span class="level-dot">${escapeHtml(word.register || 'everyday')}</span><button class="master-btn ${mastered ? 'is-mastered' : ''}" data-master="${encodeURIComponent(word.word)}" type="button" title="Mark mastered">${mastered ? '✓' : '○'}</button></div>
    </article>`;
  }).join('');

  $$('[data-speak]').forEach(button => button.addEventListener('click', () => speak(decodeURIComponent(button.dataset.speak))));
  $$('[data-master]').forEach(button => button.addEventListener('click', () => toggleMastered(decodeURIComponent(button.dataset.master))));
}

function toggleMastered(word) {
  if (state.progress.masteredWords[word]) delete state.progress.masteredWords[word];
  else state.progress.masteredWords[word] = { date: todayISO(), lessonDay: state.lesson.day };
  saveProgress();
  renderVocabulary();
  showToast(state.progress.masteredWords[word] ? `Mastered: ${word}` : `Moved ${word} back to review`);
}

function renderShadowing() {
  const items = state.lesson.shadowing || [];
  if (!items.length) return;
  state.shadowIndex = Math.min(state.shadowIndex, items.length - 1);
  const item = items[state.shadowIndex];
  $('#shadowSentence').textContent = item.text;
  $('#shadowNote').textContent = item.note || '';
  $('#shadowCounter').textContent = `${state.shadowIndex + 1} / ${items.length}`;
}

function speak(text, onEnd) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis is not supported in this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => /en-US/i.test(v.lang) && /Google|Samantha|Microsoft|Natural/i.test(v.name)) || voices.find(v => /en-US/i.test(v.lang));
  if (preferred) utterance.voice = preferred;
  const wave = $('.wave');
  utterance.onstart = () => wave?.classList.add('playing');
  utterance.onend = () => { wave?.classList.remove('playing'); onEnd?.(); };
  utterance.onerror = () => wave?.classList.remove('playing');
  window.speechSynthesis.speak(utterance);
}

function startSpeechPractice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = $('#recordShadow');
  const feedback = $('#speechFeedback');
  const target = state.lesson.shadowing[state.shadowIndex].text;

  if (!Recognition) {
    state.progress.speakingReps += 1;
    saveProgress();
    feedback.textContent = 'Speech recognition is not available here. Say the sentence aloud 3 times, then continue. Your speaking rep was counted.';
    feedback.classList.remove('hidden');
    showToast('Speaking rep counted ✓');
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  button.classList.add('recording');
  button.innerHTML = '<span>●</span> Listening…';
  feedback.classList.add('hidden');

  recognition.onresult = event => {
    const transcript = event.results[0][0].transcript;
    const score = similarity(normalizeText(target), normalizeText(transcript));
    state.progress.speakingReps += 1;
    saveProgress();
    feedback.innerHTML = `<b>You said:</b> “${escapeHtml(transcript)}”<br><b>Word match:</b> ${Math.round(score * 100)}% · Focus on rhythm and clarity, not chasing a perfect score.`;
    feedback.classList.remove('hidden');
  };
  recognition.onerror = () => {
    feedback.textContent = 'I could not capture that clearly. Try again, or simply shadow it aloud without scoring.';
    feedback.classList.remove('hidden');
  };
  recognition.onend = () => {
    button.classList.remove('recording');
    button.innerHTML = '<span>●</span> Practice';
  };
  recognition.start();
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
  const left = new Set(a.split(' '));
  const right = new Set(b.split(' '));
  const intersection = [...left].filter(word => right.has(word)).length;
  return intersection / Math.max(left.size, right.size, 1);
}

function renderLanguageLab() {
  $('#languageLabGrid').innerHTML = (state.curriculum.languageLabs || []).map(lab => `
    <article class="lab-card">
      <div class="lab-icon">${escapeHtml(lab.icon)}</div>
      <h3>${escapeHtml(lab.title)}</h3>
      <p>${escapeHtml(lab.description)}</p>
      <a href="#today" data-lab-section="${lab.sectionIndex ?? 0}">${escapeHtml(lab.cta || 'Study today')} <span>→</span></a>
    </article>`).join('');

  $$('[data-lab-section]').forEach(link => link.addEventListener('click', () => {
    state.activeSection = Math.min(Number(link.dataset.labSection), state.lesson.sections.length - 1);
    renderLessonRail();
    renderLessonPanel();
  }));
}

function renderPhases() {
  const currentDay = state.lesson.day;
  $('#phaseList').innerHTML = state.curriculum.phases.map((phase, index) => {
    const total = phase.endDay - phase.startDay + 1;
    let progress = 0;
    if (currentDay > phase.endDay) progress = 100;
    else if (currentDay >= phase.startDay) progress = Math.round(((currentDay - phase.startDay + 1) / total) * 100);
    return `<article class="phase-card">
      <div class="phase-num">PHASE ${String(index + 1).padStart(2, '0')}<br>DAY ${phase.startDay}–${phase.endDay}</div>
      <div><h3>${escapeHtml(phase.title)}</h3><p>${escapeHtml(phase.description)}</p></div>
      <div class="phase-progress"><div class="meter"><i style="width:${progress}%"></i></div><span>${progress}%</span></div>
    </article>`;
  }).join('');
}

function renderRoadmap() {
  $('#roadmapGrid').innerHTML = state.curriculum.roadmap.map(item => `
    <div class="roadmap-day ${item.day === state.lesson.day ? 'current' : ''}"><b>${String(item.day).padStart(2, '0')}</b><span>${escapeHtml(item.topic)}</span></div>`).join('');
}

function renderStats() {
  const mastered = Object.keys(state.progress.masteredWords || {}).length;
  const completed = Object.keys(state.progress.completedLessons || {}).length;
  const streak = calculateStreak(state.progress.completedLessons || {});
  $('#masteredCount').textContent = mastered;
  $('#speakingReps').textContent = state.progress.speakingReps || 0;
  $('#streakCount').textContent = streak;
  const currentPhase = state.curriculum?.phases?.find(p => state.lesson?.day >= p.startDay && state.lesson?.day <= p.endDay);
  if (currentPhase) $('#phaseLabel').textContent = currentPhase.shortTitle || currentPhase.title;
  if ($('#historyCount')) $('#historyCount').textContent = `${completed} completed`;
}

function calculateStreak(completedLessons) {
  const dates = new Set(Object.keys(completedLessons));
  let cursor = new Date(`${todayISO()}T12:00:00`);
  let streak = 0;
  if (!dates.has(todayISO())) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderHistory() {
  const history = Object.entries(state.progress.completedLessons || {}).sort(([a], [b]) => b.localeCompare(a));
  $('#historyList').innerHTML = history.length ? history.slice(0, 8).map(([date, lesson]) => `
    <div class="history-item"><div class="history-index">D${String(lesson.day || '?').padStart(2, '0')}</div><div><b>${escapeHtml(lesson.title || 'Daily session')}</b><span>${formatDate(date, { day:'2-digit', month:'short', year:'numeric' })}</span></div><span class="history-check">✓</span></div>`).join('') : `
    <div class="concept-card"><h4>Your history starts today.</h4><p>Complete today's lesson and it will appear here.</p></div>`;
  $('#historyCount').textContent = `${history.length} completed`;
}

function renderCalendar() {
  const now = new Date();
  $('#calendarMonth').textContent = new Intl.DateTimeFormat('en-US', { month:'long', year:'numeric' }).format(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < mondayOffset; i++) cells.push('<span class="calendar-day empty"></span>');
  for (let day = 1; day <= lastDay; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const active = state.progress.completedLessons?.[date] ? 'active' : '';
    const today = date === todayISO() ? 'today' : '';
    cells.push(`<span class="calendar-day ${active} ${today}">${day}</span>`);
  }
  $('#calendarGrid').innerHTML = cells.join('');
}

function completeToday() {
  const today = todayISO();
  state.progress.completedLessons[today] = { day: state.lesson.day, title: state.lesson.title };
  saveProgress();
  renderHistory();
  renderCalendar();
  showToast('Lesson complete. Identity reinforced ✓');
}

function exportProgress() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Daily English OS',
    progress: state.progress,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `daily-english-progress-${todayISO()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  $('#themeToggle').addEventListener('click', () => setTheme(document.body.classList.contains('light') ? 'dark' : 'light'));
  $('#openPlanBtn').addEventListener('click', () => { $('#roadmapDrawer').classList.add('open'); $('#path').scrollIntoView({ behavior:'smooth' }); });
  $('#closePlanBtn').addEventListener('click', () => $('#roadmapDrawer').classList.remove('open'));
  $('#completeToday').addEventListener('click', completeToday);
  $('#exportProgress').addEventListener('click', exportProgress);

  $$('#vocabFilters button').forEach(button => button.addEventListener('click', () => {
    state.vocabFilter = button.dataset.filter;
    $$('#vocabFilters button').forEach(item => item.classList.toggle('active', item === button));
    renderVocabulary();
  }));

  $('#prevShadow').addEventListener('click', () => {
    const total = state.lesson.shadowing.length;
    state.shadowIndex = (state.shadowIndex - 1 + total) % total;
    renderShadowing();
  });
  $('#nextShadow').addEventListener('click', () => {
    state.shadowIndex = (state.shadowIndex + 1) % state.lesson.shadowing.length;
    renderShadowing();
  });
  $('#speakShadow').addEventListener('click', () => speak(state.lesson.shadowing[state.shadowIndex].text));
  $('#recordShadow').addEventListener('click', startSpeechPractice);
}

function setTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  localStorage.setItem(THEME_KEY, theme);
  $('#themeToggle').textContent = theme === 'light' ? '☀' : '☾';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function rich(value = '') {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

document.addEventListener('DOMContentLoaded', loadData);
