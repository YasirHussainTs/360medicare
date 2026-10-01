/* =====================================================================
   navigation, search, boot
   ===================================================================== */
const ICONS = {
  dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
  leads: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  contacts: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
  deals: '<path d="M11 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v4"/><path d="m15 19 2 2 4-4"/>',
  myday: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18m-11 6 2 2 4-4"/>',
  vacancies: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  clients: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h2m-2 4h2m4-4h2m-2 4h2M9 21v-4h6v4"/>',
  tickets: '<circle cx="12" cy="12" r="9"/><path d="M12 17v.01M12 13.5a2 2 0 1 0-2-3.5"/>',
  assets: '<rect x="2" y="4" width="20" height="12" rx="2"/><path d="M2 20h20"/>',
  marketing: '<path d="m3 11 18-6v14L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  budgets: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
  ask: '<path d="m12 3 1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 16v4M17 18h4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  integrations: '<path d="M9 2v6M15 2v6"/><rect x="6" y="8" width="12" height="7" rx="2"/><path d="M12 15v3a4 4 0 0 0 4 4h1"/>',
  automations: '<path d="M13 2 4.5 13H11l-1 9 8.5-11H12z"/>',
  talent: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 2 2 4-4"/>',
  portal: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M7 14h5"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  reports: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  people: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.35.4.64.73.83"/>',
};
/**
 * Navigation is generated from the signed-in person's permission keys, so nobody sees a
 * door they cannot open. Hiding is a courtesy; the real app also enforces every one of
 * these on the server.
 */
const NAV = [
  { group: null, items: [
    ['dashboard', 'Dashboard', 'dashboard', null],
    ['ask', 'Ask 360', 'ask', 'crm.view'],
  ] },
  { group: 'CRM', items: [
    ['leads', 'Leads', 'leads', 'crm.view'], ['contacts', 'Contacts', 'contacts', 'crm.view'],
    ['deals', 'Deals', 'deals', 'crm.view'], ['myday', 'My day', 'myday', 'crm.view'],
  ] },
  { group: 'Recruitment', items: [
    ['vacancies', 'Vacancies', 'vacancies', 'recruitment.manage'],
    ['clients', 'Clients', 'clients', 'recruitment.manage'],
    ['talent', 'Talent pool', 'talent', 'recruitment.manage'],
    ['portalrequests', 'Client requests', 'portal', 'recruitment.manage'],
    ['clientaccess', 'Portal access', 'contacts', 'recruitment.manage'],
  ] },
  { group: 'Operations', items: [
    ['tickets', 'IT Support', 'tickets', 'ticket.create'],
    ['assets', 'IT Assets', 'assets', 'asset.manage'],
    ['marketing', 'Marketing', 'marketing', 'marketing.request_create'],
    ['budgets', 'Budgets & approvals', 'budgets', 'budget.view'],
    ['calendar', 'Tasks & meetings', 'calendar', 'crm.view'],
    ['chat', 'Chat', 'chat', null],
  ] },
  { group: 'Insight', items: [
    ['reports', 'Reports', 'reports', 'report.view'],
    ['people', 'People', 'people', 'user.manage'],
    ['settings', 'Settings', 'settings', 'settings.manage'],
    ['integrations', 'Integrations', 'integrations', 'settings.manage'],
    ['automations', 'Automations', 'automations', 'settings.manage'],
  ] },
];
/** A view the current user cannot open. Never reached through the nav — only by URL/state. */
const VIEW_PERMISSION = {
  leads: 'crm.view', lead: 'crm.view', contacts: 'crm.view', contact: 'crm.view', deals: 'crm.view', myday: 'crm.view',
  vacancies: 'recruitment.manage', vacancy: 'recruitment.manage', clients: 'recruitment.manage',
  assets: 'asset.manage', marketing: 'marketing.request_create', budgets: 'budget.view',
  reports: 'report.view', people: 'user.manage', settings: 'settings.manage',
  ask: 'crm.view', calendar: 'crm.view', integrations: 'settings.manage', automations: 'settings.manage',
  talent: 'recruitment.manage', portalrequests: 'recruitment.manage', clientaccess: 'recruitment.manage',
};
const VIEWS = {
  dashboard: viewDashboard, leads: viewLeads, lead: viewLead, contacts: viewContacts, contact: viewContact,
  deals: viewDeals, myday: viewMyDay, vacancies: viewVacancies, vacancy: viewVacancy, clients: viewClients,
  tickets: viewTickets, ticket: viewTicket, assets: viewAssets, marketing: viewMarketing,
  reports: viewReports, people: viewPeople, settings: viewSettings, chat: viewChat, budgets: viewBudgets,
  ask: viewAsk, calendar: viewCalendar, integrations: viewIntegrations, automations: viewAutomations,
  talent: viewTalent, portalrequests: viewPortalRequests, clientaccess: viewClientAccess, portal: viewPortal,
};
const PARENT = { lead: 'leads', contact: 'contacts', vacancy: 'vacancies', ticket: 'tickets' };

