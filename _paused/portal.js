/* =====================================================================
   TALENT PORTAL — the client-facing product
   =====================================================================

   Business model: 360Medicare sells access to verified, licence-ready
   healthcare professionals. Hospitals browse the pool themselves instead of
   waiting for CVs by email, and request the ones they want.

   THE ONE RULE THAT PROTECTS THE BUSINESS:
   a client never sees a candidate's name, phone, email or documents until
   360Medicare releases the profile against a signed vacancy. Everything in
   the portal is keyed to an anonymous reference (360M-RN-4118).

   Two reasons, and both matter more than the convenience of showing a CV:

   1. Fee protection. A hospital that gets a nurse's phone number can hire
      her directly and never pay the placement fee. Once the contact details
      are out, there is nothing to enforce. Anonymity IS the commercial
      product; the CV is just the sample.
   2. Candidate trust. Most of these people are employed. A profile that
      names them, their employer and their phone number circulating around
      GCC HR departments will cost them their current job, and cost us our
      reputation as the agency that leaks candidates.

   So: anonymised card -> client requests -> we release with consent ->
   interview -> offer -> placement. The release step is where the fee is
   protected and where the candidate agrees to be identified.
   ===================================================================== */

const PORTAL_TABS = ['browse', 'shortlist', 'requests', 'vacancies'];
const REQUEST_LABEL = { PROFILE: 'Full profile requested', INTERVIEW: 'Interview requested' };

const talentOf = id => DB.talent.find(t => t.id === id) || {};
const clientOf = id => DB.clients.find(c => c.id === id) || { name: '—' };
const isShortlisted = (clientId, talentId) => DB.shortlists.some(s => s.clientId === clientId && s.talentId === talentId);
/** Has 360Medicare released this candidate's identity to this client yet? */
const isReleased = (clientId, talentId) =>
  DB.requests.some(r => r.clientId === clientId && r.talentId === talentId &&
    ['PROFILE_RELEASED', 'INTERVIEW_SCHEDULED', 'OFFER_MADE'].includes(r.status));

/* ------------------------------------------------------------ internal side */

