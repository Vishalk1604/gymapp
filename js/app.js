import * as store from './store.js';
import { DAYS, INCREMENTS } from './store.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const sheet = document.getElementById('sheet');
const importInput = document.getElementById('import-file');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- helpers ---------- */

const todayIndex = () => (new Date().getDay() + 6) % 7; // JS weeks start on Sunday, ours on Monday
const fmt = (n) => String(Math.round(n * 100) / 100);
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

/* ---------- routing: #/ is the week, #/day/0..6 is a day ---------- */

function parseRoute() {
  const match = location.hash.match(/^#\/day\/([0-6])$/);
  return match ? { view: 'day', day: Number(match[1]) } : { view: 'week' };
}

const currentDay = () => parseRoute().day;

function openDay(index) {
  history.pushState({ fromWeek: true }, '', `#/day/${index}`);
  render();
}

// Switching days replaces the history entry, so the back button still goes to the week.
function switchDay(index, enter = index > currentDay() ? 'next' : 'prev') {
  if (index === currentDay()) return;
  history.replaceState(history.state, '', `#/day/${index}`);
  render({ enter });
}

function goToWeek() {
  if (history.state?.fromWeek) history.back();
  else {
    history.replaceState(null, '', '#/');
    render();
  }
}

/* ---------- rendering ---------- */

let lastViewKey = '';

function render({ focus, reveal, enter } = {}) {
  const route = parseRoute();
  app.innerHTML = route.view === 'day' ? dayView(route.day) : weekView();
  document.title = route.view === 'day' ? `${DAYS[route.day]} · GymApp` : 'GymApp';

  const viewKey = route.view === 'day' ? `day-${route.day}` : 'week';
  if (viewKey !== lastViewKey) {
    window.scrollTo(0, 0);
    lastViewKey = viewKey;
  }
  if (enter && !reduceMotion.matches) app.querySelector('.day')?.classList.add(`enter-${enter}`);
  if (focus) app.querySelector(focus)?.focus();
  if (reveal) {
    app.querySelector(reveal)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
}

function weekView() {
  const today = todayIndex();
  let trainingDays = 0;
  let exercises = 0;
  DAYS.forEach((_, i) => {
    const stats = store.dayStats(i);
    if (stats.exercises) trainingDays++;
    exercises += stats.exercises;
  });
  const summary = exercises
    ? `${plural(trainingDays, 'training day')} · ${plural(exercises, 'exercise')}`
    : 'Tap a day to start planning your split';

  return `
    <header class="hero">
      <div class="hero__bar">
        <span class="brand">${icon('dumbbell')} GymApp</span>
        <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('settings')}</button>
      </div>
      <h1 class="hero__title">Weekly plan</h1>
      <p class="hero__sub">${summary}</p>
    </header>
    <main class="week">${DAYS.map((name, i) => dayCard(name, i, i === today)).join('')}</main>`;
}

function dayCard(name, index, isToday) {
  const day = store.getDay(index);
  const { exercises } = store.dayStats(index);
  const hasTitle = day.title.trim() !== '';
  const title = hasTitle ? esc(day.title) : exercises ? 'Untitled workout' : 'Rest day';
  const chips = day.categories
    .filter((c) => c.name.trim())
    .map((c) => `<span class="chip">${esc(c.name)}</span>`)
    .join('');

  return `
    <button class="day-card${isToday ? ' is-today' : ''}" data-action="open-day" data-day="${index}">
      <span class="day-card__label">
        ${name}${isToday ? '<span class="badge">Today</span>' : ''}
        ${exercises ? `<span class="day-card__count">${plural(exercises, 'exercise')}</span>` : ''}
      </span>
      <span class="day-card__title${hasTitle ? '' : ' is-empty'}">${title}</span>
      ${chips ? `<span class="chips">${chips}</span>` : ''}
      <span class="day-card__arrow">${icon('chevronRight')}</span>
    </button>`;
}

function dayView(index) {
  const day = store.getDay(index);
  const today = todayIndex();
  const stats = store.dayStats(index);

  const pills = DAYS.map((name, i) => {
    const d = store.getDay(i);
    const classes = ['pill', i === index && 'is-active', i === today && 'is-today',
      (d.title.trim() || d.categories.length) && 'has-plan'].filter(Boolean).join(' ');
    return `<button class="${classes}" data-action="switch-day" data-day="${i}"
      aria-label="${name}${i === today ? ' (today)' : ''}"${i === index ? ' aria-current="page"' : ''}>${name.slice(0, 3)}</button>`;
  }).join('');

  const summary = stats.categories
    ? `${plural(stats.categories, 'category', 'categories')} · ${plural(stats.exercises, 'exercise')} · ${plural(stats.sets, 'set')}`
    : '';

  const body = day.categories.length
    ? day.categories.map(categoryCard).join('')
    : `<div class="empty">
        <div class="empty__icon">${icon('dumbbell')}</div>
        <p class="empty__title">Nothing planned yet</p>
        <p class="empty__text">Name this workout, then add a category like “Back” or “Biceps”.</p>
      </div>`;

  return `
    <header class="dayhead">
      <div class="topbar">
        <button class="icon-btn" data-action="back" aria-label="Back to week">${icon('back')}</button>
        <div class="topbar__title">${DAYS[index]}${index === today ? '<span class="badge">Today</span>' : ''}</div>
        <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('settings')}</button>
      </div>
      <nav class="pills" aria-label="Days of the week">${pills}</nav>
    </header>
    <main class="day">
      <input class="inline-input day-title" data-field="day-title" value="${esc(day.title)}"
        placeholder="Name this workout" maxlength="60" autocomplete="off" enterkeyhint="done"
        aria-label="Workout title for ${DAYS[index]}">
      ${summary ? `<p class="day-stats">${summary}</p>` : ''}
      ${body}
      <button class="add-btn add-btn--category" data-action="add-category">${icon('plus')} Add category</button>
    </main>`;
}

function categoryCard(category) {
  return `
    <section class="category${category.collapsed ? ' is-collapsed' : ''}" data-id="${category.id}">
      <div class="category__head">
        <button class="icon-btn collapse-btn" data-action="toggle-category"
          aria-expanded="${!category.collapsed}" aria-label="Show or hide exercises">${icon('chevronDown')}</button>
        <input class="inline-input category__name" data-field="category-name" value="${esc(category.name)}"
          placeholder="Category, e.g. Biceps" maxlength="40" autocomplete="off" enterkeyhint="done"
          aria-label="Category name">
        <span class="count" title="Exercises">${category.exercises.length}</span>
        <button class="icon-btn icon-btn--danger" data-action="remove" aria-label="Delete category">${icon('trash')}</button>
      </div>
      <div class="category__body">
        ${category.exercises.map(exerciseCard).join('')}
        <button class="add-btn" data-action="add-exercise">${icon('plus')} Add exercise</button>
      </div>
    </section>`;
}

function exerciseCard(exercise) {
  const steps = INCREMENTS.map((inc) => `
    <button type="button" data-action="increment" data-value="${inc}" aria-pressed="${exercise.increment === inc}"
      aria-label="Weight buttons change by ${fmt(inc)} kg">${fmt(inc)}<small>kg</small></button>`).join('');

  return `
    <article class="exercise" data-id="${exercise.id}">
      <div class="exercise__head">
        <input class="inline-input exercise__name" data-field="exercise-name" value="${esc(exercise.name)}"
          placeholder="Exercise name" maxlength="50" autocomplete="off" enterkeyhint="done" aria-label="Exercise name">
        <div class="segmented" role="group" aria-label="Weight step">${steps}</div>
        <button class="icon-btn icon-btn--danger" data-action="remove" aria-label="Delete exercise">${icon('trash')}</button>
      </div>
      ${exercise.sets.length ? '<div class="sets-head" aria-hidden="true"><span>#</span><span>Weight kg</span><span>Reps</span><span></span></div>' : ''}
      <ol class="sets">${exercise.sets.map((set, n) => setRow(set, n, exercise.increment)).join('')}</ol>
      <button class="add-btn add-btn--set" data-action="add-set">${icon('plus')} Add set</button>
    </article>`;
}

function setRow(set, n, increment) {
  const label = `Set ${n + 1}`;
  return `
    <li class="set" data-id="${set.id}">
      <span class="set__num">${n + 1}</span>
      ${stepper('weight', fmt(set.weight), `${label} weight in kg`, `by ${fmt(increment)} kg`)}
      ${stepper('reps', set.reps, `${label} reps`, 'by 1')}
      <button class="icon-btn icon-btn--set icon-btn--danger" data-action="remove" aria-label="Remove ${label}">${icon('close')}</button>
    </li>`;
}

function stepper(kind, value, label, stepText) {
  return `
    <div class="stepper" data-kind="${kind}">
      <button class="stepper__btn" type="button" data-step="-1" aria-label="${label}: decrease ${stepText}">${icon('minus')}</button>
      <input class="stepper__val" data-field="${kind}" value="${value}" aria-label="${label}"
        inputmode="${kind === 'weight' ? 'decimal' : 'numeric'}" autocomplete="off" enterkeyhint="done">
      <button class="stepper__btn" type="button" data-step="1" aria-label="${label}: increase ${stepText}">${icon('plus')}</button>
    </div>`;
}

/* ---------- steppers: tap to step once, hold to repeat ---------- */

let hold = null;
let suppressClick = false;

function step(button) {
  const stepper = button.closest('.stepper');
  const input = stepper.querySelector('.stepper__val');
  const id = button.closest('[data-id]').dataset.id;
  const direction = Number(button.dataset.step);
  input.value = stepper.dataset.kind === 'weight'
    ? fmt(store.stepWeight(id, direction))
    : store.stepReps(id, direction);
}

function startHold(button) {
  let count = 0;
  const tick = () => {
    step(button);
    count++;
    hold.timer = setTimeout(tick, count > 8 ? 55 : 110); // speeds up after a moment
  };
  hold = { timer: setTimeout(() => { suppressClick = true; tick(); }, 420) };
}

function stopHold() {
  if (!hold) return;
  clearTimeout(hold.timer);
  hold = null;
}

app.addEventListener('pointerdown', (e) => {
  const button = e.target.closest('.stepper__btn');
  if (!button) return;
  suppressClick = false;
  stopHold();
  startHold(button);
});
window.addEventListener('pointerup', stopHold);
window.addEventListener('pointercancel', stopHold); // fires when the touch turns into a scroll
app.addEventListener('pointerout', (e) => {
  const button = e.target.closest('.stepper__btn');
  if (button && !button.contains(e.relatedTarget)) stopHold();
});
app.addEventListener('contextmenu', (e) => { if (e.target.closest('.stepper__btn')) e.preventDefault(); });

/* ---------- events ---------- */

app.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  if (button.classList.contains('stepper__btn')) {
    if (suppressClick) suppressClick = false; // this click ends a hold that already stepped
    else step(button);
    return;
  }

  const id = button.closest('[data-id]')?.dataset.id;
  switch (button.dataset.action) {
    case 'open-day':
      openDay(Number(button.dataset.day));
      break;
    case 'switch-day':
      switchDay(Number(button.dataset.day));
      break;
    case 'back':
      goToWeek();
      break;
    case 'settings':
      openSheet();
      break;
    case 'add-category': {
      const category = store.addCategory(currentDay());
      render({ focus: `[data-id="${category.id}"] .category__name` });
      break;
    }
    case 'toggle-category':
      store.toggleCollapsed(id);
      render();
      break;
    case 'add-exercise': {
      const exercise = store.addExercise(id);
      render({ focus: `[data-id="${exercise.id}"] .exercise__name` });
      break;
    }
    case 'increment':
      store.updateExercise(id, { increment: Number(button.dataset.value) });
      render();
      break;
    case 'add-set': {
      const set = store.addSet(id);
      render({ reveal: `[data-id="${set.id}"]` });
      break;
    }
    case 'remove': {
      const label = store.remove(id);
      render();
      if (label) toast(`${label} deleted`, undoLast);
      break;
    }
  }
});