const LOGO_WHITE = 'assets/logo-white.png';

function renderNav() {
  const counts = {
    myday: DB.activities.filter(a => a.owner === ME.id && a.status === 'OPEN' && overdue(a.due)).length,
    tickets: DB.tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status) && (isITAgent() || t.requester === ME.id)).length,
    vacancies: DB.vacancies.filter(v => v.status === 'OPEN').length,
    budgets: canApproveBudget() ? DB.budgets.filter(b => b.status === 'SUBMITTED').length : 0,
    portalrequests: DB.requests.filter(r => r.status === 'NEW').length,
    calendar: DB.activities.filter(a => a.owner === ME.id && a.status === 'OPEN' && overdue(a.due)).length,
  };
  const active = PARENT[STATE.view] || STATE.view;
  $('sidebar').innerHTML =
    `<a class="brand" onclick="go('dashboard')" style="cursor:pointer"><img src="${LOGO_WHITE}" alt="360Medicare" /></a>` +
    NAV.map(sec => {
      const items = sec.items.filter(([, , , perm]) => !perm || can(perm));
      if (!items.length) return '';
      return `<div class="navgroup">${sec.group ? `<h5>${sec.group}</h5>` : ''}
      ${items.map(([id, label, icon]) => `<button class="navitem ${active === id ? 'active' : ''}" onclick="go('${id}')">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg>
        <span>${label}</span>${counts[id] ? `<span class="count">${counts[id]}</span>` : ''}</button>`).join('')}
    </div>`;
    }).join('') +
    `<div class="foot"><b style="color:var(--sidebar-fg)">${esc(ME.name)}</b><br>${esc(ME.title)}<br><span style="opacity:.7">${ME.scope === 'ALL' ? 'Sees the whole company' : ME.scope === 'DEPARTMENT' ? 'Sees ' + dept(ME.dept).name : 'Sees own records only'}</span></div>`;
  $('me-avatar').textContent = initials(ME.name);
  $('me-name').textContent = ME.name;
  $('me-role').textContent = ME.title;
}
function go(view, params) {
  STATE.view = view; STATE.params = params || {};
  if (!PARENT[view]) { STATE.page = 1; if (!params || !params.keepFilters) { /* keep explicit filters set by callers */ } }
  if (params && params.cat) STATE.filters = { cat: params.cat };
  if (params && params.status) STATE.filters = { status: params.status };
  if (params && params.priority) STATE.filters = { priority: params.priority };
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo({ top: 0 });
  render();
}
function render() {
  if (STATE.view === 'portal') { viewPortal(); return; }
  document.body.classList.remove('portal-mode');
  renderNav();
  const need = VIEW_PERMISSION[STATE.view];
  if (need && !can(need)) {
    $('view').innerHTML = pageHeader('Not available to your account') +
      `<div class="card"><div class="card-b stack muted" style="gap:8px">
        <div>${esc(ME.name)} (${esc(ME.title)}) does not hold the <b>${need}</b> permission, so this module is hidden.</div>
        <div>That is the access model doing its job rather than an error — the same check runs on the server, so the data never leaves it either.</div>
        <div><button class="btn ghost" onclick="go('dashboard')">Back to dashboard</button></div>
      </div></div>`;
    return;
  }
  (VIEWS[STATE.view] || viewDashboard)();
}

