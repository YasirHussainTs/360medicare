/* =====================================================================
   helpers, scope rules and shared UI pieces
   ===================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, c) => (c || 'AED') + ' ' + Math.round(n || 0).toLocaleString('en-AE');
const num = n => (n || 0).toLocaleString('en-AE');
const dept = id => DEPARTMENTS.find(d => d.id === id) || { name: '—', color: '#999' };
const status = id => STATUSES.find(s => s.id === id) || STATUSES[0];
const user = id => USERS.find(u => u.id === id) || { name: '—' };
const person = id => DB.people.find(p => p.id === id) || { name: '—' };
const initials = n => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const fmt = (iso, time) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + (time ? ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
};
const rel = iso => {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso)) / 86400e3;
  if (Math.abs(diff) < 1) return diff >= 0 ? 'today' : 'today';
  const d = Math.round(Math.abs(diff));
  return diff > 0 ? d + 'd ago' : 'in ' + d + 'd';
};
const overdue = iso => iso && new Date(iso) < new Date();
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/* Permission and scope rules — exactly what the real app enforces on the server. */
const can = k => ME.role === 'ADMIN' || (ME.perms || []).includes(k);
const canSeeAll = () => ME.role === 'ADMIN' || ME.scope === 'ALL';
function scopeLeads(rows) {
  if (canSeeAll()) return rows;
  if (ME.scope === 'DEPARTMENT') return rows.filter(l => l.dept === ME.dept);
  return rows.filter(l => l.owner === ME.id);
}
function scopeDeals(rows) {
  if (canSeeAll()) return rows;
  if (ME.scope === 'DEPARTMENT') return rows.filter(d => d.dept === ME.dept);
  return rows.filter(d => d.owner === ME.id);
}
const isITAgent = () => can('ticket.manage');
const isMarketing = () => can('marketing.manage');
const isRecruiter = () => can('recruitment.manage');
const canApproveBudget = () => can('budget.approve');

/**
 * DUPLICATE POLICY — the rule the team asked for.
 *
 * Healthcare clients genuinely come back: an AHPRA doctor later wanting GSM/PR, a DHA
 * nurse who then needs a placement. Those are separate pieces of work and must both be
 * recordable. What is blocked is a second OPEN enquiry for the SAME service — that is two
 * agents working one customer.
 */
const CLOSED_CATS = ['CONVERTED', 'DISQUALIFIED'];
function duplicateVerdict(personId, deptId, service) {
  const leads = DB.leads.filter(l => l.personId === personId && l.dept === deptId);
  const open = leads.filter(l => !CLOSED_CATS.includes(status(l.status).cat));
  const clash = open.find(l => (l.service || null) === (service || null));
  if (clash) return { decision: 'BLOCK', lead: clash };
  if (open.length) return { decision: 'WARN', related: open };
  return { decision: 'ALLOW' };
}

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'ok');
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 300); }, 3200);
}

