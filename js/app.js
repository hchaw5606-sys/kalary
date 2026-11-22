/* Kalary — Transaction Photos PWA (mobile + desktop) */
import { STR, LANGS, CURRENCIES } from './i18n.js';
import { DB, uid } from './db.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}
const LS = { lang: 'kalary-lang', theme: 'kalary-theme', currency: 'kalary-currency', view: 'kalary-view' };

let lang = localStorage.getItem(LS.lang) || 'ku';
let theme = localStorage.getItem(LS.theme) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let currency = localStorage.getItem(LS.currency) || 'IQD';
let items = [];
let filterType = 'all', filterCat = 'all', searchQ = '', sortBy = 'new', gridMode = false;
let editingId = null, pendingPhoto = null; // {blob, dataUrl}
let currentDetail = null, camStream = null;

const t = () => STR[lang];
const fmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString(lang === 'en' ? 'en-US' : 'ar-IQ', { maximumFractionDigits: 2 }) + ' ' + currency;
};
const fmtDate = (iso) => {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-IQ-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
};
const todayISO = () => new Date().toISOString().slice(0, 10);

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------- i18n / theme ---------- */
function applyLang() {
  const s = t();
  document.documentElement.lang = lang;
  document.documentElement.dir = s.dir;
  $('#appTitle').textContent = s.appName;
  $('#appSub').textContent = s.appSub;
  $('#lblBalance').textContent = s.balance;
  $('#lblIncome').textContent = s.income;
  $('#lblExpense').textContent = s.expense;
  $('#lblCount').textContent = s.items;
  $('#lblPhotos').textContent = s.photo;
  $('#lblAvg').textContent = s.total;
  $('#lblRecent').textContent = s.recent;
  $('#seeAllBtn').textContent = s.seeAll + ' →';
  $('#emptyTitle').textContent = s.noData;
  $('#emptyHint').textContent = s.noDataHint;
  $('#listEmptyTitle').textContent = s.noData;
  $('#searchInput').placeholder = s.search;
  $('#lblByCat').textContent = s.byCategory;
  $('#lblByMonth').textContent = s.byMonth;
  $('#lblSummary').textContent = s.total;
  $('#lblLang').textContent = s.language;
  $('#lblTheme').textContent = s.theme;
  $('#lblCurrency').textContent = s.currency;
  $('#lblStorage').textContent = s.storage;
  $('#lblOffline').textContent = s.offline;
  $('#lblClear').textContent = s.clearAll;
  $('#versionLine').textContent = s.version;
  $('#installTitle').textContent = '📲 ' + s.install;
  $('#installHint').textContent = s.installHint;
  $('#photoHint').textContent = s.photoAdded + ' ...';
  $$('[data-i]').forEach(el => { const k = el.dataset.i; if (s[k]) el.textContent = s[k]; });
  $$('#sortSelect option').forEach(o => { if (s[o.dataset.i]) o.textContent = s[o.dataset.i]; });
  $('#langSelect').value = lang;
  buildCatChips(); buildCategorySelect(); buildCurrencySelects();
  render();
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  $('#themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('#themeSelect').value = theme;
  localStorage.setItem(LS.theme, theme);
}
function buildCurrencySelects() {
  const opts = CURRENCIES.map(c => `<option value="${c}">${c}</option>`).join('');
  $('#currencySelect').innerHTML = opts; $('#currencySelect').value = currency;
  $('#fCurrency').innerHTML = opts; $('#fCurrency').value = currency;
}
function buildCategorySelect() {
  const cats = Object.entries(t().categories);
  $('#fCategory').innerHTML = cats.map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
}
function buildCatChips() {
  const cats = Object.entries(t().categories);
  $('#catChips').innerHTML = `<button class="chip ${filterCat === 'all' ? 'on' : ''}" data-cat="all">${t().all}</button>` +
    cats.map(([k, v]) => `<button class="chip ${filterCat === k ? 'on' : ''}" data-cat="${k}">${v}</button>`).join('');
  $$('#catChips .chip').forEach(c => c.onclick = () => { filterCat = c.dataset.cat; buildCatChips(); renderList(); });
}

/* ---------- data ---------- */
async function load() { items = await DB.all(); render(); }
function totals() {
  let inc = 0, exp = 0;
  items.forEach(i => { if (i.type === 'income') inc += Number(i.amount) || 0; else exp += Number(i.amount) || 0; });
  return { inc, exp, bal: inc - exp };
}
function filtered() {
  let list = [...items];
  if (filterType !== 'all') list = list.filter(i => i.type === filterType);
  if (filterCat !== 'all') list = list.filter(i => i.category === filterCat);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter(i => (i.title || '').toLowerCase().includes(q) || (i.person || '').toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q));
  }
  const byDate = (a, b) => (a.date || '').localeCompare(b.date || '');
  if (sortBy === 'new') list.sort((a, b) => byDate(b, a));
  else if (sortBy === 'old') list.sort((a, b) => byDate(a, b));
  else if (sortBy === 'high') list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  else list.sort((a, b) => (a.amount || 0) - (b.amount || 0));
  return list;
}