function globalSearch(q) {
  const box = $('searchres');
  if (!q || q.length < 2) { box.innerHTML = ''; return; }
  const t = q.toLowerCase();
  const hits = [
    ...DB.people.filter(p => p.name.toLowerCase().includes(t) || p.phone.includes(t)).slice(0, 4).map(p => ({ label: p.name, sub: 'Contact · ' + p.phone, go: `go('contact',{id:'${p.id}'})` })),
    ...DB.vacancies.filter(v => v.title.toLowerCase().includes(t)).slice(0, 3).map(v => ({ label: v.title, sub: 'Vacancy · ' + v.code, go: `go('vacancy',{id:'${v.id}'})` })),
    ...DB.tickets.filter(x => x.title.toLowerCase().includes(t)).slice(0, 3).map(x => ({ label: x.title, sub: 'Ticket · ' + x.code, go: `go('ticket',{id:'${x.id}'})` })),
  ].slice(0, 8);
  box.innerHTML = hits.length ? `<div class="card" style="position:absolute;top:38px;left:0;right:0;z-index:50;max-height:320px;overflow:auto">
    ${hits.map(h => `<div style="padding:9px 12px;border-bottom:1px solid var(--border);cursor:pointer" onclick="${h.go};document.getElementById('globalsearch').value='';document.getElementById('searchres').innerHTML=''">
      <b style="font-size:13px">${esc(h.label)}</b><div class="xs muted">${esc(h.sub)}</div></div>`).join('')}</div>` : '';
}
function showNotifications() {
  modal({ title: 'Notifications', fields: [], submitLabel: 'Mark all read',
    extra: DB.notifications.map(n => `<div style="padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:13px">${esc(n.text)}</div><div class="xs muted">${rel(n.at)}</div></div>`).join(''),
    onSubmit: () => { DB.notifications.forEach(n => n.read = true); save(); closeModal(); toast('All notifications marked read'); } });
}
function switchUser() {
  modal({ title: 'Switch account', desc: 'Same screens, different permissions and data scope. This is the access model, not a UI trick.',
    submitLabel: 'Switch',
    fields: [{ name: 'id', label: 'Employee', type: 'select', full: true, value: ME.id, options: USERS.map(u => ({ value: u.id, label: u.name + ' — ' + u.title + ' (' + { OWN: 'own records', DEPARTMENT: 'department', ALL: 'whole company' }[u.scope] + ')' })) }],
    onSubmit: v => { closeModal(); signInAs(v.id); } });
}
function profileMenu() {
  const perms = ME.role === 'ADMIN' ? ['every permission key'] : (ME.perms || []);
  modal({ title: ME.name, desc: ME.title + ' · ' + ME.email, submitLabel: 'Switch account', fields: [],
    extra: `<div class="stack" style="gap:10px">
      <div class="spread sm"><span class="muted">Role</span>${badge(ME.role.toLowerCase(), ME.role === 'ADMIN' ? 'primary' : 'neutral')}</div>
      <div class="spread sm"><span class="muted">Data scope</span><span>${{ OWN: 'Own records only', DEPARTMENT: dept(ME.dept).name + ' only', ALL: 'Whole company' }[ME.scope]}</span></div>
      <div><div class="muted sm" style="margin-bottom:5px">Permissions</div><div class="row" style="gap:5px">${perms.map(p => badge(p)).join('')}</div></div>
      <div class="xs muted">Everything on screen — the sidebar, the buttons, the rows in every table — is derived from this list.</div>
    </div>`,
    onSubmit: () => { closeModal(); switchUser(); } });
}
function signInAs(id) {
  ME = USERS.find(u => u.id === id); save(); go('dashboard');
  toast('Now viewing as ' + ME.name + ' — ' + (ME.scope === 'ALL' ? 'whole company' : ME.scope === 'DEPARTMENT' ? dept(ME.dept).name + ' only' : 'own records only'));
}
function toggleTheme() {
  const el = document.documentElement;
  const next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  el.setAttribute('data-theme', next);
  try { localStorage.setItem('m360demo.theme', next); } catch (e) {}
  render();
}
document.addEventListener('click', e => { if (!e.target.closest('.searchwrap')) $('searchres').innerHTML = ''; });
// Enter in the top search sends the phrase to Ask 360 — one box for both jumping and asking.
$('globalsearch').addEventListener?.('keydown', e => {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim();
  if (!q) return;
  e.target.value = ''; $('searchres').innerHTML = '';
  go('ask'); runAsk(q);
});

/* boot */
(function () {
  try { const t = localStorage.getItem('m360demo.theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  if (!load()) { DB = build(); ME = USERS[1]; save(); }
  render();
  setTimeout(() => toast('Signed in as ' + ME.name + ' · ' + ME.title), 600);
})();