// Text is saved as you type and the page isn't re-rendered, so the keyboard stays open.
app.addEventListener('input', (e) => {
  const el = e.target;
  const id = el.closest('[data-id]')?.dataset.id;
  switch (el.dataset.field) {
    case 'day-title': store.setDayTitle(currentDay(), el.value); break;
    case 'category-name': store.updateCategory(id, { name: el.value }); break;
    case 'exercise-name': store.updateExercise(id, { name: el.value }); break;
    case 'weight': store.setWeight(id, el.value); break;
    case 'reps': store.setReps(id, el.value); break;
  }
});

// When a typed number is committed, show the cleaned-up value (or the old one if it was invalid).
app.addEventListener('change', (e) => {
  const el = e.target;
  const id = el.closest('[data-id]')?.dataset.id;
  if (el.dataset.field === 'weight') el.value = fmt(store.setWeight(id, el.value));
  if (el.dataset.field === 'reps') el.value = store.setReps(id, el.value);
});

app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('input')) e.target.blur();
});

app.addEventListener('focusin', (e) => {
  const el = e.target;
  if (el.matches('.stepper__val')) requestAnimationFrame(() => el.setSelectionRange(0, el.value.length));
});

window.addEventListener('popstate', () => render());

/* ---------- swipe left/right to change day ---------- */