function viewTalent() {
  const f = STATE.filters;
  let rows = DB.talent;
  if (f.category) rows = rows.filter(t => t.category === f.category);
  if (f.licence) rows = rows.filter(t => t.licence === f.licence);
  if (f.published) rows = rows.filter(t => (f.published === 'yes') === !!t.published);
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter(t => (t.ref + t.title + t.specialty + person(t.personId).name).toLowerCase().includes(q));
  }

  const published = DB.talent.filter(t => t.published).length;
  const verified = DB.talent.filter(t => t.verified).length;

  $('view').innerHTML = pageHeader('Talent pool',
    'The candidates we can sell. Publishing puts an anonymised profile in front of every client with portal access.',
    ['Recruitment', 'Talent pool'],
    `<button class="btn ghost" onclick="openPortalAs()">Preview the client portal</button>
     <button class="btn" onclick="addTalent()">Publish a candidate</button>`) +
    `<div class="grid g4" style="margin-bottom:12px">
      ${metric('In the pool', DB.talent.length)}
      ${metric('Live on the portal', published, { tone: 'pos', sub: DB.talent.length - published + ' held back' })}
      ${metric('Fully verified', verified, { sub: 'documents and licence checked' })}
      ${metric('Client requests waiting', DB.requests.filter(r => r.status === 'NEW').length, { tone: DB.requests.some(r => r.status === 'NEW') ? 'warn' : '', go: "go('portalrequests')" })}
    </div>` +
    filterBar([
      { name: 'category', label: 'Nurses and doctors', options: [{ value: 'Nurse', label: 'Nurses' }, { value: 'Doctor', label: 'Doctors' }] },
      { name: 'licence', label: 'Any licence', options: [...new Set(DB.talent.map(t => t.licence))].map(l => ({ value: l, label: l })) },
      { name: 'published', label: 'Published and held', options: [{ value: 'yes', label: 'On the portal' }, { value: 'no', label: 'Held back' }] },
    ], 'Reference, specialty or internal name') +
    `<div class="card"><div class="tw"><table>
      <thead><tr><th>Candidate</th><th>Specialty</th><th>Licence</th><th>Available</th><th>Expectation</th><th>Interest</th><th>On portal</th><th></th></tr></thead>
      <tbody>${rows.map(t => {
        const p = person(t.personId);
        const shortlists = DB.shortlists.filter(s => s.talentId === t.id).length;
        const reqs = DB.requests.filter(r => r.talentId === t.id).length;
        return `<tr>
          <td><b>${esc(t.ref)}</b> ${t.verified ? badge('Verified', 'success') : badge('Unverified', 'warning')}
            <div class="xs muted">${esc(t.title)} · internally ${esc(p.name)}</div></td>
          <td class="sm">${esc(t.specialty)}<div class="xs muted">${t.years} yrs · ${esc(t.country)}</div></td>
          <td class="sm">${esc(t.licence)}<div class="xs muted">${esc(t.licenceStatus)}</div></td>
          <td class="sm">${esc(t.availability)}</td>
          <td class="tnum sm">${money(t.expectation)}</td>
          <td class="sm">${shortlists} shortlists · ${reqs} requests<div class="xs muted">${t.views} profile views</div></td>
          <td>${t.published ? badge('Live', 'success') : badge('Held')}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn ghost sm" onclick="togglePublish('${t.id}')">${t.published ? 'Unpublish' : 'Publish'}</button>
            <button class="btn ghost sm" onclick="previewTalent('${t.id}')">Preview</button>
          </td></tr>`;
      }).join('') || `<tr><td colspan="8">${empty('Nobody matches', 'Clear the filters, or publish a candidate into the pool.')}</td></tr>`}
      </tbody></table></div></div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>What a client can and cannot see</h3></div>
      <div class="card-b sm muted stack" style="gap:8px">
        <div><b style="color:var(--fg)">They see:</b> the reference, title, specialty, years of experience, licence and its status, languages, availability, salary expectation, and the highlights we write.</div>
        <div><b style="color:var(--fg)">They do not see:</b> name, phone, email, passport, employer, or any document — until we release the profile against a signed vacancy.</div>
        <div>That release step is the whole commercial protection. A hospital holding a nurse's phone number can hire her directly and never pay the fee, and a candidate whose name circulates around GCC HR departments can lose the job she currently has. Anonymity is the product; the profile is the sample.</div>
      </div></div>`;
}

function togglePublish(id) {
  const t = talentOf(id);
  t.published = !t.published;
  save();
  toast(t.published ? t.ref + ' is now live on the client portal' : t.ref + ' pulled from the portal — existing shortlists keep the reference but the card is hidden');
  render();
}

