/* ===================================================
   FitLife — app.js
   All the interactive logic for your health tracker.
   We keep things human-readable with clear comments.
   =================================================== */

// ─────────────────────────────────────────────────
//  1. CHART COLORS
//  Kept in sync with the CSS variables in style.css
// ─────────────────────────────────────────────────
const COLORS = {
  steps:  '#1f5c45',
  cal:    '#d9582b',
  water:  '#2b7a78',
  sleep:  '#474b55',
  amber:  '#b7862b',
  danger: '#b42318',
  grid:   '#eeeae3',
  track:  '#efece6',
  label:  '#8e897f'
};

// ─────────────────────────────────────────────────
//  2. LOCAL STORAGE & SMALL HELPERS
//  Centralized read/write so we never forget JSON
// ─────────────────────────────────────────────────
function saveData(key, value) {
  try {
    localStorage.setItem('fitlife_' + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function loadData(key, defaultValue) {
  try {
    const stored = localStorage.getItem('fitlife_' + key);
    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// Escape user-entered text before putting it into innerHTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Local-time "YYYY-MM-DD" key (toISOString() uses UTC and can be off by a day)
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(key) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Older saved data stored types with an emoji prefix — strip it
function cleanLabel(str) {
  return String(str || '').replace(/^[^A-Za-z]+/, '').trim();
}

function iconSvg(name) {
  return `<svg class="icon"><use href="#i-${name}"/></svg>`;
}

// ─────────────────────────────────────────────────
//  3. TOAST NOTIFICATION HELPER
//  Shows a small message at the bottom-right
//  type: 'success' (default) or 'error'
// ─────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = message;
  document.getElementById('toastIconUse').setAttribute('href', type === 'error' ? '#i-alert' : '#i-check');
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');

  // Auto-hide after 2.8 seconds (restart the timer if a new toast arrives)
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────────
//  4. GREETING & DATE
//  Personalizes the dashboard header
// ─────────────────────────────────────────────────
function updateGreetingAndDate() {
  const hour = new Date().getHours();
  const greetEl = document.getElementById('greetingTime');

  if (hour < 12)      greetEl.textContent = 'morning';
  else if (hour < 17) greetEl.textContent = 'afternoon';
  else                greetEl.textContent = 'evening';

  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric'
  });
}

// ─────────────────────────────────────────────────
//  5. PROFILE MANAGEMENT
//  Name, goals, avatar initial, data export/reset
// ─────────────────────────────────────────────────
let profile = loadData('profile', {
  name:           'Athlete',
  stepsGoal:      10000,
  calBurnGoal:    500,
  waterGoal:      2500,
  calIntakeGoal:  2000
});

const profileModal = document.getElementById('profileModal');

function applyProfile() {
  const name = profile.name || 'Athlete';
  document.getElementById('greetingName').textContent    = name;
  document.getElementById('sidebarUserName').textContent = name;

  const initial = name.charAt(0).toUpperCase();
  document.getElementById('userAvatarSidebar').textContent = initial;
  document.getElementById('avatarDisplay').textContent     = initial;

  // Goal displays
  document.getElementById('stepsGoalDisplay').textContent = profile.stepsGoal.toLocaleString();
  document.getElementById('calGoalDisplay').textContent   = profile.calBurnGoal;
  document.getElementById('waterGoalDisplay').textContent = profile.waterGoal.toLocaleString();
  document.getElementById('waterGoalText').textContent    = profile.waterGoal;

  // Prefill profile form fields
  document.getElementById('profileName').value          = name;
  document.getElementById('profileStepsGoal').value     = profile.stepsGoal;
  document.getElementById('profileCalGoal').value       = profile.calBurnGoal;
  document.getElementById('profileWaterGoal').value     = profile.waterGoal;
  document.getElementById('profileCalIntakeGoal').value = profile.calIntakeGoal;
}

function openProfile() {
  applyProfile(); // Discard any unsaved edits from last time
  profileModal.classList.add('active');
  sidebar.classList.remove('open');
}

function closeProfile() {
  profileModal.classList.remove('active');
}

document.getElementById('openProfileBtn').addEventListener('click', openProfile);
document.getElementById('sidebarProfileBtn').addEventListener('click', openProfile);
document.getElementById('closeProfileModal').addEventListener('click', closeProfile);

// Click outside the box, or press Escape, to close
profileModal.addEventListener('click', (e) => {
  if (e.target === profileModal) closeProfile();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProfile();
    sidebar.classList.remove('open');
  }
});

// Save profile changes
document.getElementById('saveProfileBtn').addEventListener('click', () => {
  const newName = document.getElementById('profileName').value.trim();
  if (!newName) { showToast('Please enter your name', 'error'); return; }

  profile = {
    name:           newName,
    stepsGoal:      parseInt(document.getElementById('profileStepsGoal').value)     || 10000,
    calBurnGoal:    parseInt(document.getElementById('profileCalGoal').value)        || 500,
    waterGoal:      parseInt(document.getElementById('profileWaterGoal').value)      || 2500,
    calIntakeGoal:  parseInt(document.getElementById('profileCalIntakeGoal').value)  || 2000
  };

  saveData('profile', profile);
  applyProfile();
  refreshDashboardStats();
  renderMeals();
  renderWaterLog();
  drawCalorieRing();
  drawWeeklyChart();
  closeProfile();
  showToast('Profile saved');
});

// Live avatar preview while typing name
document.getElementById('profileName').addEventListener('input', (e) => {
  const initial = (e.target.value.trim().charAt(0) || 'A').toUpperCase();
  document.getElementById('avatarDisplay').textContent = initial;
});

// Download everything FitLife has saved as a JSON file
document.getElementById('exportDataBtn').addEventListener('click', () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('fitlife_')) data[key] = loadData(key.slice(8), null);
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `fitlife-data-${todayKey}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Data exported');
});

// Wipe all FitLife data from this browser
document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (!confirm('Delete all your FitLife data? This cannot be undone.')) return;

  Object.keys(localStorage)
    .filter(key => key.startsWith('fitlife_'))
    .forEach(key => localStorage.removeItem(key));
  location.reload();
});

// ─────────────────────────────────────────────────
//  6. SIDEBAR NAVIGATION
//  Switch between sections
// ─────────────────────────────────────────────────
const navItems   = document.querySelectorAll('.nav-item');
const sections   = document.querySelectorAll('.section');
const sidebar    = document.getElementById('sidebar');
const mobileBtn  = document.getElementById('mobileToggle');

function drawChartsFor(id) {
  if (id === 'dashboard') drawWeeklyChart();
  if (id === 'workouts')  drawWorkoutChart();
  if (id === 'nutrition') drawCalorieRing();
  if (id === 'water')     drawWaterWeekChart();
  if (id === 'sleep')     drawSleepChart();
  if (id === 'bmi')       drawWeightChart();
}

function switchSection(targetId) {
  sections.forEach(s => s.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));

  const targetSection = document.getElementById('section-' + targetId);
  const targetNav     = document.getElementById('nav-' + targetId);

  if (targetSection) targetSection.classList.add('active');
  if (targetNav)     targetNav.classList.add('active');

  sidebar.classList.remove('open');
  window.scrollTo(0, 0);

  // Charts can only be measured once their section is visible
  drawChartsFor(targetId);
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(item.dataset.section);
  });
});

// "View all" style links within cards
document.querySelectorAll('[data-go]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(link.dataset.go);
  });
});

// Mobile menu toggle
mobileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sidebar.classList.toggle('open');
});

// Tap outside the sidebar to close it on mobile
document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ─────────────────────────────────────────────────
//  7. DAILY LOG DATA
//  Steps, calories burned, water, sleep
// ─────────────────────────────────────────────────
let todayKey = getTodayKey();

function getTodayKey() {
  return toDateKey(new Date()); // e.g. "2026-10-20"
}

let todayLog = loadData('log_' + todayKey, {
  steps:      0,
  calBurned:  0,
  water:      0,   // in ml
  sleep:      0    // in hours
});

function saveTodayLog() {
  saveData('log_' + todayKey, todayLog);
}

function refreshDashboardStats() {
  const stepsPct = Math.min((todayLog.steps / profile.stepsGoal) * 100, 100);
  document.getElementById('stepsDisplay').textContent = todayLog.steps.toLocaleString();
  document.getElementById('stepsFill').style.width    = stepsPct + '%';

  const calPct = Math.min((todayLog.calBurned / profile.calBurnGoal) * 100, 100);
  document.getElementById('calBurnedDisplay').textContent = todayLog.calBurned.toLocaleString();
  document.getElementById('calFill').style.width          = calPct + '%';

  const waterPct = Math.min((todayLog.water / profile.waterGoal) * 100, 100);
  document.getElementById('waterDashDisplay').innerHTML = todayLog.water.toLocaleString() + '<small>ml</small>';
  document.getElementById('waterFill').style.width      = waterPct + '%';

  const sleepPct = Math.min((todayLog.sleep / 8) * 100, 100);
  document.getElementById('sleepDashDisplay').innerHTML = todayLog.sleep + '<small>hr</small>';
  document.getElementById('sleepFill').style.width      = sleepPct + '%';

  renderGoals();
}

// ─────────────────────────────────────────────────
//  8. TODAY'S GOALS CHECKLIST (Dashboard)
// ─────────────────────────────────────────────────
function renderGoals() {
  const workedOutToday = workouts.some(w => toDateKey(new Date(w.date)) === todayKey);

  const goals = [
    { name: 'Steps',           done: todayLog.steps >= profile.stepsGoal,
      progress: `${todayLog.steps.toLocaleString()} / ${profile.stepsGoal.toLocaleString()}` },
    { name: 'Active calories', done: todayLog.calBurned >= profile.calBurnGoal,
      progress: `${todayLog.calBurned} / ${profile.calBurnGoal} kcal` },
    { name: 'Water',           done: todayLog.water >= profile.waterGoal,
      progress: `${todayLog.water.toLocaleString()} / ${profile.waterGoal.toLocaleString()} ml` },
    { name: 'Sleep 7+ hours',  done: todayLog.sleep >= 7,
      progress: `${todayLog.sleep} hr` },
    { name: 'Log a workout',   done: workedOutToday,
      progress: workedOutToday ? 'Done' : 'Not yet' }
  ];

  document.getElementById('goalList').innerHTML = goals.map(g => `
    <li class="goal-item ${g.done ? 'done' : ''}">
      <span class="goal-check">${iconSvg('check')}</span>
      <span class="goal-name">${g.name}</span>
      <span class="goal-progress">${g.progress}</span>
    </li>
  `).join('');

  document.getElementById('goalsDoneCount').textContent = goals.filter(g => g.done).length;
}

// ─────────────────────────────────────────────────
//  9. QUICK LOG (Dashboard shortcut form)
// ─────────────────────────────────────────────────
document.getElementById('quickLogBtn').addEventListener('click', () => {
  const steps    = parseInt(document.getElementById('quickSteps').value)    || 0;
  const cals     = parseInt(document.getElementById('quickCalories').value) || 0;
  const water    = parseInt(document.getElementById('quickWaterQL').value)  || 0;
  const sleepH   = parseFloat(document.getElementById('quickSleepQL').value) || 0;

  if (steps <= 0 && cals <= 0 && water <= 0 && sleepH <= 0) {
    showToast('Enter at least one value to log', 'error');
    return;
  }

  todayLog.steps     += Math.max(0, steps);
  todayLog.calBurned += Math.max(0, cals);
  if (sleepH > 0) todayLog.sleep = sleepH; // sleep replaces (don't accumulate)

  // Water goes through the water log so the Hydration page stays in sync
  if (water > 0) {
    waterLog.push({ amount: water, time: currentTimeLabel() });
    saveData('water_' + todayKey, waterLog);
    todayLog.water = getTotalWater();
    renderWaterLog();
  }

  saveTodayLog();
  refreshDashboardStats();
  drawWeeklyChart();
  updateStreak();

  ['quickSteps', 'quickCalories', 'quickWaterQL', 'quickSleepQL']
    .forEach(id => document.getElementById(id).value = '');

  showToast("Saved to today's log");
});

// ─────────────────────────────────────────────────
//  10. WORKOUT TRACKER
// ─────────────────────────────────────────────────
let workouts = loadData('workouts', []).map(w => ({ ...w, type: cleanLabel(w.type) }));
let selectedIntensity = 'Medium';

document.querySelectorAll('.intensity-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedIntensity = btn.dataset.value;
  });
});

document.getElementById('workoutForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const type     = document.getElementById('workoutType').value;
  const duration = parseInt(document.getElementById('workoutDuration').value);
  const calories = parseInt(document.getElementById('workoutCalories').value) || 0;
  const notes    = document.getElementById('workoutNotes').value.trim();

  if (!type)                     { showToast('Please select a workout type', 'error'); return; }
  if (!duration || duration < 1) { showToast('Please enter a duration', 'error'); return; }

  workouts.unshift({
    id:        Date.now(),
    type,
    duration,
    calories:  Math.max(0, calories),
    notes,
    intensity: selectedIntensity,
    date:      new Date().toISOString()
  });
  if (workouts.length > 50) workouts.pop(); // Keep last 50
  saveData('workouts', workouts);

  // Also add burned calories to today's log
  todayLog.calBurned += Math.max(0, calories);
  saveTodayLog();

  refreshWorkoutViews();
  document.getElementById('workoutForm').reset();
  showToast('Workout logged');
});

function refreshWorkoutViews() {
  renderWorkoutHistory();
  renderRecentWorkouts();
  updateWorkoutStats();
  drawWorkoutChart();
  refreshDashboardStats();
  drawWeeklyChart();
  updateStreak();
}

function workoutDateLabel(w) {
  return new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderWorkoutHistory() {
  const container = document.getElementById('workoutHistoryList');
  if (!workouts.length) {
    container.innerHTML = '<div class="empty-state">No workouts yet. Log your first one.</div>';
    return;
  }

  container.innerHTML = workouts.map(w => `
    <div class="list-item">
      <div class="li-badge">${w.type.charAt(0)}</div>
      <div class="li-body">
        <div class="li-title">${escapeHtml(w.type)}</div>
        <div class="li-meta">${w.duration} min${w.calories ? ' · ' + w.calories + ' kcal' : ''} · ${workoutDateLabel(w)}</div>
        ${w.notes ? `<div class="li-note">${escapeHtml(w.notes)}</div>` : ''}
      </div>
      <span class="tag ${w.intensity}">${w.intensity}</span>
      <button class="icon-btn" onclick="deleteWorkout(${w.id})" aria-label="Delete workout">${iconSvg('trash')}</button>
    </div>
  `).join('');
}

function renderRecentWorkouts() {
  const container = document.getElementById('recentWorkoutsList');
  const recent    = workouts.slice(0, 4);

  if (!recent.length) {
    container.innerHTML = '<div class="empty-state">No workouts logged yet.</div>';
    return;
  }

  container.innerHTML = recent.map(w => `
    <div class="list-item">
      <div class="li-badge">${w.type.charAt(0)}</div>
      <div class="li-body">
        <div class="li-title">${escapeHtml(w.type)}</div>
        <div class="li-meta">${workoutDateLabel(w)}</div>
      </div>
      <span class="li-value">${w.duration} min</span>
    </div>
  `).join('');
}

function updateWorkoutStats() {
  document.getElementById('totalWorkouts').textContent = workouts.length;

  // This week count (Mon–Sun)
  const now       = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday = 0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const weekCount = workouts.filter(w => new Date(w.date) >= weekStart).length;
  document.getElementById('weekWorkouts').textContent = weekCount;
}

// Globally exposed so inline onclick works
window.deleteWorkout = function(id) {
  const removed = workouts.find(w => w.id === id);
  workouts = workouts.filter(w => w.id !== id);
  saveData('workouts', workouts);

  // Take its calories back out of today's total if it was logged today
  if (removed && removed.calories && toDateKey(new Date(removed.date)) === todayKey) {
    todayLog.calBurned = Math.max(0, todayLog.calBurned - removed.calories);
    saveTodayLog();
  }

  refreshWorkoutViews();
  showToast('Workout removed');
};

// ─────────────────────────────────────────────────
//  11. NUTRITION TRACKER
// ─────────────────────────────────────────────────
let meals = loadData('meals_' + todayKey, []).map(m => ({ ...m, type: cleanLabel(m.type) }));

function saveMeals() {
  saveData('meals_' + todayKey, meals);
}

document.getElementById('mealForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const name     = document.getElementById('mealName').value.trim();
  const type     = document.getElementById('mealType').value;
  const calories = parseInt(document.getElementById('mealCalories').value) || 0;
  const protein  = parseFloat(document.getElementById('mealProtein').value) || 0;
  const carbs    = parseFloat(document.getElementById('mealCarbs').value)   || 0;
  const fat      = parseFloat(document.getElementById('mealFat').value)     || 0;

  if (!name)         { showToast('Please enter a meal name', 'error'); return; }
  if (calories <= 0) { showToast('Please enter calories', 'error'); return; }

  meals.unshift({
    id: Date.now(), name, type, calories,
    protein: Math.max(0, protein), carbs: Math.max(0, carbs), fat: Math.max(0, fat)
  });
  saveMeals();

  renderMeals();
  drawCalorieRing();
  document.getElementById('mealForm').reset();
  showToast('Meal added');
});

function renderMeals() {
  const container = document.getElementById('mealsList');

  if (!meals.length) {
    container.innerHTML = '<div class="empty-state">No meals logged today.</div>';
  } else {
    container.innerHTML = meals.map(m => `
      <div class="list-item">
        <div class="li-badge meal">${m.type.charAt(0)}</div>
        <div class="li-body">
          <div class="li-title">${escapeHtml(m.name)}</div>
          <div class="li-meta">${m.type} · P ${m.protein}g · C ${m.carbs}g · F ${m.fat}g</div>
        </div>
        <span class="li-value">${m.calories} kcal</span>
        <button class="icon-btn" onclick="deleteMeal(${m.id})" aria-label="Delete meal">${iconSvg('trash')}</button>
      </div>
    `).join('');
  }

  // Totals (always recalculated so they reset to 0 when the last meal is deleted)
  const totalCal  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt = meals.reduce((s, m) => s + m.protein,  0);
  const totalCarb = meals.reduce((s, m) => s + m.carbs,    0);
  const totalFat  = meals.reduce((s, m) => s + m.fat,      0);

  document.getElementById('totalCalIn').textContent   = totalCal.toLocaleString();
  document.getElementById('totalProtein').textContent = Math.round(totalProt) + 'g';
  document.getElementById('totalCarbs').textContent   = Math.round(totalCarb) + 'g';
  document.getElementById('totalFat').textContent     = Math.round(totalFat) + 'g';

  const goal = profile.calIntakeGoal;
  const pct  = Math.min((totalCal / goal) * 100, 100);
  document.getElementById('calorieGoalText').textContent = `${totalCal.toLocaleString()} / ${goal.toLocaleString()} kcal`;
  document.getElementById('calorieGoalFill').style.width = pct + '%';
}

window.deleteMeal = function(id) {
  meals = meals.filter(m => m.id !== id);
  saveMeals();
  renderMeals();
  drawCalorieRing();
  showToast('Meal removed');
};

// ─────────────────────────────────────────────────
//  12. WATER TRACKER
// ─────────────────────────────────────────────────
let waterLog = loadData('water_' + todayKey, []); // [{amount, time}]

function currentTimeLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getTotalWater() {
  return waterLog.reduce((s, e) => s + e.amount, 0);
}

function saveWater() {
  saveData('water_' + todayKey, waterLog);
  todayLog.water = getTotalWater();
  saveTodayLog();
  refreshDashboardStats();
  renderWaterLog();
  drawWaterWeekChart();
}

function addWater(amount) {
  if (!amount || amount <= 0) return;
  waterLog.push({ amount, time: currentTimeLabel() });
  saveWater();
  showToast(`Added ${amount} ml`);
}

document.querySelectorAll('.water-btn').forEach(btn => {
  btn.addEventListener('click', () => addWater(parseInt(btn.dataset.amount)));
});

document.getElementById('addCustomWater').addEventListener('click', () => {
  const val = parseInt(document.getElementById('customWaterAmt').value);
  if (!val || val <= 0) { showToast('Enter a valid amount', 'error'); return; }
  addWater(val);
  document.getElementById('customWaterAmt').value = '';
});

document.getElementById('resetWaterBtn').addEventListener('click', () => {
  if (!waterLog.length) return;
  if (!confirm("Reset today's water log?")) return;
  waterLog = [];
  saveWater();
  showToast('Water log reset');
});

document.getElementById('waterTipsToggle').addEventListener('click', (e) => {
  const tips = document.getElementById('hydrationTips');
  tips.hidden = !tips.hidden;
  e.currentTarget.textContent = tips.hidden ? 'Show tips' : 'Hide tips';
});

window.deleteWater = function(index) {
  waterLog.splice(index, 1);
  saveWater();
  showToast('Entry removed');
};

function renderWaterLog() {
  const total = getTotalWater();
  const goal  = profile.waterGoal;
  const pct   = Math.min((total / goal) * 100, 100);

  document.getElementById('waterFillViz').style.height     = pct + '%';
  document.getElementById('waterPercent').textContent       = Math.round(pct) + '%';
  document.getElementById('waterAmountDisplay').textContent = total.toLocaleString();
  document.getElementById('waterGoalText').textContent      = goal.toLocaleString();

  const container = document.getElementById('waterLogList');

  if (!waterLog.length) {
    container.innerHTML = '<div class="empty-state">No water logged yet today.</div>';
    return;
  }

  // Show newest first, but keep each entry's real index for deleting
  container.innerHTML = waterLog.map((e, i) => `
    <div class="list-item">
      <div class="li-badge water">${iconSvg('drop')}</div>
      <div class="li-body">
        <div class="li-title">${e.amount} ml</div>
        <div class="li-meta">${e.time}</div>
      </div>
      <button class="icon-btn" onclick="deleteWater(${i})" aria-label="Delete entry">${iconSvg('trash')}</button>
    </div>
  `).reverse().join('');
}

// ─────────────────────────────────────────────────
//  13. SLEEP TRACKER
// ─────────────────────────────────────────────────
let sleepLogs    = loadData('sleepLogs', []);
let sleepQuality = 'Good';

document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sleepQuality = btn.dataset.value;
  });
});

document.getElementById('sleepForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const bedTime  = document.getElementById('sleepBedTime').value;
  const wakeTime = document.getElementById('sleepWakeTime').value;
  const notes    = document.getElementById('sleepNotes').value.trim();

  if (!bedTime || !wakeTime) {
    showToast('Please enter both bedtime and wake time', 'error');
    return;
  }

  // Calculate hours (handle overnight sleep)
  const [bH, bM] = bedTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);

  let totalMinutes = (wH * 60 + wM) - (bH * 60 + bM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Next day wake-up

  const hours = parseFloat((totalMinutes / 60).toFixed(1));

  sleepLogs.unshift({
    id:       Date.now(),
    bedTime,
    wakeTime,
    hours,
    quality:  sleepQuality,
    notes,
    date:     todayKey
  });
  if (sleepLogs.length > 30) sleepLogs.pop();
  saveData('sleepLogs', sleepLogs);

  todayLog.sleep = hours;
  saveTodayLog();
  refreshDashboardStats();

  renderSleepHistory();
  drawSleepChart();
  showSleepScore(hours, sleepQuality);
  document.getElementById('sleepNotes').value = '';
  showToast(`${hours} hours of sleep logged`);
});

function showSleepScore(hours, quality) {
  let score = 0;

  // Duration scoring (ideal: 7–9 hours)
  if (hours >= 7 && hours <= 9)      score += 60;
  else if (hours >= 6 && hours < 7)  score += 45;
  else if (hours > 9 && hours <= 10) score += 50;
  else if (hours >= 5)               score += 30;
  else                               score += 15;

  // Quality scoring
  const qualityScores = { Poor: 0, Fair: 15, Good: 30, Great: 40 };
  score += qualityScores[quality] || 0;
  score = Math.min(score, 100);

  let msg, color;
  if (score >= 85)      { msg = "Excellent rest. You're set for the day.";            color = COLORS.steps; }
  else if (score >= 65) { msg = 'Good sleep. Keep this routine going.';               color = COLORS.steps; }
  else if (score >= 45) { msg = 'Decent, but try to improve consistency and length.'; color = COLORS.amber; }
  else                  { msg = 'Your body needs more rest. Aim for an earlier night.'; color = COLORS.cal; }

  const valueEl = document.getElementById('sleepScoreValue');
  valueEl.textContent = score;
  valueEl.style.color = color;
  document.getElementById('sleepScoreMsg').textContent = msg;
  document.getElementById('sleepScoreBox').hidden = false;
}

window.deleteSleep = function(id) {
  const removed = sleepLogs.find(s => s.id === id);
  sleepLogs = sleepLogs.filter(s => s.id !== id);
  saveData('sleepLogs', sleepLogs);

  // If it was today's entry, fall back to the next most recent one from today
  if (removed && removed.date === todayKey) {
    const other = sleepLogs.find(s => s.date === todayKey);
    todayLog.sleep = other ? other.hours : 0;
    saveTodayLog();
    refreshDashboardStats();
  }

  renderSleepHistory();
  drawSleepChart();
  showToast('Sleep entry removed');
};

function renderSleepHistory() {
  const container = document.getElementById('sleepHistoryList');

  if (!sleepLogs.length) {
    container.innerHTML = '<div class="empty-state">No sleep logged yet.</div>';
    document.getElementById('avgSleepDisplay').textContent = '0h';
    return;
  }

  const avg = sleepLogs.reduce((s, e) => s + e.hours, 0) / sleepLogs.length;
  document.getElementById('avgSleepDisplay').textContent = avg.toFixed(1) + 'h';

  container.innerHTML = sleepLogs.slice(0, 10).map(s => `
    <div class="list-item">
      <div class="li-badge sleep">${iconSvg('moon')}</div>
      <div class="li-body">
        <div class="li-title">${s.hours} hours</div>
        <div class="li-meta">${s.bedTime} – ${s.wakeTime} · ${formatShortDate(s.date)}</div>
        ${s.notes ? `<div class="li-note">${escapeHtml(s.notes)}</div>` : ''}
      </div>
      <span class="tag ${s.quality}">${s.quality}</span>
      <button class="icon-btn" onclick="deleteSleep(${s.id})" aria-label="Delete entry">${iconSvg('trash')}</button>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────
//  14. WEIGHT TRACKER
// ─────────────────────────────────────────────────
let weights = loadData('weights', []); // [{id, date: 'YYYY-MM-DD', kg}], newest first

document.getElementById('weightDate').value = todayKey;
document.getElementById('weightDate').max   = todayKey;

document.getElementById('weightForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const date = document.getElementById('weightDate').value || todayKey;
  const kg   = parseFloat(document.getElementById('weightValue').value);

  if (!kg || kg <= 0 || kg > 500) { showToast('Please enter a valid weight', 'error'); return; }

  // One entry per day — replace if that date already exists
  weights = weights.filter(w => w.date !== date);
  weights.push({ id: Date.now(), date, kg: parseFloat(kg.toFixed(1)) });
  weights.sort((a, b) => b.date.localeCompare(a.date));
  saveData('weights', weights);

  renderWeights();
  drawWeightChart();
  document.getElementById('weightValue').value = '';
  showToast(`${kg.toFixed(1)} kg saved`);
});

window.deleteWeight = function(id) {
  weights = weights.filter(w => w.id !== id);
  saveData('weights', weights);
  renderWeights();
  drawWeightChart();
  showToast('Weight entry removed');
};

function renderWeights() {
  const container = document.getElementById('weightHistoryList');
  const changeEl  = document.getElementById('weightChange');

  document.getElementById('weightCount').textContent = weights.length;
  changeEl.className = 'ws-value';

  if (!weights.length) {
    container.innerHTML = '<div class="empty-state">No weight entries yet.</div>';
    document.getElementById('weightCurrent').textContent = '—';
    changeEl.textContent = '—';
    return;
  }

  const latest = weights[0].kg;
  const first  = weights[weights.length - 1].kg;
  const diff   = latest - first;

  document.getElementById('weightCurrent').textContent = latest.toFixed(1) + ' kg';
  changeEl.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1) + ' kg';
  if (diff < 0) changeEl.classList.add('down');
  if (diff > 0) changeEl.classList.add('up');

  container.innerHTML = weights.slice(0, 15).map(w => `
    <div class="list-item">
      <div class="li-body">
        <div class="li-title">${w.kg.toFixed(1)} kg</div>
        <div class="li-meta">${formatShortDate(w.date)}</div>
      </div>
      <button class="icon-btn" onclick="deleteWeight(${w.id})" aria-label="Delete entry">${iconSvg('trash')}</button>
    </div>
  `).join('');

  // Prefill the BMI weight with the latest entry if it's empty
  const bmiWeight = document.getElementById('bmiWeight');
  if (!bmiWeight.value && bmiUnit === 'metric') bmiWeight.value = latest;
}