const badge = (text, tone) => `<span class="badge b-${tone || 'neutral'}">${esc(text)}</span>`;
function statusBadge(v) {
  const map = {
    NEW: 'info', WORKING: 'info', CONNECTED: 'primary', CONVERTED: 'success', UNRESPONSIVE: 'warning', DISQUALIFIED: 'danger',
    OPEN: 'info', WON: 'success', LOST: 'danger', ASSIGNED: 'primary', IN_PROGRESS: 'primary', WAITING_FOR_USER: 'warning',
    WAITING_FOR_INFO: 'warning', RESOLVED: 'success', CLOSED: 'neutral', CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'info', LOW: 'neutral',
    AVAILABLE: 'info', UNDER_REPAIR: 'warning', RETIRED: 'neutral', LOST_ASSET: 'danger',
    ACTIVE: 'success', PROSPECT: 'info', ON_HOLD: 'warning', INACTIVE: 'neutral', FILLED: 'success', DRAFT: 'neutral',
    REVIEWING: 'info', APPROVED: 'primary', COMPLETED: 'success', REJECTED: 'danger', WITHDRAWN: 'neutral',
    OFFER_ACCEPTED: 'success', DOCUMENTATION: 'success', VISA_PROCESSING: 'success', DEPLOYED: 'success',
    SOURCED: 'neutral', SUBMITTED: 'info', CLIENT_REVIEW: 'info', SHORTLISTED: 'primary', INTERVIEW: 'primary', OFFER: 'warning',
  };
  return badge(String(v).replace(/_/g, ' ').toLowerCase(), map[v] || 'neutral');
}
const metric = (label, value, opts = {}) => `
  <button class="metric ${opts.tone || ''}" ${opts.go ? `onclick="${opts.go}"` : 'style="cursor:default"'}>
    <div class="l">${esc(label)}</div>
    <div class="v tnum">${esc(value)}</div>
    <div class="s">${opts.sub ? esc(opts.sub) : ''} ${opts.trend != null ? `<span class="${opts.trend >= 0 ? 'up' : 'down'}">${opts.trend >= 0 ? '▲' : '▼'} ${Math.abs(opts.trend)}%</span>` : ''}</div>
  </button>`;
const pageHeader = (title, desc, crumbs, actions) => `
  <div class="page-h spread">
    <div>
      ${crumbs ? `<div class="crumbs">${crumbs.join(' <span style="opacity:.5">/</span> ')}</div>` : ''}
      <h1>${esc(title)}</h1>
      ${desc ? `<p>${esc(desc)}</p>` : ''}
    </div>
    <div class="row">${actions || ''}</div>
  </div>`;
const empty = (title, desc) => `<div class="empty"><h4>${esc(title)}</h4><div class="sm">${esc(desc || '')}</div></div>`;
const seatMeter = (filled, total) => {
  const left = Math.max(0, total - filled), p = total ? Math.min(100, filled / total * 100) : 0;
  return `<div style="min-width:130px">
    <div class="spread xs" style="margin-bottom:4px"><b class="tnum" style="font-size:12.5px">${filled}<span class="muted">/${total}</span></b>
    <span class="${left === 0 ? '' : 'muted'}" style="${left === 0 ? 'color:var(--success)' : ''}">${left === 0 ? 'Fully filled' : left + ' to fill'}</span></div>
    <div class="meter ${left === 0 ? 'full' : ''}"><i style="width:${p}%"></i></div></div>`;
};