/* ---------- render ---------- */
function txCard(i) {
  const s = t();
  const img = i.photoDataUrl ? `<img class="thumb" src="${i.photoDataUrl}" alt="">` : `<div class="noimg">🧾</div>`;
  const sign = i.type === 'income' ? '+' : '−';
  const cls = i.type === 'income' ? 'pos' : 'neg';
  return `<button class="tx-card" data-id="${i.id}">${img}
    <span class="body"><span class="t">${escapeHtml(i.title)}</span>
    <span class="m">${s.categories[i.category] || i.category} · ${fmtDate(i.date)}${i.person ? ' · ' + escapeHtml(i.person) : ''}</span></span>
    <span class="amt ${cls}">${sign} ${fmt(i.amount)}<small>${i.currency || currency}</small></span></button>`;
}
function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function render() {
  const { inc, exp, bal } = totals();
  $('#heroBalance').textContent = fmt(bal);
  $('#heroIncome').textContent = fmt(inc);
  $('#heroExpense').textContent = fmt(exp);
  $('#statCount').textContent = items.length;
  $('#statPhotos').textContent = items.filter(i => i.photoDataUrl).length;
  $('#statAvg').textContent = items.length ? fmt((inc + exp) / items.length) : fmt(0);
  const recent = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  $('#recentList').innerHTML = recent.map(txCard).join('');
  $('#homeEmpty').classList.toggle('hidden', items.length > 0);
  $('#recentList').classList.toggle('hidden', items.length === 0);
  bindCards($('#recentList'));
  renderList(); renderStats();
}
function renderList() {
  const list = filtered();
  const el = $('#fullList');
  el.className = gridMode ? 'grid-view' : 'tx-list';
  el.innerHTML = list.map(txCard).join('');
  $('#listEmpty').classList.toggle('hidden', list.length > 0);
  bindCards(el);
}
function bindCards(root) {
  root.querySelectorAll('.tx-card').forEach(c => c.onclick = () => openDetail(c.dataset.id));
}
function renderStats() {
  const s = t();
  const byCat = {};
  items.forEach(i => { byCat[i.category] = (byCat[i.category] || 0) + (Number(i.amount) || 0); });
  const max = Math.max(1, ...Object.values(byCat));
  $('#catBars').innerHTML = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<div class="bar-row"><span>${s.categories[k] || k}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / max * 100)}%"></div></div><b>${fmt(v)}</b></div>`).join('') || `<p style="color:var(--muted)">${s.noData}</p>`;
  // monthly chart
  const months = {};
  items.forEach(i => { const m = (i.date || '').slice(0, 7); if (m) months[m] = (months[m] || 0) + (Number(i.amount) || 0); });
  const keys = Object.keys(months).sort().slice(-6);
  const cv = $('#monthChart'), ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!keys.length) { ctx.fillStyle = '#94a3b8'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.noData, cv.width / 2, cv.height / 2); }
  else {
    const mMax = Math.max(1, ...keys.map(k => months[k]));
    const bw = cv.width / keys.length;
    keys.forEach((k, idx) => {
      const h = (months[k] / mMax) * (cv.height - 50);
      const x = idx * bw + bw * 0.2, y = cv.height - 30 - h;
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#14b8a6'); g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, bw * 0.6, h, 8); ctx.fill();
      ctx.fillStyle = '#64748b'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(k.slice(5), x + bw * 0.3, cv.height - 10);
    });
  }
  const { inc, exp, bal } = totals();
  $('#summaryBox').innerHTML = `<dl class="kv">
    <dt>${s.income}</dt><dd class="pos">${fmt(inc)}</dd>
    <dt>${s.expense}</dt><dd class="neg">${fmt(exp)}</dd>
    <dt>${s.balance}</dt><dd>${fmt(bal)}</dd>
    <dt>${s.count}</dt><dd>${items.length} ${s.items}</dd></dl>`;
}