// ─────────────────────────────────────────────────
//  15. BMI CALCULATOR
// ─────────────────────────────────────────────────
let bmiUnit   = 'metric';
let bmiGender = 'Male';
let bmiHistory = loadData('bmiHistory', []);

document.querySelectorAll('.unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    bmiUnit = btn.dataset.unit;

    document.getElementById('heightUnit').textContent = bmiUnit === 'metric' ? 'cm' : 'in';
    document.getElementById('weightUnit').textContent = bmiUnit === 'metric' ? 'kg' : 'lb';
    document.getElementById('bmiHeight').placeholder  = bmiUnit === 'metric' ? '175' : '69';
    document.getElementById('bmiWeight').placeholder  = bmiUnit === 'metric' ? '70' : '154';
  });
});

document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    bmiGender = btn.dataset.value;
  });
});

document.getElementById('bmiForm').addEventListener('submit', (e) => {
  e.preventDefault();

  let height = parseFloat(document.getElementById('bmiHeight').value);
  let weight = parseFloat(document.getElementById('bmiWeight').value);
  const age  = parseInt(document.getElementById('bmiAge').value);

  if (!height || !weight || height <= 0 || weight <= 0) {
    showToast('Please enter height and weight', 'error');
    return;
  }

  // Convert imperial to metric
  if (bmiUnit === 'imperial') {
    height = height * 2.54;      // inches → cm
    weight = weight * 0.453592;  // lbs → kg
  }

  const heightM = height / 100;
  const bmi     = weight / (heightM * heightM);
  const rounded = parseFloat(bmi.toFixed(1));

  let category, className, desc;

  if (bmi < 18.5) {
    category  = 'Underweight';
    className = 'bmi-underweight';
    desc      = 'You may need to gain some weight. A nutritionist can help with a healthy plan.';
  } else if (bmi < 25) {
    category  = 'Healthy weight';
    className = 'bmi-normal';
    desc      = 'Your weight is in a healthy range for your height. Keep it up.';
  } else if (bmi < 30) {
    category  = 'Overweight';
    className = 'bmi-overweight';
    desc      = 'More activity and small diet changes can help you reach a healthier range.';
  } else {
    category  = 'Obese';
    className = 'bmi-obese';
    desc      = 'Consider working with a healthcare professional on a safe weight-loss plan.';
  }

  // Ideal weight range for their height, shown in the unit they entered
  const weightFactor = bmiUnit === 'imperial' ? 1 / 0.453592 : 1;
  const weightLabel  = bmiUnit === 'imperial' ? 'lb' : 'kg';
  const idealMin = (18.5 * heightM * heightM * weightFactor).toFixed(1);
  const idealMax = (24.9 * heightM * heightM * weightFactor).toFixed(1);

  // Age and sex don't change adult BMI, but BMI isn't valid for kids/teens
  const ageNote = age && age < 18
    ? '<div class="bmi-note">For under-18s, BMI should be read against age and sex percentile charts.</div>'
    : '';

  document.getElementById('bmiResult').innerHTML = `
    <div class="bmi-result-content ${className}">
      <div class="bmi-value">${rounded}</div>
      <div class="bmi-category">${category}</div>
      <div class="bmi-desc">${desc}</div>
      <div class="bmi-note">Healthy weight for your height: ${idealMin}–${idealMax} ${weightLabel}</div>
      ${ageNote}
    </div>
  `;

  bmiHistory.unshift({
    bmi:      rounded,
    category,
    date:     new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  });
  if (bmiHistory.length > 10) bmiHistory.pop();
  saveData('bmiHistory', bmiHistory);
  renderBmiHistory();
  showToast(`Your BMI is ${rounded}`);
});

