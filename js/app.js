/* navigation, sign-in and boot */
const STATE = { view: 'dashboard', params: {} };
let ME = null;
const ICONS = {
  dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
  roi: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  pipeline: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  reports: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/>',
};
const NAV = [
  { group: null, items: [['dashboard', 'Dashboard', 'dashboard'], ['roi', 'ROI report', 'roi'], ['pipeline', 'Pipeline', 'pipeline'], ['reports', 'Reports', 'reports']] },
  { group: 'Reference', items: [['about', 'Data & method', 'about']] },
];
const PARENT = { dept: 'dashboard' };

function renderNav() {
  const active = PARENT[STATE.view] || STATE.view;
  $('sidebar').innerHTML =
    `<a class="brand" onclick="go('dashboard')" style="cursor:pointer"><img src="assets/logo-white.png" alt="360Medicare" /></a>` +
    NAV.map(sec => `<div class="navgroup">${sec.group ? `<h5>${sec.group}</h5>` : ''}
      ${sec.items.map(([id, label, icon]) => `<button class="navitem ${active === id ? 'active' : ''}" onclick="go('${id}')">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg><span>${label}</span></button>`).join('')}</div>`).join('') +
    `<div class="foot"><b style="color:var(--sidebar-fg)">${esc(ME.name)}</b><br>${esc(ME.title)}<br><button class="lk" style="color:var(--sidebar-muted);margin-top:6px" onclick="logout()">Sign out</button></div>`;
  $('me-avatar').textContent = ME.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  $('me-name').textContent = ME.name;
  $('me-role').textContent = ME.title;
}
function go(view, params, noHash) {
  STATE.view = VIEWS[view] ? view : 'dashboard'; STATE.params = params || {};
  document.getElementById('sidebar').classList.remove('open');
  if (!noHash) { try { history.pushState(null, '', '#' + encodeURIComponent(JSON.stringify([STATE.view, STATE.params]))); } catch (e) {} }
  window.scrollTo({ top: 0 });
  render();
}
function render() { if (!ME || !D) return; renderNav(); VIEWS[STATE.view](); }
window.addEventListener('popstate', () => { applyHash(); render(); });
function applyHash() {
  try { const [v, p] = JSON.parse(decodeURIComponent(location.hash.slice(1))); STATE.view = VIEWS[v] ? v : 'dashboard'; STATE.params = p || {}; }
  catch (e) { STATE.view = 'dashboard'; STATE.params = {}; }
}
function profileMenu() {
  modal({ title: ME.name, desc: ME.title, submitLabel: 'Sign out', fields: [],
    extra: '<div class="sm muted">Signed in. Your session ends when you sign out or close this tab.</div>', onSubmit: () => logout() });
}
function toggleTheme() {
  const el = document.documentElement, next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  el.setAttribute('data-theme', next);
  try { localStorage.setItem('m360.theme', next); } catch (e) {}
}

/* ---- sign-in -------------------------------------------------------------
   The September figures are published only as encrypted files (data.enc.json).
   A person's password is the key: it is stretched with PBKDF2 and used to decrypt
   their own copy in the browser. A wrong password simply fails to decrypt.      */
const PEOPLE = {
  muneer: { name: 'Muneer', title: 'CMO' },
  austin: { name: 'Austin', title: 'Operational Manager' },
  sharon: { name: 'Sharon', title: 'HR and Ops' },
  yasir: { name: 'Yasir Hussain', title: 'IT Admin' },
};
const unb64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
async function deriveKey(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
async function decryptFor(user, key, blobs) {
  const b = blobs.users[user];
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv) }, key, unb64(b.ct));
  return JSON.parse(new TextDecoder().decode(buf));
}
async function loadBlobs() { const r = await fetch('data.enc.json', { cache: 'no-store' }); if (!r.ok) throw new Error('Data file not found'); return r.json(); }

async function doLogin(ev) {
  ev.preventDefault();
  const btn = $('lbtn'), err = $('lerr'); err.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
  const user = $('lu').value.trim().toLowerCase(), pw = $('lp').value;
  try {
    if (!window.crypto || !crypto.subtle) throw new Error('Open this site over https:// (secure connection required).');
    const blobs = await loadBlobs();
    if (!PEOPLE[user] || !blobs.users[user]) throw new Error('Wrong username or password.');
    const key = await deriveKey(pw, unb64(blobs.users[user].salt), blobs.iter);
    let data; try { data = await decryptFor(user, key, blobs); } catch (e) { throw new Error('Wrong username or password.'); }
    try { sessionStorage.setItem('m360.s', JSON.stringify({ user, key: await crypto.subtle.exportKey('jwk', key) })); } catch (e) {}
    $('lp').value = ''; start(user, data);
  } catch (e) { err.textContent = e.message; }
  btn.disabled = false; btn.textContent = 'Sign in';
}
function start(user, data) {
  ME = PEOPLE[user]; D = data;
  $('login').classList.add('hidden');
  $('asof').textContent = D.period.label;
  applyHash(); render();
}
function logout() {
  try { sessionStorage.removeItem('m360.s'); } catch (e) {}
  ME = null; D = null; history.replaceState(null, '', location.pathname);
  $('view').innerHTML = ''; $('sidebar').innerHTML = ''; closeModal(); showLogin();
}
function showLogin() { $('login').classList.remove('hidden'); setTimeout(() => $('lu').focus(), 50); }

(async function boot() {
  try { const t = localStorage.getItem('m360.theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  // keep the person signed in across a page refresh (this browser tab only)
  try {
    const s = JSON.parse(sessionStorage.getItem('m360.s') || 'null');
    if (s && PEOPLE[s.user]) {
      const key = await crypto.subtle.importKey('jwk', s.key, 'AES-GCM', false, ['decrypt']);
      return start(s.user, await decryptFor(s.user, key, await loadBlobs()));
    }
  } catch (e) { try { sessionStorage.removeItem('m360.s'); } catch (x) {} }
  showLogin();
})();