/* ---------- navigation ---------- */
function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  $$('.bottomnav button').forEach(b => b.classList.toggle('on', b.dataset.view === name));
  localStorage.setItem(LS.view, name);
  if (name === 'stats') renderStats();
  window.scrollTo({ top: 0 });
}
$$('.bottomnav button').forEach(b => b.onclick = () => showView(b.dataset.view));
$('#seeAllBtn').onclick = () => showView('list');
$('#fabBtn').onclick = () => openForm();
$('#themeBtn').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); };
$('#langBtn').onclick = () => { const i = LANGS.findIndex(l => l.code === lang); lang = LANGS[(i + 1) % LANGS.length].code; localStorage.setItem(LS.lang, lang); applyLang(); };
$('#langSelect').onchange = (e) => { lang = e.target.value; localStorage.setItem(LS.lang, lang); applyLang(); };
$('#themeSelect').onchange = (e) => { theme = e.target.value; applyTheme(); };
$('#currencySelect').onchange = (e) => { currency = e.target.value; localStorage.setItem(LS.currency, currency); buildCurrencySelects(); render(); };
$('#searchInput').oninput = (e) => { searchQ = e.target.value; renderList(); };
$('#sortSelect').onchange = (e) => { sortBy = e.target.value; renderList(); };
$('#viewToggle').onclick = () => { gridMode = !gridMode; $('#viewToggle').textContent = gridMode ? '☰' : '⊞'; renderList(); };
$$('#typeChips .chip').forEach(c => c.onclick = () => { filterType = c.dataset.type; $$('#typeChips .chip').forEach(x => x.classList.toggle('on', x === c)); renderList(); });

/* ---------- form ---------- */
let formType = 'expense';
function setFormType(tp) {
  formType = tp;
  $('#typeIncome').className = tp === 'income' ? 'on-inc' : '';
  $('#typeExpense').className = tp === 'expense' ? 'on-exp' : '';
}
$('#typeIncome').onclick = () => setFormType('income');
$('#typeExpense').onclick = () => setFormType('expense');

function openForm(item = null) {
  editingId = item ? item.id : null;
  pendingPhoto = null;
  $('#formTitle').textContent = item ? '✏️ ' + t().edit : '➕ ' + t().add;
  $('#fTitle').value = item?.title || '';
  $('#fAmount').value = item?.amount ?? '';
  $('#fCurrency').value = item?.currency || currency;
  $('#fCategory').value = item?.category || 'other';
  $('#fPerson').value = item?.person || '';
  $('#fDate').value = item?.date || todayISO();
  $('#fNotes').value = item?.notes || '';
  setFormType(item?.type || 'expense');
  if (item?.photoDataUrl) showPhotoPreview(item.photoDataUrl); else hidePhotoPreview();
  $('#formOverlay').classList.add('open');
}
function closeForm() { $('#formOverlay').classList.remove('open'); }
$('#formCancel').onclick = closeForm;
$('#formOverlay').addEventListener('click', (e) => { if (e.target.id === 'formOverlay') closeForm(); });

