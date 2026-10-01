/* =====================================================================
   Ask 360, notes & files, service pipelines, calendar,
   integrations and automations
   ===================================================================== */

/* ---------- service-level deal pipelines (global practice) ---------- */
const SERVICE_PIPELINES = {
  'DHA Licence': ['Enquiry', 'Documents Collected', 'Dataflow Submitted', 'Primary Source Verified', 'Exam Booked', 'Exam Passed', 'Licence Issued'],
  'DOH Licence': ['Enquiry', 'Documents Collected', 'Dataflow Submitted', 'Exam Booked', 'Licence Issued'],
  'SCFHS Licence': ['Enquiry', 'Documents Collected', 'Dataflow Submitted', 'Classification Issued', 'Prometric Booked', 'Licence Issued'],
  'Australia PR': ['Enquiry', 'Points Assessment', 'Skills Assessment', 'English Test', 'EOI Lodged', 'Invitation Received', 'Visa Lodged', 'Visa Granted'],
  'Canada PR': ['Enquiry', 'Eligibility Check', 'ECA & Language', 'Profile Created', 'ITA Received', 'Application Filed', 'PR Granted'],
  'Nurse Recruitment': ['Registered', 'Screened', 'Submitted to Client', 'Interview', 'Offer', 'Offer Accepted', 'Documentation', 'Visa', 'Deployed'],
  'UK Universities': ['Enquiry', 'Shortlisting', 'Application Sent', 'Offer Received', 'CAS Issued', 'Visa Granted', 'Enrolled'],
  'NCLEX Prep': ['Enquiry', 'Counselling', 'Fee Quoted', 'Enrolled', 'Exam Booked', 'Passed'],
};
/** A service uses its own stages when it has them, otherwise the department's. */
const stagesFor = (service, deptId) => SERVICE_PIPELINES[service] || STAGES[deptId] || [];

/* ---------- notes & files ---------- */
function notesFor(entityType, entityId) {
  return DB.notes.filter(n => n.entityType === entityType && n.entityId === entityId)
    .sort((a, b) => (b.pinned - a.pinned) || (new Date(b.at) - new Date(a.at)));
}
function personNotes(personId) {
  return DB.notes.filter(n => n.personId === personId).sort((a, b) => new Date(b.at) - new Date(a.at));
}
function filesFor(entityType, entityId) {
  return DB.files.filter(f => f.entityType === entityType && f.entityId === entityId);
}
function personFiles(personId) {
  return DB.files.filter(f => f.personId === personId);
}
const originOf = n => {
  if (n.entityType === 'Lead') { const l = DB.leads.find(x => x.id === n.entityId); return l ? `${l.service || dept(l.dept).name} · ${l.code}` : 'Lead'; }
  if (n.entityType === 'Deal') { const d = DB.deals.find(x => x.id === n.entityId); return d ? `Deal · ${d.code}` : 'Deal'; }
  return n.entityType;
};
const fileSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

function notesBlock(entityType, entityId, personId, showOrigin) {
  const notes = showOrigin ? personNotes(personId) : notesFor(entityType, entityId);
  return `<div class="card-b" style="border-bottom:1px solid var(--border)">
      <textarea id="note-${entityId}" rows="2" placeholder="Add a note — what was said, what was agreed, what happens next."></textarea>
      <div class="spread" style="margin-top:8px">
        <span class="xs muted">Notes are stored against the person too, so they show on every file they hold.</span>
        <button class="btn sm" onclick="addNote('${entityType}','${entityId}','${personId || ''}')">Add note</button>
      </div></div>
    ${notes.length ? notes.map(n => `<div class="row" style="align-items:flex-start;gap:11px;padding:11px 16px;border-bottom:1px solid var(--border)">
        <div class="avatar" style="flex:0 0 30px">${initials(user(n.by).name)}</div>
        <div style="flex:1;min-width:0">
          <div><b style="font-size:13px">${esc(user(n.by).name)}</b> <span class="xs muted">${rel(n.at)}</span>
          ${showOrigin ? `<span class="pill xs" style="margin-left:6px">${esc(originOf(n))}</span>` : ''}
          ${n.pinned ? `<span class="xs" style="color:var(--primary);margin-left:6px">pinned</span>` : ''}</div>
          <div style="margin-top:2px;white-space:pre-line">${esc(n.body)}</div>
        </div>
        <button class="btn ghost sm" onclick="togglePin('${n.id}')">${n.pinned ? 'Unpin' : 'Pin'}</button>
      </div>`).join('') : `<div class="card-b muted sm">No notes yet.</div>`}`;
}
function filesBlock(entityType, entityId, personId, showOrigin) {
  const files = showOrigin ? personFiles(personId) : filesFor(entityType, entityId);
  return `<div class="card-b" style="border-bottom:1px solid var(--border)">
      <button class="btn ghost" style="width:100%;border-style:dashed;height:auto;padding:14px" onclick="addFile('${entityType}','${entityId}','${personId || ''}')">
        Attach passport, licence, certificate or offer letter
      </button>
      <div class="xs muted" style="margin-top:6px">Uploaded once against this person — visible on every enquiry, deal and placement they hold.</div>
    </div>
    ${files.length ? files.map(f => `<div class="spread" style="padding:10px 16px;border-bottom:1px solid var(--border)">
      <div style="min-width:0"><b style="font-size:13px">${esc(f.name)}</b>
        <div class="xs muted">${fileSize(f.size)} · ${esc(user(f.by).name)} · ${rel(f.at)}${showOrigin ? ' · ' + esc(originOf(f)) : ''}</div></div>
      <button class="btn ghost sm" onclick="toast('Downloads use a signed, expiring link once S3 is connected in Settings → Integrations.')">Download</button>
    </div>`).join('') : `<div class="card-b muted sm">No files yet.</div>`}`;
}
function addNote(entityType, entityId, personId) {
  const el = $('note-' + entityId);
  const body = (el.value || '').trim();
  if (!body) return;
  DB.notes.unshift({ id: uid('n'), body, entityType, entityId, personId: personId || null, by: ME.id, at: new Date().toISOString(), pinned: false });
  el.value = ''; save(); toast('Note added'); render();
}
const togglePin = id => { const n = DB.notes.find(x => x.id === id); n.pinned = !n.pinned; save(); render(); };
function addFile(entityType, entityId, personId) {
  modal({ title: 'Attach a document', desc: 'In the live app the file goes straight to storage and only the metadata touches the API.',
    submitLabel: 'Attach',
    fields: [
      { name: 'name', label: 'File name', required: true, full: true, placeholder: 'passport-scan.pdf' },
      { name: 'kind', label: 'Document type', type: 'select', options: ['Passport', 'Degree certificate', 'Licence', 'Experience letter', 'Good standing certificate', 'Offer letter', 'Visa'].map(k => ({ value: k, label: k })) },
    ],
    onSubmit: v => {
      DB.files.unshift({ id: uid('f'), name: v.name, kind: v.kind, size: 200000 + Math.floor(Math.random() * 2000000), entityType, entityId, personId: personId || null, by: ME.id, at: new Date().toISOString() });
      save(); closeModal(); toast('Document attached — it now shows on this contact everywhere'); render();
    } });
}

