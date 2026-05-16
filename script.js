/* ═══════════════════════════════════════
   CHRONO.GRID — script.js
   ═══════════════════════════════════════ */

'use strict';

// ── STATE ──────────────────────────────
const state = {
  dates: [],
  checked: [],
  theme: 'green'
};

const STORAGE_KEY = 'chronogrid_v1';

// ── DOM REFS ───────────────────────────
const $ = id => document.getElementById(id);

const inputPanel      = $('inputPanel');
const progressPanel   = $('progressPanel');
const checklistPanel  = $('checklistPanel');
const checklistContainer = $('checklistContainer');

const startDateInput    = $('startDate');
const intervalDaysInput = $('intervalDays');
const totalIntervalsInput = $('totalIntervals');

const generateBtn = $('generateBtn');
const resetBtn    = $('resetBtn');
const exportBtn   = $('exportBtn');
const exportMenu  = $('exportMenu');
const exportPDFBtn   = $('exportPDF');
const exportImageBtn = $('exportImage');

const progressFill    = $('progressFill');
const progressGlow    = $('progressGlow');
const completedCount  = $('completedCount');
const totalCount      = $('totalCount');
const percentDisplay  = $('percentDisplay');
const progressStatus  = $('progressStatus');

const themeBtns = document.querySelectorAll('.theme-btn');
const canvas    = $('particleCanvas');
const ctx       = canvas ? canvas.getContext('2d') : null;

// ── PARTICLE SYSTEM ────────────────────
const particles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

