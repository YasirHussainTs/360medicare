# Put it live on Vercel — 10 minutes, no Node.js

1. **GitHub:** github.com → New repository (private) → name `360medicare-dashboard` → "uploading an existing file" →
   drag in everything from this folder (index.html, data.enc.json, vercel.json, package.json, assets, js, _paused, tools) → Commit.
2. **Vercel:** vercel.com → Add New → Project → pick the repo.
   Framework Preset **Other**; leave every other setting as it is; **Deploy**.
3. Open the `.vercel.app` address it gives you and sign in with `muneer` / `austin` / `sharon` / `yasir`
   plus the password from PRIVATE-credentials.txt (give each person only their own).
4. Optional own address: Vercel → Settings → Domains → add e.g. `dashboard.360medicare.ae` and the DNS record it shows.

## Each month
Send Claude the new figures; you get a new `data.enc.json`. Replace that one file in GitHub → Vercel redeploys in a minute.
To change a password or remove someone, ask for a new `data.enc.json` as well.

## How the login works (and its limit)
The figures are not on the site in readable form: they are encrypted, and the password is the key. Wrong password = nothing opens.
Use the strong random passwords supplied; short or guessable ones would weaken this. Anyone who knows a password sees that person's copy,
and the site cannot lock out repeated guesses (a server-based login could). For this internal report that is a fair trade for having no server.
Opening `index.html` by double-click will not work — use the Vercel address (https).