function addTalent() {
  const candidates = DB.people.filter(p => !DB.talent.some(t => t.personId === p.id)).slice(0, 120);
  modal({
    title: 'Publish a candidate', desc: 'This creates the anonymous profile clients browse. Nothing identifying is included.',
    submitLabel: 'Publish to the portal',
    fields: [
      { name: 'personId', label: 'Candidate', type: 'select', required: true, full: true, options: candidates.map(p => ({ value: p.id, label: p.name + ' · ' + (p.profession || '') })) },
      { name: 'category', label: 'Nurse or doctor', type: 'select', options: [{ value: 'Nurse', label: 'Nurse' }, { value: 'Doctor', label: 'Doctor' }] },
      { name: 'title', label: 'Title shown to clients', required: true, placeholder: 'Senior Staff Nurse' },
      { name: 'specialty', label: 'Specialty', required: true, placeholder: 'ICU' },
      { name: 'years', label: 'Years of experience', type: 'number', value: 5 },
      { name: 'licence', label: 'Licence', type: 'select', options: ['DHA', 'DOH', 'MOHAP', 'SCFHS', 'QCHP', 'NHRA', 'NMC (UK)', 'NCLEX'].map(l => ({ value: l, label: l })) },
      { name: 'licenceStatus', label: 'Licence status', type: 'select', options: ['Dataflow in progress', 'Dataflow verified', 'Eligibility letter issued', 'Licence issued'].map(l => ({ value: l, label: l })) },
      { name: 'availability', label: 'Availability', type: 'select', options: ['Immediate', 'Within 30 days', 'Within 60 days', 'Within 90 days'].map(a => ({ value: a, label: a })) },
      { name: 'expectation', label: 'Salary expectation (AED)', type: 'number', value: 8000 },
      { name: 'highlights', label: 'Highlights shown on the card', type: 'textarea', placeholder: 'One per line. No names, no employer, no contact details.' },
    ],
    onSubmit: v => {
      const p = person(v.personId);
      const t = {
        id: uid('tp'), personId: v.personId,
        ref: (v.category === 'Doctor' ? '360M-DR-' : '360M-RN-') + String(4100 + DB.talent.length),
        title: v.title, category: v.category, specialty: v.specialty, years: +v.years || 0,
        country: p.country, currentEmployer: 'Hospital, details withheld',
        licence: v.licence, licenceStatus: v.licenceStatus, exams: [], languages: ['English'],
        availability: v.availability, expectation: +v.expectation || 0, currency: 'AED',
        verified: false, docsVerified: ['Passport'], published: true,
        highlights: (v.highlights || '').split('\n').map(x => x.trim()).filter(Boolean),
        views: 0, addedAt: new Date().toISOString(),
      };
      DB.talent.unshift(t); save(); closeModal();
      toast(t.ref + ' published — clients see the profile, not the person');
      render();
    },
  });
}

function previewTalent(id) {
  const t = talentOf(id);
  modal({
    title: 'Client view of ' + t.ref, desc: 'Exactly what a hospital sees. Nothing identifying is included.',
    submitLabel: 'Close', fields: [],
    extra: talentCard(t, null, true),
    onSubmit: () => closeModal(),
  });
}

function viewPortalRequests() {
  const rows = DB.requests.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  $('view').innerHTML = pageHeader('Client requests',
    'What the hospitals have asked for through the portal. Releasing a profile is the moment our fee becomes enforceable — do it against a signed vacancy.',
    ['Recruitment', 'Client requests']) +
    `<div class="grid g4" style="margin-bottom:12px">
      ${metric('Waiting on us', rows.filter(r => r.status === 'NEW').length, { tone: 'warn' })}
      ${metric('Profiles released', rows.filter(r => r.status === 'PROFILE_RELEASED').length)}
      ${metric('Interviews scheduled', rows.filter(r => r.status === 'INTERVIEW_SCHEDULED').length, { tone: 'pos' })}
      ${metric('Offers made', rows.filter(r => r.status === 'OFFER_MADE').length, { tone: 'pos' })}
    </div>
    <div class="card"><div class="tw"><table>
      <thead><tr><th>Client</th><th>Candidate</th><th>Asked for</th><th>Message</th><th>Status</th><th>When</th><th></th></tr></thead>
      <tbody>${rows.map(r => {
        const t = talentOf(r.talentId);
        const released = isReleased(r.clientId, r.talentId);
        return `<tr>
          <td><b>${esc(clientOf(r.clientId).name)}</b><div class="xs muted">${esc((DB.clientUsers.find(u => u.id === r.by) || {}).name || 'Portal user')}</div></td>
          <td><b>${esc(t.ref)}</b><div class="xs muted">${esc(t.title)} · ${esc(t.specialty)}${released ? ' · released as ' + esc(person(t.personId).name) : ''}</div></td>
          <td class="sm">${REQUEST_LABEL[r.type] || r.type}</td>
          <td class="sm" style="max-width:260px">${esc(r.message)}</td>
          <td>${statusBadge(r.status)}</td>
          <td class="sm muted">${rel(r.at)}</td>
          <td style="text-align:right;white-space:nowrap">
            ${r.status === 'NEW' ? `<button class="btn sm" onclick="releaseProfile('${r.id}')">Release profile</button>
              <button class="btn ghost sm" onclick="declineRequest('${r.id}')">Decline</button>` : ''}
            ${r.status === 'PROFILE_RELEASED' ? `<button class="btn sm" onclick="scheduleFromRequest('${r.id}')">Schedule interview</button>` : ''}
            ${r.status === 'INTERVIEW_SCHEDULED' ? `<button class="btn sm" onclick="offerFromRequest('${r.id}')">Record offer</button>` : ''}
          </td></tr>`;
      }).join('') || `<tr><td colspan="7">${empty('No requests yet', 'They appear here as soon as a client shortlists or asks for a profile.')}</td></tr>`}
      </tbody></table></div></div>`;
}