function renderBmiHistory() {
  const container = document.getElementById('bmiHistoryList');

  if (!bmiHistory.length) {
    container.innerHTML = '<div class="empty-state">No BMI records yet.</div>';
    return;
  }

  container.innerHTML = bmiHistory.map(b => `
    <div class="list-item">
      <div class="li-body">
        <div class="li-title">${b.bmi}</div>
        <div class="li-meta">${b.category === 'Normal Weight' ? 'Healthy weight' : b.category}</div>
      </div>
      <span class="li-meta">${b.date}</span>
    </div>
  `).join('');
}

document.getElementById('clearBmiHistory').addEventListener('click', () => {
  if (!bmiHistory.length) return;
  bmiHistory = [];
  saveData('bmiHistory', bmiHistory);
  renderBmiHistory();
  showToast('BMI history cleared');
});

// ─────────────────────────────────────────────────
//  16. STREAK COUNTER
//  Consecutive days with steps or calories logged
// ─────────────────────────────────────────────────
function updateStreak() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const log = loadData('log_' + toDateKey(d), null);

    if (log && (log.steps > 0 || log.calBurned > 0)) {
      streak++;
    } else if (i > 0) {
      break; // Streak broken (today not logged yet doesn't break it)
    }
  }

  document.getElementById('streakDisplay').textContent = streak + (streak === 1 ? ' day' : ' days');
}

