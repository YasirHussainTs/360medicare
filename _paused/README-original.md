# 360Medicare — Internal Platform

The full platform: CRM, recruitment with seat counting, IT service desk, IT assets, marketing queue, budgets and approvals, Ask 360, notes and documents, tasks and meetings, integrations and automations.

**This version has no build step and no database.** It is plain HTML, CSS and JavaScript, so a Vercel deploy cannot fail on a compile error, a missing environment variable or a database connection. Data is seeded in the browser and kept in `localStorage`.

---

## Deploy to Vercel

**Option 1 — drag and drop (about 30 seconds)**

1. Go to https://vercel.com/new
2. Drag this whole folder onto the page
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy.

**Option 2 — from GitHub**

```bash
git init
git add .
git commit -m "360Medicare platform"
git remote add origin git@github.com:<you>/360medicare.git
git push -u origin main
```

Then import the repository at https://vercel.com/new. No environment variables are needed.

`vercel.json` already tells Vercel there is nothing to build and that the site is the
repository root. If you are fixing an existing project that was set up before this file
existed, go to **Project → Settings → Build & Output Settings** and set:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Build Command | leave empty (turn the override off) |
| Output Directory | `.` (a single dot) |
| Install Command | leave empty |

Then redeploy. The error *"No Output Directory named public found"* means Vercel ran a
build and went looking for a folder to publish — there is no build, so the answer is `.`.

**Run it locally**

```bash
npm run dev      # http://localhost:3000
```

Or just open `index.html` in a browser — it works from the file system too.

---

## Signing in

There is no login screen in this version. The platform opens as **Austin (CEO)**. Use **Switch account** at the bottom of any page — or click the name in the top right — to view the platform as anyone else.

| Person | Role | Sees |
| --- | --- | --- |
| Yasir Hussain | IT Administrator | Everything, company-wide |
| Austin | CEO | Everything, company-wide |
| Muneer | CMO | Everything, company-wide |
| Sagar | Designer, Marketing | Marketing queue, campaigns, budgets. No IT assets |
| Siyad | Marketing Specialist | Same as Sagar |
| Mohanan | Migration Manager | Migration CRM only |
| Sharifa | Recruitment Manager | Recruitment clients, vacancies, placements |
| Sharon | Study Abroad Manager | Study Abroad CRM only |
| Ahmed, Sneha, Joseph, Fatima, Deepak | Consultants | Their own records only |

The sidebar physically changes between accounts. That is the permission model, not a UI trick.

---

## Worth showing on a review call

| Feature | Where | What to do |
| --- | --- | --- |
| **Recruitment seat counting** | Vacancies → open one | Move a candidate to *offer accepted* — the open-seat count drops. Move them to *withdrawn* — it comes back. |
| **Duplicate policy** | Leads → New lead | Enter phone `+971553100137` (Ayesha Rahman). Same service = blocked. Different service = allowed with a warning. Different department = allowed. |
| **Ask 360** | Sidebar, or type in the top bar and press Enter | "How many converted leads in Migration", "which vacancies still have open seats", "overdue tickets". |
| **Notes and documents** | Any lead, then that person's contact | A note written on a lead appears on the contact, labelled with where it came from. |
| **Service pipelines** | Deals | Stage options depend on the *service* — DHA Licence and Australia PR have completely different steps. |
| **Budgets** | Budgets & approvals | Approve, reduce, or reject. Requests at or above AED 25,000 need company-wide sign-off. |
| **Talent portal** | Recruitment → Talent pool → *Preview the client portal* | Browse as a hospital would: anonymous cards, shortlist, request a candidate. Then go to Recruitment → Client requests and release one — the name appears only after that. |
| **Automations** | Settings → Automations | Press *Test run* on "Raise an invoice when a candidate is deployed" — it fails because Zoho Finance is not connected. Connect it in Integrations, run again, it succeeds. |

---

## Files

```
index.html            the shell — sidebar, top bar, containers
assets/styles.css     design tokens, layout, components, light and dark
assets/*.png          logo, favicon, social preview
js/data.js            departments, services, people, the whole seeded dataset
js/ui.js              helpers, permission checks, charts, modal
js/crm.js             dashboard, leads, contacts, deals, my day
js/operations.js      recruitment, IT support, assets, marketing, budgets, reports, people, settings
js/advanced.js        Ask 360, notes and files, calendar, integrations, automations
js/portal.js          talent pool, client-facing portal, profile release workflow
js/app.js             navigation, permission-filtered sidebar, routing, boot
```

Scripts load in order with plain `<script>` tags. No bundler, no transpiler, no `node_modules` on the server.

---

## What this version is not

Data lives in the visitor's browser, so two people looking at the same deployment do not see each other's edits, and clearing browser storage resets everything. There is no authentication, so anyone with the link can open it — keep the URL private, or put Vercel password protection on the project.

That is the deliberate trade for a deployment that cannot fail. When you are ready for real multi-user data, the full codebase (Next.js, TypeScript, Prisma, Postgres/Supabase) is a separate package — same screens, same rules, same design, with the database and permissions enforced on the server.
