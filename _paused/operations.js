/* =====================================================================
   views — recruitment, IT, marketing, reports, admin
   ===================================================================== */
function viewClients() {
  const rows = DB.clients.filter(c => !STATE.filters.q || (c.name + c.city + c.country).toLowerCase().includes(STATE.filters.q.toLowerCase()));
  $('view').innerHTML = pageHeader('Clients', 'Hospitals and employers we supply candidates to, with the seats they have open.', ['Recruitment', 'Clients'],
    `<button class="btn" onclick="newClient()">+ Add client</button>`) +
    filterBar([], 'Client name or city') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Client</th><th>Location</th><th>Status</th><th>Open vacancies</th><th>Seats open</th><th>Filled</th><th>Fee / placement</th><th>Account manager</th></tr></thead><tbody>
    ${rows.map(c => {
      const vs = DB.vacancies.filter(v => v.clientId === c.id), open = vs.filter(v => v.status === 'OPEN');
      return `<tr><td><span class="link" onclick="STATE.filters={client:'${c.id}'};go('vacancies')">${esc(c.name)}</span>
        <div class="xs muted">${c.code} · hospital · ${c.reg}</div></td>
        <td>${esc(c.city)}, ${esc(c.country)}</td><td>${statusBadge(c.status)}</td>
        <td class="tnum">${open.length}</td>
        <td class="tnum"><b>${open.reduce((s, v) => s + Math.max(0, v.positions - v.filled), 0)}</b></td>
        <td class="tnum muted">${vs.reduce((s, v) => s + v.filled, 0)}/${vs.reduce((s, v) => s + v.positions, 0)}</td>
        <td class="tnum">${money(c.fee)}</td>
        <td>${esc(user(c.am).name)}<div class="xs muted">Contract to ${fmt(c.contractEnd)}</div></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}
function newClient() {
  modal({ title: 'Add recruitment client', desc: 'The employer side of the business — hospital, clinic group or agency.', submitLabel: 'Add client',
    fields: [
      { name: 'name', label: 'Client name', required: true }, { name: 'country', label: 'Country', required: true, value: 'United Arab Emirates' },
      { name: 'city', label: 'City' }, { name: 'reg', label: 'Regulator', type: 'select', options: ['DHA', 'DOH', 'MOHAP', 'SCFHS', 'QCHP', 'NHRA'].map(r => ({ value: r, label: r })) },
      { name: 'fee', label: 'Fee per placement (AED)', type: 'number', value: 9000 },
      { name: 'am', label: 'Account manager', type: 'select', options: USERS.map(u => ({ value: u.id, label: u.name })) },
    ],
    onSubmit: v => { DB.clients.push({ id: uid('cl'), code: 'CL-' + String(DB.clients.length + 1).padStart(6, '0'), name: v.name, country: v.country, city: v.city, reg: v.reg, fee: +v.fee || 0, am: v.am, type: 'HOSPITAL', status: 'PROSPECT', contact: '—', contractEnd: day(365), terms: 45 }); save(); closeModal(); toast('Client added'); render(); } });
}
function viewVacancies() {
  const f = STATE.filters;
  let rows = DB.vacancies;
  if (f.client) rows = rows.filter(v => v.clientId === f.client);
  if (f.status) rows = rows.filter(v => v.status === f.status);
  if (f.q) rows = rows.filter(v => (v.title + v.specialty).toLowerCase().includes(f.q.toLowerCase()));
  const open = DB.vacancies.filter(v => v.status === 'OPEN');
  const seatsOpen = open.reduce((s, v) => s + Math.max(0, v.positions - v.filled), 0);
  const seatsTotal = DB.vacancies.reduce((s, v) => s + v.positions, 0);
  $('view').innerHTML = pageHeader('Vacancies', 'Client requirements and how many seats are still to fill.', ['Recruitment', 'Vacancies'],
    `<button class="btn" onclick="newVacancy()">+ New vacancy</button>`) +
    `<div class="grid g3" style="margin-bottom:12px">
      ${metric('Open vacancies', num(open.length))}
      ${metric('Seats still to fill', num(seatsOpen), { tone: 'warn' })}
      ${metric('Seats confirmed', num(DB.vacancies.reduce((s, v) => s + v.filled, 0)), { tone: 'pos', sub: 'of ' + seatsTotal + ' requested' })}
    </div>` +
    filterBar([
      { name: 'client', label: 'All clients', options: DB.clients.map(c => ({ value: c.id, label: c.name })) },
      { name: 'status', label: 'All statuses', options: ['OPEN', 'FILLED', 'ON_HOLD', 'CLOSED'].map(s => ({ value: s, label: s.replace('_', ' ').toLowerCase() })) },
    ], 'Job title or specialty') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Vacancy</th><th>Client</th><th>Seats</th><th>Status</th><th>Licence</th><th>Salary</th><th>Target start</th><th>Recruiter</th></tr></thead><tbody>
    ${rows.map(v => { const c = DB.clients.find(x => x.id === v.clientId); return `<tr>
      <td><span class="link" onclick="go('vacancy',{id:'${v.id}'})">${esc(v.title)}</span><div class="xs muted">${v.code} · ${esc(v.specialty)}</div></td>
      <td>${esc(c.name)}<div class="xs muted">${esc(c.city)}, ${esc(c.country)}</div></td>
      <td>${seatMeter(v.filled, v.positions)}</td><td>${statusBadge(v.status)}</td><td>${esc(v.licence)}</td>
      <td class="tnum sm">${money(v.salaryMin)} – ${money(v.salaryMax)}</td><td class="muted">${fmt(v.target)}</td><td>${esc(user(v.owner).name)}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}
function newVacancy() {
  modal({ title: 'Open a vacancy', desc: 'Seats count down automatically as candidates reach offer accepted.', submitLabel: 'Open vacancy',
    fields: [
      { name: 'clientId', label: 'Client', type: 'select', required: true, options: DB.clients.map(c => ({ value: c.id, label: c.name })) },
      { name: 'title', label: 'Job title', required: true, placeholder: 'Staff Nurse — ICU' },
      { name: 'specialty', label: 'Specialty', placeholder: 'ICU, Theatre, NICU…' },
      { name: 'positions', label: 'Positions', type: 'number', required: true, value: 5 },
      { name: 'licence', label: 'Licence required', type: 'select', options: ['DHA', 'DOH', 'MOHAP', 'SCFHS', 'QCHP', 'NHRA', 'NMC (UK)'].map(l => ({ value: l, label: l })) },
      { name: 'salaryMin', label: 'Salary from (AED)', type: 'number', value: 7000 },
      { name: 'salaryMax', label: 'Salary to (AED)', type: 'number', value: 9500 },
      { name: 'owner', label: 'Recruiter', type: 'select', options: USERS.map(u => ({ value: u.id, label: u.name })) },
    ],
    onSubmit: v => {
      const vac = { id: uid('v'), code: 'JOB-' + String(DB.vacancies.length + 1).padStart(6, '0'), clientId: v.clientId, title: v.title, specialty: v.specialty, positions: +v.positions || 1, filled: 0, licence: v.licence, salaryMin: +v.salaryMin, salaryMax: +v.salaryMax, currency: 'AED', contract: 24, experience: 2, language: 'English', status: 'OPEN', priority: 'MEDIUM', owner: v.owner, target: day(45), opened: new Date().toISOString(), requirements: 'To be confirmed with the client.' };
      DB.vacancies.unshift(vac); save(); closeModal(); toast('Vacancy opened — ' + vac.code); go('vacancy', { id: vac.id });
    } });
}
function viewVacancy() {
  const v = DB.vacancies.find(x => x.id === STATE.params.id);
  if (!v) return go('vacancies');
  const c = DB.clients.find(x => x.id === v.clientId);
  const pls = DB.placements.filter(p => p.vacancyId === v.id);
  const left = Math.max(0, v.positions - v.filled);
  const inProcess = pls.filter(p => !p.seat && !['REJECTED', 'WITHDRAWN'].includes(p.stage)).length;

  $('view').innerHTML = pageHeader(v.title, v.code + ' · ' + c.name + ' · ' + c.city + ', ' + c.country,
    ['Recruitment', `<span class="link" onclick="go('vacancies')">Vacancies</span>`, v.code],
    `<button class="btn" onclick="addCandidate('${v.id}')">+ Add candidate</button>`) +
    `<div class="grid g4">
      ${metric('Positions requested', v.positions)}
      ${metric('Confirmed', v.filled, { tone: 'pos', sub: 'offer accepted or beyond' })}
      ${metric('Still to fill', left, { tone: left ? 'warn' : 'pos' })}
      ${metric('Candidates in process', inProcess, { sub: 'not yet consuming a seat' })}
    </div>
    <div class="split-r" style="margin-top:14px">
      <div class="card"><div class="card-h"><h3>Candidates</h3>${seatMeter(v.filled, v.positions)}</div>
        ${pls.length ? `<div class="tw"><table><thead><tr><th>Candidate</th><th>Stage</th><th>Seat</th><th>Fee</th><th>Last change</th></tr></thead><tbody>
        ${pls.map(p => { const per = person(p.personId); return `<tr>
          <td><span class="link" onclick="go('contact',{id:'${per.id}'})">${esc(per.name)}</span><div class="xs muted">${esc(per.profession)} · ${esc(per.country)}</div></td>
          <td><select style="min-width:170px" onchange="movePlacement('${p.id}',this.value)">${PLACEMENT_STAGES.map(s => `<option value="${s}" ${s === p.stage ? 'selected' : ''}>${s.replace(/_/g, ' ').toLowerCase()}</option>`).join('')}</select></td>
          <td>${p.seat ? badge('Seat taken', 'success') : '<span class="xs muted">Not counted</span>'}</td>
          <td class="tnum">${money(p.fee)}</td><td class="muted sm">${rel(p.updated)}</td></tr>`; }).join('')}
        </tbody></table></div>` : empty('No candidates yet', 'Add a candidate from CRM to start the submission pipeline.')}
      </div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Requirement</h3>${statusBadge(v.status)}</div><div class="card-b stack" style="gap:8px">
          ${[['Specialty', v.specialty], ['Licence', v.licence], ['Experience', v.experience + ' years'], ['Language', v.language],
             ['Salary', money(v.salaryMin) + ' – ' + money(v.salaryMax)], ['Contract', v.contract + ' months'], ['Target start', fmt(v.target)], ['Recruiter', user(v.owner).name]]
            .map(([k, val]) => `<div class="spread sm"><span class="muted">${k}</span><span>${esc(val)}</span></div>`).join('')}
          <div class="sm" style="border-top:1px solid var(--border);padding-top:9px"><span class="muted">Requirements</span><div>${esc(v.requirements)}</div></div>
        </div></div>
        <div class="card"><div class="card-h"><h3>How seats are counted</h3></div><div class="card-b sm muted stack" style="gap:8px">
          <div>A seat is taken once a candidate reaches one of these stages:</div>
          <div class="row" style="gap:5px">${SEAT_STAGES.map(s => badge(s.replace(/_/g, ' ').toLowerCase(), 'success')).join('')}</div>
          <div>Offer <b>sent</b> does not count — an offer can still be declined, and the team must keep sourcing until the client commits. Rejections and withdrawals release the seat immediately.</div>
          <div style="color:var(--fg)">Try it: move a candidate to <b>offer accepted</b> and watch the counters above change.</div>
        </div></div>
      </div></div>`;
}
function movePlacement(id, stage) {
  const p = DB.placements.find(x => x.id === id), v = DB.vacancies.find(x => x.id === p.vacancyId);
  const willConsume = consumesSeat(stage);
  if (willConsume && !p.seat && v.filled >= v.positions) {
    toast('All ' + v.positions + ' seats on ' + v.code + ' are already filled. Increase the positions or release a seat first.', 'err');
    render(); return;
  }
  const was = p.stage;
  p.stage = stage; p.seat = willConsume; p.updated = new Date().toISOString();
  p.history.unshift({ to: stage, at: new Date().toISOString(), by: ME.name });
  recomputeSeats(DB, v.id); save();
  if (willConsume && !consumesSeat(was)) toast('Seat consumed — ' + Math.max(0, v.positions - v.filled) + ' of ' + v.positions + ' still to fill');
  else if (!willConsume && consumesSeat(was)) toast('Seat released — ' + Math.max(0, v.positions - v.filled) + ' now open');
  else toast('Stage updated');
  if (v.status === 'FILLED') { DB.notifications.unshift({ id: uid('n'), text: 'Vacancy ' + v.code + ' is now fully filled', at: new Date().toISOString(), read: false }); toast(v.code + ' is now fully filled', 'ok'); }
  render();
}
function addCandidate(vacancyId) {
  const v = DB.vacancies.find(x => x.id === vacancyId);
  modal({ title: 'Add candidate to this vacancy', desc: 'Candidates only consume a seat once they reach offer accepted.', submitLabel: 'Add candidate',
    fields: [
      { name: 'personId', label: 'Candidate', type: 'select', required: true, full: true, options: DB.people.slice(0, 120).map(p => ({ value: p.id, label: p.name + ' · ' + p.profession })) },
      { name: 'stage', label: 'Starting stage', type: 'select', options: PLACEMENT_STAGES.map(s => ({ value: s, label: s.replace(/_/g, ' ').toLowerCase() })) },
      { name: 'fee', label: 'Placement fee (AED)', type: 'number', value: DB.clients.find(c => c.id === v.clientId).fee },
    ],
    onSubmit: val => {
      if (consumesSeat(val.stage) && v.filled >= v.positions) { toast('That stage would over-fill the vacancy.', 'err'); return; }
      DB.placements.unshift({ id: uid('pl'), code: 'PLC-' + String(DB.placements.length + 1).padStart(6, '0'), vacancyId: v.id, personId: val.personId, stage: val.stage, seat: consumesSeat(val.stage), fee: +val.fee || 0, owner: v.owner, updated: new Date().toISOString(), history: [{ to: val.stage, at: new Date().toISOString(), by: ME.name }] });
      recomputeSeats(DB, v.id); save(); closeModal(); toast('Candidate added'); render();
    } });
}

/* ---------------- IT support ---------------- */
function viewTickets() {
  const f = STATE.filters;
  let rows = DB.tickets;
  if (!isITAgent()) rows = rows.filter(t => t.requester === ME.id);
  if (f.priority) rows = rows.filter(t => t.priority === f.priority);
  if (f.status) rows = rows.filter(t => t.status === f.status);
  if (f.category) rows = rows.filter(t => t.category === f.category);
  if (f.q) rows = rows.filter(t => (t.title + t.code).toLowerCase().includes(f.q.toLowerCase()));
  const openT = DB.tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status));
  const resolved = DB.tickets.filter(t => t.resolved);
  const avg = resolved.length ? Math.round(resolved.reduce((s, t) => s + SLA[t.priority] * 0.7, 0) / resolved.length * 10) / 10 : 0;

  $('view').innerHTML = pageHeader('IT Support', isITAgent() ? 'The service desk queue.' : 'Raise a request and track what IT is doing about it.', null,
    `<button class="btn" onclick="newTicket()">+ Raise a ticket</button>`) +
    (isITAgent() ? `<div class="grid g5" style="margin-bottom:12px">
      ${metric('Open tickets', openT.length)}
      ${metric('Critical', openT.filter(t => t.priority === 'CRITICAL').length, { tone: 'bad', go: "STATE.filters={priority:'CRITICAL'};render()" })}
      ${metric('High priority', openT.filter(t => t.priority === 'HIGH').length, { tone: 'warn' })}
      ${metric('Past SLA', openT.filter(t => overdue(t.due)).length, { tone: 'warn' })}
      ${metric('Avg resolution', avg + 'h', { tone: 'pos', sub: resolved.length + ' resolved' })}
    </div>
    <div class="split" style="margin-bottom:12px">
      <div class="card"><div class="card-h"><h3>Tickets by category</h3></div><div class="card-b">${bars(TICKET_CATS.map(c => ({ label: c, value: DB.tickets.filter(t => t.category === c).length })))}</div></div>
      <div class="card"><div class="card-h"><h3>By priority</h3></div><div class="card-b">${bars(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => ({ label: p.toLowerCase(), value: DB.tickets.filter(t => t.priority === p).length, color: { CRITICAL: 'var(--danger)', HIGH: 'var(--warning)', MEDIUM: 'var(--info)', LOW: 'var(--muted)' }[p] })))}</div></div>
    </div>` : '') +
    filterBar([
      { name: 'status', label: 'All statuses', options: TICKET_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ').toLowerCase() })) },
      { name: 'priority', label: 'All priorities', options: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => ({ value: p, label: p.toLowerCase() })) },
      { name: 'category', label: 'All categories', options: TICKET_CATS.map(c => ({ value: c, label: c })) },
    ], 'Ticket title or code') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th><th>Raised by</th><th>Assigned</th><th>Due</th><th>Age</th></tr></thead><tbody>
    ${rows.map(t => `<tr>
      <td><span class="link" onclick="go('ticket',{id:'${t.id}'})">${esc(t.title)}</span><div class="xs muted">${t.code}</div></td>
      <td class="sm">${esc(t.category)}</td><td>${statusBadge(t.priority)}</td><td>${statusBadge(t.status)}</td>
      <td class="sm">${esc(user(t.requester).name)}</td><td class="sm">${t.assignee ? esc(user(t.assignee).name) : '<span class="muted">Unassigned</span>'}</td>
      <td class="sm" style="${overdue(t.due) && !['RESOLVED', 'CLOSED'].includes(t.status) ? 'color:var(--danger);font-weight:500' : ''}">${fmt(t.due, true)}</td>
      <td class="muted sm">${rel(t.created)}</td></tr>`).join('') || `<tr><td colspan="8">${empty('No tickets here', 'Raise one and IT will pick it up.')}</td></tr>`}
    </tbody></table></div></div>`;
}
function newTicket() {
  modal({ title: 'Tell IT what is wrong', desc: 'Describe the problem — IT picks it up from here, no phone call needed.', submitLabel: 'Send to IT',
    fields: [
      { name: 'title', label: 'What is the problem?', required: true, full: true, placeholder: 'Laptop will not connect to the office WiFi' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: TICKET_CATS.map(c => ({ value: c, label: c })) },
      { name: 'priority', label: 'How urgent?', type: 'select', value: 'MEDIUM', options: [
        { value: 'LOW', label: 'Low — can wait' }, { value: 'MEDIUM', label: 'Medium — slowing me down' },
        { value: 'HIGH', label: 'High — I cannot work properly' }, { value: 'CRITICAL', label: 'Critical — work has stopped' }] },
      { name: 'description', label: 'Details', type: 'textarea', required: true, placeholder: 'When did it start? What have you already tried?' },
    ],
    onSubmit: v => {
      const now = new Date();
      const t = { id: uid('t'), code: 'TCK-' + String(DB.tickets.length + 1).padStart(6, '0'), title: v.title, description: v.description, category: v.category, priority: v.priority, status: 'OPEN', requester: ME.id, assignee: null, created: now.toISOString(), due: new Date(now.getTime() + SLA[v.priority] * 3600e3).toISOString(), resolved: null, comments: [] };
      DB.tickets.unshift(t); save(); closeModal();
      toast('Ticket ' + t.code + ' raised — due ' + fmt(t.due, true) + ' under the ' + v.priority.toLowerCase() + ' SLA');
      go('ticket', { id: t.id });
    } });
}
function viewTicket() {
  const t = DB.tickets.find(x => x.id === STATE.params.id);
  if (!t) return go('tickets');
  $('view').innerHTML = pageHeader(t.title, t.code + ' · raised by ' + user(t.requester).name + ' ' + rel(t.created),
    [`<span class="link" onclick="go('tickets')">IT Support</span>`, t.code],
    isITAgent() ? `<select style="width:auto;min-width:160px" onchange="setTicket('${t.id}','status',this.value)">${TICKET_STATUSES.map(s => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s.replace(/_/g, ' ').toLowerCase()}</option>`).join('')}</select>
      <select style="width:auto;min-width:160px" onchange="setTicket('${t.id}','assignee',this.value)"><option value="">Unassigned</option>${USERS.map(u => `<option value="${u.id}" ${u.id === t.assignee ? 'selected' : ''}>${u.name}</option>`).join('')}</select>` : statusBadge(t.status)) +
    `<div class="split-r">
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Reported problem</h3></div><div class="card-b">${esc(t.description)}</div></div>
        <div class="card"><div class="card-h"><h3>Conversation</h3></div>
          ${t.comments.map(c => `<div class="row" style="align-items:flex-start;gap:11px;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div class="avatar" style="flex:0 0 30px">${initials(user(c.by).name)}</div>
            <div><b style="font-size:13px">${esc(user(c.by).name)}</b> <span class="xs muted">${rel(c.at)}</span>${c.internal ? ' ' + badge('internal') : ''}
            <div style="margin-top:2px">${esc(c.body)}</div></div></div>`).join('') || '<div class="card-b muted sm">No replies yet.</div>'}
          <div class="card-b" style="border-top:1px solid var(--border)">
            <textarea id="cbox" rows="2" placeholder="Add a reply…"></textarea>
            <div class="spread" style="margin-top:8px">
              ${isITAgent() ? `<label class="row sm muted" style="gap:6px"><input type="checkbox" id="cint" style="width:auto"> Internal note</label>` : '<span></span>'}
              <button class="btn" onclick="postComment('${t.id}')">Post reply</button></div>
          </div></div></div>
      <div class="card"><div class="card-h"><h3>Details</h3></div><div class="card-b stack" style="gap:9px">
        ${[['Priority', statusBadge(t.priority)], ['Status', statusBadge(t.status)], ['Category', esc(t.category)],
           ['Due', fmt(t.due, true)], ['Raised', fmt(t.created, true)], ['Resolved', t.resolved ? fmt(t.resolved, true) : '—'],
           ['SLA', SLA[t.priority] + ' hours']].map(([k, v]) => `<div class="spread sm"><span class="muted">${k}</span><span>${v}</span></div>`).join('')}
      </div></div></div>`;
}
function setTicket(id, field, value) {
  const t = DB.tickets.find(x => x.id === id);
  t[field] = value || null;
  if (field === 'status' && ['RESOLVED', 'CLOSED'].includes(value)) t.resolved = new Date().toISOString();
  if (field === 'assignee' && value && t.status === 'OPEN') t.status = 'ASSIGNED';
  save(); toast('Ticket updated'); render();
}
function postComment(id) {
  const body = ($('cbox').value || '').trim();
  if (!body) return;
  const t = DB.tickets.find(x => x.id === id);
  t.comments.push({ by: ME.id, body, at: new Date().toISOString(), internal: ($('cint') || {}).checked || false });
  save(); toast('Reply posted'); render();
}

/* ---------------- assets ---------------- */
function viewAssets() {
  const f = STATE.filters;
  let rows = DB.assets;
  if (f.status) rows = rows.filter(a => a.status === f.status);
  if (f.type) rows = rows.filter(a => a.type === f.type);
  if (f.q) rows = rows.filter(a => (a.name + a.tag + a.serial).toLowerCase().includes(f.q.toLowerCase()));
  const s = k => DB.assets.filter(a => a.status === k).length;
  $('view').innerHTML = pageHeader('IT Assets', 'Every device the company owns, and who is holding it right now.', null,
    `<button class="btn" onclick="newAsset()">+ Add asset</button>`) +
    `<div class="grid g5" style="margin-bottom:12px">
      ${metric('Total assets', DB.assets.length)}
      ${metric('Assigned', s('ASSIGNED'), { tone: 'pos', go: "STATE.filters={status:'ASSIGNED'};render()" })}
      ${metric('Available', s('AVAILABLE'), { go: "STATE.filters={status:'AVAILABLE'};render()" })}
      ${metric('Under repair', s('UNDER_REPAIR'), { tone: 'warn' })}
      ${metric('Book value', money(DB.assets.reduce((t, a) => t + a.price, 0)), { sub: DB.assets.filter(a => new Date(a.warranty) < new Date(Date.now() + 30 * 864e5)).length + ' warranties expiring soon' })}
    </div>` +
    filterBar([
      { name: 'status', label: 'All statuses', options: ['AVAILABLE', 'ASSIGNED', 'UNDER_REPAIR', 'RETIRED'].map(x => ({ value: x, label: x.replace('_', ' ').toLowerCase() })) },
      { name: 'type', label: 'All types', options: ASSET_TYPES.map(t => ({ value: t, label: t })) },
    ], 'Name, tag or serial number') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Asset</th><th>Type</th><th>Status</th><th>Held by</th><th>Warranty</th><th>Cost</th><th></th></tr></thead><tbody>
    ${rows.map(a => { const soon = new Date(a.warranty) < new Date(Date.now() + 30 * 864e5); return `<tr>
      <td><b>${esc(a.name)}</b><div class="xs muted">${a.tag} · ${esc(a.serial)}</div></td>
      <td class="sm">${esc(a.type)}</td><td>${statusBadge(a.status)}</td>
      <td class="sm">${a.holder ? esc(user(a.holder).name) : '<span class="muted">In stock</span>'}${a.location ? `<div class="xs muted">${esc(a.location)}</div>` : ''}</td>
      <td class="sm ${soon ? '' : 'muted'}" style="${soon ? 'color:var(--warning);font-weight:500' : ''}">${fmt(a.warranty)}</td>
      <td class="tnum sm">${money(a.price)}</td>
      <td style="text-align:right">${a.holder ? `<button class="btn ghost sm" onclick="returnAsset('${a.id}')">Return</button>` : `<button class="btn ghost sm" onclick="assignAsset('${a.id}')">Assign</button>`}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}
function assignAsset(id) {
  const a = DB.assets.find(x => x.id === id);
  modal({ title: 'Assign ' + a.name, desc: 'Custody is recorded with a full history — nothing is overwritten.', submitLabel: 'Assign asset',
    fields: [
      { name: 'userId', label: 'Assign to', type: 'select', required: true, full: true, options: USERS.map(u => ({ value: u.id, label: u.name })) },
      { name: 'condition', label: 'Condition at handover', type: 'select', value: 'GOOD', options: ['NEW', 'GOOD', 'FAIR', 'POOR'].map(c => ({ value: c, label: c.toLowerCase() })) },
    ],
    onSubmit: v => { a.holder = v.userId; a.status = 'ASSIGNED'; a.location = 'Head office'; a.history.unshift({ user: v.userId, from: new Date().toISOString(), to: null }); save(); closeModal(); toast(a.name + ' assigned to ' + user(v.userId).name); render(); } });
}
function returnAsset(id) {
  const a = DB.assets.find(x => x.id === id);
  const open = a.history.find(h => !h.to); if (open) open.to = new Date().toISOString();
  const was = a.holder; a.holder = null; a.status = 'AVAILABLE'; a.location = 'IT store room';
  save(); toast(a.name + ' returned from ' + user(was).name + ' — history kept'); render();
}
function newAsset() {
  modal({ title: 'Add an asset', submitLabel: 'Add asset',
    fields: [
      { name: 'name', label: 'Asset name', required: true, placeholder: 'MacBook Pro 14" M3' },
      { name: 'type', label: 'Type', type: 'select', required: true, options: ASSET_TYPES.map(t => ({ value: t, label: t })) },
      { name: 'brand', label: 'Brand' }, { name: 'serial', label: 'Serial number' },
      { name: 'price', label: 'Purchase price (AED)', type: 'number', value: 4000 },
      { name: 'warranty', label: 'Warranty expiry', type: 'date' },
    ],
    onSubmit: v => { DB.assets.unshift({ id: uid('as'), tag: 'AST-' + String(DB.assets.length + 1).padStart(5, '0'), name: v.name, type: v.type, brand: v.brand, serial: v.serial || '—', price: +v.price || 0, currency: 'AED', status: 'AVAILABLE', holder: null, warranty: v.warranty ? new Date(v.warranty).toISOString() : day(730), location: 'IT store room', history: [] }); save(); closeModal(); toast('Asset added to the register'); render(); } });
}

/* ---------------- marketing ---------------- */
function viewMarketing() {
  const f = STATE.filters;
  let rows = DB.marketing;
  if (!isMarketing()) rows = rows.filter(m => m.requester === ME.id);
  if (f.status) rows = rows.filter(m => m.status === f.status);
  if (f.type) rows = rows.filter(m => m.type === f.type);
  if (f.q) rows = rows.filter(m => (m.title + m.code).toLowerCase().includes(f.q.toLowerCase()));
  $('view').innerHTML = pageHeader('Marketing', isMarketing() ? 'The creative queue, with what is late and what is next.' : 'Ask marketing for creative work and follow its progress.', null,
    `<button class="btn" onclick="newMarketing()">+ New request</button>`) +
    (isMarketing() ? `<div class="grid g4" style="margin-bottom:12px">
      ${metric('New requests', DB.marketing.filter(m => m.status === 'NEW').length)}
      ${metric('In progress', DB.marketing.filter(m => ['IN_PROGRESS', 'APPROVED', 'REVIEWING'].includes(m.status)).length)}
      ${metric('Overdue', DB.marketing.filter(m => overdue(m.due) && m.status !== 'COMPLETED').length, { tone: 'bad' })}
      ${metric('Delivered', DB.marketing.filter(m => m.status === 'COMPLETED').length, { tone: 'pos', sub: '3.4 day average turnaround' })}
    </div>` : '') +
    filterBar([
      { name: 'status', label: 'All statuses', options: MKT_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ').toLowerCase() })) },
      { name: 'type', label: 'All types', options: MKT_TYPES.map(t => ({ value: t, label: t })) },
    ], 'Request title or code') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Request</th><th>Type</th><th>Requested by</th><th>Status</th><th>Assigned</th><th>Needed by</th><th>Age</th></tr></thead><tbody>
    ${rows.map(m => `<tr>
      <td><b>${esc(m.title)}</b><div class="xs muted">${m.code} · ${dept(m.dept).name}</div></td>
      <td class="sm">${esc(m.type)}</td><td class="sm">${esc(user(m.requester).name)}</td>
      <td>${isMarketing() ? `<select style="min-width:150px" onchange="setMkt('${m.id}','status',this.value)">${MKT_STATUSES.map(s => `<option value="${s}" ${s === m.status ? 'selected' : ''}>${s.replace(/_/g, ' ').toLowerCase()}</option>`).join('')}</select>` : statusBadge(m.status)}</td>
      <td class="sm">${m.assignee ? esc(user(m.assignee).name) : '<span class="muted">Unassigned</span>'}</td>
      <td class="sm" style="${overdue(m.due) && m.status !== 'COMPLETED' ? 'color:var(--danger);font-weight:500' : ''}">${fmt(m.due)}</td>
      <td class="muted sm">${rel(m.created)}</td></tr>`).join('') || `<tr><td colspan="7">${empty('No creative requests', 'Ask marketing for a poster, a reel or a campaign.')}</td></tr>`}
    </tbody></table></div></div>`;
}
const setMkt = (id, f, v) => { const m = DB.marketing.find(x => x.id === id); m[f] = v; if (v === 'COMPLETED') m.completed = new Date().toISOString(); if (!m.assignee) m.assignee = 'u10'; save(); toast('Request updated'); render(); };
function newMarketing() {
  modal({ title: 'Request creative work', desc: 'Tell marketing exactly what you need and when — no more WhatsApp chasing.', submitLabel: 'Send request',
    fields: [
      { name: 'title', label: 'What do you need?', required: true, full: true, placeholder: 'Instagram carousel for DHA licensing offer' },
      { name: 'type', label: 'Type of work', type: 'select', required: true, options: MKT_TYPES.map(t => ({ value: t, label: t })) },
      { name: 'dept', label: 'For which department', type: 'select', options: DEPARTMENTS.map(d => ({ value: d.id, label: d.name })) },
      { name: 'priority', label: 'Priority', type: 'select', value: 'MEDIUM', options: ['LOW', 'MEDIUM', 'HIGH'].map(p => ({ value: p, label: p.toLowerCase() })) },
      { name: 'due', label: 'Needed by', type: 'date' },
      { name: 'brief', label: 'Brief', type: 'textarea', required: true, placeholder: 'Key message, offer, call to action, any copy that must appear…' },
    ],
    onSubmit: v => { DB.marketing.unshift({ id: uid('m'), code: 'MKT-' + String(DB.marketing.length + 1).padStart(6, '0'), title: v.title, type: v.type, dept: v.dept, requester: ME.id, assignee: null, priority: v.priority, status: 'NEW', due: v.due ? new Date(v.due).toISOString() : day(7), created: new Date().toISOString(), brief: v.brief, completed: null }); save(); closeModal(); toast('Request sent to marketing'); render(); } });
}

/* ---------------- reports, people, settings ---------------- */
function viewReports() {
  const leads = scopeLeads(DB.leads), deals = scopeDeals(DB.deals);
  const cat = c => leads.filter(l => status(l.status).cat === c).length;
  const converted = cat('CONVERTED'), won = deals.filter(d => d.status === 'WON');
  const funnel = [['Leads received', leads.length], ['Contact made', cat('CONNECTED') + converted], ['Converted to deal', converted], ['Deals won', won.length]];
  $('view').innerHTML = pageHeader('Reports', 'Everything a manager asks on a Monday morning.') +
    `<div class="split">
      <div class="card"><div class="card-h"><h3>Lead to conversion funnel</h3></div><div class="card-b stack" style="gap:11px">
        ${funnel.map(([l, v]) => `<div><div class="spread sm"><span>${l}</span><b class="tnum">${num(v)} <span class="muted xs">${pct(v, leads.length)}%</span></b></div>
          <div class="meter" style="margin-top:4px"><i style="width:${pct(v, leads.length)}%"></i></div></div>`).join('')}
      </div></div>
      <div class="card"><div class="card-h"><h3>Recruitment supply</h3></div><div class="card-b">
        <div class="grid g3" style="margin-bottom:14px">
          <div><div class="xs muted">Seats open</div><div style="font-family:var(--display);font-size:20px;font-weight:600">${DB.vacancies.filter(v => v.status === 'OPEN').reduce((s, v) => s + Math.max(0, v.positions - v.filled), 0)}</div></div>
          <div><div class="xs muted">Filled</div><div style="font-family:var(--display);font-size:20px;font-weight:600">${DB.vacancies.reduce((s, v) => s + v.filled, 0)}</div></div>
          <div><div class="xs muted">Deployed</div><div style="font-family:var(--display);font-size:20px;font-weight:600">${DB.placements.filter(p => p.stage === 'DEPLOYED').length}</div></div>
        </div>
        ${bars(PLACEMENT_STAGES.slice(0, 10).map(s => ({ label: s.replace(/_/g, ' ').toLowerCase(), value: DB.placements.filter(p => p.stage === s).length, color: consumesSeat(s) ? 'var(--success)' : 'var(--primary)' })))}
      </div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>Department scorecard</h3></div><div class="tw">
      <table><thead><tr><th>Department</th><th>Leads</th><th>Converted</th><th>Conversion</th><th>Won deals</th><th>Revenue</th><th>Open pipeline</th></tr></thead><tbody>
      ${DEPARTMENTS.map(d => { const dl = leads.filter(l => l.dept === d.id), dd = deals.filter(x => x.dept === d.id), cv = dl.filter(l => l.dealId).length;
        return `<tr><td><b>${d.name}</b></td><td class="tnum">${dl.length}</td><td class="tnum">${cv}</td><td class="tnum">${pct(cv, dl.length)}%</td>
        <td class="tnum">${dd.filter(x => x.status === 'WON').length}</td><td class="tnum"><b>${money(dd.filter(x => x.status === 'WON').reduce((s, x) => s + x.amount, 0))}</b></td>
        <td class="tnum">${money(dd.filter(x => x.status === 'OPEN').reduce((s, x) => s + x.amount, 0))}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>Marketing return</h3></div><div class="tw">
      <table><thead><tr><th>Campaign</th><th>Channel</th><th>Spend</th><th>Leads</th><th>Cost / lead</th><th>Converted</th><th>Revenue</th></tr></thead><tbody>
      ${CAMPAIGNS.map(c => { const cl = leads.filter(l => l.campaign === c.id); const cd = cl.filter(l => l.dealId).map(l => DB.deals.find(d => d.id === l.dealId)).filter(Boolean);
        return `<tr><td><b>${c.name}</b></td><td class="sm">${c.channel}</td><td class="tnum">${money(c.spend)}</td><td class="tnum">${cl.length}</td>
        <td class="tnum">${money(cl.length ? c.spend / cl.length : 0)}</td><td class="tnum">${cd.length}</td>
        <td class="tnum">${money(cd.reduce((s, d) => s + d.amount, 0))}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    <div class="xs muted" style="margin-top:12px">Every number here is a live calculation over the same records, so a report can never disagree with the record it came from. CSV export and scheduled email digests are Phase 6.</div>`;
}
function viewPeople() {
  $('view').innerHTML = pageHeader('People', 'Employees, what they can see, and what they are carrying.', null,
    `<button class="btn" onclick="toast('In the real app this creates an account with a temporary password.')">+ Add employee</button>`) +
    `<div class="card"><div class="tw"><table><thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Data access</th><th>Permissions</th><th></th></tr></thead><tbody>
    ${USERS.map(u => `<tr>
      <td><span class="row" style="gap:9px"><span class="avatar">${initials(u.name)}</span><span><b>${esc(u.name)}</b><div class="xs muted">${esc(u.email)} · ${esc(u.title)}</div></span></span></td>
      <td class="sm">${u.dept ? dept(u.dept).name : '—'}</td>
      <td>${badge(u.role.toLowerCase(), u.role === 'ADMIN' ? 'primary' : 'neutral')}</td>
      <td>${badge({ OWN: 'own records', DEPARTMENT: dept(u.dept).name, ALL: 'whole company' }[u.scope], u.scope === 'ALL' ? 'warning' : 'neutral')}</td>
      <td style="max-width:320px"><span class="row" style="gap:4px">${u.role === 'ADMIN' ? badge('every permission', 'primary') : u.perms.map(p => badge(p)).join('')}</span></td>
      <td style="text-align:right"><button class="btn ghost sm" onclick="signInAs('${u.id}')">View as</button></td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>How access is decided</h3></div><div class="card-b sm muted stack" style="gap:8px">
      <div>Three independent axes, not one role field: <b>role</b> (is this an administrator), <b>permission keys</b> (what can they do), <b>data scope</b> (whose records can they see).</div>
      <div>Yasir, Austin and Muneer hold everything company-wide. Sagar and Siyad run the marketing queue, campaigns and budget requests — deliberately without <b>asset.manage</b>, because raising a ticket is enough and hardware custody stays with IT. Mohanan and Sharon see only their own department's CRM; Sharifa additionally holds <b>recruitment.manage</b>. Consultants see only what they own.</div>
      <div>Adding a new job role later is granting a different set of keys — a data change, not a rewrite. Press <b>View as</b> on anyone above to see the same screens through their permissions.</div>
    </div></div>`;
}
function viewSettings() {
  $('view').innerHTML = pageHeader('Settings', 'Departments, statuses and pipelines are data, not code — they change without a deployment.') +
    `<div class="split">
      <div class="card"><div class="card-h"><h3>Company</h3></div><div class="card-b stack" style="gap:9px">
        ${[['Company', '360 Medicare Consultancy LLC'], ['Timezone', 'Asia/Dubai'], ['Currency', 'AED'], ['Working hours', '09:30 – 18:00'], ['Working week', 'Monday – Friday']]
          .map(([k, v]) => `<div class="spread sm"><span class="muted">${k}</span><span>${v}</span></div>`).join('')}
        <div class="xs muted" style="border-top:1px solid var(--border);padding-top:9px">These come from environment configuration, so a second office in another country runs the same build with different values.</div>
      </div></div>
      <div class="card"><div class="card-h"><h3>Lead statuses</h3></div><div class="card-b stack" style="gap:7px">
        ${STATUSES.map(s => `<div class="spread sm"><span class="row" style="gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${s.color}"></span>${s.name}</span>${badge(s.cat.toLowerCase())}</div>`).join('')}
        <div class="xs muted" style="border-top:1px solid var(--border);padding-top:9px">Reporting groups on the category, not the name — renaming a status can never break a dashboard.</div>
      </div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>Departments and services</h3></div><div class="tw">
      <table><thead><tr><th>Department</th><th>Services</th><th>People</th><th>Leads</th><th>Pipeline stages</th></tr></thead><tbody>
      ${DEPARTMENTS.map(d => `<tr><td><span class="row" style="gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${d.color}"></span><b>${d.name}</b></span></td>
        <td><span class="row" style="gap:4px">${SERVICES[d.id].map(s => badge(s)).join('')}</span></td>
        <td class="tnum">${USERS.filter(u => u.dept === d.id).length}</td><td class="tnum">${DB.leads.filter(l => l.dept === d.id).length}</td>
        <td><span class="row" style="gap:4px">${STAGES[d.id].map((s, i) => badge(s, i === STAGES[d.id].length - 1 ? 'success' : 'neutral')).join('')}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="grid g3" style="margin-top:14px">
      ${[['Ticket categories', TICKET_CATS], ['Asset types', ASSET_TYPES], ['Marketing request types', MKT_TYPES]].map(([t, items]) =>
        `<div class="card"><div class="card-h"><h3>${t}</h3></div><div class="card-b row" style="gap:5px">${items.map(i => badge(i)).join('')}</div></div>`).join('')}
    </div>`;
}
function viewChat() {
  $('view').innerHTML = pageHeader('Chat', 'Internal messaging between employees and departments.') +
    `<div class="card"><div class="card-h"><h3>Not switched on yet — and here is the honest reason</h3></div><div class="card-b stack muted" style="gap:11px">
      <div>The data model exists (conversations, members, messages, read receipts). What is missing is the transport. Real-time chat needs a server holding an open connection per user; this app runs on serverless functions that start, answer one request and stop, so a WebSocket cannot survive between messages.</div>
      <div>Turning it on means adding one managed service — Pusher, Ably or Supabase Realtime — against the schema that already exists. Shipping a fake chat that polls every few seconds would feel broken to the team and cost more in database reads than the real thing.</div>
      <div style="color:var(--fg)"><b>Recommendation:</b> keep WhatsApp for chat in Phase 1 and put this in Phase 7, once the CRM has replaced Zoho. Most of the "chat" in the current process is actually threaded comments on tickets and marketing requests — and those already work here.</div>
    </div></div>`;
}

/* ---------------- budgets & approvals ---------------- */
function viewBudgets() {
  const f = STATE.filters;
  let rows = DB.budgets.filter(b => canApproveBudget() || ME.scope === 'ALL' ? true : b.requester === ME.id || b.dept === ME.dept);
  if (f.status) rows = rows.filter(b => b.status === f.status);
  if (f.dept) rows = rows.filter(b => b.dept === f.dept);
  if (f.q) rows = rows.filter(b => (b.title + b.code).toLowerCase().includes(f.q.toLowerCase()));

  const pending = DB.budgets.filter(b => b.status === 'SUBMITTED');
  const approved = DB.budgets.filter(b => b.status === 'APPROVED');
  const approvedValue = approved.reduce((s, b) => s + b.approved, 0);
  const spentValue = approved.reduce((s, b) => s + b.spent, 0);

  $('view').innerHTML = pageHeader('Budgets & approvals',
    `Requests route automatically: under ${money(BUDGET_THRESHOLD)} a budget approver signs off, at or above it the request needs company-wide sign-off.`,
    ['Marketing', 'Budgets'],
    `<button class="btn" onclick="newBudget()">Request budget</button>`) +
    `<div class="grid g4" style="margin-bottom:12px">
      ${metric('Awaiting decision', pending.length, { tone: pending.length ? 'warn' : '', sub: money(pending.reduce((s, b) => s + b.requested, 0)) + ' requested' })}
      ${metric('Approved', money(approvedValue), { tone: 'pos' })}
      ${metric('Spent against approved', money(spentValue), { sub: money(approvedValue - spentValue) + ' still available' })}
      ${metric('Rejected', DB.budgets.filter(b => b.status === 'REJECTED').length, { tone: 'bad' })}
    </div>` +
    filterBar([
      { name: 'status', label: 'All statuses', options: BUDGET_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ').toLowerCase() })) },
      { name: 'dept', label: 'All departments', options: DEPARTMENTS.map(d => ({ value: d.id, label: d.name })) },
    ], 'Budget title or code') +
    `<div class="card"><div class="tw"><table>
      <thead><tr><th>Request</th><th>Department</th><th>Requested</th><th>Approved</th><th>Spent</th><th>Status</th><th>Raised by</th><th></th></tr></thead>
      <tbody>${rows.map(b => {
        const needsCeo = b.requested >= BUDGET_THRESHOLD;
        const remaining = b.approved - b.spent;
        return `<tr>
          <td><b>${esc(b.title)}</b><div class="xs muted">${b.code}${b.campaign ? ' · ' + esc((CAMPAIGNS.find(c => c.id === b.campaign) || {}).name || '') : ''} · needed by ${fmt(b.neededBy)}</div></td>
          <td class="sm">${dept(b.dept).name}</td>
          <td class="tnum"><b>${money(b.requested)}</b>${needsCeo && b.status === 'SUBMITTED' ? `<div class="xs" style="color:var(--warning)">Needs company-wide sign-off</div>` : ''}</td>
          <td class="tnum">${b.approved ? money(b.approved) : '—'}</td>
          <td class="tnum muted sm">${b.spent ? money(b.spent) : '—'}</td>
          <td>${statusBadge(b.status)}${b.approver ? `<div class="xs muted">by ${esc(user(b.approver).name)} ${rel(b.decided)}</div>` : ''}
            ${b.note ? `<div class="xs muted" style="max-width:200px">${esc(b.note)}</div>` : ''}</td>
          <td class="sm">${esc(user(b.requester).name)}</td>
          <td style="text-align:right;white-space:nowrap">
            ${canApproveBudget() && ['SUBMITTED', 'CHANGES_REQUESTED'].includes(b.status)
              ? `<button class="btn sm" onclick="decideBudget('${b.id}','APPROVE')">Approve</button>
                 <button class="btn ghost sm" onclick="decideBudget('${b.id}','REJECT')">Reject</button>`
              : b.status === 'APPROVED' && remaining > 0
                ? `<button class="btn ghost sm" onclick="recordSpend('${b.id}')">Record spend</button>`
                : ''}
          </td></tr>`;
      }).join('') || `<tr><td colspan="8">${empty('No budget requests', 'Raise the first one — spend then sits next to the campaign and the leads it produced.')}</td></tr>`}
      </tbody></table></div></div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>How approval routing works</h3></div>
      <div class="card-b sm muted stack" style="gap:8px">
        <div>The threshold is a setting, not code. Today it is ${money(BUDGET_THRESHOLD)}: below that, anyone holding <b>budget.approve</b> can sign off; at or above it, the approver must also have company-wide scope.</div>
        <div>Nobody can approve their own request, a decided budget cannot be edited, and every decision is appended to the request's history rather than overwriting it.</div>
        <div>Recorded spend can never exceed the approved amount — an over-run comes back as a top-up request, which is the point of having the control.</div>
      </div></div>`;
}
function newBudget() {
  modal({ title: 'Request a budget', desc: 'Spend lives next to the campaign it pays for, so cost per lead is never a separate spreadsheet.',
    submitLabel: 'Submit for approval',
    fields: [
      { name: 'title', label: 'What is the money for?', required: true, full: true, placeholder: 'Meta ads — ICU nurses, October push' },
      { name: 'requested', label: 'Amount needed (AED)', type: 'number', required: true, value: 15000 },
      { name: 'dept', label: 'Department', type: 'select', options: DEPARTMENTS.map(d => ({ value: d.id, label: d.name })) },
      { name: 'campaign', label: 'Link to campaign', type: 'select', options: [{ value: '', label: 'None' }].concat(CAMPAIGNS.map(c => ({ value: c.id, label: c.name }))) },
      { name: 'neededBy', label: 'Needed by', type: 'date' },
      { name: 'purpose', label: 'Justification', type: 'textarea', placeholder: 'Expected reach, target cost per lead, what happens if this is not funded.' },
    ],
    onSubmit: v => {
      const amount = +v.requested || 0;
      const b = { id: uid('b'), code: 'BUD-' + String(DB.budgets.length + 1).padStart(6, '0'), title: v.title, purpose: v.purpose, dept: v.dept, campaign: v.campaign || null, period: 'This month', requested: amount, approved: 0, spent: 0, currency: 'AED', status: 'SUBMITTED', requester: ME.id, approver: null, submitted: new Date().toISOString(), decided: null, note: null, neededBy: v.neededBy ? new Date(v.neededBy).toISOString() : day(14), events: [{ action: 'SUBMITTED', amount, by: ME.id, at: new Date().toISOString() }] };
      DB.budgets.unshift(b);
      DB.notifications.unshift({ id: uid('n'), text: `Budget ${b.code} needs approval — ${money(amount)}${amount >= BUDGET_THRESHOLD ? ', above the sign-off threshold' : ''}`, at: new Date().toISOString(), read: false });
      save(); closeModal();
      toast(amount >= BUDGET_THRESHOLD ? 'Submitted — routed for company-wide sign-off because it is at or above ' + money(BUDGET_THRESHOLD) : 'Submitted for approval');
      render();
    } });
}
function decideBudget(id, action) {
  const b = DB.budgets.find(x => x.id === id);
  if (b.requester === ME.id && ME.role !== 'ADMIN') { toast('You cannot approve your own budget request.', 'err'); return; }
  if (action === 'APPROVE' && b.requested >= BUDGET_THRESHOLD && ME.scope !== 'ALL') {
    toast('Requests of ' + money(BUDGET_THRESHOLD) + ' or more need company-wide sign-off.', 'err'); return;
  }
  modal({ title: (action === 'APPROVE' ? 'Approve ' : 'Reject ') + b.code,
    desc: action === 'APPROVE' ? 'You can approve less than was requested — the requester is told either way.' : 'The reason is sent to the requester.',
    submitLabel: action === 'APPROVE' ? 'Approve budget' : 'Reject',
    fields: action === 'APPROVE'
      ? [{ name: 'amount', label: 'Amount approved (AED)', type: 'number', value: b.requested, required: true }, { name: 'note', label: 'Note to the requester', type: 'textarea' }]
      : [{ name: 'note', label: 'Reason', type: 'textarea', required: true, placeholder: 'Why this is not being funded right now.' }],
    onSubmit: v => {
      b.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      b.approved = action === 'APPROVE' ? (+v.amount || b.requested) : 0;
      b.approver = ME.id; b.decided = new Date().toISOString(); b.note = v.note || null;
      b.events.unshift({ action: b.status, amount: b.approved, by: ME.id, at: b.decided, note: v.note });
      save(); closeModal();
      toast(action === 'APPROVE'
        ? 'Approved ' + money(b.approved) + (b.approved < b.requested ? ' (reduced from ' + money(b.requested) + ')' : '')
        : 'Rejected — the requester has been notified');
      render();
    } });
}
function recordSpend(id) {
  const b = DB.budgets.find(x => x.id === id);
  const left = b.approved - b.spent;
  modal({ title: 'Record spend against ' + b.code, desc: money(left) + ' still available.', submitLabel: 'Record spend',
    fields: [{ name: 'amount', label: 'Amount spent (AED)', type: 'number', required: true, value: left }, { name: 'note', label: 'What on', placeholder: 'Meta invoice 4417' }],
    onSubmit: v => {
      const amt = +v.amount || 0;
      if (amt > left) { toast('That is more than the approved budget allows. Raise a top-up request instead.', 'err'); return; }
      b.spent += amt; b.events.unshift({ action: 'SPEND_RECORDED', amount: amt, by: ME.id, at: new Date().toISOString(), note: v.note });
      save(); closeModal(); toast('Spend recorded — ' + money(b.approved - b.spent) + ' left'); render();
    } });
}