// ─────────────────────────────────────────────────
//  17. CANVAS CHARTS
//  Hand-drawn with HTML Canvas
// ─────────────────────────────────────────────────

// Sizes the canvas to its on-screen width (and the screen's pixel density)
// so charts stay sharp and fill their card. Returns null if it's hidden.
function prepareCanvas(canvas) {
  if (!canvas.dataset.h) canvas.dataset.h = canvas.getAttribute('height');
  const W   = canvas.clientWidth;
  const H   = parseInt(canvas.dataset.h);
  const dpr = window.devicePixelRatio || 1;
  if (!W) return null;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.font = '12px Archivo, sans-serif';
  ctx.textAlign = 'center';
  return { ctx, W, H };
}

function drawEmptyChart(ctx, W, H, message) {
  ctx.fillStyle = COLORS.label;
  ctx.font = '13px Archivo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, W / 2, H / 2);
}

// Light horizontal guide lines
function drawGrid(ctx, left, right, top, height, lines = 4) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= lines; i++) {
    const y = Math.round(top + (height / lines) * i) + 0.5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
}

function drawDashedLine(ctx, left, right, y, color) {
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function bar(ctx, x, y, w, h, radius = 4) {
  if (h <= 0) return;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [Math.min(radius, h), Math.min(radius, h), 0, 0]);
  ctx.fill();
}

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateKey(d));
  }
  return days;
}