let touchStart = null;

app.addEventListener('touchstart', (e) => {
  touchStart = null;
  if (parseRoute().view !== 'day' || e.touches.length !== 1) return;
  if (e.target.closest('input, .stepper, .segmented, .pills')) return;
  const t = e.touches[0];
  if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return; // leave screen edges to the OS
  touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
}, { passive: true });

app.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const quick = Date.now() - touchStart.time < 600;
  touchStart = null;
  if (!quick || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
  const day = currentDay();
  if (dx < 0) switchDay((day + 1) % 7, 'next');
  else switchDay((day + 6) % 7, 'prev');
}, { passive: true });

/* ---------- toast ---------- */

let toastTimer;

function toast(message, onUndo) {
  toastEl.innerHTML = `<span>${esc(message)}</span>${onUndo ? '<button class="toast__btn" type="button">Undo</button>' : ''}`;
  if (onUndo) {
    toastEl.querySelector('button').addEventListener('click', () => {
      hideToast();
      onUndo();
    });
  }
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, onUndo ? 6000 : 2500);
}

function hideToast() {
  toastEl.classList.remove('is-visible');
}

function undoLast() {
  if (!store.undo()) return;
  render();
  toast('Restored');
}

/* ---------- settings sheet ---------- */

const resetButton = sheet.querySelector('[data-action="reset"]');
let resetTimer;

