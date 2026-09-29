# Visitor Approval Desk

The secretary logs a guest's name and purpose of visit. The Chairman sees it straight away, adds a comment, and allows or declines the meeting. When the visit is over, **Adjourn** moves it to the **Visitor Log**. Arabic and English, right-to-left and left-to-right.

- **No dependencies.** Plain Node.js 18 or newer; nothing to `npm install`.
- **Data** is saved in `data/db.json` (or the folder in `DATA_DIR`).
- **Updates** reach every open screen within about 4 seconds.

## Accounts

The app starts with two demo accounts, shown on the sign-in page so a demo is one click:

| Role | Username | Password |
|---|---|---|
| Chairman | `chairman` | `chairman123` |
| Secretary | `secretary` | `secretary123` |

The Chairman can switch between the Chairman and Secretary views and can clear all visits from the Visitor Log (useful between demos). The server enforces the roles: a secretary cannot allow, decline, comment on or clear visits.

Each visit gets a permanent serial number when it is logged. New visits the Chairman hasn't looked at yet are shown in a deeper colour with a **New** tag until he clicks, comments on or decides on them.

**Chime and reminders.** The Chairman's page plays a short chime when a new meeting is requested. The secretary can press **Remind** on any waiting visit: the Chairman hears a longer chime and the visit is highlighted with a **Reminder** tag until he looks at it. A visit can be reminded at most once every 30 seconds. The Chairman can silence it with the **Mute** button in the top bar (it then reads **Unmute**). Browsers only allow sound after someone has clicked on the page once, so the Chairman should click anywhere after opening it; the page shows a message if a chime was blocked.

**Before real use, change the passwords.** Setting any of the variables below hides the demo accounts from the sign-in page.

| Variable | What it does |
|---|---|
| `CHAIRMAN_USER`, `CHAIRMAN_PASSWORD` | Chairman login |
| `SECRETARY_USER`, `SECRETARY_PASSWORD` | Secretary login |
| `USERS_JSON` | Several accounts at once, e.g. `[{"username":"sara","password":"…","role":"secretary","name":"Sara"},{"username":"ahmed","password":"…","role":"chairman","name":"Ahmed"}]` |
| `SESSION_SECRET` | Any long random text. Keeps people signed in across restarts. |
| `SESSION_HOURS` | How long a sign-in lasts (default 12) |
| `DATA_DIR` | Folder for the data file (default `./data`) |
| `PORT` | Port to listen on (default 3000; hosts usually set this for you) |
| `SHOW_DEMO_LOGINS` | Set to `false` to hide the demo accounts even with default passwords |

## Run it on your computer

```
node server.js
```
Open http://localhost:3000

## Put it online on cPanel

This needs the **Setup Node.js App** tool in cPanel (under Software). If you don't see it, ask your host to enable Node.js support.

1. **Make a subdomain** (cPanel → Domains), for example `visitors.yourdomain.com`. Use a subdomain rather than a sub-folder such as `yourdomain.com/visitors`, because the app expects to sit at the root of its address.
2. **Upload the files.** In File Manager, upload `visitor-desk.zip` to your home folder (next to `public_html`, not inside it) and extract it. You get a `visitor-desk` folder.
3. **Create the app.** cPanel → Setup Node.js App → Create Application:
   - Node.js version: 18 or newer
   - Application mode: Production
   - Application root: `visitor-desk`
   - Application URL: the subdomain from step 1
   - Application startup file: `server.js`
4. **Add environment variables** on the same screen (Add Variable):
   - `SESSION_SECRET`: any long random text
   - `CHAIRMAN_PASSWORD` and `SECRETARY_PASSWORD`: when you're ready to replace the demo passwords
5. Click **Create** (or **Save**), then **Restart**. Skip "Run NPM Install"; there is nothing to install.
6. **Turn on HTTPS**: cPanel → SSL/TLS Status → Run AutoSSL for the subdomain.
7. Open `https://visitors.yourdomain.com`.

Visits are saved in `visitor-desk/data/db.json` and survive restarts. To update the app later, upload the changed files over the old ones and click **Restart** in Setup Node.js App. Include `data/db.json` in your cPanel backups.

If the page shows an error, open Setup Node.js App → your app, and check that the startup file is `server.js` and the Node.js version is 18 or newer. The host's error log (cPanel → Errors, or `stderr.log` in the app folder) shows the reason.

## Other ways to put it online

### Option A: Render (free, quickest)
1. Put this folder in a GitHub repository.
2. On render.com: **New → Blueprint**, pick the repository. `render.yaml` sets everything up, including a random `SESSION_SECRET`.
3. Open the `…onrender.com` address it gives you.

On Render's free plan the app sleeps after about 15 minutes without visitors. The first page load after that takes up to a minute, and **visits saved before it slept are lost**, because free instances have no permanent disk. That's fine for a live demo. To keep data, use a paid instance with a persistent disk mounted at `/data` and set `DATA_DIR=/data`.

### Option B: Railway, Fly.io or any Docker host
Use the included `Dockerfile`. Attach a volume at `/data` so visits survive restarts, and set `SESSION_SECRET`.

### Option C: an office server (Windows or Linux)
1. Install Node.js 18+ and copy this folder to the server.
2. Set the environment variables above, then run `node server.js`. Use a service manager (NSSM on Windows, systemd or pm2 on Linux) so it restarts automatically.
3. Put it behind IIS (URL Rewrite + ARR) or nginx for HTTPS on your internal domain.

Back up `data/db.json` regularly; it is the whole database.

## Files
```
server.js          web server, sign-in, API, storage
public/app.html    dashboard page
public/app.js      dashboard behaviour
public/login.html  sign-in page
public/i18n.js     Arabic and English text
public/styles.css  design
public/logo.png    office logo
render.yaml        Render deployment
Dockerfile         container deployment
```

## Limits of this version
- Accounts are set in configuration, not managed in the app.
- The data file suits a single office (thousands of visits). For heavier use, move storage to SQL Server or PostgreSQL.
- No export yet; the Visitor Log can be added to Excel export on request.