function showPhotoPreview(url) {
  $('#photoPreview').src = url; $('#photoPreview').classList.remove('hidden');
  $('#photoPlaceholder').classList.add('hidden'); $('#removePhotoBtn').classList.remove('hidden');
}
function hidePhotoPreview() {
  $('#photoPreview').classList.add('hidden'); $('#photoPreview').src = '';
  $('#photoPlaceholder').classList.remove('hidden'); $('#removePhotoBtn').classList.add('hidden');
}
$('#removePhotoBtn').onclick = () => { pendingPhoto = null; hidePhotoPreview(); };

async function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const dataUrl = await compressImage(file);
  pendingPhoto = { dataUrl };
  showPhotoPreview(dataUrl);
  toast(t().photoAdded);
}
function compressImage(file, max = 1600, quality = 0.82) {
  return new Promise((res) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}
$('#galleryBtn').onclick = () => $('#galleryInput').click();
$('#camBtn').onclick = () => openCamera();
$('#galleryInput').onchange = (e) => handleFile(e.target.files[0]);
$('#cameraInput').onchange = (e) => handleFile(e.target.files[0]);

$('#formSave').onclick = async () => {
  const title = $('#fTitle').value.trim();
  const amount = parseFloat($('#fAmount').value);
  if (!title || isNaN(amount)) { toast(t().required); return; }
  const existing = editingId ? await DB.get(editingId) : null;
  const item = {
    id: editingId || uid(),
    title, amount, currency: $('#fCurrency').value, type: formType,
    category: $('#fCategory').value, person: $('#fPerson').value.trim(),
    date: $('#fDate').value || todayISO(), notes: $('#fNotes').value.trim(),
    photoDataUrl: pendingPhoto ? pendingPhoto.dataUrl : (existing?.photoDataUrl || null),
    createdAt: existing?.createdAt || Date.now(), updatedAt: Date.now()
  };
  try { await DB.put(item); await load(); closeForm(); toast(t().saved); }
  catch (e) { console.error(e); toast(t().error); }
};

/* ---------- camera (live) ---------- */
async function openCamera() {
  $('#cameraOverlay').classList.add('open');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    $('#camVideo').srcObject = camStream;
  } catch (e) {
    // Fallback to file capture on mobile browsers
    closeCamera(); $('#cameraInput').click();
  }
}
function closeCamera() {
  $('#cameraOverlay').classList.remove('open');
  if (camStream) { camStream.getTracks().forEach(tr => tr.stop()); camStream = null; }
}
$('#camCancel').onclick = closeCamera;
$('#camShutter').onclick = () => {
  const v = $('#camVideo'), cv = $('#camCanvas');
  cv.width = v.videoWidth || 1280; cv.height = v.videoHeight || 720;
  cv.getContext('2d').drawImage(v, 0, 0);
  cv.toBlob(async (blob) => {
    if (blob) { const dataUrl = await compressImage(blob); pendingPhoto = { dataUrl }; showPhotoPreview(dataUrl); toast(t().photoAdded); }
    closeCamera();
  }, 'image/jpeg', 0.85);
};