function weekdayLabel(key) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

// ── 17a. Weekly Activity Bar Chart (Dashboard)
function drawWeeklyChart() {
  const canvas = document.getElementById('weeklyChart');
  const prep = canvas && prepareCanvas(canvas);
  if (!prep) return;
  const { ctx, W, H } = prep;

  const days      = getLastNDays(7);
  const stepsData = days.map(d => (loadData('log_' + d, {}).steps || 0));
  const calData   = days.map(d => (loadData('log_' + d, {}).calBurned || 0));

  // Each series is scaled against its own goal so both fit on one chart
  const maxSteps = Math.max(...stepsData, profile.stepsGoal, 1);
  const maxCal   = Math.max(...calData, profile.calBurnGoal, 1);

  const padL = 4, padR = 4, padT = 8, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const groupW = chartW / 7;
  const barW   = Math.min(groupW * 0.28, 22);

  drawGrid(ctx, padL, W - padR, padT, chartH);

  days.forEach((day, i) => {
    const x = padL + i * groupW + groupW / 2;
    const isToday = day === todayKey;

    const stepsH = (stepsData[i] / maxSteps) * chartH;
    ctx.fillStyle = COLORS.steps;
    bar(ctx, x - barW - 2, padT + chartH - stepsH, barW, stepsH);

    const calH = (calData[i] / maxCal) * chartH;
    ctx.fillStyle = COLORS.cal;
    bar(ctx, x + 2, padT + chartH - calH, barW, calH);

    ctx.fillStyle = isToday ? '#1c1b18' : COLORS.label;
    ctx.font = (isToday ? '600 ' : '') + '12px Archivo, sans-serif';
    ctx.fillText(isToday ? 'Today' : weekdayLabel(day), x, H - 8);
  });
}

