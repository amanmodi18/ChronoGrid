'use strict';

const state = {
  dates: [],
  checked: []
};

const STORAGE_KEY = 'chronogrid_v1';
const $ = id => document.getElementById(id);

const startDateInput = $('startDate');
const intervalDaysInput = $('intervalDays');
const totalIntervalsInput = $('totalIntervals');
const generateBtn = $('generateBtn');
const resetBtn = $('resetBtn');
const exportBtn = $('exportBtn');
const exportMenu = $('exportMenu');
const exportPDFBtn = $('exportPDF');
const exportImageBtn = $('exportImage');
const checklistContainer = $('checklistContainer');
const progressPanel = $('progressPanel');
const checklistPanel = $('checklistPanel');
const progressFill = $('progressFill');
const progressGlow = $('progressGlow');
const completedCount = $('completedCount');
const totalCount = $('totalCount');
const percentDisplay = $('percentDisplay');
const progressStatus = $('progressStatus');

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function formatDate(dateObj) {
  return `${String(dateObj.getDate()).padStart(2, '0')} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function getDayLabel(dateObj) {
  return DAYS[dateObj.getDay()];
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    dates: state.dates.map(d => d.toISOString()),
    checked: state.checked,
    inputs: {
      startDate: startDateInput.value,
      intervalDays: intervalDaysInput.value,
      totalIntervals: totalIntervalsInput.value
    }
  }));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function updateProgress() {
  const done = state.checked.filter(Boolean).length;
  const total = state.dates.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  completedCount.textContent = done;
  totalCount.textContent = total;
  percentDisplay.textContent = pct + '%';
  progressFill.style.width = pct + '%';
  progressGlow.style.width = pct + '%';

  if (pct === 100) progressStatus.textContent = '✓ MISSION ACCOMPLISHED — ALL CHECKPOINTS CLEARED';
  else progressStatus.textContent = 'MISSION IN PROGRESS';
}

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

    item.addEventListener('click', () => {
      state.checked[i] = !state.checked[i];
      renderChecklist();
      updateProgress();
      saveToStorage();
    });

    checklistContainer.appendChild(item);
  });
}

function generateChecklist() {
  const start = new Date(startDateInput.value + 'T00:00:00');
  const interval = parseInt(intervalDaysInput.value, 10);
  const total = parseInt(totalIntervalsInput.value, 10);

  if (!startDateInput.value || !interval || !total) return;

  state.dates = [];
  state.checked = [];

  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + (i * interval));
    state.dates.push(d);
    state.checked.push(false);
  }

  progressPanel.style.display = '';
  checklistPanel.style.display = '';

  renderChecklist();
  updateProgress();
  saveToStorage();
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

exportBtn.addEventListener('click', e => {
  e.stopPropagation();
  exportMenu.style.display = exportMenu.style.display === 'none' ? 'flex' : 'none';
});

document.addEventListener('click', () => {
  exportMenu.style.display = 'none';
});

exportPDFBtn.addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFillColor(3, 9, 18);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(0, 255, 140);
  doc.setFontSize(20);
  doc.text('CHRONO.GRID — CHECKPOINT LOG', 14, 20);

  let y = 40;

  state.dates.forEach((dateObj, i) => {
    doc.setTextColor(state.checked[i] ? 0 : 220, 255, 200);
    doc.text(`${state.checked[i] ? '✓' : '□'} ${formatDate(dateObj)} — ${getDayLabel(dateObj)}`, 20, y);
    y += 10;
  });

  doc.setFontSize(10);
  doc.setTextColor(0, 255, 140);
  doc.textWithLink('@unfollowaman', 105, 290, {
    align: 'center',
    url: 'https://x.com/unfollowaman'
  });

  doc.save('chrono-grid-checklist.pdf');
});

exportImageBtn.addEventListener('click', async () => {
  try {
    const screenshotCanvas = await html2canvas(checklistPanel, {
      backgroundColor: null,
      scale: 2,
      logging: false
    });

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 1600;
    finalCanvas.height = 2000;

    const ctx = finalCanvas.getContext('2d');

    ctx.fillStyle = '#F4B400';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    ctx.fillStyle = '#0f0f10';
    ctx.fillRect(95, 330, 1410, 1280);

    const gradient = ctx.createLinearGradient(0, 0, finalCanvas.width, 0);
    gradient.addColorStop(0, '#1a1a1d');
    gradient.addColorStop(1, '#202024');

    ctx.fillStyle = gradient;
    ctx.fillRect(125, 365, 1350, 1210);

    const imageWidth = 1120;
    const imageHeight = screenshotCanvas.height * (imageWidth / screenshotCanvas.width);

    const imageX = (finalCanvas.width - imageWidth) / 2;
    const imageY = 500;

    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 30;
    ctx.drawImage(screenshotCanvas, imageX, imageY, imageWidth, imageHeight);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';

    ctx.font = 'bold 96px Alfa Slab One';
    ctx.fillStyle = '#CC2222';
    ctx.fillText('CHRONO', 620, 145);

    ctx.fillStyle = '#1f1f1f';
    ctx.fillText('.GRID', 960, 145);

    ctx.fillStyle = '#1f1f1f';
    ctx.font = '48px Oswald';
    ctx.fillText('INTERVAL CHECKLIST SYSTEM', finalCanvas.width / 2, 220);

    const link = document.createElement('a');
    link.download = 'chrono-grid-showcase.png';
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.error(e);
    alert('Image export failed.');
  }
});

function init() {
  const today = new Date();
  startDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const saved = loadFromStorage();

  if (saved) {
    startDateInput.value = saved.inputs?.startDate || startDateInput.value;
    intervalDaysInput.value = saved.inputs?.intervalDays || '7';
    totalIntervalsInput.value = saved.inputs?.totalIntervals || '10';

    if (saved.dates?.length) {
      state.dates = saved.dates.map(d => new Date(d));
      state.checked = saved.checked || [];
      progressPanel.style.display = '';
      checklistPanel.style.display = '';
      renderChecklist();
      updateProgress();
    }
  }
}

generateBtn.addEventListener('click', generateChecklist);
resetBtn.addEventListener('click', resetAll);

init();