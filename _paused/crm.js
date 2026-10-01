/* =====================================================================
   views — CRM
   ===================================================================== */
function viewDashboard() {
  const leads = scopeLeads(DB.leads), deals = scopeDeals(DB.deals);
  const catCount = c => leads.filter(l => status(l.status).cat === c).length;
  const won = deals.filter(d => d.status === 'WON');
  const open = deals.filter(d => d.status === 'OPEN');
  const revenue = won.reduce((s, d) => s + d.amount, 0);
  const received = deals.reduce((s, d) => s + d.received, 0);
  const spend = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const converted = catCount('CONVERTED');

  const days = 30, buckets = Array.from({ length: days }, () => ({ l: 0, c: 0 }));
  leads.forEach(l => {
    const d = Math.floor((Date.now() - new Date(l.created)) / 86400e3);
    if (d >= 0 && d < days) { buckets[days - 1 - d].l++; if (l.dealId) buckets[days - 1 - d].c++; }
  });

  const byStatus = STATUSES.map(s => ({ label: s.name, value: leads.filter(l => l.status === s.id).length, color: s.color })).filter(x => x.value).sort((a, b) => b.value - a.value);
  const seatsOpen = DB.vacancies.filter(v => v.status === 'OPEN').reduce((s, v) => s + Math.max(0, v.positions - v.filled), 0);
  const critical = DB.tickets.filter(t => t.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const lateTickets = DB.tickets.filter(t => overdue(t.due) && !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const lateFollow = leads.filter(l => overdue(l.followUp)).length;
  const lateMkt = DB.marketing.filter(m => overdue(m.due) && m.status !== 'COMPLETED').length;
  const warranty = DB.assets.filter(a => new Date(a.warranty) < new Date(Date.now() + 30 * 864e5)).length;

  const attention = [
    ['Critical IT tickets', critical, "go('tickets',{priority:'CRITICAL'})"],
    ['Tickets past SLA', lateTickets, "go('tickets')"],
    ['Follow-ups past due', lateFollow, "go('myday')"],
    ['Overdue creative requests', lateMkt, "go('marketing')"],
    ['Open recruitment seats', seatsOpen, "go('vacancies')"],
    ['Warranties expiring in 30 days', warranty, "go('assets')"],
  ].filter(a => a[1] > 0);

  $('view').innerHTML =
    pageHeader('Good day, ' + ME.name.split(' ')[0], 'Company performance · last 30 days · showing ' + (canSeeAll() ? 'the whole company' : ME.scope === 'DEPARTMENT' ? 'your department' : 'your own records')) +
    (attention.length ? `<div class="card" style="margin-bottom:14px;border-color:color-mix(in srgb,var(--warning) 35%,transparent);background:var(--warning-bg)">
      <div class="card-b row" style="gap:20px;padding:11px 16px">
        <b style="font-size:13px">Needs attention today</b>
        ${attention.map(a => `<span class="link row" style="gap:6px" onclick="${a[2]}"><b class="tnum">${a[1]}</b><span class="muted">${a[0]}</span></span>`).join('')}
      </div></div>` : '') +
    `<div class="grid g4">
      ${metric('Total leads', num(leads.length), { trend: 12.4, sub: 'vs previous period', go: "go('leads')" })}
      ${metric('Converted', num(converted), { sub: pct(converted, leads.length) + '% conversion', tone: 'pos', go: "go('leads',{cat:'CONVERTED'})" })}
      ${metric('Revenue won', money(revenue), { sub: money(revenue - received) + ' still to collect', tone: 'pos', go: "go('deals',{status:'WON'})" })}
      ${metric('Open pipeline', money(open.reduce((s, d) => s + d.amount, 0)), { sub: open.length + ' open deals', go: "go('deals',{status:'OPEN'})" })}
    </div>
    <div class="grid g4" style="margin-top:12px">
      ${metric('New leads', num(catCount('NEW')), { go: "go('leads',{cat:'NEW'})" })}
      ${metric('Connected', num(catCount('CONNECTED')), { go: "go('leads',{cat:'CONNECTED'})" })}
      ${metric('Not answering', num(catCount('UNRESPONSIVE')), { tone: 'warn', go: "go('leads',{cat:'UNRESPONSIVE'})" })}
      ${metric('Not interested / not eligible', num(catCount('DISQUALIFIED')), { tone: 'bad', go: "go('leads',{cat:'DISQUALIFIED'})" })}
    </div>
    <div class="grid g4" style="margin-top:12px">
      ${metric('Marketing spend', money(spend), { sub: money(leads.length ? spend / leads.length : 0) + ' per lead' })}
      ${metric('Active clients', num(DB.clients.filter(c => c.status === 'ACTIVE').length), { go: "go('clients')" })}
      ${metric('Open seats to fill', num(seatsOpen), { tone: 'warn', sub: 'across ' + DB.vacancies.filter(v => v.status === 'OPEN').length + ' vacancies', go: "go('vacancies')" })}
      ${metric('Candidates deployed', num(DB.placements.filter(p => p.stage === 'DEPLOYED').length), { tone: 'pos', go: "go('vacancies')" })}
    </div>

    <div class="split" style="margin-top:14px">
      <div class="card"><div class="card-h"><h3>Leads and conversions</h3><span class="xs muted">last 30 days</span></div>
        <div class="card-b">${lineChart([
          { label: 'Leads', color: '#0E6B6B', points: buckets.map(b => b.l) },
          { label: 'Converted', color: '#D97706', points: buckets.map(b => b.c) },
        ])}</div></div>
      <div class="card"><div class="card-h"><h3>Where leads are sitting</h3></div><div class="card-b">${donut(byStatus)}</div></div>
    </div>

    <div class="card" style="margin-top:14px"><div class="card-h"><h3>Department performance</h3></div>
      <div class="tw"><table><thead><tr><th>Department</th><th>Leads</th><th>Converted</th><th>Conversion</th><th>Deals</th><th>Pipeline</th><th>Revenue</th></tr></thead><tbody>
      ${DEPARTMENTS.map(d => {
        const dl = leads.filter(l => l.dept === d.id), dd = deals.filter(x => x.dept === d.id);
        const cv = dl.filter(l => status(l.status).cat === 'CONVERTED').length;
        return `<tr><td><span class="row" style="gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${d.color}"></span><b>${d.name}</b></span></td>
          <td class="tnum">${dl.length}</td><td class="tnum">${cv}</td><td class="tnum">${pct(cv, dl.length)}%</td>
          <td class="tnum">${dd.length}</td><td class="tnum">${money(dd.filter(x => x.status === 'OPEN').reduce((s, x) => s + x.amount, 0))}</td>
          <td class="tnum"><b>${money(dd.filter(x => x.status === 'WON').reduce((s, x) => s + x.amount, 0))}</b></td></tr>`;
      }).join('')}</tbody></table></div></div>

    <div class="split" style="margin-top:14px">
      <div class="card"><div class="card-h"><h3>Campaigns generating leads</h3></div>
        <div class="tw"><table><thead><tr><th>Campaign</th><th>Spend</th><th>Leads</th><th>Cost / lead</th><th>Converted</th></tr></thead><tbody>
        ${CAMPAIGNS.map(c => {
          const cl = leads.filter(l => l.campaign === c.id);
          const cv = cl.filter(l => l.dealId).length;
          return `<tr><td><b>${c.name}</b><div class="xs muted">${c.channel}</div></td><td class="tnum">${money(c.spend)}</td>
            <td class="tnum">${cl.length}</td><td class="tnum">${money(cl.length ? c.spend / cl.length : 0)}</td><td class="tnum">${cv}</td></tr>`;
        }).join('')}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Team workload</h3></div>
        <div class="tw"><table><thead><tr><th>Employee</th><th>Leads</th><th>Open tasks</th><th>Overdue</th></tr></thead><tbody>
        ${CONSULTANTS.map(id => {
          const u = user(id), acts = DB.activities.filter(a => a.owner === id && a.status === 'OPEN');
          return `<tr><td><b>${u.name}</b><div class="xs muted">${u.title}</div></td><td class="tnum">${leads.filter(l => l.owner === id).length}</td>
            <td class="tnum">${acts.length}</td><td class="tnum">${acts.filter(a => overdue(a.due)).length ? `<b style="color:var(--danger)">${acts.filter(a => overdue(a.due)).length}</b>` : '0'}</td></tr>`;
        }).join('')}</tbody></table></div></div>
    </div>`;
}

/* ---------------- leads ---------------- */
function viewLeads() {
  const f = STATE.filters;
  let rows = scopeLeads(DB.leads);
  if (f.cat) rows = rows.filter(l => status(l.status).cat === f.cat);
  if (f.dept) rows = rows.filter(l => l.dept === f.dept);
  if (f.status) rows = rows.filter(l => l.status === f.status);
  if (f.owner) rows = rows.filter(l => l.owner === f.owner);
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter(l => { const p = person(l.personId); return (p.name + p.phone + p.email + l.code).toLowerCase().includes(q); });
  }
  rows = rows.slice().sort((a, b) => new Date(b.created) - new Date(a.created));
  const per = 12, pages = Math.max(1, Math.ceil(rows.length / per));
  STATE.page = Math.min(STATE.page, pages);
  const view = rows.slice((STATE.page - 1) * per, STATE.page * per);

  $('view').innerHTML = pageHeader('Leads', 'Every enquiry across all five departments.', ['CRM', 'Leads'],
    `<button class="btn" onclick="newLead()">+ New lead</button>`) +
    filterBar([
      { name: 'dept', label: 'All departments', options: DEPARTMENTS.map(d => ({ value: d.id, label: d.name })) },
      { name: 'status', label: 'All statuses', options: STATUSES.map(s => ({ value: s.id, label: s.name })) },
      { name: 'owner', label: 'All owners', options: USERS.map(u => ({ value: u.id, label: u.name })) },
    ], 'Name, phone, email or lead code') +
    `<div class="card"><div class="tw"><table>
      <thead><tr><th>Lead</th><th>Contact</th><th>Department</th><th>Status</th><th>Owner</th><th>Source</th><th>Next follow-up</th><th>Created</th></tr></thead>
      <tbody>${view.map(l => { const p = person(l.personId), st = status(l.status); return `<tr>
        <td><span class="link" onclick="go('lead',{id:'${l.id}'})">${esc(p.name)}</span><div class="xs muted">${l.code}</div></td>
        <td>${esc(p.phone)}<div class="xs muted">${esc(p.country)}</div></td>
        <td>${dept(l.dept).name}<div class="xs muted">${esc(l.service || '—')}</div></td>
        <td><span class="badge" style="background:${st.color}18;color:${st.color};border-color:${st.color}44">${esc(st.name)}</span></td>
        <td>${esc(user(l.owner).name)}</td><td>${esc(l.source)}</td>
        <td class="${overdue(l.followUp) ? '' : 'muted'}" style="${overdue(l.followUp) ? 'color:var(--danger);font-weight:500' : ''}">${fmt(l.followUp)}</td>
        <td class="muted">${rel(l.created)}</td></tr>`; }).join('') || `<tr><td colspan="8">${empty('No leads match these filters', 'Clear a filter, or add the first enquiry.')}</td></tr>`}
      </tbody></table></div>${pager(rows.length, per, pages)}</div>`;
}

function filterBar(filters, placeholder) {
  return `<div class="row" style="margin-bottom:12px">
    ${placeholder ? `<input style="max-width:260px;height:34px" placeholder="${esc(placeholder)}" value="${esc(STATE.filters.q || '')}" oninput="STATE.filters.q=this.value;STATE.page=1;clearTimeout(window._t);window._t=setTimeout(render,250)">` : ''}
    ${filters.map(f => `<select style="width:auto;min-width:150px" onchange="STATE.filters['${f.name}']=this.value;STATE.page=1;render()">
      <option value="">${esc(f.label)}</option>
      ${f.options.map(o => `<option value="${esc(o.value)}" ${STATE.filters[f.name] === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>`).join('')}
    ${Object.values(STATE.filters).some(Boolean) ? `<button class="btn ghost sm" onclick="STATE.filters={};STATE.page=1;render()">Clear</button>` : ''}
  </div>`;
}
function pager(total, per, pages) {
  if (total <= per) return '';
  return `<div class="spread" style="padding:10px 14px;border-top:1px solid var(--border)">
    <span class="sm muted">${(STATE.page - 1) * per + 1}–${Math.min(total, STATE.page * per)} of ${total}</span>
    <span class="row">
      <button class="btn ghost sm" ${STATE.page === 1 ? 'disabled style="opacity:.4"' : ''} onclick="STATE.page--;render()">Previous</button>
      <span class="sm muted">Page ${STATE.page} of ${pages}</span>
      <button class="btn ghost sm" ${STATE.page === pages ? 'disabled style="opacity:.4"' : ''} onclick="STATE.page++;render()">Next</button>
    </span></div>`;
}

function newLead() {
  const firstDept = DEPARTMENTS[0].id;
  modal({
    title: 'New lead', desc: 'Capture the enquiry. Existing history and duplicate checks appear as you type.',
    submitLabel: 'Create lead',
    fields: [
      { name: 'firstName', label: 'First name', required: true }, { name: 'lastName', label: 'Last name' },
      { name: 'phone', label: 'Phone', placeholder: '+971 50 000 0000', oninput: 'dupCheck()' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'country', label: 'Country', value: 'India' }, { name: 'profession', label: 'Profession' },
      { name: 'dept', label: 'Department', type: 'select', required: true, oninput: 'onDeptChange(this.value)', options: DEPARTMENTS.map(d => ({ value: d.id, label: d.name })) },
      { name: 'service', label: 'Service', type: 'select', required: true, oninput: 'dupCheck()', options: SERVICES[firstDept].map(x => ({ value: x, label: x })) },
      { name: 'source', label: 'Source', type: 'select', options: SOURCES.map(s => ({ value: s, label: s })) },
      { name: 'owner', label: 'Assign to', type: 'select', value: ME.id, options: USERS.map(u => ({ value: u.id, label: u.name })) },
      { name: 'followUp', label: 'Next follow-up', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'What did they ask for?' },
    ],
    onSubmit: v => {
      const existing = findByPhone(v.phone);
      if (existing) {
        const verdict = duplicateVerdict(existing.id, v.dept, v.service);
        if (verdict.decision === 'BLOCK') {
          toast(existing.name + ' already has an open ' + v.service + ' enquiry (' + verdict.lead.code + ', owned by ' + user(verdict.lead.owner).name + '). Open that one, or choose a different service.', 'err');
          return;
        }
      }
      let p = existing;
      if (!p) {
        p = { id: uid('p'), code: 'PER-' + String(DB.people.length + 1).padStart(6, '0'), name: (v.firstName + ' ' + v.lastName).trim(), phone: v.phone || '—', whatsapp: v.phone, email: v.email, country: v.country, city: '', profession: v.profession, owner: v.owner, created: new Date().toISOString() };
        DB.people.push(p);
      }
      const lead = { id: uid('l'), code: 'LEAD-' + String(DB.leads.length + 1).padStart(6, '0'), personId: p.id, dept: v.dept, service: v.service, status: 'new', source: v.source || 'Website', campaign: null, owner: v.owner, created: new Date().toISOString(), followUp: v.followUp ? new Date(v.followUp).toISOString() : null, lastContact: null, notes: v.notes, dealId: null };
      DB.leads.unshift(lead); save(); closeModal();
      toast(existing ? 'Second service enquiry added for ' + p.name + ' — same contact, separate file' : 'Lead created — ' + lead.code);
      go('lead', { id: lead.id });
    },
  });
}
const digitsOf = v => (v || '').replace(/\D/g, '');
function findByPhone(phone) {
  const d = digitsOf(phone);
  return d.length > 5 ? DB.people.find(p => digitsOf(p.phone).slice(-9) === d.slice(-9)) : null;
}
function onDeptChange(deptId) {
  const sel = $('f_service');
  if (sel) sel.innerHTML = (SERVICES[deptId] || []).map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  dupCheck();
}
/** Live duplicate verdict while the agent types — informs on a second service, blocks a real duplicate. */
function dupCheck() {
  const box = $('modal-extra');
  const phone = ($('f_phone') || {}).value;
  const deptId = ($('f_dept') || {}).value;
  const service = ($('f_service') || {}).value;
  const p = findByPhone(phone);
  if (!p) { box.innerHTML = ''; return; }

  const all = DB.leads.filter(l => l.personId === p.id);
  const history = all.map(l => `<div class="xs" style="margin-top:3px">${dept(l.dept).name} · ${esc(l.service || '—')} — ${status(l.status).name}</div>`).join('');
  const v = deptId ? duplicateVerdict(p.id, deptId, service) : { decision: 'ALLOW' };

  if (v.decision === 'BLOCK') {
    box.innerHTML = `<div class="warnbox" style="background:color-mix(in srgb,var(--danger) 10%,transparent);border-color:color-mix(in srgb,var(--danger) 32%,transparent)">
      <b style="color:var(--danger)">Duplicate — this exact service is already open</b>
      <div style="margin-top:4px">${esc(p.name)} already has <b>${v.lead.code}</b> for ${esc(service)}, owned by ${esc(user(v.lead.owner).name)}, currently ${esc(status(v.lead.status).name)}.</div>
      <div class="xs muted" style="margin-top:6px">Open that enquiry instead — or pick a different service if this is genuinely new work.</div></div>`;
  } else if (v.decision === 'WARN') {
    box.innerHTML = `<div class="warnbox"><b>Same person, different service — this is allowed</b>
      <div style="margin-top:4px">${esc(p.name)} has ${v.related.length} other open ${v.related.length === 1 ? 'enquiry' : 'enquiries'} in ${dept(deptId).name}. This will be saved as a separate file against the same contact.</div>
      ${history}</div>`;
  } else {
    box.innerHTML = `<div class="warnbox" style="background:var(--muted-bg);border-color:var(--border)">
      <b>We already know this person</b>${history}
      <div class="xs muted" style="margin-top:6px">Saving links this enquiry to the existing contact instead of creating a second record for the same human.</div></div>`;
  }
}

/* ---------------- lead detail ---------------- */
function viewLead() {
  const l = DB.leads.find(x => x.id === STATE.params.id);
  if (!l) return go('leads');
  const p = person(l.personId), st = status(l.status);
  const acts = DB.activities.filter(a => a.leadId === l.id);
  const deal = DB.deals.find(d => d.id === l.dealId);
  const placements = DB.placements.filter(x => x.personId === p.id);

  $('view').innerHTML = pageHeader(p.name, l.code + ' · owned by ' + user(l.owner).name, ['CRM', `<span class="link" onclick="go('leads')">Leads</span>`, l.code],
    `<select style="width:auto;min-width:170px" onchange="setLeadStatus('${l.id}',this.value)">${STATUSES.map(s => `<option value="${s.id}" ${s.id === l.status ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
     <select style="width:auto;min-width:150px" onchange="setLeadOwner('${l.id}',this.value)">${USERS.map(u => `<option value="${u.id}" ${u.id === l.owner ? 'selected' : ''}>${u.name}</option>`).join('')}</select>
     ${deal ? `<button class="btn ghost" onclick="go('deals')">View deal ${deal.code}</button>` : `<button class="btn" onclick="convertLead('${l.id}')">Convert to deal</button>`}`) +
    `<div class="split-r">
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Enquiry</h3><span class="badge" style="background:${st.color}18;color:${st.color};border-color:${st.color}44">${st.name}</span></div>
          <div class="card-b grid g4">
            ${[['Department', dept(l.dept).name], ['Service', l.service], ['Source', l.source], ['Campaign', (CAMPAIGNS.find(c => c.id === l.campaign) || {}).name || '—'],
               ['Country', p.country], ['Profession', p.profession], ['Created', fmt(l.created, true)], ['Last contacted', l.lastContact ? rel(l.lastContact) : 'Not yet']]
              .map(([k, v]) => `<div><div class="xs muted">${k}</div><div style="margin-top:2px">${esc(v)}</div></div>`).join('')}
            ${l.notes ? `<div style="grid-column:1/-1"><div class="xs muted">Notes</div><div style="margin-top:2px">${esc(l.notes)}</div></div>` : ''}
          </div></div>
        <div class="card"><div class="card-h"><h3>Activity</h3><button class="btn ghost sm" onclick="logActivity('${l.id}')">Log activity</button></div>
          ${acts.length ? `<div>${acts.map(a => `<div class="spread" style="padding:11px 16px;border-bottom:1px solid var(--border)">
            <div><b style="font-size:13px">${esc(a.subject)}</b><div class="xs muted">${a.type.replace('_', ' ').toLowerCase()} · due ${fmt(a.due)}</div></div>
            <div class="row">${statusBadge(a.priority)}${a.status === 'OPEN' ? `<button class="btn ghost sm" onclick="completeActivity('${a.id}')">Done</button>` : badge('completed', 'success')}</div></div>`).join('')}</div>`
            : empty('No activity yet', 'Log the first call or schedule a follow-up so this lead does not go quiet.')}
        </div>
        <div class="card"><div class="card-h"><h3>Notes</h3><span class="xs muted">Also visible on this person's contact record</span></div>
          ${notesBlock('Lead', l.id, l.personId, false)}</div>
        <div class="card"><div class="card-h"><h3>Files</h3><span class="xs muted">Passport, licence, certificates</span></div>
          ${filesBlock('Lead', l.id, l.personId, false)}</div>
        </div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Reach out</h3></div><div class="card-b stack" style="gap:8px">
          <div class="row"><span class="muted sm" style="width:70px">Phone</span><b>${esc(p.phone)}</b></div>
          <div class="row"><span class="muted sm" style="width:70px">WhatsApp</span><b>${esc(p.whatsapp || p.phone)}</b></div>
          <div class="row"><span class="muted sm" style="width:70px">Email</span><span style="word-break:break-all">${esc(p.email)}</span></div>
          <div class="link" style="margin-top:4px" onclick="go('contact',{id:'${p.id}'})">Open full contact history →</div>
        </div></div>
        ${deal ? `<div class="card"><div class="card-h"><h3>Deal</h3></div><div class="card-b">
          <div style="font-family:var(--display);font-size:20px;font-weight:600">${money(deal.amount)}</div>
          <div class="sm muted">${esc(deal.stage)} · ${deal.status.toLowerCase()}</div></div></div>` : ''}
        ${placements.length ? `<div class="card"><div class="card-h"><h3>Recruitment</h3></div><div class="card-b stack" style="gap:10px">
          ${placements.map(pl => { const v = DB.vacancies.find(x => x.id === pl.vacancyId); return `<div><span class="link" onclick="go('vacancy',{id:'${v.id}'})">${esc(v.title)}</span>
            <div class="xs muted">${esc(DB.clients.find(c => c.id === v.clientId).name)}</div><div style="margin-top:3px">${statusBadge(pl.stage)}</div></div>`; }).join('')}
        </div></div>` : ''}
      </div></div>`;
}
const setLeadStatus = (id, v) => { const l = DB.leads.find(x => x.id === id); l.status = v; l.lastContact = new Date().toISOString(); save(); toast('Status updated to ' + status(v).name); render(); };
const setLeadOwner = (id, v) => { DB.leads.find(x => x.id === id).owner = v; save(); toast('Reassigned to ' + user(v).name); render(); };
const completeActivity = id => { DB.activities.find(a => a.id === id).status = 'COMPLETED'; save(); toast('Marked as done'); render(); };
function logActivity(leadId) {
  const l = DB.leads.find(x => x.id === leadId);
  modal({ title: 'Log an activity', submitLabel: 'Save activity',
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: ['CALL', 'TASK', 'MEETING', 'FOLLOW_UP', 'NOTE'].map(t => ({ value: t, label: t.replace('_', ' ').toLowerCase() })) },
      { name: 'subject', label: 'Subject', required: true },
      { name: 'due', label: 'Due', type: 'date' },
      { name: 'priority', label: 'Priority', type: 'select', value: 'MEDIUM', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => ({ value: p, label: p.toLowerCase() })) },
    ],
    onSubmit: v => {
      DB.activities.unshift({ id: uid('a'), type: v.type, subject: v.subject, due: v.due ? new Date(v.due).toISOString() : day(1), status: 'OPEN', priority: v.priority, owner: l.owner, personId: l.personId, leadId: l.id });
      save(); closeModal(); toast('Activity logged'); render();
    } });
}
function convertLead(id) {
  const l = DB.leads.find(x => x.id === id), p = person(l.personId);
  modal({ title: 'Convert lead to deal', desc: 'The enquiry stays in reporting; a deal is created against the same person.',
    submitLabel: 'Create deal',
    fields: [
      { name: 'name', label: 'Deal name', required: true, full: true, value: p.name + ' · ' + dept(l.dept).name },
      { name: 'amount', label: 'Amount (AED)', type: 'number', value: 12000 },
      { name: 'stage', label: 'Stage', type: 'select', hint: (SERVICE_PIPELINES[l.service] ? l.service : dept(l.dept).name) + ' pipeline', options: stagesFor(l.service, l.dept).map(s => ({ value: s, label: s })) },
      { name: 'close', label: 'Expected close', type: 'date' },
    ],
    onSubmit: v => {
      const d = { id: uid('d'), code: 'DEAL-' + String(DB.deals.length + 1).padStart(6, '0'), name: v.name, personId: l.personId, dept: l.dept, service: l.service, stage: v.stage, amount: +v.amount || 0, received: 0, status: 'OPEN', owner: l.owner, close: v.close ? new Date(v.close).toISOString() : day(30), created: new Date().toISOString() };
      DB.deals.unshift(d); l.dealId = d.id; l.status = 'converted'; save(); closeModal();
      toast('Converted — deal ' + d.code + ' created'); render();
    } });
}

