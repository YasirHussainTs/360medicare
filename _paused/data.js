/* =====================================================================
   360Medicare demo — data layer
   A deterministic seeded dataset so the numbers are the same on every
   machine, persisted to localStorage so edits survive a refresh.
   ===================================================================== */
const LS_KEY = 'm360.v4';
let rngState = 20260911;
const rnd = () => (rngState = (rngState * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(10, 0, 0, 0); return d.toISOString(); };
const uid = p => p + '-' + Math.random().toString(36).slice(2, 8);

const DEPARTMENTS = [
  { id: 'MIG', name: 'Migration', color: '#0E6B6B' },
  { id: 'STU', name: 'Study Abroad', color: '#2563EB' },
  { id: 'REC', name: 'Recruitment', color: '#7C3AED' },
  { id: 'LIC', name: 'Professional Licensing', color: '#D97706' },
  { id: 'ACA', name: '360Future Academy', color: '#059669' },
];
const SERVICES = {
  MIG: ['Canada PR', 'Australia PR', 'UK Skilled Worker', 'Family Visa'],
  STU: ['UK Universities', 'Canada Colleges', 'Germany Public Universities', 'IELTS Coaching'],
  REC: ['Nurse Recruitment', 'Allied Health', 'Physician Recruitment'],
  LIC: ['DHA Licence', 'DOH Licence', 'MOHAP Licence', 'SCFHS Licence', 'Prometric Prep'],
  ACA: ['NCLEX Prep', 'OET Training', 'Soft Skills Programme'],
};
const STATUSES = [
  { id: 'new', name: 'New Lead', cat: 'NEW', color: '#2563EB' },
  { id: 'attempted', name: 'Attempted Contact', cat: 'WORKING', color: '#6366F1' },
  { id: 'connected', name: 'Connected', cat: 'CONNECTED', color: '#0E6B6B' },
  { id: 'callback', name: 'Call Back Requested', cat: 'CONNECTED', color: '#0891B2' },
  { id: 'pending', name: 'Decision Pending', cat: 'CONNECTED', color: '#7C3AED' },
  { id: 'future', name: 'Future Candidate', cat: 'WORKING', color: '#64748B' },
  { id: 'noanswer', name: 'Not Answering', cat: 'UNRESPONSIVE', color: '#D97706' },
  { id: 'notint', name: 'Not Interested', cat: 'DISQUALIFIED', color: '#DC2626' },
  { id: 'noteli', name: 'Not Eligible', cat: 'DISQUALIFIED', color: '#B91C1C' },
  { id: 'converted', name: 'Converted', cat: 'CONVERTED', color: '#059669' },
];
const STAGES = {
  MIG: ['Enquiry', 'Eligibility Check', 'Documents', 'Application Filed', 'Visa Granted'],
  STU: ['Enquiry', 'Shortlisting', 'Application Sent', 'Offer Received', 'Enrolled'],
  REC: ['Registered', 'Submitted', 'Interview', 'Offer', 'Deployed'],
  LIC: ['Enquiry', 'Documents Collected', 'Dataflow Submitted', 'Exam Booked', 'Licence Issued'],
  ACA: ['Enquiry', 'Counselling', 'Fee Quoted', 'Enrolled'],
};
/* Mirror of the service pipelines used by the deal seed (declared before build runs). */
const SERVICE_PIPELINES_SEED = {
  'DHA Licence': ['Enquiry', 'Documents Collected', 'Dataflow Submitted', 'Primary Source Verified', 'Exam Booked', 'Exam Passed', 'Licence Issued'],
  'SCFHS Licence': ['Enquiry', 'Documents Collected', 'Dataflow Submitted', 'Classification Issued', 'Prometric Booked', 'Licence Issued'],
  'Australia PR': ['Enquiry', 'Points Assessment', 'Skills Assessment', 'English Test', 'EOI Lodged', 'Invitation Received', 'Visa Lodged', 'Visa Granted'],
  'Canada PR': ['Enquiry', 'Eligibility Check', 'ECA & Language', 'Profile Created', 'ITA Received', 'Application Filed', 'PR Granted'],
  'Nurse Recruitment': ['Registered', 'Screened', 'Submitted to Client', 'Interview', 'Offer', 'Offer Accepted', 'Documentation', 'Visa', 'Deployed'],
  'UK Universities': ['Enquiry', 'Shortlisting', 'Application Sent', 'Offer Received', 'CAS Issued', 'Visa Granted', 'Enrolled'],
  'NCLEX Prep': ['Enquiry', 'Counselling', 'Fee Quoted', 'Enrolled', 'Exam Booked', 'Passed'],
};

const PLACEMENT_STAGES = ['SOURCED', 'SUBMITTED', 'CLIENT_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'OFFER_ACCEPTED', 'DOCUMENTATION', 'VISA_PROCESSING', 'DEPLOYED', 'REJECTED', 'WITHDRAWN'];
const SEAT_STAGES = ['OFFER_ACCEPTED', 'DOCUMENTATION', 'VISA_PROCESSING', 'DEPLOYED'];
const consumesSeat = s => SEAT_STAGES.includes(s);

const TICKET_CATS = ['Hardware', 'Software & Licences', 'Network & WiFi', 'Email & Accounts', 'CRM / 360Medicare App', 'Printer & Peripherals', 'Access Request'];
const SLA = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
const ASSET_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Mobile Phone', 'Headset', 'Printer', 'Software Licence'];
const MKT_TYPES = ['Social Media Post', 'Reel / Video', 'Poster / Flyer', 'Landing Page', 'Email Campaign', 'Paid Ad Creative', 'Brochure'];
const MKT_STATUSES = ['NEW', 'REVIEWING', 'APPROVED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'COMPLETED'];
const TICKET_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'];

/**
 * THE TEAM, and what each person can actually reach.
 *
 * `perms` is the real control — the nav, the buttons and the data are all derived from it.
 * Three people hold everything; everyone else gets the doors their job needs and no more.
 * Note who does NOT get `asset.manage`: marketing and the department heads. They raise an
 * IT ticket like anyone else, but custody of company hardware stays with IT.
 */
const P = {
  CRM: 'crm.view', CRM_EDIT: 'crm.edit',
  REC: 'recruitment.manage',
  TICKET: 'ticket.create', TICKET_DESK: 'ticket.manage',
  ASSET: 'asset.manage',
  MKT: 'marketing.request_create', MKT_DESK: 'marketing.manage', CAMPAIGN: 'campaign.manage',
  BUDGET: 'budget.view', BUDGET_REQ: 'budget.request', BUDGET_OK: 'budget.approve',
  REPORT: 'report.view', USERS: 'user.manage', SETTINGS: 'settings.manage',
};
const ALL_PERMS = Object.values(P);
const BASE = [P.CRM, P.TICKET, P.MKT];

const USERS = [
  { id: 'u1', name: 'Yasir Hussain', email: 'yasir@360medicare.ae', title: 'IT Administrator', dept: null, role: 'ADMIN', scope: 'ALL', perms: ALL_PERMS },
  { id: 'u2', name: 'Austin', email: 'austin@360medicare.ae', title: 'Chief Executive Officer', dept: null, role: 'ADMIN', scope: 'ALL', perms: ALL_PERMS },
  { id: 'u3', name: 'Muneer', email: 'muneer@360medicare.ae', title: 'Chief Marketing Officer', dept: null, role: 'ADMIN', scope: 'ALL', perms: ALL_PERMS },

  { id: 'u4', name: 'Sagar', email: 'sagar@360medicare.ae', title: 'Designer — Marketing', dept: null, role: 'USER', scope: 'ALL',
    perms: [...BASE, P.MKT_DESK, P.CAMPAIGN, P.BUDGET, P.BUDGET_REQ, P.REPORT] },
  { id: 'u5', name: 'Siyad', email: 'siyad@360medicare.ae', title: 'Marketing Specialist', dept: null, role: 'USER', scope: 'ALL',
    perms: [...BASE, P.MKT_DESK, P.CAMPAIGN, P.BUDGET, P.BUDGET_REQ, P.REPORT] },

  { id: 'u6', name: 'Mohanan', email: 'mohanan@360medicare.ae', title: 'Migration Manager', dept: 'MIG', role: 'USER', scope: 'DEPARTMENT',
    perms: [...BASE, P.CRM_EDIT, P.BUDGET, P.BUDGET_REQ, P.REPORT] },
  { id: 'u7', name: 'Sharifa', email: 'sharifa@360medicare.ae', title: 'Recruitment Manager', dept: 'REC', role: 'USER', scope: 'DEPARTMENT',
    perms: [...BASE, P.CRM_EDIT, P.REC, P.BUDGET, P.BUDGET_REQ, P.REPORT] },
  { id: 'u8', name: 'Sharon', email: 'sharon@360medicare.ae', title: 'Study Abroad Manager', dept: 'STU', role: 'USER', scope: 'DEPARTMENT',
    perms: [...BASE, P.CRM_EDIT, P.BUDGET, P.BUDGET_REQ, P.REPORT] },

  { id: 'u9', name: 'Ahmed Farouk', email: 'ahmed@360medicare.ae', title: 'Migration Consultant', dept: 'MIG', role: 'USER', scope: 'OWN', perms: [...BASE, P.CRM_EDIT] },
  { id: 'u10', name: 'Sneha Thomas', email: 'sneha@360medicare.ae', title: 'Study Abroad Counsellor', dept: 'STU', role: 'USER', scope: 'OWN', perms: [...BASE, P.CRM_EDIT] },
  { id: 'u11', name: 'Joseph Kuriakose', email: 'joseph@360medicare.ae', title: 'Recruitment Consultant', dept: 'REC', role: 'USER', scope: 'OWN', perms: [...BASE, P.CRM_EDIT, P.REC] },
  { id: 'u12', name: 'Fatima Zahra', email: 'fatima@360medicare.ae', title: 'Licensing Specialist', dept: 'LIC', role: 'USER', scope: 'OWN', perms: [...BASE, P.CRM_EDIT] },
  { id: 'u13', name: 'Deepak Menon', email: 'deepak@360medicare.ae', title: 'Academy Coordinator', dept: 'ACA', role: 'USER', scope: 'OWN', perms: [...BASE, P.CRM_EDIT] },
];
const CONSULTANTS = ['u9', 'u10', 'u11', 'u12', 'u13'];
const MANAGERS = { MIG: 'u6', REC: 'u7', STU: 'u8', LIC: 'u12', ACA: 'u13' };
const DEPT_OF = { u9: 'MIG', u10: 'STU', u11: 'REC', u12: 'LIC', u13: 'ACA' };

const BUDGET_THRESHOLD = 25000;
const BUDGET_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'];

const FIRST = ['Anjali','Rahul','Grace','Mohammed','Jenny','Arun','Sarah','Vinod','Reema','Karthik','Blessy','Omar','Neha','Tariq','Lisa','Sandeep','Aisha','Mathew','Divya','Hassan','Rose','Ibrahim','Paul','Zainab','Nikhil','Mary','Yusuf','Preethi','Daniel','Fathima'];
const LAST = ['Kumar','Varghese','Fernandes','Ali','Joseph','Menon','Khan','Pillai','Ahmed','George','Reddy','Mathew','Sharma','Abdullah','Dsouza','Nair','Rahman','Thomas','Iyer','Sait'];
const COUNTRIES = ['India','Philippines','Pakistan','Egypt','Nigeria','Kenya','United Arab Emirates','Jordan'];
const PROFESSIONS = ['Staff Nurse','ICU Nurse','Midwife','Lab Technician','Radiographer','Physiotherapist','Pharmacist','Teacher','Accountant'];
const SOURCES = ['Website','Meta Ads','Google Ads','WhatsApp','Referral','Walk-in','Event'];
const CAMPAIGNS = [
  { id: 'c1', name: 'Meta — Nurses to UAE', channel: 'Meta Ads', dept: 'REC', spend: 31500 },
  { id: 'c2', name: 'Google — DHA Licence', channel: 'Google Ads', dept: 'LIC', spend: 18400 },
  { id: 'c3', name: 'Instagram — Canada PR', channel: 'Instagram', dept: 'MIG', spend: 22750 },
  { id: 'c4', name: 'TikTok — Study in UK', channel: 'TikTok', dept: 'STU', spend: 9800 },
  { id: 'c5', name: 'NCLEX Batch Launch', channel: 'Email', dept: 'ACA', spend: 5200 },
];

function build() {
  rngState = 20260911;
  const db = { people: [], leads: [], deals: [], activities: [], clients: [], vacancies: [], placements: [], tickets: [], assets: [], marketing: [], budgets: [], notes: [], files: [], meetings: [], automations: [], integrations: [], talent: [], clientUsers: [], shortlists: [], requests: [], notifications: [] };

  /* people + leads + deals */
  for (let i = 0; i < 140; i++) {
    const fn = pick(FIRST), ln = pick(LAST);
    const phone = '+9715' + String(10000000 + i * 137).slice(0, 8);
    const p = {
      id: 'p' + i, code: 'PER-' + String(i + 1).padStart(6, '0'), name: fn + ' ' + ln,
      phone, whatsapp: phone, email: (fn + '.' + ln + i).toLowerCase() + '@example.com',
      country: pick(COUNTRIES), city: pick(['Dubai','Abu Dhabi','Kochi','Manila','Cairo','Lagos','Nairobi']),
      profession: pick(PROFESSIONS), owner: pick(CONSULTANTS), created: day(-int(1, 110)),
    };
    db.people.push(p);

    const nLeads = i % 11 === 0 ? 2 : 1;           // some people enquire twice, in different departments
    const used = [];
    for (let k = 0; k < nLeads; k++) {
      let dept = pick(DEPARTMENTS).id;
      while (used.includes(dept)) dept = pick(DEPARTMENTS).id;
      used.push(dept);
      const st = pick(STATUSES);
      const conv = st.id === 'converted';
      // Owner always belongs to the department that holds the enquiry — otherwise the
      // department-scope test below would be meaningless.
      const inDept = CONSULTANTS.filter(c => DEPT_OF[c] === dept);
      const owner = inDept.length ? pick(inDept) : MANAGERS[dept];
      const lead = {
        id: 'l' + db.leads.length, code: 'LEAD-' + String(db.leads.length + 1).padStart(6, '0'),
        personId: p.id, dept, service: pick(SERVICES[dept]), status: st.id,
        source: pick(SOURCES), campaign: i % 3 === 0 ? pick(CAMPAIGNS).id : null,
        owner, created: day(-int(0, 89)),
        followUp: conv ? null : day(int(-6, 14)),
        lastContact: st.id === 'new' ? null : day(-int(1, 20)),
        notes: 'Enquiry about ' + pick(SERVICES[dept]) + '. Captured via ' + pick(SOURCES) + '.',
        dealId: null,
      };
      db.leads.push(lead);

      if (conv) {
        const stages = SERVICE_PIPELINES_SEED[lead.service] || STAGES[dept];
        const won = rnd() > 0.45;
        const amount = 4000 + int(0, 26) * 1000;
        const deal = {
          id: 'd' + db.deals.length, code: 'DEAL-' + String(db.deals.length + 1).padStart(6, '0'),
          name: p.name + ' · ' + DEPARTMENTS.find(d => d.id === dept).name,
          personId: p.id, dept, service: lead.service, stage: won ? stages[stages.length - 1] : pick(stages.slice(1, 4)),
          amount, received: won ? (rnd() > 0.5 ? amount : Math.round(amount / 2)) : 0,
          status: won ? 'WON' : 'OPEN', owner, close: day(int(-20, 40)), created: day(-int(1, 40)),
        };
        db.deals.push(deal);
        lead.dealId = deal.id;
      }
    }

    if (i % 3 === 0) {
      db.activities.push({
        id: 'a' + db.activities.length, type: pick(['CALL','FOLLOW_UP','TASK','MEETING']),
        subject: pick(['Follow up on documents','Call back candidate','Send fee structure','Schedule counselling','Collect passport copy','Confirm exam date']),
        due: day(int(-4, 9)), status: rnd() > 0.75 ? 'COMPLETED' : 'OPEN',
        priority: pick(['LOW','MEDIUM','HIGH']), owner: i % 4 === 0 ? pick(USERS).id : p.owner, personId: p.id,
        leadId: (db.leads.find(l => l.personId === p.id) || {}).id,
      });
    }
  }

  /* The journeys that prove why one person can hold several enquiries:
     an AHPRA doctor who later wants GSM/PR, a DHA nurse who then needs a placement. */
  const journeys = [
    { first: 'Ayesha', last: 'Rahman', profession: 'Registered Nurse', country: 'India', enquiries: [
      { dept: 'LIC', service: 'DHA Licence', status: 'converted', note: 'DHA licence issued — now eligible for UAE hospital roles.' },
      { dept: 'REC', service: 'Nurse Recruitment', status: 'connected', note: 'Looking for an ICU post in Dubai. Same person, different service.' } ] },
    { first: 'Dr. Vivek', last: 'Menon', profession: 'General Practitioner', country: 'India', enquiries: [
      { dept: 'LIC', service: 'SCFHS Licence', status: 'connected', note: 'AHPRA pathway started; Dataflow submitted.' },
      { dept: 'MIG', service: 'Australia PR', status: 'pending', note: 'GSM 189 points test looks positive — running alongside the licensing file.' } ] },
    { first: 'Joan', last: 'Mbeki', profession: 'Midwife', country: 'Kenya', enquiries: [
      { dept: 'ACA', service: 'NCLEX Prep', status: 'converted', note: 'Enrolled in the NCLEX batch.' },
      { dept: 'REC', service: 'Nurse Recruitment', status: 'attempted', note: 'Wants placement once NCLEX is cleared.' } ] },
  ];
  journeys.forEach((j, ji) => {
    const phone = '+97155' + String(3100000 + ji * 37).slice(0, 7);
    const jp = {
      id: 'pj' + ji, code: 'PER-90' + String(ji + 1).padStart(4, '0'), name: j.first + ' ' + j.last,
      phone, whatsapp: phone, email: (j.first + '.' + j.last).toLowerCase().replace(/[^a-z.]/g, '') + '@example.com',
      country: j.country, city: pick(['Kochi', 'Nairobi', 'Manila']), profession: j.profession,
      owner: pick(CONSULTANTS), created: day(-120),
    };
    db.people.unshift(jp);
    j.enquiries.forEach((e, ei) => {
      db.leads.unshift({
        id: 'lj' + ji + ei, code: 'LEAD-90' + (ji + 1) + String(ei + 1).padStart(2, '0'),
        personId: jp.id, dept: e.dept, service: e.service, status: e.status,
        source: ei === 0 ? 'Meta Ads' : 'Existing client', campaign: null,
        owner: MANAGERS[e.dept] || pick(CONSULTANTS), created: day(-(110 - ei * 30)),
        followUp: e.status === 'converted' ? null : day(ei + 2),
        lastContact: day(-(5 + ei)), notes: e.note, dealId: null,
      });
    });
  });

  /* every employee gets a few live tasks so "My day" is real for whoever is signed in */
  USERS.forEach((u, ui) => {
    for (let k = 0; k < 4; k++) {
      const pr = db.people[(ui * 9 + k * 5) % db.people.length];
      const lead = db.leads.find(l => l.personId === pr.id);
      db.activities.push({
        id: 'ua' + ui + k, type: pick(['CALL', 'FOLLOW_UP', 'TASK', 'MEETING']),
        subject: pick(['Call back ' + pr.name.split(' ')[0], 'Send the fee structure', 'Chase missing documents', 'Confirm interview slot', 'Review client requirement', 'Approve the campaign creative']),
        due: day(k === 0 ? -2 : k === 1 ? 0 : k + 1), status: 'OPEN',
        priority: pick(['LOW', 'MEDIUM', 'HIGH']), owner: u.id, personId: pr.id, leadId: lead ? lead.id : null,
      });
    }
  });

  /* recruitment */
  const clientSeed = [
    { name: 'Al Noor Specialist Hospital', country: 'United Arab Emirates', city: 'Abu Dhabi', reg: 'DOH', fee: 9000, am: 'u6' },
    { name: 'Gulf International Medical City', country: 'United Arab Emirates', city: 'Dubai', reg: 'DHA', fee: 11000, am: 'u7' },
    { name: 'Riyadh Care Hospital', country: 'Saudi Arabia', city: 'Riyadh', reg: 'SCFHS', fee: 12500, am: 'u6' },
    { name: 'Doha Family Clinic Group', country: 'Qatar', city: 'Doha', reg: 'QCHP', fee: 8000, am: 'u7' },
    { name: 'Salmaniya Medical Complex', country: 'Bahrain', city: 'Manama', reg: 'NHRA', fee: 8500, am: 'u6' },
  ];
  clientSeed.forEach((c, i) => db.clients.push({
    id: 'cl' + i, code: 'CL-' + String(i + 1).padStart(6, '0'), ...c,
    type: 'HOSPITAL', status: i === 4 ? 'PROSPECT' : 'ACTIVE',
    contact: pick(['Dr. Samir Haddad','Ms. Hala Nasser','Mr. Faisal Al Otaibi','Dr. Amira Saleh']),
    contractEnd: day(int(60, 300)), terms: 45,
  }));

  const vacSeed = [
    { cl: 'cl0', title: 'Staff Nurse — ICU', sp: 'ICU', pos: 12, lic: 'DOH', min: 7000, max: 9500 },
    { cl: 'cl0', title: 'Midwife — Labour & Delivery', sp: 'Obstetrics', pos: 4, lic: 'DOH', min: 8000, max: 10000 },
    { cl: 'cl1', title: 'Staff Nurse — Emergency', sp: 'Emergency', pos: 8, lic: 'DHA', min: 7500, max: 9000 },
    { cl: 'cl1', title: 'Radiographer', sp: 'Radiology', pos: 3, lic: 'DHA', min: 9000, max: 12000 },
    { cl: 'cl2', title: 'Staff Nurse — Medical Ward', sp: 'Med-Surg', pos: 20, lic: 'SCFHS', min: 8000, max: 11000 },
    { cl: 'cl3', title: 'Physiotherapist', sp: 'Rehabilitation', pos: 2, lic: 'QCHP', min: 9000, max: 13000 },
    { cl: 'cl2', title: 'Operating Theatre Nurse', sp: 'Theatre', pos: 6, lic: 'SCFHS', min: 8500, max: 11500 },
  ];
  vacSeed.forEach((v, i) => db.vacancies.push({
    id: 'v' + i, code: 'JOB-' + String(i + 1).padStart(6, '0'), clientId: v.cl, title: v.title,
    specialty: v.sp, positions: v.pos, filled: 0, licence: v.lic, salaryMin: v.min, salaryMax: v.max,
    currency: 'AED', contract: 24, experience: 2, language: 'English', status: 'OPEN',
    priority: i % 3 === 0 ? 'HIGH' : 'MEDIUM', owner: i % 2 ? 'u7' : 'u6',
    target: day(int(20, 70)), opened: day(-int(20, 70)),
    requirements: 'BSc Nursing, minimum 2 years post-registration experience, eligible for the stated licence.',
  }));

  db.vacancies.forEach((v, vi) => {
    const n = Math.min(v.positions, int(3, 7));
    for (let k = 0; k < n; k++) {
      const stage = pick(PLACEMENT_STAGES.slice(0, 10));
      const person = db.people[(vi * 13 + k * 7) % db.people.length];
      db.placements.push({
        id: 'pl' + db.placements.length, code: 'PLC-' + String(db.placements.length + 1).padStart(6, '0'),
        vacancyId: v.id, personId: person.id, stage, seat: consumesSeat(stage),
        fee: db.clients.find(c => c.id === v.clientId).fee, owner: v.owner,
        updated: day(-int(0, 25)),
        history: [{ to: stage, at: day(-int(1, 25)), by: 'Seed' }],
      });
    }
    recomputeSeats(db, v.id);
  });

  /* tickets */
  const tTitles = ['Laptop will not connect to office WiFi','Outlook keeps asking for password','Need access to the Recruitment module','Printer on 3rd floor jamming','CRM search returns no results','Headset microphone not working','Request Adobe licence','Screen flickering on external monitor','Cannot open shared drive','New joiner laptop setup','VPN drops every few minutes','Excel crashes on large export'];
  for (let i = 0; i < 26; i++) {
    const pr = pick(['LOW','MEDIUM','HIGH','CRITICAL']);
    const st = pick(TICKET_STATUSES);
    const created = day(-int(0, 30));
    db.tickets.push({
      id: 't' + i, code: 'TCK-' + String(i + 1).padStart(6, '0'), title: pick(tTitles),
      description: 'Reported from the employee portal. Steps already tried: restart and reconnect.',
      category: pick(TICKET_CATS), priority: pr, status: st,
      requester: pick(USERS).id, assignee: st === 'OPEN' ? null : 'u11',
      created, due: new Date(new Date(created).getTime() + SLA[pr] * 3600e3).toISOString(),
      resolved: ['RESOLVED','CLOSED'].includes(st) ? day(-int(0, 5)) : null,
      comments: st === 'OPEN' ? [] : [{ by: 'u11', body: 'Picked this up — will update shortly.', at: day(-int(0, 4)), internal: false }],
    });
  }

  /* assets */
  const aPlan = [['MacBook Pro 14" M3','Laptop','Apple',8500],['Dell Latitude 5450','Laptop','Dell',4200],['HP EliteDesk 800','Desktop','HP',3100],['Dell 24" P2422H','Monitor','Dell',750],['iPhone 14','Mobile Phone','Apple',3300],['Jabra Evolve2 40','Headset','Jabra',480],['Canon imageRUNNER','Printer','Canon',6200],['Microsoft 365 Business','Software Licence','Microsoft',1450]];
  for (let i = 0; i < 30; i++) {
    const a = aPlan[i % aPlan.length];
    const assigned = i % 3 !== 0;
    db.assets.push({
      id: 'as' + i, tag: 'AST-' + String(i + 1).padStart(5, '0'), name: a[0], type: a[1], brand: a[2],
      serial: 'SN' + (100000 + i * 37), price: a[3], currency: 'AED',
      status: assigned ? 'ASSIGNED' : (i % 9 === 0 ? 'UNDER_REPAIR' : 'AVAILABLE'),
      holder: assigned ? pick(USERS).id : null,
      warranty: day(i % 4 === 0 ? int(5, 28) : int(60, 500)),
      location: assigned ? 'Head office — 3rd floor' : 'IT store room',
      history: assigned ? [{ user: pick(USERS).id, from: day(-int(30, 300)), to: null }] : [],
    });
  }

  /* marketing */
  const mTitles = ['Instagram carousel for DHA licensing offer','Reel for nurse recruitment drive','Landing page for Canada PR webinar','Email campaign for NCLEX batch','Poster for Study Abroad expo','Paid ad creative for Meta — ICU nurses','Brochure refresh for Migration','Event banner for careers fair','WhatsApp broadcast creative','Testimonial video edit'];
  for (let i = 0; i < 16; i++) {
    const st = pick(MKT_STATUSES);
    db.marketing.push({
      id: 'm' + i, code: 'MKT-' + String(i + 1).padStart(6, '0'), title: pick(mTitles),
      type: pick(MKT_TYPES), dept: pick(DEPARTMENTS).id, requester: pick(USERS).id,
      assignee: st === 'NEW' ? null : 'u10', priority: pick(['LOW','MEDIUM','HIGH']), status: st,
      due: day(int(-5, 14)), created: day(-int(1, 25)),
      brief: 'Square and story sizes, brand colours, Arabic and English versions. Offer ends this month.',
      completed: st === 'COMPLETED' ? day(-int(1, 6)) : null,
    });
  }

  /* budgets and approvals */
  const budgetSeed = [
    { title: 'Meta ads — ICU nurses, October push', amount: 45000, status: 'SUBMITTED', dept: 'REC', campaign: 'c1' },
    { title: 'Google Search — DHA licence keywords', amount: 18000, status: 'APPROVED', approved: 15000, spent: 9200, dept: 'LIC', campaign: 'c2' },
    { title: 'Instagram creator collaboration — Canada PR', amount: 22000, status: 'SUBMITTED', dept: 'MIG', campaign: 'c3' },
    { title: 'Careers fair stand — Kochi', amount: 12500, status: 'APPROVED', approved: 12500, spent: 12500, dept: 'REC' },
    { title: 'Academy brochure rebrand', amount: 8000, status: 'REJECTED', dept: 'ACA', note: 'Hold until the new brand guidelines land next quarter.' },
    { title: 'TikTok creative batch — Study in UK', amount: 9500, status: 'SUBMITTED', dept: 'STU', campaign: 'c4' },
  ];
  budgetSeed.forEach((b, i) => {
    const decided = b.status !== 'SUBMITTED';
    db.budgets.push({
      id: 'b' + i, code: 'BUD-' + String(i + 1).padStart(6, '0'), title: b.title,
      purpose: 'Expected reach and target cost per lead attached in the brief.',
      dept: b.dept, campaign: b.campaign || null, period: 'This month',
      requested: b.amount, approved: b.approved || 0, spent: b.spent || 0, currency: 'AED',
      status: b.status, requester: i % 2 ? 'u5' : 'u4', approver: decided ? 'u3' : null,
      submitted: day(-(10 - i)), decided: decided ? day(-(5 - i)) : null, note: b.note || null,
      neededBy: day(14 - i),
      events: [
        ...(decided ? [{ action: b.status, amount: b.approved || 0, by: 'u3', at: day(-(5 - i)) }] : []),
        { action: 'SUBMITTED', amount: b.amount, by: i % 2 ? 'u5' : 'u4', at: day(-(10 - i)) },
      ],
    });
  });

  /* notes and documents — written on a lead, visible on the contact everywhere */
  const noteBodies = [
    'Called — asked us to send the fee structure over WhatsApp. Wants to start after Ramadan.',
    'Documents received: passport, degree certificate, two experience letters. Missing the good standing certificate.',
    'Spoke to her husband; she is on night shift this week. Call back after 4pm.',
    'Client confirmed the interview slot for Tuesday. Candidate briefed on the panel format.',
    'Dataflow submitted — reference PSV-88214. Expect 4 to 6 weeks.',
    'Wants to compare our fee with another agency. Sent the breakdown showing what is included.',
    'Passport expires in 8 months — flagged, needs renewal before the visa stage.',
  ];
  const docNames = [
    ['passport-scan.pdf', 'Passport', 840000], ['nursing-degree.pdf', 'Degree certificate', 1240000],
    ['dha-eligibility-letter.pdf', 'Licence', 320000], ['experience-certificate.jpg', 'Experience letter', 2100000],
    ['good-standing.pdf', 'Good standing certificate', 410000],
  ];
  db.leads.slice(0, 26).forEach((l, i) => {
    db.notes.push({ id: 'nt' + i, body: pick(noteBodies), entityType: 'Lead', entityId: l.id, personId: l.personId,
      by: l.owner, at: day(-(i % 14)), pinned: i % 7 === 0 });
    if (i % 2 === 0) {
      const [name, kind, size] = docNames[i % docNames.length];
      db.files.push({ id: 'fl' + i, name, kind, size, entityType: 'Lead', entityId: l.id, personId: l.personId, by: l.owner, at: day(-(i % 20)) });
    }
  });

  /* meetings across the next fortnight */
  const meetingSubjects = ['Document review — DHA application', 'Client call — Al Noor ICU requirement', 'Counselling session', 'Interview prep', 'Weekly marketing stand-up', 'Budget review with CMO', 'Candidate briefing — Riyadh Care'];
  USERS.forEach((u, ui) => {
    for (let k = 0; k < 3; k++) {
      const start = new Date(); start.setDate(start.getDate() + ((ui + k * 3) % 12)); start.setHours(9 + ((ui + k) % 7), k % 2 ? 30 : 0, 0, 0);
      db.meetings.push({
        id: 'mt' + ui + k, subject: pick(meetingSubjects), start: start.toISOString(),
        end: new Date(start.getTime() + 30 * 60000).toISOString(),
        location: pick(['Head office — room 2', 'Microsoft Teams', 'Client office', 'Phone']),
        personId: k === 0 ? db.people[(ui * 7) % db.people.length].id : null,
        owner: u.id, attendees: k === 1 ? [USERS[(ui + 1) % USERS.length].id] : [],
      });
    }
  });

  /* starter automations */
  db.automations = [
    { id: 'au1', name: 'Chase leads nobody has called in 3 days', description: 'The single rule that recovers the most revenue in any CRM rollout.',
      trigger: 'LEAD_IDLE', condition: { field: 'statusCategory', value: 'not CONVERTED' }, actions: ['NOTIFY_OWNER', 'CREATE_TASK'],
      active: true, runs: 148, lastRun: day(0), lastError: null },
    { id: 'au2', name: 'Round-robin new Meta leads to Recruitment', description: 'Paid leads assigned to whoever is carrying the fewest, within seconds of arriving.',
      trigger: 'LEAD_CREATED', condition: { field: 'source', value: 'Meta Ads' }, actions: ['ASSIGN_ROUND_ROBIN'],
      active: true, runs: 92, lastRun: day(0), lastError: null },
    { id: 'au3', name: 'Escalate critical tickets to the manager', trigger: 'TICKET_SLA_BREACHED',
      condition: { field: 'priority', value: 'CRITICAL' }, actions: ['NOTIFY_MANAGER'], active: true, runs: 6, lastRun: day(-2), lastError: null },
    { id: 'au4', name: 'Tell the account manager when a vacancy fills', trigger: 'VACANCY_FILLED',
      condition: null, actions: ['NOTIFY_OWNER'], active: true, runs: 11, lastRun: day(-1), lastError: null },
    { id: 'au5', name: 'Raise an invoice when a candidate is deployed', description: 'Waiting on the Zoho Finance connection.',
      trigger: 'PLACEMENT_STAGE_CHANGED', condition: { field: 'stage', value: 'DEPLOYED' }, actions: ['WEBHOOK'],
      active: false, runs: 3, lastRun: day(-4), lastError: 'WEBHOOK: Zoho Finance is not connected' },
    { id: 'au6', name: 'WhatsApp follow-up after a missed call', description: 'Template message when a lead is marked not answering.',
      trigger: 'LEAD_STATUS_CHANGED', condition: { field: 'status', value: 'Not Answering' }, actions: ['SEND_WHATSAPP'],
      active: true, runs: 0, lastRun: null, lastError: null },
  ];
  db.integrations = ['zoho_crm', 'meta'];

  /* ------------------------------------------------------------ talent portal */
  /**
   * The saleable product: verified, licence-ready healthcare professionals.
   *
   * A talent profile is a PUBLISHED view of a person — deliberately separate from the CRM
   * record, because what a hospital sees is not what we hold. No name, no phone, no
   * passport until an interview is agreed. See portal.js for why that matters.
   */
  const SPECIALTIES = ['ICU', 'Emergency', 'Theatre', 'NICU', 'Med-Surg', 'Obstetrics', 'Dialysis', 'Oncology', 'Cardiology', 'Paediatrics'];
  const LICENCES = ['DHA', 'DOH', 'MOHAP', 'SCFHS', 'QCHP', 'NHRA', 'NMC (UK)', 'NCLEX'];
  const LANGS = [['English'], ['English', 'Arabic'], ['English', 'Hindi'], ['English', 'Malayalam'], ['English', 'Tagalog'], ['English', 'Arabic', 'Hindi']];
  const AVAIL = ['Immediate', 'Within 30 days', 'Within 60 days', 'Within 90 days'];
  const TITLES = ['Staff Nurse', 'Senior Staff Nurse', 'Charge Nurse', 'Midwife', 'Specialist Doctor', 'General Practitioner', 'Physiotherapist', 'Radiographer', 'Lab Technologist'];

  db.people.slice(0, 64).forEach((p, i) => {
    const isDoctor = /doctor|physician|general prac|specialist/i.test(p.profession || '') || i % 11 === 0;
    const licence = pick(LICENCES);
    const verified = i % 4 !== 0;
    db.talent.push({
      id: 'tp' + i,
      personId: p.id,
      // The public handle. A client never sees a name until we release it.
      ref: (isDoctor ? '360M-DR-' : '360M-RN-') + String(4100 + i),
      title: isDoctor ? pick(['Specialist Doctor', 'General Practitioner']) : pick(TITLES.slice(0, 4)),
      category: isDoctor ? 'Doctor' : 'Nurse',
      specialty: pick(SPECIALTIES),
      years: int(2, 14),
      country: p.country,
      currentEmployer: pick(['Tertiary hospital, 400 beds', 'University teaching hospital', 'Private multi-speciality', 'Government district hospital']),
      licence,
      licenceStatus: verified ? pick(['Eligibility letter issued', 'Licence issued', 'Dataflow verified']) : 'Dataflow in progress',
      exams: verified && i % 3 === 0 ? ['Prometric passed'] : [],
      languages: pick(LANGS),
      availability: pick(AVAIL),
      expectation: 6000 + int(0, 8) * 500,
      currency: 'AED',
      verified,
      docsVerified: verified ? ['Passport', 'Degree certificate', 'Experience letters', 'Good standing'] : ['Passport', 'Degree certificate'],
      published: i % 5 !== 0,
      highlights: [
        `${int(2, 14)} years in ${pick(SPECIALTIES)}`,
        pick(['BLS and ACLS current', 'IELTS 7.0 overall', 'OET B in all sub-tests', 'Trained on Epic and Cerner']),
        pick(['Available to interview this week', 'Open to relocation across GCC', 'Previously worked in a JCI-accredited facility']),
      ],
      views: int(0, 40),
      addedAt: day(-int(3, 90)),
    });
  });

  /* Hospital-side users who can sign in to the portal. */
  db.clientUsers = db.clients.slice(0, 4).map((c, i) => ({
    id: 'cu' + i, clientId: c.id, name: c.contact,
    email: 'hr' + (i + 1) + '@' + c.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com',
    title: pick(['Head of Nursing', 'Talent Acquisition Manager', 'HR Director', 'Medical Director']),
    lastSeen: day(-int(0, 9)), active: i !== 3,
  }));

  /* What the hospitals have done in the portal so far. */
  db.shortlists = [];
  db.clients.slice(0, 3).forEach((c, ci) => {
    db.talent.filter(t => t.published).slice(ci * 5, ci * 5 + 4).forEach((t, k) => {
      db.shortlists.push({ id: 'sl' + ci + k, clientId: c.id, talentId: t.id, at: day(-int(1, 20)), note: '' });
    });
  });

  const REQ_STATUS = ['NEW', 'PROFILE_RELEASED', 'INTERVIEW_SCHEDULED', 'OFFER_MADE', 'DECLINED'];
  db.clients.slice(0, 3).forEach((c, ci) => {
    db.talent.filter(t => t.published).slice(ci * 3, ci * 3 + 3).forEach((t, k) => {
      const vac = db.vacancies.find(v => v.clientId === c.id);
      db.requests.push({
        id: 'rq' + ci + k, clientId: c.id, talentId: t.id, vacancyId: vac ? vac.id : null,
        type: k === 0 ? 'INTERVIEW' : 'PROFILE',
        status: pick(REQ_STATUS), at: day(-int(0, 12)),
        message: pick(['Please share the full profile — looks like a strong ICU fit.', 'Can we interview this week? Panel is free Tuesday and Wednesday.', 'Need two more like this one for the same unit.', 'What is the earliest joining date?']),
        by: db.clientUsers.find(u => u.clientId === c.id) ? db.clientUsers.find(u => u.clientId === c.id).id : null,
      });
    });
  });

  db.notifications = [
    { id: 'n0', text: 'Gulf International Medical City requested an interview with 360M-RN-4103', at: day(0), read: false },
    { id: 'n1', text: 'Budget BUD-000001 needs your approval — AED 45,000 is above the sign-off threshold', at: day(0), read: false },
    { id: 'n4', text: 'Vacancy JOB-000002 is now fully filled', at: day(0), read: false },
    { id: 'n2', text: 'Ticket TCK-000004 breached its SLA', at: day(0), read: false },
    { id: 'n3', text: 'Marketing request MKT-000003 was delivered', at: day(-1), read: true },
  ];
  return db;
}

/* The rule that matters: filled seats are recomputed from placements, never incremented. */
function recomputeSeats(db, vacancyId) {
  const v = db.vacancies.find(x => x.id === vacancyId);
  if (!v) return;
  v.filled = db.placements.filter(p => p.vacancyId === v.id && p.seat).length;
  if (v.status === 'OPEN' || v.status === 'FILLED') v.status = v.filled >= v.positions ? 'FILLED' : 'OPEN';
}

let DB, ME, STATE = { view: 'dashboard', params: {}, filters: {}, page: 1 };

function save() { try { localStorage.setItem(LS_KEY, JSON.stringify({ db: DB, me: ME.id })); } catch (e) {} }
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const j = JSON.parse(raw); if (!j.db || !j.db.budgets) return false; DB = j.db; ME = USERS.find(u => u.id === j.me) || USERS[1]; return true; }
  } catch (e) {}
  return false;
}
function resetDemo() { localStorage.removeItem(LS_KEY); DB = build(); ME = USERS[1]; save(); go('dashboard'); toast('Sample data reset'); }