// ── 17b. Workouts by Type Bar Chart
function drawWorkoutChart() {
  const canvas = document.getElementById('workoutChart');
  const prep = canvas && prepareCanvas(canvas);
  if (!prep) return;
  const { ctx, W, H } = prep;

  if (!workouts.length) {
    drawEmptyChart(ctx, W, H, 'Log workouts to see which types you do most');
    return;
  }

  const counts = {};
  workouts.forEach(w => { counts[w.type] = (counts[w.type] || 0) + 1; });

  const entries  = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = Math.max(...entries.map(e => e[1]), 1);

  const padL = 4, padR = 4, padT = 22, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const groupW = chartW / entries.length;
  const barW   = Math.min(groupW * 0.5, 56);

  drawGrid(ctx, padL, W - padR, padT, chartH);

  entries.forEach(([label, count], i) => {
    const x    = padL + i * groupW + groupW / 2;
    const barH = (count / maxCount) * chartH;

    // Most frequent type in brand green, the rest in a softer tone
    ctx.fillStyle = i === 0 ? COLORS.steps : '#8fb5a3';
    bar(ctx, x - barW / 2, padT + chartH - barH, barW, barH, 6);

    ctx.fillStyle = '#1c1b18';
    ctx.font = '600 12px Archivo, sans-serif';
    ctx.fillText(count, x, padT + chartH - barH - 6);

    ctx.fillStyle = COLORS.label;
    ctx.font = '12px Archivo, sans-serif';
    const maxChars = Math.max(4, Math.floor(groupW / 7));
    const short = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
    ctx.fillText(short, x, H - 8);
  });
}