function releaseProfile(id) {
  const r = DB.requests.find(x => x.id === id);
  const t = talentOf(r.talentId);
  modal({
    title: 'Release ' + t.ref + ' to ' + clientOf(r.clientId).name,
    desc: 'This reveals the candidate\u2019s name and documents to the client. Do it against a signed vacancy, and only with the candidate\u2019s consent.',
    submitLabel: 'Release the profile',
    fields: [
      { name: 'vacancyId', label: 'Against which vacancy', type: 'select', required: true, full: true,
        options: DB.vacancies.filter(v => v.clientId === r.clientId).map(v => ({ value: v.id, label: v.code + ' · ' + v.title })) },
      { name: 'consent', label: 'Candidate consent', type: 'select', required: true,
        options: [{ value: 'yes', label: 'Yes — the candidate has agreed' }, { value: 'no', label: 'Not yet' }] },
      { name: 'note', label: 'Note to the client', type: 'textarea', placeholder: 'Available for interview Tuesday and Wednesday.' },
    ],
    onSubmit: v => {
      if (v.consent !== 'yes') { toast('Get the candidate\u2019s consent first — releasing without it is how agencies lose candidates and reputations.', 'err'); return; }
      r.status = 'PROFILE_RELEASED'; r.vacancyId = v.vacancyId; r.releasedAt = new Date().toISOString();
      // A released candidate enters the vacancy pipeline — the portal and the CRM are one system.
      if (!DB.placements.some(p => p.vacancyId === v.vacancyId && p.personId === t.personId)) {
        DB.placements.unshift({
          id: uid('pl'), code: 'PLC-' + String(DB.placements.length + 1).padStart(6, '0'),
          vacancyId: v.vacancyId, personId: t.personId, stage: 'SUBMITTED', seat: false,
          fee: clientOf(r.clientId).fee, owner: ME.id, updated: new Date().toISOString(),
          history: [{ to: 'SUBMITTED', at: new Date().toISOString(), by: ME.name }],
        });
      }
      save(); closeModal();
      toast('Released — ' + t.ref + ' is now ' + person(t.personId).name + ' to this client, and sits in the vacancy pipeline');
      render();
    },
  });
}
function declineRequest(id) {
  const r = DB.requests.find(x => x.id === id);
  r.status = 'DECLINED'; save(); toast('Declined — the client is notified'); render();
}
function scheduleFromRequest(id) {
  const r = DB.requests.find(x => x.id === id);
  const t = talentOf(r.talentId);
  modal({ title: 'Schedule interview', desc: clientOf(r.clientId).name + ' · ' + t.ref, submitLabel: 'Schedule',
    fields: [
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'time', label: 'Time', type: 'time', value: '10:00' },
      { name: 'mode', label: 'Format', type: 'select', options: ['Video call', 'Telephone', 'In person'].map(m => ({ value: m, label: m })) },
    ],
    onSubmit: v => {
      const start = new Date(v.date + 'T' + (v.time || '10:00'));
      r.status = 'INTERVIEW_SCHEDULED'; r.interviewAt = start.toISOString();
      DB.meetings.unshift({ id: uid('mt'), subject: 'Client interview — ' + t.ref + ' with ' + clientOf(r.clientId).name,
        start: start.toISOString(), end: new Date(start.getTime() + 45 * 60000).toISOString(),
        location: v.mode, personId: t.personId, owner: ME.id, attendees: [] });
      const pl = DB.placements.find(p => p.personId === t.personId && p.vacancyId === r.vacancyId);
      if (pl) { pl.stage = 'INTERVIEW'; pl.updated = new Date().toISOString(); }
      save(); closeModal(); toast('Interview scheduled and added to your calendar'); render();
    } });
}
function offerFromRequest(id) {
  const r = DB.requests.find(x => x.id === id);
  const t = talentOf(r.talentId);
  r.status = 'OFFER_MADE';
  const pl = DB.placements.find(p => p.personId === t.personId && p.vacancyId === r.vacancyId);
  if (pl) { pl.stage = 'OFFER'; pl.updated = new Date().toISOString(); }
  save();
  toast('Offer recorded. The seat is consumed only when the candidate accepts — move the placement to offer accepted on the vacancy.');
  render();
}