function openSheet() {
  sheet.hidden = false;
  void sheet.offsetWidth; // start the slide-up transition from the hidden state
  sheet.classList.add('is-open');
  document.body.classList.add('no-scroll');
  sheet.querySelector('.sheet__close').focus({ preventScroll: true });
}

function closeSheet() {
  sheet.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
  disarmReset();
  setTimeout(() => {
    if (!sheet.classList.contains('is-open')) sheet.hidden = true;
  }, reduceMotion.matches ? 0 : 300);
}

function disarmReset() {
  clearTimeout(resetTimer);
  resetButton.classList.remove('is-armed');
  resetButton.querySelector('.sheet__label').textContent = 'Reset all data';
}

// First tap arms the button, a second tap within 4 seconds erases everything (still undoable).
function resetData() {
  if (!resetButton.classList.contains('is-armed')) {
    resetButton.classList.add('is-armed');
    resetButton.querySelector('.sheet__label').textContent = 'Tap again to erase everything';
    resetTimer = setTimeout(disarmReset, 4000);
    return;
  }
  store.resetAll();
  closeSheet();
  render();
  toast('All data cleared', undoLast);
}

async function exportBackup() {
  const name = `gymapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([store.exportData()], name, { type: 'application/json' });

  // iPhones save files through the share sheet ("Save to Files"); elsewhere a normal download works.
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'GymApp backup' });
    } catch (err) {
      if (err.name !== 'AbortError') toast('Could not share the backup');
    }
    return;
  }

  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup downloaded');
}

sheet.addEventListener('click', (e) => {
  switch (e.target.closest('[data-action]')?.dataset.action) {
    case 'close-sheet': closeSheet(); break;
    case 'export': exportBackup(); break;
    case 'import': importInput.click(); break;
    case 'reset': resetData(); break;
  }
});

importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  importInput.value = '';
  if (!file) return;
  try {
    store.importData(await file.text());
    closeSheet();
    render();
    toast('Backup imported', undoLast);
  } catch (err) {
    toast(err.message);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden) closeSheet();
});

/* ---------- start ---------- */

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('GymApp: offline mode unavailable', err));
}

// Ask the browser not to clear our data when the phone is low on storage.
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((granted) => granted || navigator.storage.persist()).catch(() => {});
}