// ── 17c. Calorie Ring (Nutrition)
function drawCalorieRing() {
  const canvas = document.getElementById('calorieRing');
  if (!canvas) return;

  // Fixed 160×160 ring, scaled up for high-DPI screens
  const W   = 160;
  const H   = 160;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx    = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx     = W / 2;
  const cy     = H / 2;
  const radius = 66;
  const lineW  = 12;

  ctx.clearRect(0, 0, W, H);

  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const pct      = Math.min(totalCal / profile.calIntakeGoal, 1);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.track;
  ctx.lineWidth   = lineW;
  ctx.stroke();

  if (pct > 0) {
    const startAngle = -Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + pct * Math.PI * 2);
    ctx.strokeStyle = COLORS.cal;
    ctx.lineWidth   = lineW;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }
}

// ── 17d. Water This Week Bar Chart
function drawWaterWeekChart() {
  const canvas = document.getElementById('waterWeekChart');
  const prep = canvas && prepareCanvas(canvas);
  if (!prep) return;
  const { ctx, W, H } = prep;

  const days = getLastNDays(7);
  const data = days.map(d => {
    if (d === todayKey) return getTotalWater();
    return loadData('water_' + d, []).reduce((s, e) => s + e.amount, 0);
  });

  const maxVal = Math.max(...data, profile.waterGoal, 1) * 1.1;
  const padL = 4, padR = 4, padT = 8, padB = 26;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const groupW = chartW / 7;
  const barW   = Math.min(groupW * 0.5, 32);

  days.forEach((day, i) => {
    const x    = padL + i * groupW + groupW / 2;
    const barH = (data[i] / maxVal) * chartH;
    const isToday = day === todayKey;

    ctx.fillStyle = data[i] >= profile.waterGoal ? COLORS.water : '#9cc6c4';
    bar(ctx, x - barW / 2, padT + chartH - barH, barW, barH);

    ctx.fillStyle = isToday ? '#1c1b18' : COLORS.label;
    ctx.font = (isToday ? '600 ' : '') + '12px Archivo, sans-serif';
    ctx.fillText(isToday ? 'Today' : weekdayLabel(day), x, H - 7);
  });

  const goalY = padT + chartH - (profile.waterGoal / maxVal) * chartH;
  drawDashedLine(ctx, padL, W - padR, goalY, COLORS.water);
}