function viewClientAccess() {
  $('view').innerHTML = pageHeader('Portal access',
    'Who at each hospital can sign in to the talent portal, and what they have been doing.',
    ['Recruitment', 'Portal access'],
    `<button class="btn" onclick="inviteClientUser()">Invite a client</button>`) +
    `<div class="card"><div class="tw"><table>
      <thead><tr><th>Person</th><th>Client</th><th>Shortlisted</th><th>Requests</th><th>Last seen</th><th>Access</th><th></th></tr></thead>
      <tbody>${DB.clientUsers.map(u => `<tr>
        <td><b>${esc(u.name)}</b><div class="xs muted">${esc(u.title)} · ${esc(u.email)}</div></td>
        <td class="sm">${esc(clientOf(u.clientId).name)}</td>
        <td class="tnum">${DB.shortlists.filter(s => s.clientId === u.clientId).length}</td>
        <td class="tnum">${DB.requests.filter(r => r.clientId === u.clientId).length}</td>
        <td class="sm muted">${u.active ? rel(u.lastSeen) : 'Never signed in'}</td>
        <td>${u.active ? badge('Active', 'success') : badge('Invited')}</td>
        <td style="text-align:right"><button class="btn ghost sm" onclick="openPortalAs('${u.clientId}')">Open their portal</button></td>
      </tr>`).join('')}
      </tbody></table></div></div>
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>How client sign-in will work</h3></div>
      <div class="card-b sm muted stack" style="gap:8px">
        <div>Client accounts are a separate world from employee accounts. A hospital user is not a 360Medicare user with fewer permissions — they sit in their own table, tied to one client, and can only ever see their own shortlist, their own vacancies and the published pool.</div>
        <div>That separation is deliberate. The day someone misconfigures a permission, the worst case must be a client seeing another published profile — never an employee record, another hospital\u2019s pipeline, or a candidate\u2019s documents.</div>
        <div>In this preview you can open any client\u2019s portal directly. In production it is an emailed invitation, their own password, and a session that cannot reach the internal app at all.</div>
      </div></div>`;
}
function inviteClientUser() {
  modal({ title: 'Invite a client to the portal', desc: 'They receive an email with their own sign-in. They will only ever see published profiles and their own vacancies.',
    submitLabel: 'Send invitation',
    fields: [
      { name: 'clientId', label: 'Client', type: 'select', required: true, options: DB.clients.map(c => ({ value: c.id, label: c.name })) },
      { name: 'name', label: 'Their name', required: true },
      { name: 'title', label: 'Job title', placeholder: 'Head of Nursing' },
      { name: 'email', label: 'Work email', type: 'email', required: true, full: true },
    ],
    onSubmit: v => {
      DB.clientUsers.push({ id: uid('cu'), clientId: v.clientId, name: v.name, email: v.email, title: v.title, lastSeen: null, active: false });
      save(); closeModal(); toast('Invitation sent to ' + v.email); render();
    } });
}