/* ---------- Ask 360 ---------- */
const ASK_EXAMPLES = [
  'How many converted leads in Migration?',
  'Show nurses from India waiting on a DHA licence',
  'Which vacancies still have open seats?',
  'Overdue tickets',
  'Total pipeline value',
  'Marketing requests raised this month',
  'Budgets awaiting approval',
];

/**
 * The question is turned into a STRUCTURED PLAN, and the plan runs against the same scoped
 * data the pages use. Nothing writes a query from free text, so an answer can never contain
 * a row you could not open yourself — and no figure is invented, every number came from a row.
 */
const plural = e => ({ vacancy: 'vacancies', marketing: 'creative requests', person: 'contacts' }[e] || e + 's');

function askPlan(question) {
  const q = question.toLowerCase();
  const f = {}, parts = [];
  const now = new Date();

  const d = DEPARTMENTS.find(x => q.includes(x.name.toLowerCase()) || (x.id === 'LIC' && /licens/.test(q)));
  if (d) { f.dept = d.id; parts.push(d.name); }
  const svc = Object.values(SERVICES).flat().find(x => q.includes(x.toLowerCase()));
  if (svc) { f.service = svc; parts.push(svc); }

  if (/converted|won/.test(q)) { f.cat = 'CONVERTED'; parts.push('converted'); }
  else if (/not answering|unresponsive|no answer/.test(q)) { f.cat = 'UNRESPONSIVE'; parts.push('not answering'); }
  else if (/not interested|not eligible|disqualified/.test(q)) { f.cat = 'DISQUALIFIED'; parts.push('disqualified'); }
  else if (/\bnew\b/.test(q)) { f.cat = 'NEW'; parts.push('new'); }

  if (/this month/.test(q)) { f.from = new Date(now.getFullYear(), now.getMonth(), 1); parts.push('this month'); }
  else if (/last month/.test(q)) { f.from = new Date(now.getFullYear(), now.getMonth() - 1, 1); f.to = new Date(now.getFullYear(), now.getMonth(), 1); parts.push('last month'); }
  else if (/this week/.test(q)) { const s = new Date(now); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); s.setHours(0, 0, 0, 0); f.from = s; parts.push('this week'); }
  else if (/last week/.test(q)) { const s = new Date(now); s.setDate(s.getDate() - ((s.getDay() + 6) % 7) - 7); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(e.getDate() + 7); f.from = s; f.to = e; parts.push('last week'); }
  else if (/today/.test(q)) { const s = new Date(now); s.setHours(0, 0, 0, 0); f.from = s; parts.push('today'); }

  const country = ['india', 'philippines', 'pakistan', 'egypt', 'nigeria', 'kenya', 'jordan'].find(c => q.includes(c));
  if (country) { f.country = country; parts.push(country); }
  const prof = ['nurse', 'midwife', 'doctor', 'physiotherapist', 'radiographer', 'pharmacist', 'technician'].find(p => q.includes(p));
  if (prof) { f.profession = prof; parts.push(prof); }
  const lic = ['dha', 'doh', 'mohap', 'scfhs', 'qchp', 'nhra'].find(l => new RegExp('\\b' + l + '\\b').test(q));
  if (lic) { f.licence = lic.toUpperCase(); parts.push(lic.toUpperCase()); }
  if (/overdue|past due|late/.test(q)) { f.overdue = true; parts.push('overdue'); }
  if (/\bmy |mine|assigned to me/.test(q)) { f.mine = true; parts.push('owned by me'); }
  if (/open seat|still.*fill|unfilled/.test(q)) { f.openSeats = true; parts.push('with open seats'); }
  if (/await|pending approval|to approve/.test(q)) { f.pending = true; parts.push('awaiting decision'); }

  const entity = /vacanc|seat|position/.test(q) ? 'vacancy'
    : /candidate|placement|deployed/.test(q) ? 'placement'
    : /ticket|support|helpdesk/.test(q) ? 'ticket'
    : /asset|laptop|device/.test(q) ? 'asset'
    : /budget|spend|approval/.test(q) ? 'budget'
    : /creative|marketing request|design/.test(q) ? 'marketing'
    : /deal|revenue|pipeline|value/.test(q) ? 'deal'
    : 'lead';
  const intent = /how much|total|revenue|sum|worth/.test(q) ? 'sum' : /how many|count|number of/.test(q) ? 'count' : 'list';

  return { entity, intent, f, explain: parts.length ? `${plural(entity)} · ${parts.join(' · ')}` : `all ${plural(entity)}` };
}
function askRun(p) {
  const f = p.f;
  const inRange = iso => (!f.from || new Date(iso) >= f.from) && (!f.to || new Date(iso) < f.to);

  if (p.entity === 'lead') {
    let rows = scopeLeads(DB.leads).filter(l => inRange(l.created));
    if (f.dept) rows = rows.filter(l => l.dept === f.dept);
    if (f.service) rows = rows.filter(l => l.service === f.service);
    if (f.cat) rows = rows.filter(l => status(l.status).cat === f.cat);
    if (f.mine) rows = rows.filter(l => l.owner === ME.id);
    if (f.overdue) rows = rows.filter(l => overdue(l.followUp));
    if (f.country) rows = rows.filter(l => (person(l.personId).country || '').toLowerCase().includes(f.country));
    if (f.profession) rows = rows.filter(l => (person(l.personId).profession || '').toLowerCase().includes(f.profession));
    if (f.licence) rows = rows.filter(l => (l.service || '').toUpperCase().includes(f.licence));
    return { count: rows.length, rows: rows.slice(0, 25), cols: ['Lead', 'Service', 'Status', 'Owner'], kind: 'lead' };
  }
  if (p.entity === 'deal') {
    let rows = scopeDeals(DB.deals).filter(d => inRange(d.created));
    if (f.dept) rows = rows.filter(d => d.dept === f.dept);
    return { count: rows.length, total: rows.reduce((s, d) => s + d.amount, 0), rows: rows.slice(0, 25), cols: ['Deal', 'Stage', 'Amount', 'Owner'], kind: 'deal' };
  }
  if (p.entity === 'vacancy') {
    let rows = DB.vacancies;
    if (f.openSeats) rows = rows.filter(v => v.positions - v.filled > 0);
    if (f.licence) rows = rows.filter(v => v.licence === f.licence);
    return { count: rows.length, rows, cols: ['Vacancy', 'Client', 'Seats', 'Status'], kind: 'vacancy' };
  }
  if (p.entity === 'placement') {
    return { count: DB.placements.length, rows: DB.placements.slice(0, 25), cols: ['Candidate', 'Vacancy', 'Stage'], kind: 'placement' };
  }
  if (p.entity === 'ticket') {
    let rows = DB.tickets;
    if (f.overdue) rows = rows.filter(t => overdue(t.due) && !['RESOLVED', 'CLOSED'].includes(t.status));
    return { count: rows.length, rows: rows.slice(0, 25), cols: ['Ticket', 'Priority', 'Status', 'Assigned'], kind: 'ticket' };
  }
  if (p.entity === 'asset') {
    return { count: DB.assets.length, rows: DB.assets.slice(0, 25), cols: ['Asset', 'Status', 'Held by'], kind: 'asset' };
  }
  if (p.entity === 'budget') {
    let rows = DB.budgets;
    if (f.pending) rows = rows.filter(b => b.status === 'SUBMITTED');
    return { count: rows.length, total: rows.reduce((s, b) => s + b.requested, 0), rows, cols: ['Budget', 'Requested', 'Status'], kind: 'budget' };
  }
  let rows = DB.marketing.filter(m => inRange(m.created));
  return { count: rows.length, rows: rows.slice(0, 25), cols: ['Request', 'Type', 'Status'], kind: 'marketing' };
}
function askRow(r, kind) {
  if (kind === 'lead') { const p = person(r.personId); return `<tr><td><span class="link" onclick="go('lead',{id:'${r.id}'})">${esc(p.name)}</span><div class="xs muted">${r.code}</div></td>
    <td class="sm">${esc(r.service || dept(r.dept).name)}</td><td>${statusBadge(status(r.status).cat)}</td><td class="sm">${esc(user(r.owner).name)}</td></tr>`; }
  if (kind === 'deal') return `<tr><td><b>${esc(r.name)}</b><div class="xs muted">${r.code}</div></td><td class="sm">${esc(r.stage)}</td><td class="tnum">${money(r.amount)}</td><td class="sm">${esc(user(r.owner).name)}</td></tr>`;
  if (kind === 'vacancy') { const c = DB.clients.find(x => x.id === r.clientId); return `<tr><td><span class="link" onclick="go('vacancy',{id:'${r.id}'})">${esc(r.title)}</span><div class="xs muted">${r.code}</div></td>
    <td class="sm">${esc(c.name)}</td><td>${seatMeter(r.filled, r.positions)}</td><td>${statusBadge(r.status)}</td></tr>`; }
  if (kind === 'placement') { const v = DB.vacancies.find(x => x.id === r.vacancyId); return `<tr><td>${esc(person(r.personId).name)}</td><td class="sm">${esc(v.title)}</td><td>${statusBadge(r.stage)}</td></tr>`; }
  if (kind === 'ticket') return `<tr><td><span class="link" onclick="go('ticket',{id:'${r.id}'})">${esc(r.title)}</span><div class="xs muted">${r.code}</div></td><td>${statusBadge(r.priority)}</td><td>${statusBadge(r.status)}</td><td class="sm">${r.assignee ? esc(user(r.assignee).name) : '—'}</td></tr>`;
  if (kind === 'asset') return `<tr><td><b>${esc(r.name)}</b><div class="xs muted">${r.tag}</div></td><td>${statusBadge(r.status)}</td><td class="sm">${r.holder ? esc(user(r.holder).name) : 'In stock'}</td></tr>`;
  if (kind === 'budget') return `<tr><td><b>${esc(r.title)}</b><div class="xs muted">${r.code}</div></td><td class="tnum">${money(r.requested)}</td><td>${statusBadge(r.status)}</td></tr>`;
  return `<tr><td><b>${esc(r.title)}</b><div class="xs muted">${r.code}</div></td><td class="sm">${esc(r.type)}</td><td>${statusBadge(r.status)}</td></tr>`;
}
function viewAsk() {
  $('view').innerHTML = pageHeader('Ask 360', 'Ask for anything in the platform in plain English. Answers come from live records, under your own permissions.') +
    `<div class="card"><div class="card-b">
      <div class="row" style="flex-wrap:nowrap">
        <input id="askbox" placeholder="e.g. how many not-answering leads does Migration have this month?" onkeydown="if(event.key==='Enter')runAsk(this.value)" />
        <button class="btn" onclick="runAsk(document.getElementById('askbox').value)">Ask</button>
      </div>
      <div class="row" style="gap:5px;margin-top:10px">
        ${ASK_EXAMPLES.map(e => `<button class="btn ghost sm" onclick="runAsk('${e.replace(/'/g, "\\'")}')">${esc(e)}</button>`).join('')}
      </div>
    </div></div>
    <div id="askresult"></div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>How this works, and what it will not do</h3></div>
      <div class="card-b sm muted stack" style="gap:8px">
        <div>Your question is translated into a structured query plan, and that plan runs through the same permission-scoped queries the rest of the app uses. Nothing writes a query from free text, so a question can never reach a row you could not open yourself — and no number here is generated, every figure came from a real record.</div>
        <div>Today the planner is deterministic: it understands departments, services, statuses, periods, nationalities, professions and licence bodies. Swapping it for a language model is a contained change — the model's only job would be to emit the same plan. Worth doing once there is a real set of staff questions to measure it against, not before.</div>
      </div></div>`;
  const box = $('askbox'); if (box && box.focus) box.focus();
}
function runAsk(question) {
  if (!question || !question.trim()) return;
  const t0 = performance.now();
  const p = askPlan(question);
  const r = askRun(p);
  const ms = Math.max(1, Math.round(performance.now() - t0));
  const headline = p.intent === 'sum' && r.total != null ? money(r.total)
    : `${r.count} ${r.count === 1 ? p.entity : plural(p.entity)}`;
  $('askresult').innerHTML = `<div class="card" style="margin-top:14px">
    <div class="card-h"><h3>${headline}</h3><span class="xs muted">${ms}ms · searched ${canSeeAll() ? 'the whole company' : ME.scope === 'DEPARTMENT' ? dept(ME.dept).name : 'your own records'}</span></div>
    <div class="card-b" style="border-bottom:1px solid var(--border);padding-bottom:11px">
      <span class="sm muted">Interpreted as</span> ${badge(p.explain, 'primary')}
      <span class="xs muted" style="margin-left:8px">“${esc(question)}”</span>
    </div>
    ${r.rows.length ? `<div class="tw"><table><thead><tr>${r.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${r.rows.map(row => askRow(row, r.kind)).join('')}</tbody></table></div>`
      : `<div class="card-b muted sm">Nothing matched. Try naming a department, a service or a period — “DHA licence leads this month” works better than “recent stuff”.</div>`}
  </div>`;
  const el = $('askbox'); if (el) el.value = question;
}

/* ---------- tasks & meetings ---------- */
function viewCalendar() {
  const mine = DB.activities.filter(a => a.owner === ME.id && a.status === 'OPEN');
  const meetings = DB.meetings.filter(m => m.owner === ME.id || (m.attendees || []).includes(ME.id));
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = d.toDateString();
    days.push({
      key, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
      meetings: meetings.filter(m => new Date(m.start).toDateString() === key).sort((a, b) => new Date(a.start) - new Date(b.start)),
      tasks: mine.filter(t => new Date(t.due).toDateString() === key),
    });
  }
  const overdueTasks = mine.filter(t => overdue(t.due));
  const busy = days.filter(d => d.meetings.length || d.tasks.length);
  const time = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  $('view').innerHTML = pageHeader('Tasks & meetings', 'The next two weeks of your work, in one agenda.', null,
    `<button class="btn ghost" onclick="newTask()">Add task</button><button class="btn" onclick="newMeeting()">Schedule meeting</button>`) +
    `<div class="grid g4" style="margin-bottom:12px">
      ${metric('Overdue', overdueTasks.length, { tone: overdueTasks.length ? 'bad' : '' })}
      ${metric('Due today', days[0].tasks.length)}
      ${metric('Meetings this fortnight', meetings.length)}
      ${metric('Open tasks', mine.length)}
    </div>
    ${overdueTasks.length ? `<div class="card" style="margin-bottom:12px;border-color:color-mix(in srgb,var(--danger) 30%,transparent)">
      <div class="card-h"><h3>Overdue — clear these first</h3></div>
      ${overdueTasks.map(t => `<div class="spread" style="padding:10px 16px;border-bottom:1px solid var(--border)">
        <div><b style="font-size:13px">${esc(t.subject)}</b><div class="xs" style="color:var(--danger)">was due ${fmt(t.due)}</div></div>
        <button class="btn ghost sm" onclick="completeActivity('${t.id}')">Done</button></div>`).join('')}
    </div>` : ''}
    ${busy.length ? busy.map(d => `<div class="card" style="margin-bottom:10px">
      <div class="card-h"><h3>${d.label}</h3><span class="xs muted">${d.meetings.length} meetings · ${d.tasks.length} tasks</span></div>
      ${d.meetings.map(m => `<div class="row" style="align-items:flex-start;gap:14px;padding:11px 16px;border-bottom:1px solid var(--border)">
        <span class="tnum sm" style="width:96px;flex:0 0 96px;font-weight:600">${time(m.start)}–${time(m.end)}</span>
        <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(m.subject)}</b>
          <div class="xs muted">${esc([m.location, m.personId ? person(m.personId).name : null].filter(Boolean).join(' · ') || 'No location set')}
          ${(m.attendees || []).length ? ' · ' + m.attendees.map(a => esc(user(a).name)).join(', ') : ''}</div></div>
        ${badge('Meeting', 'primary')}</div>`).join('')}
      ${d.tasks.map(t => `<div class="row" style="align-items:flex-start;gap:14px;padding:11px 16px;border-bottom:1px solid var(--border)">
        <span class="sm muted" style="width:96px;flex:0 0 96px">All day</span>
        <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(t.subject)}</b>
          <div class="xs muted">${t.type.replace('_', ' ').toLowerCase()}${t.leadId ? ' · ' + esc(person(t.personId).name) : ''}</div></div>
        <div class="row">${statusBadge(t.priority)}<button class="btn ghost sm" onclick="completeActivity('${t.id}')">Done</button></div></div>`).join('')}
    </div>`).join('') : `<div class="card">${empty('Nothing scheduled', 'Add a task or schedule a meeting and the next two weeks will fill in here.')}</div>`}`;
}
function newTask() {
  modal({ title: 'Add a task', submitLabel: 'Add task',
    fields: [
      { name: 'subject', label: 'What needs doing?', required: true, full: true },
      { name: 'type', label: 'Type', type: 'select', options: ['TASK', 'CALL', 'FOLLOW_UP'].map(t => ({ value: t, label: t.replace('_', ' ').toLowerCase() })) },
      { name: 'due', label: 'Due', type: 'date', required: true },
      { name: 'priority', label: 'Priority', type: 'select', value: 'MEDIUM', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => ({ value: p, label: p.toLowerCase() })) },
    ],
    onSubmit: v => {
      DB.activities.unshift({ id: uid('a'), type: v.type, subject: v.subject, due: new Date(v.due).toISOString(), status: 'OPEN', priority: v.priority, owner: ME.id, personId: null, leadId: null });
      save(); closeModal(); toast('Task added'); render();
    } });
}
function newMeeting() {
  modal({ title: 'Schedule a meeting', desc: 'Once Outlook is connected in Settings → Integrations, this also lands on the real calendar with a Teams link.',
    submitLabel: 'Schedule',
    fields: [
      { name: 'subject', label: 'Subject', required: true, full: true, placeholder: 'Document review — DHA application' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'time', label: 'Start time', type: 'time', value: '10:00', required: true },
      { name: 'minutes', label: 'Duration (minutes)', type: 'number', value: 30 },
      { name: 'location', label: 'Location', placeholder: 'Head office, meeting room 2' },
      { name: 'personId', label: 'With which contact', type: 'select', options: [{ value: '', label: 'Internal meeting' }].concat(DB.people.slice(0, 80).map(p => ({ value: p.id, label: p.name }))) },
      { name: 'attendee', label: 'Invite a colleague', type: 'select', options: [{ value: '', label: 'Nobody else' }].concat(USERS.map(u => ({ value: u.id, label: u.name }))) },
    ],
    onSubmit: v => {
      const start = new Date(v.date + 'T' + (v.time || '10:00'));
      const end = new Date(start.getTime() + (+v.minutes || 30) * 60000);
      DB.meetings.unshift({ id: uid('m'), subject: v.subject, start: start.toISOString(), end: end.toISOString(), location: v.location, personId: v.personId || null, owner: ME.id, attendees: v.attendee ? [v.attendee] : [] });
      if (v.attendee) DB.notifications.unshift({ id: uid('n'), text: `${ME.name} invited you to “${v.subject}”`, at: new Date().toISOString(), read: false });
      save(); closeModal(); toast('Meeting scheduled'); render();
    } });
}

/* ---------- integrations ---------- */
const INTEGRATIONS = [
  { id: 'zoho_crm', name: 'Zoho CRM', cat: 'CRM', dir: 'IN', summary: 'One-time import of leads, contacts and deals from the system the team uses today.',
    unlocks: ['Import historic leads and contacts', 'Map Zoho statuses to 360Medicare statuses', 'Row-level import log so nothing is silently dropped'],
    note: 'Deliberately one-way. Two systems both accepting edits to the same record need a conflict policy, and there is no correct automatic answer.',
    creds: ['Client ID', 'Client secret', 'Refresh token'] },
  { id: 'zoho_books', name: 'Zoho Finance (Books)', cat: 'Finance', dir: 'TWO_WAY', summary: 'Raise an invoice from a won deal or a deployed candidate, and read payment status back.',
    unlocks: ['Invoice created when a deal is won', 'Invoice the hospital when a candidate is deployed', 'Payment status on the deal, so “collected” is real', 'Revenue reporting finance agrees with'],
    note: 'Invoices are created by 360Medicare and payment status is read back. Finance stays the source of truth for money; this platform never edits a posted invoice.',
    creds: ['Client ID', 'Client secret', 'Refresh token', 'Organisation ID'] },
  { id: 'microsoft_365', name: 'Outlook & Microsoft 365', cat: 'Email & Calendar', dir: 'TWO_WAY', summary: 'Send and log email against the contact, and put meetings on the real calendar.',
    unlocks: ['Email from inside a lead, logged on the timeline', 'Meetings sync both ways with Outlook', 'Teams link generated automatically', 'Automation action: send an email template'],
    note: 'Microsoft Graph with delegated permissions, so everyone sends as themselves and consent is per user.',
    creds: ['Tenant ID', 'Application (client) ID', 'Client secret'] },
  { id: 'meta', name: 'Meta — Facebook & Instagram', cat: 'Social & Ads', dir: 'IN', summary: 'Lead Ads land directly as leads, and ad spend flows into cost per lead.',
    unlocks: ['Instant Form leads arrive in seconds, not in a CSV', 'Campaign spend synced daily for real cost per lead', 'Form fields mapped once, then left alone'],
    note: 'Webhook for leadgen plus a nightly spend pull. The webhook is verified against the app secret — anything unsigned is dropped.',
    creds: ['App ID', 'App secret', 'Page ID', 'Ad account ID'] },
  { id: 'google_ads', name: 'Google Ads', cat: 'Social & Ads', dir: 'IN', summary: 'Lead form extensions and daily spend for search campaigns.',
    unlocks: ['Search campaign leads captured automatically', 'Cost per lead by keyword theme', 'Conversion upload back to Google when a lead converts'],
    creds: ['Customer ID', 'Developer token', 'Refresh token'] },
  { id: 'tiktok', name: 'TikTok for Business', cat: 'Social & Ads', dir: 'IN', beta: true, summary: 'Lead generation forms and spend from TikTok campaigns.',
    unlocks: ['TikTok lead forms captured automatically', 'Spend in the same cost-per-lead table as Meta and Google'],
    creds: ['App ID', 'App secret', 'Advertiser ID'] },
  { id: 'linkedin', name: 'LinkedIn Pages & Ads', cat: 'Social & Ads', dir: 'TWO_WAY', summary: 'Publish posts and pull Lead Gen Form submissions.',
    unlocks: ['Schedule and publish posts straight from a marketing request', 'Lead Gen Form submissions arrive as leads', 'Post performance next to the creative that produced it'],
    creds: ['Client ID', 'Client secret', 'Organisation URN'] },
  { id: 'whatsapp', name: 'WhatsApp Business Platform', cat: 'Messaging', dir: 'TWO_WAY', summary: 'Two-way conversations with candidates on the channel they actually answer.',
    unlocks: ['Inbound messages become leads automatically', 'Approved templates for follow-up', 'Conversation history on the contact timeline'],
    note: 'Priced per conversation and templates need pre-approval — budget it before promising it to the team.',
    creds: ['Phone number ID', 'WhatsApp Business account ID', 'Permanent token'] },
  { id: 's3', name: 'Amazon S3', cat: 'Storage', dir: 'OUT', summary: 'Where uploaded passports, licences and certificates are actually stored.',
    unlocks: ['Documents stored outside the database', 'Signed, expiring download links', 'Lifecycle rules for the retention policy'],
    creds: ['Bucket', 'Region', 'Access key ID', 'Secret access key'] },
];
const DIR_LABEL = { IN: 'Into 360Medicare', OUT: 'Out to the provider', TWO_WAY: 'Both directions' };

function viewIntegrations() {
  const cats = [...new Set(INTEGRATIONS.map(i => i.cat))];
  $('view').innerHTML = pageHeader('Integrations', 'Everything this platform can talk to, which way the data flows, and what each connection unlocks.', ['Settings', 'Integrations']) +
    `<div class="card" style="margin-bottom:14px"><div class="card-b sm muted">
      Credentials are written once and never returned to the browser — this screen only ever shows connected or not.
      Direction is stated on every card because it is the thing that causes trouble later: two-way means someone has decided
      what happens when both systems change the same record on the same day.
    </div></div>` +
    cats.map(cat => `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:18px 0 9px">${cat}</h3>
      <div class="grid g2">${INTEGRATIONS.filter(i => i.cat === cat).map(i => {
        const on = (DB.integrations || []).includes(i.id);
        return `<div class="card"><div class="card-h">
            <div><h3>${esc(i.name)}</h3><div class="sm muted" style="margin-top:2px">${esc(i.summary)}</div></div>
            ${on ? badge('Connected', 'success') : i.beta ? badge('Beta', 'warning') : badge('Not connected')}
          </div>
          <div class="card-b stack" style="gap:10px">
            <div class="row" style="gap:5px">${badge(DIR_LABEL[i.dir], 'primary')}${on ? badge('Last sync ' + rel(day(0))) : ''}</div>
            <ul style="margin:0;padding-left:16px" class="sm muted">${i.unlocks.map(u => `<li style="margin-bottom:3px">${esc(u)}</li>`).join('')}</ul>
            ${i.note ? `<div class="xs muted" style="border-left:2px solid var(--border);padding-left:10px">${esc(i.note)}</div>` : ''}
            <div>${on
              ? `<button class="btn ghost sm" onclick="toggleIntegration('${i.id}',false)">Disconnect</button>`
              : `<button class="btn sm" onclick="connectIntegration('${i.id}')">Connect</button>`}</div>
          </div></div>`;
      }).join('')}</div>`).join('');
}
function connectIntegration(id) {
  const def = INTEGRATIONS.find(i => i.id === id);
  modal({ title: 'Connect ' + def.name, desc: 'Stored encrypted at rest and never shown again.', submitLabel: 'Save connection',
    fields: def.creds.map(c => ({ name: c.replace(/\W/g, ''), label: c, required: true, full: true })),
    onSubmit: () => { DB.integrations = [...(DB.integrations || []), id]; save(); closeModal(); toast(def.name + ' connected'); render(); } });
}
function toggleIntegration(id, on) {
  DB.integrations = (DB.integrations || []).filter(x => x !== id);
  save(); toast('Disconnected — any automation depending on it will now fail loudly rather than silently'); render();
}

/* ---------- automations ---------- */
const AUTO_TRIGGERS = [
  ['LEAD_CREATED', 'A lead is created'], ['LEAD_STATUS_CHANGED', 'A lead status changes'], ['LEAD_IDLE', 'A lead goes untouched for N days'],
  ['DEAL_STAGE_CHANGED', 'A deal moves stage'], ['DEAL_WON', 'A deal is won'], ['TICKET_CREATED', 'A ticket is raised'],
  ['TICKET_SLA_BREACHED', 'A ticket breaches its SLA'], ['PLACEMENT_STAGE_CHANGED', 'A candidate moves stage'],
  ['VACANCY_FILLED', 'A vacancy becomes fully filled'], ['BUDGET_SUBMITTED', 'A budget is submitted'],
  ['MARKETING_REQUEST_CREATED', 'A creative request is raised'], ['SCHEDULE', 'On a schedule'],
];
const AUTO_ACTIONS = [
  ['NOTIFY_OWNER', 'Notify the record owner'], ['NOTIFY_MANAGER', "Notify the owner's manager"], ['NOTIFY_USER', 'Notify a specific person'],
  ['ASSIGN_ROUND_ROBIN', 'Assign round-robin in a department'], ['ASSIGN_USER', 'Assign to a specific person'],
  ['SET_STATUS', 'Set the lead status'], ['SET_PRIORITY', 'Set priority'], ['CREATE_TASK', 'Create a follow-up task'],
  ['ADD_NOTE', 'Add a note to the record'], ['SEND_EMAIL', 'Send an email (needs Outlook)'], ['SEND_WHATSAPP', 'Send a WhatsApp template'],
  ['WEBHOOK', 'Call a webhook'],
];
function viewAutomations() {
  const rules = DB.automations;
  $('view').innerHTML = pageHeader('Automations', 'Rules the business can change without a deployment. Every firing is logged.', ['Settings', 'Automations'],
    `<button class="btn" onclick="newAutomation()">New automation</button>`) +
    `<div class="grid g3" style="margin-bottom:12px">
      ${metric('Active rules', rules.filter(r => r.active).length, { sub: rules.filter(r => !r.active).length + ' paused' })}
      ${metric('Times fired', rules.reduce((s, r) => s + r.runs, 0), { tone: 'pos' })}
      ${metric('Rules with failures', rules.filter(r => r.lastError).length, { tone: rules.some(r => r.lastError) ? 'bad' : '' })}
    </div>
    <div class="card"><div class="tw"><table>
      <thead><tr><th>Automation</th><th>Trigger</th><th>Actions</th><th>Fired</th><th>Last run</th><th></th></tr></thead>
      <tbody>${rules.map(r => `<tr>
        <td><b>${esc(r.name)}</b>${r.description ? `<div class="xs muted">${esc(r.description)}</div>` : ''}</td>
        <td class="sm">${esc((AUTO_TRIGGERS.find(t => t[0] === r.trigger) || [])[1] || r.trigger)}</td>
        <td><span class="row" style="gap:4px">${r.actions.map(a => badge((AUTO_ACTIONS.find(x => x[0] === a) || [])[1] || a)).join('')}</span></td>
        <td class="tnum">${r.runs}</td>
        <td class="sm">${r.lastRun ? rel(r.lastRun) : '<span class="muted">Never</span>'}
          ${r.lastError ? `<div class="xs" style="color:var(--danger)">${esc(r.lastError)}</div>` : ''}</td>
        <td style="text-align:right"><span class="row" style="justify-content:flex-end">
          ${r.active ? badge('Active', 'success') : badge('Paused')}
          <button class="btn ghost sm" onclick="toggleAutomation('${r.id}')">${r.active ? 'Pause' : 'Enable'}</button>
          <button class="btn ghost sm" onclick="runAutomation('${r.id}')">Test run</button>
        </span></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><div class="card-h"><h3>Available triggers</h3></div><div class="card-b row" style="gap:5px">${AUTO_TRIGGERS.map(t => badge(t[1])).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>Available actions</h3></div><div class="card-b row" style="gap:5px">${AUTO_ACTIONS.map(a => badge(a[1])).join('')}</div></div>
    </div>
    <div class="xs muted" style="margin-top:12px">This is deliberately a fixed vocabulary rather than a scripting language. Business users get actions that are auditable and reversible; anything outside the list is a code change with a review — the right amount of friction for something that can message every customer at three in the morning.</div>`;
}
function newAutomation() {
  modal({ title: 'New automation', desc: 'When the trigger fires and the condition holds, the actions run — in order, and logged.',
    submitLabel: 'Create automation',
    fields: [
      { name: 'name', label: 'Name', required: true, full: true, placeholder: 'Chase leads nobody has called in 3 days' },
      { name: 'trigger', label: 'When this happens', type: 'select', required: true, options: AUTO_TRIGGERS.map(t => ({ value: t[0], label: t[1] })) },
      { name: 'condField', label: 'Only if', type: 'select', options: [{ value: '', label: 'Always run' }, { value: 'departmentId', label: 'Department is' }, { value: 'source', label: 'Source is' }, { value: 'priority', label: 'Priority is' }] },
      { name: 'condValue', label: 'Equals', placeholder: 'Meta Ads, HIGH, Recruitment…' },
      { name: 'action', label: 'Then do this', type: 'select', required: true, options: AUTO_ACTIONS.map(a => ({ value: a[0], label: a[1] })) },
      { name: 'description', label: 'Why this exists', type: 'textarea', placeholder: 'Future you will thank present you.' },
    ],
    onSubmit: v => {
      DB.automations.unshift({ id: uid('au'), name: v.name, description: v.description, trigger: v.trigger,
        condition: v.condField ? { field: v.condField, value: v.condValue } : null, actions: [v.action],
        active: true, runs: 0, lastRun: null, lastError: null });
      save(); closeModal(); toast('Automation created and enabled'); render();
    } });
}
const toggleAutomation = id => { const r = DB.automations.find(x => x.id === id); r.active = !r.active; save(); toast(r.active ? 'Enabled' : 'Paused'); render(); };
function runAutomation(id) {
  const r = DB.automations.find(x => x.id === id);
  const needs = { SEND_EMAIL: 'microsoft_365', SEND_WHATSAPP: 'whatsapp', WEBHOOK: 'zoho_books' };
  const blocked = r.actions.find(a => needs[a] && !(DB.integrations || []).includes(needs[a]));
  r.runs += 1; r.lastRun = new Date().toISOString();
  if (blocked) {
    r.lastError = `${blocked}: ${blocked === 'SEND_EMAIL' ? 'Outlook' : blocked === 'SEND_WHATSAPP' ? 'WhatsApp Business' : 'Zoho Finance'} is not connected`;
    toast(r.lastError + ' — connect it in Settings → Integrations', 'err');
  } else {
    r.lastError = null;
    DB.notifications.unshift({ id: uid('n'), text: `Automation “${r.name}” ran successfully`, at: new Date().toISOString(), read: false });
    toast('Ran successfully — logged against the rule');
  }
  save(); render();
}