/* ---------- charts: inline SVG, no libraries ---------- */
function lineChart(series, h = 230) {
  const w = 640, pad = 28;
  const max = Math.max(1, ...series.flatMap(s => s.points));
  const n = series[0].points.length;
  const x = i => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const y = v => h - 24 - (v / max) * (h - 52);
  const paths = series.map(s => {
    const d = s.points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${d} L${x(n - 1).toFixed(1)},${h - 24} L${x(0).toFixed(1)},${h - 24} Z`;
    return `<path d="${area}" fill="${s.color}" opacity=".09"/><path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
  }).join('');
  const grid = [0, .25, .5, .75, 1].map(f => `<line x1="${pad}" x2="${w - pad}" y1="${(24 + f * (h - 48)).toFixed(1)}" y2="${(24 + f * (h - 48)).toFixed(1)}" stroke="var(--border)" stroke-dasharray="3 4"/>`).join('');
  const legend = series.map((s, i) => `<g transform="translate(${pad + i * 120},12)"><circle r="4" cx="4" cy="0" fill="${s.color}"/><text x="14" y="4" font-size="11" fill="var(--muted)">${s.label}</text></g>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">${grid}${legend}${paths}
    <text x="${pad}" y="${h - 6}" font-size="10" fill="var(--muted)">30 days ago</text>
    <text x="${w - pad}" y="${h - 6}" font-size="10" fill="var(--muted)" text-anchor="end">today</text></svg>`;
}
function donut(data) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let a = -Math.PI / 2;
  const arcs = data.map(d => {
    const ang = (d.value / total) * Math.PI * 2, r = 62, ir = 40, cx = 80, cy = 80;
    const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a), x2 = cx + r * Math.cos(a + ang), y2 = cy + r * Math.sin(a + ang);
    const x3 = cx + ir * Math.cos(a + ang), y3 = cy + ir * Math.sin(a + ang), x4 = cx + ir * Math.cos(a), y4 = cy + ir * Math.sin(a);
    const large = ang > Math.PI ? 1 : 0;
    a += ang;
    return `<path d="M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${ir} ${ir} 0 ${large} 0 ${x4} ${y4} Z" fill="${d.color}"/>`;
  }).join('');
  return `<div class="row" style="gap:18px;align-items:center;flex-wrap:nowrap;overflow:hidden">
    <svg viewBox="0 0 160 160" width="150" height="150" style="flex:0 0 150px">${arcs}
      <text x="80" y="76" text-anchor="middle" font-size="20" font-weight="600" fill="var(--fg)" font-family="var(--display)">${total}</text>
      <text x="80" y="94" text-anchor="middle" font-size="10" fill="var(--muted)">leads</text></svg>
    <div style="flex:1;min-width:0">${data.slice(0, 7).map(d => `<div class="spread sm" style="margin-bottom:5px"><span class="row" style="gap:7px;min-width:0"><span style="width:8px;height:8px;border-radius:2px;background:${d.color};flex:0 0 8px"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.label)}</span></span><b class="tnum">${d.value}</b></div>`).join('')}</div></div>`;
}
function bars(data, h = 220) {
  const max = Math.max(1, ...data.map(d => d.value));
  return `<div class="stack" style="gap:9px">${data.map(d => `
    <div><div class="spread sm" style="margin-bottom:3px"><span>${esc(d.label)}</span><b class="tnum">${d.value}</b></div>
    <div class="meter"><i style="width:${(d.value / max) * 100}%;background:${d.color || 'var(--primary)'}"></i></div></div>`).join('')}</div>`;
}

/* ---------- modal ---------- */
function closeModal() { $('modal-root').innerHTML = ''; }
function modal({ title, desc, fields, submitLabel, onSubmit, extra }) {
  const html = `<div class="backdrop" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <header><h3>${esc(title)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}</header>
      <div class="body">
        <div id="modal-extra"></div>
        <div class="ff">${fields.map(f => {
          const id = 'f_' + f.name;
          const cls = f.full || f.type === 'textarea' ? 'field full' : 'field';
          let input;
          if (f.type === 'select') input = `<select id="${id}" ${f.oninput ? `oninput="${f.oninput}"` : ''}>${(f.options || []).map(o => `<option value="${esc(o.value)}" ${o.value === f.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
          else if (f.type === 'textarea') input = `<textarea id="${id}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`;
          else input = `<input id="${id}" type="${f.type || 'text'}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" ${f.oninput ? `oninput="${f.oninput}"` : ''} />`;
          return `<div class="${cls}"><label class="f">${esc(f.label)}${f.required ? ' *' : ''}</label>${input}${f.hint ? `<div class="xs muted" style="margin-top:3px">${esc(f.hint)}</div>` : ''}</div>`;
        }).join('')}</div>
      </div>
      <footer><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="modal-submit">${esc(submitLabel || 'Save')}</button></footer>
    </div></div>`;
  $('modal-root').innerHTML = html;
  if (extra) $('modal-extra').innerHTML = extra;
  $('modal-submit').onclick = () => {
    const vals = {};
    fields.forEach(f => { vals[f.name] = ($('f_' + f.name) || {}).value || ''; });
    const missing = fields.filter(f => f.required && !vals[f.name].trim());
    if (missing.length) { toast('Fill in: ' + missing.map(m => m.label).join(', '), 'err'); return; }
    onSubmit(vals);
  };
}