/* -------------------------------------------------------------- client side */

/** The card a hospital sees. Anonymous by design. */
function talentCard(t, clientId, previewOnly) {
  const shortlisted = clientId && isShortlisted(clientId, t.id);
  const released = clientId && isReleased(clientId, t.id);
  const requested = clientId && DB.requests.some(r => r.clientId === clientId && r.talentId === t.id);
  return `<div class="card talent-card">
    <div class="card-b">
      <div class="spread" style="align-items:flex-start">
        <div>
          <div class="row" style="gap:8px">
            <b style="font-family:var(--display);font-size:16px">${esc(t.ref)}</b>
            ${t.verified ? badge('Verified by 360Medicare', 'success') : badge('Verification in progress', 'warning')}
          </div>
          <div class="sm" style="margin-top:3px"><b>${esc(t.title)}</b> · ${esc(t.specialty)} · ${t.years} years</div>
        </div>
        ${released ? badge('Profile released', 'primary') : ''}
      </div>
      <div class="grid g2" style="margin-top:12px;gap:8px">
        ${[['Licence', t.licence + ' — ' + t.licenceStatus], ['Available', t.availability],
           ['Languages', (t.languages || []).join(', ')], ['Expectation', money(t.expectation, t.currency)],
           ['Based in', t.country], ['Current role', t.currentEmployer]]
          .map(([k, v]) => `<div><div class="xs muted">${k}</div><div class="sm">${esc(v)}</div></div>`).join('')}
      </div>
      ${(t.highlights || []).length ? `<ul class="sm muted" style="margin:12px 0 0;padding-left:16px">
        ${t.highlights.map(h => `<li style="margin-bottom:3px">${esc(h)}</li>`).join('')}</ul>` : ''}
      <div class="row" style="gap:5px;margin-top:11px">
        ${(t.docsVerified || []).map(d => badge(d + ' checked')).join('')}
      </div>
      ${released ? `<div class="warnbox" style="margin-top:12px;background:var(--primary-soft);border-color:color-mix(in srgb,var(--primary) 30%,transparent)">
        <b>${esc(person(t.personId).name)}</b> · ${esc(person(t.personId).phone)} · ${esc(person(t.personId).email)}
        <div class="xs muted" style="margin-top:4px">Released by 360Medicare against your vacancy. Documents are in the pack below.</div>
      </div>` : ''}
      ${previewOnly ? '' : `<div class="row" style="gap:6px;margin-top:13px">
        <button class="btn ${requested ? 'ghost' : ''}" ${requested ? 'disabled style="opacity:.55"' : ''} onclick="clientRequest('${clientId}','${t.id}','INTERVIEW')">
          ${requested ? 'Requested' : 'Request interview'}</button>
        <button class="btn ghost" onclick="toggleShortlist('${clientId}','${t.id}')">${shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}</button>
      </div>`}
    </div></div>`;
}

function openPortalAs(clientId) {
  const id = clientId || (DB.clientUsers[0] || {}).clientId || DB.clients[0].id;
  STATE.portalClient = id;
  STATE.portalTab = 'browse';
  document.body.classList.add('portal-mode');
  go('portal');
}
function exitPortal() {
  document.body.classList.remove('portal-mode');
  STATE.portalClient = null;
  go('talent');
}

