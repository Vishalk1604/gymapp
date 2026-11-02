// Data layer: the whole weekly routine is one object, saved to localStorage after every change.

const STORAGE_KEY = 'gymapp:v1';
const MAX_WEIGHT = 1000;
const MAX_REPS = 999;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const INCREMENTS = [2.5, 5];

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const round = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Accepts "42,5" from keyboards that use a decimal comma; empty input is not a number.
function parseNumber(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  return text === '' ? NaN : Number(text);
}

function cleanWeight(value) {
  const n = parseNumber(value);
  return Number.isFinite(n) ? clamp(round(n), 0, MAX_WEIGHT) : null;
}

function cleanReps(value) {
  const n = parseNumber(value);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, MAX_REPS) : null;
}

const emptyWeek = () => ({ version: 1, days: DAYS.map(() => ({ title: '', categories: [] })) });
const newSet = (weight, reps) => ({ id: uid(), weight, reps });

let state = load();
let snapshot = null; // one level of undo for deletes, imports and resets

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (err) {
    // Park unreadable data under another key so the next save doesn't destroy it.
    if (raw) {
      try { localStorage.setItem(`${STORAGE_KEY}:unreadable-${Date.now()}`, raw); } catch { /* storage full */ }
    }
    console.warn('GymApp: saved data could not be read', err);
  }
  return emptyWeek();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('GymApp: could not save', err);
  }
}

// Validates untrusted data (localStorage or an imported file) and fills in anything missing.
function normalize(data) {
  if (!data || !Array.isArray(data.days) || data.days.length !== DAYS.length) {
    throw new Error('That file is not a GymApp backup.');
  }
  const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const list = (v) => (Array.isArray(v) ? v : []);
  const id = (v) => (typeof v === 'string' && v ? v : uid());
  return {
    version: 1,
    days: data.days.map((day) => ({
      title: text(day?.title, 60),
      categories: list(day?.categories).map((cat) => ({
        id: id(cat?.id),
        name: text(cat?.name, 40),
        collapsed: Boolean(cat?.collapsed),
        exercises: list(cat?.exercises).map((ex) => ({
          id: id(ex?.id),
          name: text(ex?.name, 50),
          increment: INCREMENTS.includes(Number(ex?.increment)) ? Number(ex.increment) : INCREMENTS[0],
          sets: list(ex?.sets).map((set) => ({
            id: id(set?.id),
            weight: cleanWeight(set?.weight) ?? 0,
            reps: cleanReps(set?.reps) ?? 0,
          })),
        })),
      })),
    })),
  };
}

// Ids are unique across the week, so any item can be found from its id alone.
function locate(id) {
  for (const day of state.days) {
    for (const category of day.categories) {
      if (category.id === id) return { day, category };
      for (const exercise of category.exercises) {
        if (exercise.id === id) return { day, category, exercise };
        const set = exercise.sets.find((s) => s.id === id);
        if (set) return { day, category, exercise, set };
      }
    }
  }
  return {};
}

export const getDay = (index) => state.days[index];

export function dayStats(index) {
  const { categories } = state.days[index];
  const exercises = categories.reduce((n, c) => n + c.exercises.length, 0);
  const sets = categories.reduce((n, c) => n + c.exercises.reduce((m, e) => m + e.sets.length, 0), 0);
  return { categories: categories.length, exercises, sets };
}

export function setDayTitle(index, title) {
  state.days[index].title = title;
  save();
}

export function addCategory(index) {
  const category = { id: uid(), name: '', collapsed: false, exercises: [] };
  state.days[index].categories.push(category);
  save();
  return category;
}

export function updateCategory(id, patch) {
  const { category } = locate(id);
  if (!category) return;
  Object.assign(category, patch);
  save();
}

export function toggleCollapsed(id) {
  const { category } = locate(id);
  if (category) updateCategory(id, { collapsed: !category.collapsed });
}

export function addExercise(categoryId) {
  const { category } = locate(categoryId);
  if (!category) return null;
  const exercise = { id: uid(), name: '', increment: INCREMENTS[0], sets: [newSet(0, 10)] };
  category.exercises.push(exercise);
  category.collapsed = false;
  save();
  return exercise;
}

export function updateExercise(id, patch) {
  const { exercise } = locate(id);
  if (!exercise) return;
  Object.assign(exercise, patch);
  save();
}

// A new set starts as a copy of the previous one, which is usually the next thing you'd type.
export function addSet(exerciseId) {
  const { exercise } = locate(exerciseId);
  if (!exercise) return null;
  const last = exercise.sets.at(-1);
  const set = newSet(last?.weight ?? 0, last?.reps ?? 10);
  exercise.sets.push(set);
  save();
  return set;
}

export function stepWeight(setId, direction) {
  const { exercise, set } = locate(setId);
  if (!set) return 0;
  set.weight = clamp(round(set.weight + direction * exercise.increment), 0, MAX_WEIGHT);
  save();
  return set.weight;
}

// Invalid input leaves the weight unchanged; the caller shows whatever is returned.
export function setWeight(setId, value) {
  const { set } = locate(setId);
  if (!set) return 0;
  const weight = cleanWeight(value);
  if (weight !== null) {
    set.weight = weight;
    save();
  }
  return set.weight;
}

export function stepReps(setId, direction) {
  const { set } = locate(setId);
  if (!set) return 0;
  set.reps = clamp(set.reps + direction, 0, MAX_REPS);
  save();
  return set.reps;
}

export function setReps(setId, value) {
  const { set } = locate(setId);
  if (!set) return 0;
  const reps = cleanReps(value);
  if (reps !== null) {
    set.reps = reps;
    save();
  }
  return set.reps;
}

// Removes a category, exercise or set and returns what kind of thing it was.
export function remove(id) {
  const { day, category, exercise, set } = locate(id);
  const target = set ? [exercise.sets, set, 'Set']
    : exercise ? [category.exercises, exercise, 'Exercise']
    : category ? [day.categories, category, 'Category']
    : null;
  if (!target) return null;
  const [list, item, label] = target;
  snapshot = JSON.stringify(state);
  list.splice(list.indexOf(item), 1);
  save();
  return label;
}

export function undo() {
  if (!snapshot) return false;
  state = JSON.parse(snapshot);
  snapshot = null;
  save();
  return true;
}

export const exportData = () =>
  JSON.stringify({ app: 'GymApp', exportedAt: new Date().toISOString(), ...state }, null, 2);

export function importData(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const next = normalize(parsed);
  snapshot = JSON.stringify(state);
  state = next;
  save();
}

export function resetAll() {
  snapshot = JSON.stringify(state);
  state = emptyWeek();
  save();
}