/* ---------------- contacts ---------------- */
function viewContacts() {
  const q = (STATE.filters.q || '').toLowerCase();
  let rows = DB.people.filter(p => !q || (p.name + p.phone + p.email).toLowerCase().includes(q));
  if (!canSeeAll() && ME.scope === 'OWN') rows = rows.filter(p => p.owner === ME.id);
  const per = 12, pages = Math.max(1, Math.ceil(rows.length / per));
  STATE.page = Math.min(STATE.page, pages);
  $('view').innerHTML = pageHeader('Contacts', 'One record per person — however many services they enquire about.', ['CRM', 'Contacts']) +
    filterBar([], 'Name, phone or email') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Country</th><th>Relationships</th><th>Owner</th></tr></thead><tbody>
      ${rows.slice((STATE.page - 1) * per, STATE.page * per).map(p => {
        const ls = DB.leads.filter(l => l.personId === p.id), ds = DB.deals.filter(d => d.personId === p.id), pl = DB.placements.filter(x => x.personId === p.id);
        return `<tr><td><span class="link" onclick="go('contact',{id:'${p.id}'})">${esc(p.name)}</span><div class="xs muted">${p.code}</div></td>
          <td>${esc(p.phone)}</td><td class="sm" style="word-break:break-all">${esc(p.email)}</td><td>${esc(p.country)}</td>
          <td><span class="row" style="gap:5px">${badge(ls.length + ' enquiries')}${ds.length ? badge(ds.length + ' deals', 'success') : ''}${pl.length ? badge(pl.length + ' placements', 'primary') : ''}</span></td>
          <td>${esc(user(p.owner).name)}</td></tr>`;
      }).join('')}</tbody></table></div>${pager(rows.length, per, pages)}</div>`;
}
function viewContact() {
  const p = DB.people.find(x => x.id === STATE.params.id);
  if (!p) return go('contacts');
  const ls = DB.leads.filter(l => l.personId === p.id), ds = DB.deals.filter(d => d.personId === p.id), pls = DB.placements.filter(x => x.personId === p.id);
  $('view').innerHTML = pageHeader(p.name, p.code + ' · ' + ls.length + ' enquiries · ' + ds.length + ' deals',
    ['CRM', `<span class="link" onclick="go('contacts')">Contacts</span>`, p.name]) +
    `<div class="split-r" style="grid-template-columns:20rem 1fr">
      <div class="card"><div class="card-h"><h3>Details</h3></div><div class="card-b stack" style="gap:9px">
        ${[['Phone', p.phone], ['WhatsApp', p.whatsapp], ['Email', p.email], ['Country', p.country], ['City', p.city], ['Profession', p.profession], ['Owner', user(p.owner).name], ['Added', fmt(p.created)]]
          .map(([k, v]) => `<div class="spread sm"><span class="muted">${k}</span><span style="text-align:right;word-break:break-all">${esc(v || '—')}</span></div>`).join('')}
      </div></div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Service history</h3><span class="xs muted">one person, many departments</span></div><div class="card-b stack" style="gap:9px">
          ${ls.map(l => { const st = status(l.status); return `<div class="spread" style="border:1px solid var(--border);border-radius:9px;padding:10px 12px">
            <div><span class="link" onclick="go('lead',{id:'${l.id}'})"><b>${dept(l.dept).name}</b></span>
              <div class="xs muted">${l.code} · ${fmt(l.created)} · ${esc(user(l.owner).name)}</div></div>
            <span class="badge" style="background:${st.color}18;color:${st.color};border-color:${st.color}44">${st.name}</span></div>`; }).join('')}
        </div></div>
        <div class="card"><div class="card-h"><h3>Notes across every enquiry</h3><span class="xs muted">${personNotes(p.id).length} notes</span></div>
          ${notesBlock('Person', p.id, p.id, true)}</div>
        <div class="card"><div class="card-h"><h3>Documents</h3><span class="xs muted">Uploaded once, visible on every file</span></div>
          ${filesBlock('Person', p.id, p.id, true)}</div>
        ${ds.length ? `<div class="card"><div class="card-h"><h3>Deals</h3></div><div class="card-b stack" style="gap:9px">
          ${ds.map(d => `<div class="spread" style="border:1px solid var(--border);border-radius:9px;padding:10px 12px">
            <div><b>${esc(d.name)}</b><div class="xs muted">${dept(d.dept).name} · ${esc(d.stage)}</div></div>
            <b class="tnum">${money(d.amount)}</b></div>`).join('')}</div></div>` : ''}
        ${pls.length ? `<div class="card"><div class="card-h"><h3>Recruitment placements</h3></div><div class="card-b stack" style="gap:9px">
          ${pls.map(pl => { const v = DB.vacancies.find(x => x.id === pl.vacancyId); return `<div class="spread" style="border:1px solid var(--border);border-radius:9px;padding:10px 12px">
            <div><span class="link" onclick="go('vacancy',{id:'${v.id}'})"><b>${esc(v.title)}</b></span><div class="xs muted">${esc(DB.clients.find(c => c.id === v.clientId).name)}</div></div>
            ${statusBadge(pl.stage)}</div>`; }).join('')}</div></div>` : ''}
      </div></div>`;
}

/* ---------------- deals & my day ---------------- */
function viewDeals() {
  const f = STATE.filters;
  let rows = scopeDeals(DB.deals);
  if (f.status) rows = rows.filter(d => d.status === f.status);
  if (f.dept) rows = rows.filter(d => d.dept === f.dept);
  if (f.q) rows = rows.filter(d => (d.name + d.code).toLowerCase().includes(f.q.toLowerCase()));
  const per = 12, pages = Math.max(1, Math.ceil(rows.length / per));
  STATE.page = Math.min(STATE.page, pages);
  $('view').innerHTML = pageHeader('Deals', 'Revenue in motion across every department pipeline.', ['CRM', 'Deals']) +
    `<div class="grid g3" style="margin-bottom:12px">
      ${metric('Deals in view', num(rows.length))}
      ${metric('Value in view', money(rows.reduce((s, d) => s + d.amount, 0)))}
      ${metric('Won', money(rows.filter(d => d.status === 'WON').reduce((s, d) => s + d.amount, 0)), { tone: 'pos' })}
    </div>` +
    filterBar([
      { name: 'dept', label: 'All departments', options: DEPARTMENTS.map(d => ({ value: d.id, label: d.name })) },
      { name: 'status', label: 'All statuses', options: ['OPEN', 'WON', 'LOST'].map(s => ({ value: s, label: s.toLowerCase() })) },
    ], 'Deal name or code') +
    `<div class="card"><div class="tw"><table><thead><tr><th>Deal</th><th>Contact</th><th>Department</th><th>Stage</th><th>Amount</th><th>Status</th><th>Owner</th><th>Close</th></tr></thead><tbody>
      ${rows.slice((STATE.page - 1) * per, STATE.page * per).map(d => `<tr>
        <td><b>${esc(d.name)}</b><div class="xs muted">${d.code}</div></td>
        <td><span class="link" onclick="go('contact',{id:'${d.personId}'})">${esc(person(d.personId).name)}</span></td>
        <td>${dept(d.dept).name}</td>
        <td><select style="min-width:170px" onchange="moveDeal('${d.id}',this.value)">${stagesFor(d.service, d.dept).map(s => `<option ${s === d.stage ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          ${d.service ? `<div class="xs muted" style="margin-top:3px">${esc(d.service)} pipeline</div>` : ''}</td>
        <td class="tnum"><b>${money(d.amount)}</b></td><td>${statusBadge(d.status)}</td>
        <td>${esc(user(d.owner).name)}</td><td class="muted">${fmt(d.close)}</td></tr>`).join('')}
      </tbody></table></div>${pager(rows.length, per, pages)}</div>`;
}
function moveDeal(id, stage) {
  const d = DB.deals.find(x => x.id === id);
  d.stage = stage;
  const stages = stagesFor(d.service, d.dept);
  const last = stages[stages.length - 1];
  if (stage === last) { d.status = 'WON'; d.received = d.amount; toast('Deal marked won — ' + money(d.amount) + ' added to revenue'); }
  else toast('Moved to ' + stage);
  save(); render();
}
function viewMyDay() {
  const mine = DB.activities.filter(a => a.owner === ME.id && a.status === 'OPEN');
  const groups = [
    ['Overdue', mine.filter(a => overdue(a.due)), 'bad'],
    ['Today', mine.filter(a => !overdue(a.due) && new Date(a.due).toDateString() === new Date().toDateString()), ''],
    ['Coming up', mine.filter(a => new Date(a.due) > new Date() && new Date(a.due).toDateString() !== new Date().toDateString()), ''],
  ];
  $('view').innerHTML = pageHeader('My day', 'Everything you owe a customer today, in one list.', ['CRM', 'My day']) +
    `<div class="grid g3">${groups.map(([title, items, tone]) => `
      <div class="card"><div class="card-h"><h3>${title}</h3><b class="tnum ${tone === 'bad' && items.length ? '' : 'muted'}" style="${tone === 'bad' && items.length ? 'color:var(--danger)' : ''}">${items.length}</b></div>
      ${items.length ? items.map(a => `<div class="spread" style="padding:11px 15px;border-bottom:1px solid var(--border)">
        <div><b style="font-size:13px">${esc(a.subject)}</b><div class="xs muted">${a.type.replace('_', ' ').toLowerCase()} · ${fmt(a.due)}${a.leadId ? ' · <span class="link" onclick="go(\'lead\',{id:\'' + a.leadId + '\'})">' + esc(person(a.personId).name) + '</span>' : ''}</div></div>
        <button class="btn ghost sm" onclick="completeActivity('${a.id}')">Done</button></div>`).join('') : empty('Nothing here', 'Scheduled work shows up in this list.')}
      </div>`).join('')}</div>`;
}