function viewPortal() {
  const clientId = STATE.portalClient || DB.clients[0].id;
  const client = clientOf(clientId);
  const tab = STATE.portalTab || 'browse';
  const f = STATE.filters;

  let pool = DB.talent.filter(t => t.published);
  if (f.category) pool = pool.filter(t => t.category === f.category);
  if (f.specialty) pool = pool.filter(t => t.specialty === f.specialty);
  if (f.licence) pool = pool.filter(t => t.licence === f.licence);
  if (f.availability) pool = pool.filter(t => t.availability === f.availability);
  if (f.q) {
    const q = f.q.toLowerCase();
    pool = pool.filter(t => (t.ref + t.title + t.specialty + (t.highlights || []).join(' ')).toLowerCase().includes(q));
  }

  const shortlist = DB.shortlists.filter(s => s.clientId === clientId).map(s => talentOf(s.talentId)).filter(t => t.id);
  const requests = DB.requests.filter(r => r.clientId === clientId);
  const vacancies = DB.vacancies.filter(v => v.clientId === clientId);

  const tabs = [
    ['browse', 'Browse talent', DB.talent.filter(t => t.published).length],
    ['shortlist', 'My shortlist', shortlist.length],
    ['requests', 'My requests', requests.length],
    ['vacancies', 'My vacancies', vacancies.length],
  ];

  $('view').innerHTML = `
    <div class="portal-head">
      <div class="spread">
        <div class="row" style="gap:12px">
          <img src="assets/logo-ink.png" alt="360Medicare" style="width:150px;height:auto" class="portal-logo-light" />
          <span class="portal-divider"></span>
          <div><b style="font-family:var(--display);font-size:15px">${esc(client.name)}</b>
            <div class="xs muted">Talent portal · ${esc(client.city)}, ${esc(client.country)}</div></div>
        </div>
        <div class="row">
          <span class="xs muted">Preview mode</span>
          <button class="btn ghost sm" onclick="exitPortal()">Back to the internal app</button>
        </div>
      </div>
      <div class="tabs" style="margin-top:14px;border-bottom:0">
        ${tabs.map(([id, label, n]) => `<button class="tab ${tab === id ? 'active' : ''}" onclick="STATE.portalTab='${id}';render()">${label} <span class="muted">${n}</span></button>`).join('')}
      </div>
    </div>

    ${tab === 'browse' ? `
      <div class="spread" style="margin-bottom:12px">
        <div><h2 style="font-size:18px">Verified healthcare professionals, ready to hire</h2>
          <p class="sm muted" style="margin:3px 0 0">Every profile below is licence-tracked and document-checked by 360Medicare. Request a candidate and we release the full profile against your vacancy, usually the same day.</p></div>
      </div>
      ${filterBar([
        { name: 'category', label: 'Nurses and doctors', options: [{ value: 'Nurse', label: 'Nurses' }, { value: 'Doctor', label: 'Doctors' }] },
        { name: 'specialty', label: 'Any specialty', options: [...new Set(DB.talent.map(t => t.specialty))].map(s => ({ value: s, label: s })) },
        { name: 'licence', label: 'Any licence', options: [...new Set(DB.talent.map(t => t.licence))].map(l => ({ value: l, label: l })) },
        { name: 'availability', label: 'Any availability', options: ['Immediate', 'Within 30 days', 'Within 60 days', 'Within 90 days'].map(a => ({ value: a, label: a })) },
      ], 'Specialty, licence or keyword')}
      <div class="sm muted" style="margin-bottom:10px">${pool.length} ${pool.length === 1 ? 'professional' : 'professionals'} match</div>
      <div class="talent-grid">${pool.slice(0, 24).map(t => talentCard(t, clientId)).join('') || empty('Nothing matches those filters', 'Try widening the specialty or the licence.')}</div>
    ` : ''}

    ${tab === 'shortlist' ? (shortlist.length
      ? `<div class="talent-grid">${shortlist.map(t => talentCard(t, clientId)).join('')}</div>`
      : `<div class="card">${empty('Your shortlist is empty', 'Add candidates while you browse and they collect here for your panel to review.')}</div>`) : ''}

    ${tab === 'requests' ? `<div class="card"><div class="tw"><table>
        <thead><tr><th>Candidate</th><th>Asked for</th><th>Status</th><th>What happens next</th><th>When</th></tr></thead>
        <tbody>${requests.map(r => { const t = talentOf(r.talentId); return `<tr>
          <td><b>${esc(t.ref)}</b><div class="xs muted">${esc(t.title)} · ${esc(t.specialty)}</div></td>
          <td class="sm">${REQUEST_LABEL[r.type] || r.type}</td>
          <td>${statusBadge(r.status)}</td>
          <td class="sm muted">${esc({
            NEW: '360Medicare is confirming the candidate is still available and has consented.',
            PROFILE_RELEASED: 'Full profile and documents are available to your panel.',
            INTERVIEW_SCHEDULED: 'Interview confirmed — see the invitation in your calendar.',
            OFFER_MADE: 'Offer issued. We will confirm acceptance.',
            DECLINED: 'This candidate is no longer available.',
          }[r.status] || '')}</td>
          <td class="sm muted">${rel(r.at)}</td></tr>`; }).join('') || `<tr><td colspan="5">${empty('No requests yet', 'Request a candidate and it will be tracked here.')}</td></tr>`}
        </tbody></table></div></div>` : ''}

    ${tab === 'vacancies' ? `<div class="card"><div class="tw"><table>
        <thead><tr><th>Vacancy</th><th>Specialty</th><th>Seats</th><th>Candidates in process</th><th>Status</th></tr></thead>
        <tbody>${vacancies.map(v => `<tr>
          <td><b>${esc(v.title)}</b><div class="xs muted">${v.code} · target start ${fmt(v.target)}</div></td>
          <td class="sm">${esc(v.specialty)}</td>
          <td>${seatMeter(v.filled, v.positions)}</td>
          <td class="tnum">${DB.placements.filter(p => p.vacancyId === v.id).length}</td>
          <td>${statusBadge(v.status)}</td></tr>`).join('') || `<tr><td colspan="5">${empty('No open vacancies', 'Tell your account manager what you need and it will appear here.')}</td></tr>`}
        </tbody></table></div>
        <div class="card-b sm muted" style="border-top:1px solid var(--border)">Seats fall as candidates accept, so this table always matches what our recruiters see.</div>
      </div>` : ''}
  `;
}