// ── 17e. Sleep Bar Chart (last 7 entries)
function drawSleepChart() {
  const canvas = document.getElementById('sleepChart');
  const prep = canvas && prepareCanvas(canvas);
  if (!prep) return;
  const { ctx, W, H } = prep;

  const recent = sleepLogs.slice(0, 7).reverse();
  if (!recent.length) {
    drawEmptyChart(ctx, W, H, 'Log sleep to see your chart');
    return;
  }

  const padL = 4, padR = 4, padT = 10, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxH   = Math.max(...recent.map(s => s.hours), 10);
  const groupW = chartW / 7;
  const barW   = Math.min(groupW * 0.5, 36);

  drawGrid(ctx, padL, W - padR, padT, chartH);

  const qualColors = { Poor: COLORS.danger, Fair: COLORS.amber, Good: COLORS.steps, Great: COLORS.steps };

  recent.forEach((s, i) => {
    const x    = padL + i * groupW + groupW / 2;
    const barH = (s.hours / maxH) * chartH;

    ctx.fillStyle = qualColors[s.quality] || COLORS.sleep;
    bar(ctx, x - barW / 2, padT + chartH - barH, barW, barH);

    ctx.fillStyle = COLORS.label;
    ctx.font = '12px Archivo, sans-serif';
    ctx.fillText(formatShortDate(s.date), x, H - 8);

    if (barH > 22) {
      ctx.fillStyle = '#fff';
      ctx.font = '600 11px Archivo, sans-serif';
      ctx.fillText(s.hours + 'h', x, padT + chartH - barH + 15);
    }
  });

  // 8h target line
  drawDashedLine(ctx, padL, W - padR, padT + chartH - (8 / maxH) * chartH, COLORS.sleep);
}

// ── 17f. Weight Trend Line Chart
function drawWeightChart() {
  const canvas = document.getElementById('weightChart');
  const prep = canvas && prepareCanvas(canvas);
  if (!prep) return;
  const { ctx, W, H } = prep;

  const points = weights.slice(0, 30).reverse(); // oldest → newest
  if (points.length < 2) {
    drawEmptyChart(ctx, W, H, points.length ? 'Add one more entry to see your trend' : 'Log your weight to see your trend');
    return;
  }

  // Whole-number axis with 4 even steps (e.g. 73, 74, 75, 76, 77)
  const values = points.map(p => p.kg);
  const minV   = Math.floor(Math.min(...values) - 1);
  const step   = Math.max(1, Math.ceil((Math.max(...values) + 1 - minV) / 4));
  const maxV   = minV + step * 4;

  const padL = 40, padR = 12, padT = 12, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const xAt = i => padL + (i / (points.length - 1)) * chartW;
  const yAt = v => padT + chartH - ((v - minV) / (maxV - minV)) * chartH;

  // Grid with kg labels on the left
  drawGrid(ctx, padL, W - padR, padT, chartH);
  ctx.fillStyle = COLORS.label;
  ctx.font = '11px Archivo, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    ctx.fillText(maxV - step * i, padL - 8, padT + (chartH / 4) * i + 4);
  }

  // Soft area under the line
  ctx.beginPath();
  ctx.moveTo(xAt(0), padT + chartH);
  points.forEach((p, i) => ctx.lineTo(xAt(i), yAt(p.kg)));
  ctx.lineTo(xAt(points.length - 1), padT + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(31,92,69,0.08)';
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(xAt(i), yAt(p.kg)) : ctx.moveTo(xAt(i), yAt(p.kg)));
  ctx.strokeStyle = COLORS.steps;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Points
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(xAt(i), yAt(p.kg), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = COLORS.steps;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // First and last date labels
  ctx.fillStyle = COLORS.label;
  ctx.font = '12px Archivo, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatShortDate(points[0].date), padL, H - 8);
  ctx.textAlign = 'right';
  ctx.fillText(formatShortDate(points[points.length - 1].date), W - padR, H - 8);
}

// ─────────────────────────────────────────────────
//  18. INITIALIZE EVERYTHING ON PAGE LOAD
// ─────────────────────────────────────────────────
function initApp() {
  updateGreetingAndDate();
  applyProfile();
  refreshDashboardStats();
  renderWorkoutHistory();
  renderRecentWorkouts();
  updateWorkoutStats();
  renderMeals();
  renderWaterLog();
  renderSleepHistory();
  renderWeights();
  renderBmiHistory();
  updateStreak();

  // Draw charts once fonts are ready so canvas text uses Archivo
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    drawWeeklyChart();
    drawCalorieRing();
  });
}

document.addEventListener('DOMContentLoaded', initApp);

// Redraw the visible section's charts on window resize
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const activeSection = document.querySelector('.section.active');
    if (activeSection) drawChartsFor(activeSection.id.replace('section-', ''));
  }, 100);
});