/* ---------- detail ---------- */
async function openDetail(id) {
  const item = await DB.get(id); if (!item) return;
  currentDetail = item;
  const s = t();
  $('#detailTitle').textContent = '🧾 ' + item.title;
  if (item.photoDataUrl) { $('#detailImg').src = item.photoDataUrl; $('#detailImg').classList.remove('hidden'); $('#detailNoImg').classList.add('hidden'); }
  else { $('#detailImg').classList.add('hidden'); $('#detailNoImg').classList.remove('hidden'); }
  $('#detailKv').innerHTML = `
    <dt>${s.amount}</dt><dd class="${item.type === 'income' ? 'pos' : 'neg'}">${item.type === 'income' ? '+' : '−'} ${fmt(item.amount)}</dd>
    <dt>${s.type}</dt><dd>${item.type === 'income' ? s.income : s.expense}</dd>
    <dt>${s.category}</dt><dd>${s.categories[item.category] || item.category}</dd>
    <dt>${s.date}</dt><dd>${fmtDate(item.date)}</dd>
    ${item.person ? `<dt>${s.person}</dt><dd>${escapeHtml(item.person)}</dd>` : ''}
    ${item.notes ? `<dt>${s.notes}</dt><dd>${escapeHtml(item.notes)}</dd>` : ''}`;
  $('#detailOverlay').classList.add('open');
}
$('#detailClose').onclick = () => $('#detailOverlay').classList.remove('open');
$('#detailOverlay').addEventListener('click', (e) => { if (e.target.id === 'detailOverlay') $('#detailOverlay').classList.remove('open'); });
$('#detailEdit').onclick = () => { $('#detailOverlay').classList.remove('open'); openForm(currentDetail); };
$('#detailDelete').onclick = async () => {
  if (!confirm(t().confirmDelete)) return;
  await DB.del(currentDetail.id); await load();
  $('#detailOverlay').classList.remove('open'); toast(t().deleted);
};
$('#detailDownload').onclick = () => {
  if (!currentDetail?.photoDataUrl) return;
  const a = document.createElement('a');
  a.href = currentDetail.photoDataUrl; a.download = `kalary-${currentDetail.date}-${currentDetail.id}.jpg`; a.click();
};
$('#detailShare').onclick = async () => {
  const i = currentDetail; if (!i) return;
  const text = `${i.title} — ${i.type === 'income' ? '+' : '−'}${fmt(i.amount)} (${fmtDate(i.date)})`;
  try {
    if (i.photoDataUrl && navigator.share) {
      const blob = await (await fetch(i.photoDataUrl)).blob();
      const file = new File([blob], `kalary-${i.id}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    }
    if (navigator.share) await navigator.share({ title: i.title, text });
    else { await navigator.clipboard.writeText(text); toast('✓'); }
  } catch { /* user cancelled */ }
};

/* ---------- backup / export / import ---------- */
function downloadText(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('#exportJsonBtn').onclick = () => { downloadText(`kalary-backup-${todayISO()}.json`, JSON.stringify(items, null, 2)); toast(t().backupDone); };
$('#exportCsvBtn').onclick = () => {
  const head = 'title,amount,currency,type,category,person,date,notes\n';
  const rows = items.map(i => [i.title, i.amount, i.currency, i.type, i.category, i.person, i.date, `"${(i.notes || '').replace(/"/g, '""')}"`].join(',')).join('\n');
  downloadText(`kalary-${todayISO()}.csv`, head + rows, 'text/csv'); toast(t().backupDone);
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data)) throw new Error('bad');
    for (const it of data) { if (it && it.title) await DB.put({ ...it, id: it.id || uid() }); }
    await load(); toast(t().saved);
  } catch { toast(t().error); }
  e.target.value = '';
};
$('#clearBtn').onclick = async () => {
  if (!confirm(t().clearConfirm)) return;
  await DB.clear(); await load(); toast(t().deleted);
};

/* ---------- PWA install + SW ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('#installBanner').classList.add('show'); });
$('#installBanner').onclick = async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBanner').classList.remove('show'); }
};
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ---------- seed demo data (first run) ---------- */
async function seedIfEmpty() {
  if (items.length) return;
  const demo = [
    { title: 'پسوولەی بازاڕ — خواردن', amount: 45000, type: 'expense', category: 'food', person: 'سوپەرمارکێت', date: todayISO(), notes: 'نموونە — دەتوانیت بیسڕیتەوە' },
    { title: 'مووچە', amount: 850000, type: 'income', category: 'work', person: 'کۆمپانیا', date: todayISO(), notes: 'نموونە' },
    { title: 'پسوولەی کارەبا', amount: 32000, type: 'expense', category: 'bills', person: 'وەزارەتی کارەبا', date: todayISO(), notes: 'نموونە' }
  ];
  for (const d of demo) await DB.put({ ...d, id: uid(), currency: 'IQD', photoDataUrl: null, createdAt: Date.now(), updatedAt: Date.now() });
  await load();
}

/* ---------- init ---------- */
applyTheme();
applyLang();
showView(localStorage.getItem(LS.view) || 'home');
await load();
await seedIfEmpty();