function toggleShortlist(clientId, talentId) {
  const existing = DB.shortlists.find(s => s.clientId === clientId && s.talentId === talentId);
  if (existing) {
    DB.shortlists = DB.shortlists.filter(s => s !== existing);
    toast('Removed from your shortlist');
  } else {
    DB.shortlists.push({ id: uid('sl'), clientId, talentId, at: new Date().toISOString(), note: '' });
    toast(talentOf(talentId).ref + ' added to your shortlist');
  }
  save(); render();
}

function clientRequest(clientId, talentId, type) {
  const t = talentOf(talentId);
  modal({
    title: 'Request ' + t.ref, desc: 'We confirm the candidate is available and has consented, then release the full profile to your panel.',
    submitLabel: 'Send request',
    fields: [
      { name: 'vacancyId', label: 'For which vacancy', type: 'select', full: true,
        options: [{ value: '', label: 'General enquiry' }].concat(DB.vacancies.filter(v => v.clientId === clientId).map(v => ({ value: v.id, label: v.code + ' · ' + v.title }))) },
      { name: 'message', label: 'Anything we should know', type: 'textarea', placeholder: 'Panel is free Tuesday and Wednesday. Need two more like this for the same unit.' },
    ],
    onSubmit: v => {
      DB.requests.unshift({
        id: uid('rq'), clientId, talentId, vacancyId: v.vacancyId || null, type,
        status: 'NEW', at: new Date().toISOString(), message: v.message || 'No message',
        by: (DB.clientUsers.find(u => u.clientId === clientId) || {}).id || null,
      });
      t.views += 1;
      DB.notifications.unshift({ id: uid('n'), text: clientOf(clientId).name + ' requested an interview with ' + t.ref, at: new Date().toISOString(), read: false });
      save(); closeModal();
      toast('Request sent. 360Medicare usually responds the same working day.');
      render();
    },
  });
}
