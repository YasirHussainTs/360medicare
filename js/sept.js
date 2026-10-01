/* =====================================================================
   September 2026 — model and views (Dashboard, ROI, Pipeline, Reports, Data & method)
   All numbers come from /api/data (served only to signed-in users).
   ===================================================================== */
let D = null;                       // data from the API
let A = { t1: 5000, t2: 2000 };     // editable pipeline valuation assumptions

const m2 = n => 'AED ' + (n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const m0 = n => 'AED ' + Math.round(n || 0).toLocaleString('en-AE');
const xr = n => (n == null || !isFinite(n)) ? '—' : n.toFixed(2) + 'x';
const roiTone = r => r == null ? '' : r >= 5 ? 'pos' : r >= 1 ? 'warn' : 'bad';
const GROUP_COLOR = { 'Migration': '#0E6B6B', 'Study Abroad': '#C2740B', 'Recruitment Dept': '#2563EB' };
const DEPT_COLOR = { migration: '#0E6B6B', studyabroad: '#C2740B', licensing: '#7C3AED', recruitment: '#2563EB', academy: '#DB2777' };

/** Everything the screens show is derived here, once, from the raw data. */
function model() {
  const dep = D.depts.map(d => {
    const rows = D.fb.filter(f => f.dept === d.name);
    return { ...d, roi: d.rev > 0 ? d.rev / d.spend : (d.spend ? 0 : null), fbSpend: rows.reduce((s, r) => s + r.spend, 0), leads: rows.reduce((s, r) => s + r.leads, 0) };
  });
  const by = id => dep.find(d => d.id === id);
  const mig = by('migration'), sa = by('studyabroad');
  const rdSub = ['licensing', 'recruitment', 'academy'].map(by);
  const rdAd = rdSub.reduce((s, d) => s + d.spend, 0);
  const rdSpend = rdAd + D.wbc.amount;
  const rdUnits = rdSub.reduce((s, d) => s + d.rev, 0), adj = D.adjustment.amount, rdRev = rdUnits + adj;
  const t1 = D.pipeline.filter(p => p.tier === 1), t2 = D.pipeline.filter(p => p.tier === 2);
  const pipeVal = t1.length * A.t1 + t2.length * A.t2;
  const groups = [
    { id: 'migration', name: 'Migration', spend: mig.spend, rev: mig.rev, leads: mig.leads, pipe: pipeVal },
    { id: 'recruitmentdept', name: 'Recruitment Dept', spend: rdSpend, rev: rdRev, leads: rdSub.reduce((s, d) => s + d.leads, 0), pipe: 0 },
    { id: 'studyabroad', name: 'Study Abroad', spend: sa.spend, rev: sa.rev, leads: sa.leads, pipe: 0 },
  ];
  groups.forEach(g => { g.roi = g.spend ? g.rev / g.spend : null; g.cpl = g.leads ? g.spend / g.leads : null; });
  const spend = groups.reduce((s, g) => s + g.spend, 0), rev = groups.reduce((s, g) => s + g.rev, 0);
  const leads = groups.reduce((s, g) => s + g.leads, 0);
  const best = [...dep].sort((a, b) => b.roi - a.roi)[0];
  return { dep, by, groups, rdSub, rdUnits, adj, rdAd, rdSpend, rdRev, spend, rev, leads, roi: rev / spend, cpl: spend / leads, pipeVal, t1, t2, best,
    fbTotal: D.fb.reduce((s, f) => s + f.spend, 0), projected: (rev + pipeVal) / spend, unitsTotal: dep.reduce((s, d) => s + d.rev, 0) };
}

const bar = (v, max, color) => `<div class="meter"><i style="width:${max ? Math.max(1.5, v / max * 100) : 0}%;background:${color || 'var(--primary)'}"></i></div>`;
const crumbs = (...c) => ['<a class="lk" onclick="go(\'dashboard\')">Home</a>', ...c];

/* ---------------- Dashboard ---------------- */
function viewDashboard() {
  const M = model(), P = D.period.label;
  const maxRev = Math.max(...M.groups.map(g => g.rev), 1);
  $('view').innerHTML = pageHeader('Performance dashboard', `${P} · marketing spend, revenue, ROI and the pipeline still to convert.`, null,
    `<button class="btn ghost sm" onclick="go('roi')">Open ROI report</button><button class="btn sm" onclick="go('pipeline')">Open pipeline</button>`) +
  `<div class="grid g4" style="margin-bottom:14px">
    ${metric('Marketing spend', m2(M.spend), { sub: 'Ads ' + m2(M.spend - D.wbc.amount).replace('AED ', '') + ' + WhatsApp ' + D.wbc.amount.toFixed(2), go: "go('roi')" })}
    ${metric('Revenue (sales)', m0(M.rev), { tone: 'pos', sub: 'Accounts sales sheet (Firoze)', go: "go('reports',{tab:'revenue'})" })}
    ${metric('Marketing ROI', xr(M.roi), { tone: roiTone(M.roi), sub: 'Revenue ÷ spend', go: "go('roi')" })}
    ${metric('Open pipeline', m0(M.pipeVal), { tone: 'warn', sub: D.pipeline.length + ' qualified leads, not yet converted', go: "go('pipeline')" })}
  </div>
  <div class="grid g4" style="margin-bottom:14px">
    ${metric('Facebook leads', num(M.leads), { sub: 'On-Facebook leads, 1–30 Sep', go: "go('reports',{tab:'campaigns'})" })}
    ${metric('Cost per lead', m2(M.cpl), { sub: 'Spend ÷ Facebook leads', go: "go('reports',{tab:'campaigns'})" })}
    ${metric('Best ROI unit', M.best.name, { tone: 'pos', sub: xr(M.best.roi) + ' return on spend', go: "go('dept',{id:'" + M.best.id + "'})" })}
    ${metric('ROI if pipeline converts', xr(M.projected), { tone: 'pos', sub: 'Revenue + pipeline ÷ spend', go: "go('roi')" })}
  </div>
  <div class="split" style="margin-bottom:14px">
    <div class="card"><div class="card-h"><h3>Departments</h3><button class="lk xs" onclick="go('roi')">Full ROI table →</button></div>
      <div class="tw"><table><thead><tr><th>Department</th><th class="num-r">Spend</th><th class="num-r">Revenue</th><th class="num-r">ROI</th><th class="num-r">FB leads</th></tr></thead><tbody>
      ${M.groups.map(g => `<tr class="linkrow" onclick="go('dept',{id:'${g.id}'})"><td><b>${esc(g.name)}</b></td><td class="num-r tnum">${m2(g.spend)}</td><td class="num-r tnum">${g.rev ? m0(g.rev) : '—'}</td><td class="num-r">${badge(xr(g.roi), g.roi == null ? 'neutral' : g.roi >= 5 ? 'success' : 'warning')}</td><td class="num-r tnum">${num(g.leads)}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td class="num-r tnum"><b>${m2(M.spend)}</b></td><td class="num-r tnum"><b>${m0(M.rev)}</b></td><td class="num-r"><b>${xr(M.roi)}</b></td><td class="num-r tnum"><b>${num(M.leads)}</b></td></tr></tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Revenue by department</h3></div><div class="card-b stack" style="gap:12px">
      ${M.groups.map(g => `<div><div class="spread sm" style="margin-bottom:3px"><span>${esc(g.name)}</span><b class="tnum">${g.rev ? m0(g.rev) : '—'}</b></div>${bar(g.rev, maxRev, GROUP_COLOR[g.name])}</div>`).join('')}
      <div class="xs muted">Revenue is the September sales figure from Accounts (Firoze).</div></div></div>
  </div>
  <div class="split">
    <div class="card"><div class="card-h"><h3>Spend by unit</h3><button class="lk xs" onclick="go('reports',{tab:'spend'})">Spend report →</button></div><div class="card-b stack" style="gap:11px">
      ${M.dep.map(d => `<div class="linkrow" onclick="go('dept',{id:'${d.id}'})"><div class="spread sm" style="margin-bottom:3px"><span class="row" style="gap:7px"><span style="width:9px;height:9px;border-radius:2px;background:${DEPT_COLOR[d.id]}"></span>${esc(d.name)} <span class="xs muted">${esc(d.group)}</span></span><b class="tnum">${m2(d.spend)}</b></div>${bar(d.spend, Math.max(...M.dep.map(x => x.spend)), DEPT_COLOR[d.id])}</div>`).join('')}
      <div class="spread sm"><span class="muted">WhatsApp Broadcast (Recruitment Dept)</span><b class="tnum">${m2(D.wbc.amount)}</b></div></div></div>
    <div class="card"><div class="card-h"><h3>Pipeline by stage</h3><button class="lk xs" onclick="go('pipeline')">All leads →</button></div><div class="card-b stack">
      <div class="linkrow" onclick="go('pipeline',{tier:1})"><div class="spread sm"><span>Proposal sent / negotiating</span><b class="tnum">${M.t1.length} · ${m0(M.t1.length * A.t1)}</b></div></div>
      <div class="linkrow" onclick="go('pipeline',{tier:2})"><div class="spread sm"><span>Qualified, documents requested</span><b class="tnum">${M.t2.length} · ${m0(M.t2.length * A.t2)}</b></div></div>
      <div class="seg"><i style="width:${M.t1.length / D.pipeline.length * 100}%;background:var(--primary)"></i><i style="flex:1;background:var(--warning)"></i></div>
      <div class="xs muted">Read from September CRM notes. Values use editable assumptions on the ROI page.</div></div></div>
  </div>`;
}

/* ---------------- Department drill-down ---------------- */
function viewDept() {
  const M = model(), id = STATE.params.id;
  const g = M.groups.find(x => x.id === id);
  const unit = M.dep.find(x => x.id === id);
  if (!g && !unit) return go('dashboard');
  const name = g ? g.name : unit.name;
  const names = g ? (g.id === 'recruitmentdept' ? M.rdSub.map(s => s.name) : [name]) : [unit.name];
  const camps = D.fb.filter(f => names.includes(f.dept)).sort((a, b) => b.spend - a.spend);
  const spend = g ? g.spend : unit.spend;
  let body = `<div class="grid g4" style="margin-bottom:14px">
    ${metric('Spend', m2(spend), { go: "go('roi')" })}
    ${metric('Revenue', (g ? g.rev : unit.rev) ? m0(g ? g.rev : unit.rev) : '0', { tone: 'pos', sub: 'Accounts sales sheet', go: "go('reports',{tab:'revenue'})" })}
    ${metric('ROI', xr(g ? g.roi : unit.roi), { tone: roiTone(g ? g.roi : unit.roi), go: "go('roi')" })}
    ${metric('Facebook leads', num(g ? g.leads : unit.leads), { sub: 'Cost per lead ' + (((g ? g.leads : unit.leads) ? m2(spend / (g ? g.leads : unit.leads)) : '—')), go: "go('reports',{tab:'campaigns'})" })}
  </div>`;
  if (g && g.id === 'recruitmentdept') {
    body += `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Inside the Recruitment Dept</h3></div><div class="tw"><table><thead><tr><th>Unit</th><th class="num-r">Ad spend</th><th class="num-r">Revenue</th><th class="num-r">ROI</th><th class="num-r">FB leads</th></tr></thead><tbody>
      ${M.rdSub.map(s => `<tr class="linkrow" onclick="go('dept',{id:'${s.id}'})"><td><b>${esc(s.name)}</b>${s.id === 'academy' ? ` <span class="xs muted">· ${D.converted.academy} enrolled</span>` : ''}</td><td class="num-r tnum">${m2(s.spend)}</td><td class="num-r tnum">${m0(s.rev)}</td><td class="num-r roi-x">${xr(s.roi)}</td><td class="num-r tnum">${num(s.leads)}</td></tr>`).join('')}
      <tr><td>${esc(D.adjustment.label)}</td><td></td><td class="num-r tnum">${m2(M.adj)}</td><td></td><td></td></tr>
      <tr><td>WhatsApp Broadcast (whole department)</td><td class="num-r tnum">${m2(D.wbc.amount)}</td><td></td><td></td><td></td></tr>
      <tr><td><b>Department total</b></td><td class="num-r tnum"><b>${m2(M.rdSpend)}</b></td><td class="num-r tnum"><b>${m0(M.rdRev)}</b></td><td class="num-r roi-x">${xr(g.roi)}</td><td class="num-r tnum"><b>${num(g.leads)}</b></td></tr></tbody></table></div></div>`;
  }
  if (unit && unit.id === 'academy') {
    body += `<div class="card" style="margin-bottom:14px"><div class="card-b"><div class="spread"><div><b>360Future Academy enrolments</b><div class="sm muted">Confirmed converted: ${D.converted.academy} · cost per enrolment ${m2(unit.spend / D.converted.academy)}</div></div></div>
      <div class="note" style="margin-top:10px">CRM notes mention ${D.academy_notes_enrolled} enrolled learners; the management figure of ${D.converted.academy} is used.</div></div></div>`;
  }
  if (g && g.id === 'migration') {
    body += `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Migration pipeline</h3><button class="lk xs" onclick="go('pipeline')">Open pipeline →</button></div><div class="card-b sm">${D.pipeline.length} qualified doctor leads not yet converted, worth about <b>${m0(M.pipeVal)}</b>. If they convert, ROI moves from <b>${xr(g.roi)}</b> to <b>${xr((g.rev + M.pipeVal) / g.spend)}</b>.</div></div>`;
  }
  body += `<div class="card"><div class="card-h"><h3>Facebook campaigns</h3><span class="xs muted">${camps.length} campaigns</span></div><div class="tw"><table><thead><tr><th>Campaign</th><th>Unit</th><th class="num-r">Spend</th><th class="num-r">Leads</th><th class="num-r">Cost / lead</th></tr></thead><tbody>
    ${camps.map(c => `<tr><td>${esc(c.campaign)}</td><td class="xs muted">${esc(c.dept)}</td><td class="num-r tnum">${m2(c.spend)}</td><td class="num-r tnum">${num(c.leads)}</td><td class="num-r tnum">${c.leads ? m2(c.spend / c.leads) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No campaigns.</td></tr>'}</tbody></table></div></div>`;
  $('view').innerHTML = pageHeader(name, 'September 2026 department view', crumbs('<a class="lk" onclick="go(\'roi\')">ROI</a>', esc(name)),
    `<button class="btn ghost sm" onclick="go('roi')">See in ROI report</button>`) + body;
}

/* ---------------- ROI (August deck style) ---------------- */
function viewROI() {
  const M = model();
  const maxRoi = Math.max(...M.groups.map(g => g.roi || 0), 1);
  $('view').innerHTML = pageHeader('Marketing ROI — ' + D.period.label, 'ROI = revenue ÷ marketing spend. Same method as the August report. Revenue from Accounts (Firoze).', crumbs('ROI'),
    `<button class="btn ghost sm noprint" onclick="window.print()">Print / save PDF</button><button class="btn ghost sm noprint" onclick="go('dashboard')">Dashboard</button>`) +
  `<div class="grid g4" style="margin-bottom:14px">
    ${metric('Total spend', m2(M.spend), { go: "go('reports',{tab:'spend'})" })}
    ${metric('Revenue', m0(M.rev), { tone: 'pos', go: "go('reports',{tab:'revenue'})" })}
    ${metric('Overall ROI', xr(M.roi), { tone: roiTone(M.roi), sub: 'Every AED 1 spent returned AED ' + M.roi.toFixed(2) })}
    ${metric('ROI incl. pipeline', xr(M.projected), { tone: 'pos', sub: 'If listed leads convert', go: "go('pipeline')" })}
  </div>
  <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>ROI by department</h3><button class="lk xs" onclick="go('dashboard')">Back to dashboard →</button></div><div class="tw"><table>
    <thead><tr><th>Department</th><th class="num-r">Marketing spend</th><th class="num-r">Revenue</th><th class="num-r">ROI</th><th style="width:22%">&nbsp;</th><th class="num-r">Pipeline value</th><th class="num-r">ROI with pipeline</th></tr></thead><tbody>
    ${M.groups.map(g => `<tr class="linkrow" onclick="go('dept',{id:'${g.id}'})"><td><b>${esc(g.name)}</b><div class="xs muted">${g.id === 'recruitmentdept' ? 'Recruitment · Licensing · 360Future Academy · WhatsApp' : g.id === 'migration' ? 'Doctors, nurses & professionals' : 'No sales recorded in September'}</div></td>
      <td class="num-r tnum">${m2(g.spend)}</td><td class="num-r tnum">${g.rev ? m0(g.rev) : '—'}</td><td class="num-r roi-x">${xr(g.roi)}</td><td>${bar(g.roi || 0, maxRoi, GROUP_COLOR[g.name])}</td>
      <td class="num-r tnum">${g.pipe ? `<span class="lk" onclick="event.stopPropagation();go('pipeline')">${m0(g.pipe)}</span>` : '—'}</td><td class="num-r tnum">${g.rev || g.pipe ? xr((g.rev + g.pipe) / g.spend) : '—'}</td></tr>`).join('')}
    <tr><td><b>Total</b></td><td class="num-r tnum"><b>${m2(M.spend)}</b></td><td class="num-r tnum"><b>${m0(M.rev)}</b></td><td class="num-r roi-x">${xr(M.roi)}</td><td></td><td class="num-r tnum"><b>${m0(M.pipeVal)}</b></td><td class="num-r tnum"><b>${xr(M.projected)}</b></td></tr></tbody></table></div></div>
  <div class="split" style="margin-bottom:14px">
    <div class="card"><div class="card-h"><h3>Upcoming pipeline (from CRM notes)</h3><button class="lk xs" onclick="go('pipeline')">View every lead →</button></div><div class="card-b stack">
      <div class="sm muted">Leads whose September notes show real buying intent but are not yet converted. Change the value per lead to see the effect.</div>
      <div class="grid g2">
        <div class="field"><label class="f">Proposal sent / negotiating — AED per lead</label><input type="number" min="0" value="${A.t1}" oninput="setAssume('t1',this.value)" /></div>
        <div class="field"><label class="f">Qualified, documents requested — AED per lead</label><input type="number" min="0" value="${A.t2}" oninput="setAssume('t2',this.value)" /></div></div>
      <div class="tw"><table><tbody>
        <tr class="linkrow" onclick="go('pipeline',{tier:1})"><td>Proposal sent / negotiating</td><td class="num-r tnum">${M.t1.length} leads</td><td class="num-r tnum" id="v1">${m0(M.t1.length * A.t1)}</td></tr>
        <tr class="linkrow" onclick="go('pipeline',{tier:2})"><td>Qualified, documents requested</td><td class="num-r tnum">${M.t2.length} leads</td><td class="num-r tnum" id="v2">${m0(M.t2.length * A.t2)}</td></tr>
        <tr><td><b>Total pipeline</b></td><td class="num-r tnum"><b>${D.pipeline.length} leads</b></td><td class="num-r tnum" id="vt"><b>${m0(M.pipeVal)}</b></td></tr></tbody></table></div>
      <div class="xs muted">${D.pipeline_excluded} more leads were read but left out because the notes say nurture or lost. Defaults follow the August report (AED 5,000 and AED 2,000).</div></div></div>
    <div class="card"><div class="card-h"><h3>Cost efficiency</h3></div><div class="card-b stack" style="gap:10px">
      ${M.groups.map(g => `<div class="spread sm linkrow" onclick="go('dept',{id:'${g.id}'})"><span>${esc(g.name)} cost / lead</span><b class="tnum">${g.cpl ? m2(g.cpl) : '—'}</b></div>`).join('')}
      <div class="spread sm linkrow" onclick="go('dept',{id:'academy'})"><span>Academy cost / enrolment</span><b class="tnum">${m2(M.by('academy').spend / D.converted.academy)}</b></div>
      <div class="spread sm"><span>Blended cost / lead</span><b class="tnum">${m2(M.cpl)}</b></div></div></div>
  </div>
  <div class="note">Revenue is the September sales figure from Accounts (Firoze). Study Abroad had no sales in September. <a class="lk" onclick="go('about')">How these numbers are built →</a></div>`;
}
function setAssume(k, v) {
  A[k] = Math.max(0, +v || 0);
  const M = model();
  $('v1').textContent = m0(M.t1.length * A.t1); $('v2').textContent = m0(M.t2.length * A.t2); $('vt').innerHTML = '<b>' + m0(M.pipeVal) + '</b>';
}

/* ---------------- Pipeline ---------------- */
function viewPipeline() {
  const M = model(), P = STATE.params;
  const tier = P.tier || 0, q = (P.q || '').toLowerCase(), owner = P.owner || '';
  const rows = D.pipeline.filter(p => (!tier || p.tier === tier) && (!owner || p.owner === owner) && (!q || p.name.toLowerCase().includes(q)));
  const owners = [...new Set(D.pipeline.map(p => p.owner))].sort();
  const val = p => p.tier === 1 ? A.t1 : A.t2;
  $('view').innerHTML = pageHeader('Upcoming pipeline', 'Leads from September CRM notes that are qualified but not yet converted.', crumbs('<a class="lk" onclick="go(\'roi\')">ROI</a>', 'Pipeline'),
    `<button class="btn ghost sm noprint" onclick="exportPipeline()">Download CSV</button>`) +
  `<div class="grid g4" style="margin-bottom:14px">
    ${metric('Leads in pipeline', num(D.pipeline.length), { sub: 'All Migration', go: "go('pipeline')" })}
    ${metric('Proposal / negotiating', num(M.t1.length), { tone: 'pos', sub: m0(M.t1.length * A.t1), go: "go('pipeline',{tier:1})" })}
    ${metric('Qualified, docs requested', num(M.t2.length), { tone: 'warn', sub: m0(M.t2.length * A.t2), go: "go('pipeline',{tier:2})" })}
    ${metric('Total pipeline value', m0(M.pipeVal), { sub: 'See ROI with pipeline', go: "go('roi')" })}
  </div>
  <div class="card"><div class="card-h"><div class="row noprint">
    <button class="btn sm ${!tier ? '' : 'ghost'}" onclick="go('pipeline',{owner:'${owner}',q:'${esc(P.q || '')}'})">All</button>
    <button class="btn sm ${tier === 1 ? '' : 'ghost'}" onclick="go('pipeline',{tier:1,owner:'${owner}'})">Proposal / negotiating</button>
    <button class="btn sm ${tier === 2 ? '' : 'ghost'}" onclick="go('pipeline',{tier:2,owner:'${owner}'})">Qualified</button></div>
    <div class="row noprint"><select onchange="go('pipeline',{tier:${tier},owner:this.value})"><option value="">All owners</option>${owners.map(o => `<option ${o === owner ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
    <input placeholder="Search name…" value="${esc(P.q || '')}" onchange="go('pipeline',{tier:${tier},owner:'${owner}',q:this.value})" /></div></div>
  <div class="tw"><table><thead><tr><th>#</th><th>Lead</th><th>Stage</th><th>Owner</th><th class="num-r">Est. value</th><th></th></tr></thead><tbody>
  ${rows.map((p, i) => `<tr><td class="muted">${i + 1}</td><td><b>${esc(p.name)}</b></td><td>${badge(p.tier === 1 ? 'proposal / negotiating' : 'qualified, docs requested', p.tier === 1 ? 'success' : 'warning')}</td><td>${esc(p.owner)}</td><td class="num-r tnum">${m0(val(p))}</td><td><a class="lk xs" target="_blank" rel="noopener" href="${D.crmLeadUrl}${p.id}">Open in CRM ↗</a></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No leads match.</td></tr>'}
  <tr><td></td><td colspan="3"><b>${rows.length} leads shown</b></td><td class="num-r tnum"><b>${m0(rows.reduce((s, p) => s + val(p), 0))}</b></td><td></td></tr></tbody></table></div></div>`;
}
function exportPipeline() {
  const csv = ['Lead,Stage,Owner,Estimated value (AED),CRM id'].concat(D.pipeline.map(p => [JSON.stringify(p.name), p.tier === 1 ? 'Proposal/negotiating' : 'Qualified', p.owner, p.tier === 1 ? A.t1 : A.t2, p.id].join(','))).join('\n');
  download('pipeline-' + D.period.from.slice(0, 7) + '.csv', csv);
}
function download(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click();
}

/* ---------------- Reports ---------------- */
function viewReports() {
  const M = model(), tab = STATE.params.tab || 'summary';
  const tabs = [['summary', 'Summary'], ['spend', 'Spend'], ['revenue', 'Revenue'], ['campaigns', 'Campaigns'], ['recon', 'Reconciliation']];
  let body = '';
  if (tab === 'summary') body = `<div class="card"><div class="card-h"><h3>Management summary</h3></div><div class="card-b stack sm">
    <div>Marketing spend for ${D.period.label} was <b>${m2(M.spend)}</b> across ${M.dep.length} units, generating <b>${num(M.leads)}</b> Facebook leads at <b>${m2(M.cpl)}</b> each.</div>
    <div>Sales revenue reported by Accounts was <b>${m0(M.rev)}</b>, an overall ROI of <b>${xr(M.roi)}</b>. Migration returned <b>${xr(M.groups[0].roi)}</b> and the Recruitment Dept <b>${xr(M.groups[1].roi)}</b>.</div>
    <div>${D.pipeline.length} qualified Migration leads are not yet converted (about <b>${m0(M.pipeVal)}</b>). If they convert, ROI would be <b>${xr(M.projected)}</b>.</div>
    <div>Best performing unit: <b>${esc(M.best.name)}</b> at <b>${xr(M.best.roi)}</b>.</div></div></div>`;
  if (tab === 'spend') body = `<div class="card"><div class="card-h"><h3>Marketing spend by unit</h3></div><div class="tw"><table><thead><tr><th>Unit</th><th>Department</th><th class="num-r">Spend (management)</th><th class="num-r">Facebook leads</th><th class="num-r">Cost / lead</th></tr></thead><tbody>
    ${M.dep.map(d => `<tr class="linkrow" onclick="go('dept',{id:'${d.id}'})"><td><b>${esc(d.name)}</b></td><td>${esc(d.group)}</td><td class="num-r tnum">${m2(d.spend)}</td><td class="num-r tnum">${num(d.leads)}</td><td class="num-r tnum">${d.leads ? m2(d.spend / d.leads) : '—'}</td></tr>`).join('')}
    <tr><td>WhatsApp Broadcast</td><td>Recruitment Dept</td><td class="num-r tnum">${m2(D.wbc.amount)}</td><td></td><td></td></tr>
    <tr><td><b>Total</b></td><td></td><td class="num-r tnum"><b>${m2(M.spend)}</b></td><td class="num-r tnum"><b>${num(M.leads)}</b></td><td class="num-r tnum"><b>${m2(M.cpl)}</b></td></tr></tbody></table></div></div>`;
  if (tab === 'revenue') body = `<div class="card"><div class="card-h"><h3>Sales by unit (Accounts — Firoze, ${D.period.label})</h3></div><div class="tw"><table><thead><tr><th>Unit</th><th>Department</th><th class="num-r">Sales (AED)</th><th class="num-r">Spend</th><th class="num-r">ROI</th></tr></thead><tbody>
    ${M.dep.map(d => `<tr class="linkrow" onclick="go('dept',{id:'${d.id}'})"><td><b>${esc(d.name)}</b></td><td>${esc(d.group)}</td><td class="num-r tnum">${m2(d.rev)}</td><td class="num-r tnum">${m2(d.spend)}</td><td class="num-r roi-x">${xr(d.roi)}</td></tr>`).join('')}
    <tr><td>${esc(D.adjustment.label)}</td><td>Recruitment Dept</td><td class="num-r tnum">${m2(M.adj)}</td><td></td><td></td></tr>
    <tr><td><b>Total</b></td><td></td><td class="num-r tnum"><b>${m2(M.rev)}</b></td><td class="num-r tnum"><b>${m2(M.spend)}</b></td><td class="num-r roi-x">${xr(M.roi)}</td></tr></tbody></table></div>
    <div class="card-b"><div class="note">The total equals the Sales Total on the Accounts sheet (${m2(D.revenue_source.stated_total)}). The sheet’s Recruitment Dept subtotal (${m2(D.revenue_source.stated_recruitment_subtotal)}) is ${m2(Math.abs(M.adj))} lower than its three unit columns (${m2(M.rdUnits)}); the difference is shown as an adjustment until Accounts confirms which unit it belongs to.</div></div></div>`;
  if (tab === 'campaigns') {
    const rows = [...D.fb].sort((a, b) => b.spend - a.spend);
    body = `<div class="card"><div class="card-h"><h3>Facebook campaigns (${rows.length})</h3><button class="btn ghost sm noprint" onclick="exportCampaigns()">Download CSV</button></div><div class="tw"><table><thead><tr><th>Campaign</th><th>Unit</th><th class="num-r">Spend</th><th class="num-r">Leads</th><th class="num-r">Cost / lead</th></tr></thead><tbody>
    ${rows.map(c => { const u = M.dep.find(d => d.name === c.dept); return `<tr class="linkrow" onclick="go('dept',{id:'${u ? u.id : 'migration'}'})"><td>${esc(c.campaign)}</td><td class="xs muted">${esc(c.dept)}</td><td class="num-r tnum">${m2(c.spend)}</td><td class="num-r tnum">${num(c.leads)}</td><td class="num-r tnum">${c.leads ? m2(c.spend / c.leads) : '—'}</td></tr>`; }).join('')}
    <tr><td><b>Total</b></td><td></td><td class="num-r tnum"><b>${m2(M.fbTotal)}</b></td><td class="num-r tnum"><b>${num(M.leads)}</b></td><td></td></tr></tbody></table></div></div>`;
  }
  if (tab === 'recon') body = `<div class="card"><div class="card-h"><h3>Spend reconciliation</h3></div><div class="tw"><table><thead><tr><th>Unit</th><th class="num-r">Management figure</th><th class="num-r">Facebook (grouped by campaign name)</th><th class="num-r">Difference</th></tr></thead><tbody>
    ${M.dep.map(d => `<tr><td>${esc(d.name)}</td><td class="num-r tnum">${m2(d.spend)}</td><td class="num-r tnum">${m2(d.fbSpend)}</td><td class="num-r tnum">${m2(d.spend - d.fbSpend)}</td></tr>`).join('')}
    <tr><td><b>Total ads</b></td><td class="num-r tnum"><b>${m2(M.spend - D.wbc.amount)}</b></td><td class="num-r tnum"><b>${m2(M.fbTotal)}</b></td><td class="num-r tnum"><b>${m2(M.spend - D.wbc.amount - M.fbTotal)}</b></td></tr></tbody></table></div>
    <div class="card-b"><div class="note">The totals agree within ${m2(Math.abs(M.spend - D.wbc.amount - M.fbTotal))}, but the split between units differs because some campaigns serve more than one unit (for example doctor-licensing campaigns). Management figures are used for ROI; Facebook is used for lead counts.</div></div></div>`;
  $('view').innerHTML = pageHeader('Reports', D.period.label + ' · every figure links back to the dashboard and the ROI report.', crumbs('Reports'),
    `<button class="btn ghost sm noprint" onclick="window.print()">Print / save PDF</button>`) +
    `<div class="tabs noprint" style="margin-bottom:12px">${tabs.map(([k, l]) => `<button class="btn sm ${tab === k ? '' : 'ghost'}" onclick="go('reports',{tab:'${k}'})">${l}</button>`).join('')}</div>` + body;
}
function exportCampaigns() {
  download('facebook-campaigns-' + D.period.from.slice(0, 7) + '.csv', ['Campaign,Unit,Spend,Leads'].concat(D.fb.map(c => [JSON.stringify(c.campaign), c.dept, c.spend, c.leads].join(','))).join('\n'));
}

/* ---------------- Data & method ---------------- */
function viewAbout() {
  const M = model();
  $('view').innerHTML = pageHeader('Data & method', 'Where every number comes from, and what is still open.', crumbs('Data & method')) +
  `<div class="grid g2" style="margin-bottom:14px">
    <div class="card"><div class="card-h"><h3>Sources</h3></div><div class="card-b stack sm">
      <div><b>Marketing spend</b> — management figures for September; WhatsApp Broadcast ${m2(D.wbc.amount)} charged to the Recruitment Dept.</div>
      <div><b>Revenue</b> — September sales per unit from the Accounts sheet (Firoze).</div>
      <div><b>Leads and cost per lead</b> — Facebook Ads via Supermetrics, 1–30 Sep 2026 (${D.fb.length} campaigns).</div>
      <div><b>Pipeline</b> — Zoho CRM lead notes written in September, read and classified by stage.</div></div></div>
    <div class="card"><div class="card-h"><h3>Definitions</h3></div><div class="card-b stack sm">
      <div><b>ROI</b> = revenue ÷ marketing spend (13.25x means AED 13.25 back for each AED 1).</div>
      <div><b>Pipeline value</b> = leads × AED ${num(A.t1)} (proposal sent / negotiating) or AED ${num(A.t2)} (qualified, documents requested). Editable on the ROI page.</div>
      <div><b>Left out of pipeline</b> — ${D.pipeline_excluded} leads whose notes say nurture or lost.</div></div></div>
  </div>
  <div class="card"><div class="card-h"><h3>Open items to confirm</h3></div><div class="card-b stack sm">
    <div>1. Revenue follows Accounts’ “Sales Total” (${m2(D.revenue_source.stated_total)}). Its Recruitment Dept subtotal is ${m2(Math.abs(M.adj))} lower than its three unit columns, shown as an adjustment until Accounts says which unit it belongs to.</div>
    <div>2. 360Future Academy: management reports ${D.converted.academy} converted; CRM notes mention ${D.academy_notes_enrolled}.</div>
    <div>3. WhatsApp Broadcast ${m2(D.wbc.amount)} is treated as a Recruitment Dept cost and is not in the unit ROIs, only in the department ROI.</div>
    <div>4. Unit ad spend uses management figures; Facebook’s own split by campaign name differs slightly (see Reports → Reconciliation).</div></div></div>`;
}

const VIEWS = { dashboard: viewDashboard, roi: viewROI, pipeline: viewPipeline, reports: viewReports, about: viewAbout, dept: viewDept };