if (canvas && ctx) {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function spawnParticles(x, y, count = 14) {
  if (!ctx) return;

  const color = getComputedStyle(document.body).getPropertyValue('--neon').trim() || '#cc2222';

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 1.5 + Math.random() * 3;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.025 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function animateParticles() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.life -= p.decay;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  requestAnimationFrame(animateParticles);
}

if (ctx) animateParticles();

// ── SOUND ──────────────────────────────
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTick() {
  try {
    ensureAudio();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function playUncheck() {
  try {
    ensureAudio();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

// ── DATE UTILS ─────────────────────────
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function formatDate(dateObj) {
  const d = dateObj.getDate().toString().padStart(2, '0');
  const m = MONTHS[dateObj.getMonth()];
  const y = dateObj.getFullYear();

  return `${d} ${m} ${y}`;
}

function getDayLabel(dateObj) {
  return DAYS[dateObj.getDay()];
}

function generateDates(startStr, intervalDays, total) {
  const dates = [];
  const base = new Date(startStr + 'T00:00:00');

  for (let i = 0; i < total; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + (i * intervalDays));
    dates.push(d);
  }

  return dates;
}

// ── STORAGE ────────────────────────────
function saveToStorage() {
  const payload = {
    dates: state.dates.map(d => d.toISOString()),
    checked: state.checked,
    theme: state.theme,
    inputs: {
      startDate: startDateInput.value,
      intervalDays: intervalDaysInput.value,
      totalIntervals: totalIntervalsInput.value
    }
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── PROGRESS ───────────────────────────
function updateProgress() {
  const total = state.dates.length;
  const done = state.checked.filter(Boolean).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  completedCount.textContent = done;
  totalCount.textContent = total;
  percentDisplay.textContent = pct + '%';

  progressFill.style.width = pct + '%';
  progressGlow.style.width = pct + '%';

  if (pct === 0) progressStatus.textContent = 'AWAITING MISSION LAUNCH';
  else if (pct < 25) progressStatus.textContent = 'MISSION INITIATED — STAND BY';
  else if (pct < 50) progressStatus.textContent = 'PROGRESS LOGGED — CONTINUE MISSION';
  else if (pct < 75) progressStatus.textContent = 'HALFWAY MARK CROSSED — SUSTAIN EFFORT';
  else if (pct < 100) progressStatus.textContent = 'APPROACHING COMPLETION — FINAL STRETCH';
  else progressStatus.textContent = '✓ MISSION ACCOMPLISHED — ALL CHECKPOINTS CLEARED';
}

// ── CHECKLIST RENDER ───────────────────
function renderChecklist() {
  checklistContainer.innerHTML = '';

  state.dates.forEach((dateObj, i) => {
    const item = document.createElement('div');

    item.className = 'checklist-item' + (state.checked[i] ? ' completed' : '');

    item.innerHTML = `
      <span class="item-index">${String(i + 1).padStart(2, '0')}</span>
      <div class="custom-checkbox">${state.checked[i] ? '✓' : ''}</div>
      <span class="item-date">${formatDate(dateObj)}</span>
      <span class="item-day">${getDayLabel(dateObj)}</span>
    `;

    item.addEventListener('click', () => toggleItem(i, item));

    checklistContainer.appendChild(item);
  });
}

function toggleItem(index, itemEl) {
  const wasChecked = state.checked[index];
  state.checked[index] = !wasChecked;

  if (!wasChecked) {
    playTick();

    itemEl.classList.add('completed');
    itemEl.querySelector('.custom-checkbox').textContent = '✓';

    const rect = itemEl.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
  } else {
    playUncheck();

    itemEl.classList.remove('completed');
    itemEl.querySelector('.custom-checkbox').textContent = '';
  }

  updateProgress();
  saveToStorage();
}

// ── GENERATE ───────────────────────────
function generateChecklist() {
  const startVal = startDateInput.value;
  const intervalVal = parseInt(intervalDaysInput.value, 10);
  const totalVal = parseInt(totalIntervalsInput.value, 10);

  if (!startVal) return shake(startDateInput);
  if (!intervalVal || intervalVal < 1) return shake(intervalDaysInput);
  if (!totalVal || totalVal < 1) return shake(totalIntervalsInput);

  state.dates = generateDates(startVal, intervalVal, totalVal);
  state.checked = new Array(totalVal).fill(false);

  saveToStorage();
  showChecklist();
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'slideIn 0.2s ease';
  el.style.borderColor = '#ff4466';
  el.style.boxShadow = '0 0 10px rgba(255,68,102,0.3)';

  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 800);
}

function showChecklist() {
  progressPanel.style.display = '';
  checklistPanel.style.display = '';

  renderChecklist();
  updateProgress();

  setTimeout(() => {
    checklistPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

// ── RESET ──────────────────────────────
function resetAll() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;

  clearStorage();

  state.dates = [];
  state.checked = [];

  progressPanel.style.display = 'none';
  checklistPanel.style.display = 'none';
  checklistContainer.innerHTML = '';

  startDateInput.value = '';
  intervalDaysInput.value = '7';
  totalIntervalsInput.value = '10';

  inputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── THEME ──────────────────────────────
function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;

  themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  saveToStorage();
}

if (themeBtns.length) {
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });
}

// ── EXPORT ─────────────────────────────
exportBtn.addEventListener('click', e => {
  e.stopPropagation();
  exportMenu.style.display = exportMenu.style.display === 'none' ? 'flex' : 'none';
});

document.addEventListener('click', () => {
  exportMenu.style.display = 'none';
});

exportPDFBtn.addEventListener('click', async () => {
  exportMenu.style.display = 'none';

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFillColor(232, 224, 208);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(45, 42, 37);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('CHRONO', 70, 22, { align: 'center' });

    doc.setTextColor(204, 34, 34);
    doc.text('.GRID', 112, 22, { align: 'center' });

    doc.setTextColor(120, 110, 95);
    doc.setFontSize(10);
    doc.text('INTERVAL CHECKLIST SYSTEM', 105, 30, { align: 'center' });

    let y = 50;

    state.dates.forEach((dateObj, i) => {
      const checked = state.checked[i];

      doc.setFillColor(245, 240, 230);
      doc.roundedRect(15, y - 5, 180, 10, 2, 2, 'F');

      doc.setTextColor(120, 110, 95);
      doc.setFontSize(9);
      doc.text(String(i + 1).padStart(2, '0'), 22, y + 1);

      if (checked) {
        doc.setFillColor(90, 138, 58);
        doc.roundedRect(30, y - 3, 5, 5, 1, 1, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text('✓', 31.5, y + 1);
      } else {
        doc.setDrawColor(190, 180, 160);
        doc.roundedRect(30, y - 3, 5, 5, 1, 1, 'D');
      }

      doc.setTextColor(45, 42, 37);
      doc.setFontSize(11);
      doc.text(formatDate(dateObj), 42, y + 1);

      doc.setTextColor(120, 110, 95);
      doc.text(getDayLabel(dateObj), 180, y + 1);

      y += 14;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.setTextColor(204, 34, 34);
    doc.setFontSize(10);

    doc.textWithLink('@unfollowaman', 105, 290, {
      align: 'center',
      url: 'https://x.com/unfollowaman'
    });

    doc.save('chrono-grid-checklist.pdf');
  } catch (e) {
    console.error(e);
    alert('PDF export failed.');
  }
});

exportImageBtn.addEventListener('click', async () => {
  exportMenu.style.display = 'none';

  try {
    const screenshotCanvas = await html2canvas(checklistPanel, {
      backgroundColor: null,
      scale: 2,
      logging: false
    });

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 1080;
    finalCanvas.height = 1920;

    const exportCtx = finalCanvas.getContext('2d');

    exportCtx.fillStyle = '#F4B400';
    exportCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    exportCtx.fillStyle = '#0f0f10';
    exportCtx.fillRect(55, 320, 970, 1280);

    const gradient = exportCtx.createLinearGradient(0, 0, finalCanvas.width, 0);
    gradient.addColorStop(0, '#1a1a1d');
    gradient.addColorStop(1, '#202024');

    exportCtx.fillStyle = gradient;
    exportCtx.fillRect(80, 350, 920, 1220);

    const imageWidth = 760;
    const imageHeight = screenshotCanvas.height * (imageWidth / screenshotCanvas.width);

    const imageX = (finalCanvas.width - imageWidth) / 2;
    const imageY = ((1220 - imageHeight) / 2) + 350;

    exportCtx.shadowColor = 'rgba(0,0,0,0.22)';
    exportCtx.shadowBlur = 18;

    exportCtx.drawImage(screenshotCanvas, imageX, imageY, imageWidth, imageHeight);

    exportCtx.shadowBlur = 0;

    exportCtx.textAlign = 'center';

    exportCtx.font = 'bold 72px Alfa Slab One';

    const chronoWidth = exportCtx.measureText('CHRONO').width;
    const gridWidth = exportCtx.measureText('.GRID').width;
    const totalLogoWidth = chronoWidth + gridWidth;
    const logoStartX = (finalCanvas.width - totalLogoWidth) / 2;

    exportCtx.fillStyle = '#CC2222';
    exportCtx.fillText('CHRONO', logoStartX + (chronoWidth / 2), 145);

    exportCtx.fillStyle = '#1f1f1f';
    exportCtx.fillText('.GRID', logoStartX + chronoWidth + (gridWidth / 2), 145);

    exportCtx.fillStyle = '#1f1f1f';
    exportCtx.font = '38px Oswald';
    exportCtx.fillText('INTERVAL CHECKLIST SYSTEM', finalCanvas.width / 2, 220);

    const link = document.createElement('a');
    link.download = 'chrono-grid-showcase.png';
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.error(e);
    alert('Image export failed.');
  }
});

// ── SET DEFAULT DATE ───────────────────
function setDefaultDate() {
  const today = new Date();

  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');

  startDateInput.value = `${y}-${m}-${d}`;
}

// ── INIT / RESTORE ─────────────────────
function init() {
  setDefaultDate();

  const saved = loadFromStorage();

  if (saved) {
    if (saved.theme) applyTheme(saved.theme);

    if (saved.inputs) {
      if (saved.inputs.startDate) startDateInput.value = saved.inputs.startDate;
      if (saved.inputs.intervalDays) intervalDaysInput.value = saved.inputs.intervalDays;
      if (saved.inputs.totalIntervals) totalIntervalsInput.value = saved.inputs.totalIntervals;
    }

    if (saved.dates && saved.dates.length > 0) {
      state.dates = saved.dates.map(iso => new Date(iso));
      state.checked = saved.checked || new Array(state.dates.length).fill(false);

      showChecklist();
    }
  }
}

// ── EVENT LISTENERS ────────────────────
generateBtn.addEventListener('click', generateChecklist);
resetBtn.addEventListener('click', resetAll);

[startDateInput, intervalDaysInput, totalIntervalsInput].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') generateChecklist();
  });
});

// ── BOOT ───────────────────────────────
init();