// Visitor Approval Desk — standalone server
// Node 18+ · no dependencies · data kept in data/db.json
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
// Sessions are signed with this secret. Set SESSION_SECRET in production so logins survive restarts.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
const REMIND_COOLDOWN_MS = 30 * 1000; // at most one reminder per visit every 30 seconds
const SHOW_DEMO_LOGINS = (process.env.SHOW_DEMO_LOGINS || 'true') === 'true';

// ---- accounts ------------------------------------------------------------
// Default demo accounts (role "manager" is shown as Chairman in the app). Override with env vars, or with USERS_JSON:
//   USERS_JSON='[{"username":"sara","password":"...","role":"secretary","name":"Sara"}]'
function loadUsers() {
  if (process.env.USERS_JSON) {
    return JSON.parse(process.env.USERS_JSON).map(u => ({
      username: String(u.username).toLowerCase(), password: String(u.password),
      role: u.role === 'chairman' ? 'manager' : u.role, name: u.name || u.username }));
  }
  return [
    { username: (process.env.CHAIRMAN_USER || process.env.MANAGER_USER || 'chairman').toLowerCase(),
      password: process.env.CHAIRMAN_PASSWORD || process.env.MANAGER_PASSWORD || 'chairman123', role: 'manager', name: 'Chairman' },
    { username: (process.env.SECRETARY_USER || 'secretary').toLowerCase(), password: process.env.SECRETARY_PASSWORD || 'secretary123', role: 'secretary', name: 'Secretary' },
  ];
}
const USERS = loadUsers();
for (const u of USERS) if (!['manager', 'secretary'].includes(u.role)) throw new Error('Unknown role for user ' + u.username);
const usingDemoPasswords = !process.env.USERS_JSON && !process.env.CHAIRMAN_PASSWORD && !process.env.MANAGER_PASSWORD && !process.env.SECRETARY_PASSWORD;

// ---- storage (small JSON file, written atomically) -----------------------
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { visits: [] };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); if (!Array.isArray(db.visits)) db.visits = []; } catch (_) { /* first run */ }
// Serial numbers: every visit gets the next number when it is logged and keeps it.
if (!Number.isInteger(db.nextSerial)) {
  db.nextSerial = 1;
  db.visits.slice().sort((a, b) => a.createdAt - b.createdAt).forEach(v => { if (!v.serial) v.serial = db.nextSerial; db.nextSerial = Math.max(db.nextSerial, v.serial + 1); });
}
let writing = Promise.resolve();
function save() {
  const snapshot = JSON.stringify(db, null, 1);
  writing = writing.then(() => new Promise((resolve) => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, snapshot, (err) => {
      if (err) { console.error('save failed', err); return resolve(); }
      fs.rename(tmp, DB_FILE, (e) => { if (e) console.error('save failed', e); resolve(); });
    });
  }));
  return writing;
}
let version = String(Date.now()); // changes on every write so clients can skip unchanged polls
const touch = () => { version = String(Date.now()) + Math.random().toString(36).slice(2, 6); return save(); };

// ---- sessions: signed, httpOnly cookie ------------------------------------
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
function makeToken(user) {
  const body = Buffer.from(JSON.stringify({ u: user.username, exp: Date.now() + SESSION_HOURS * 3600e3 })).toString('base64url');
  return body + '.' + sign(body);
}
function readToken(tok) {
  if (!tok || !tok.includes('.')) return null;
  const [body, sig] = tok.split('.');
  const good = sign(body);
  if (!sig || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.exp < Date.now()) return null;
    return USERS.find(u => u.username === p.u) || null;
  } catch (_) { return null; }
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (_) {} } });
  return out;
}
const safeEq = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
const isHttps = (req) => req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;

// ---- helpers ------------------------------------------------------------------
function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' }, headers || {}));
  res.end(body);
}
const json = (res, status, obj, headers) => send(res, status, JSON.stringify(obj), Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}));
const redirect = (res, to) => send(res, 302, '', { Location: to });
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 20 * 1024) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function sendFile(res, file, cache) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    send(res, 200, buf, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': cache || 'no-cache' });
  });
}
const nameOf = (username) => (USERS.find(u => u.username === username) || {}).name || username;
const publicVisit = (v) => Object.assign({}, v, { createdByName: nameOf(v.createdBy), adjournedByName: v.adjournedBy ? nameOf(v.adjournedBy) : null });
const clean = (s, max) => String(s == null ? '' : s).replace(/\r\n/g, '\n').trim().slice(0, max);

// ---- routes -----------------------------------------------------------------
const fails = new Map(); // login throttle: 10 failed tries per IP per 10 minutes

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const user = readToken(parseCookies(req).vd_session);
  const method = req.method;
  const need = (roles) => {
    if (!user) { json(res, 401, { error: 'signed_out' }); return false; }
    if (roles && !roles.includes(user.role)) { json(res, 403, { error: 'forbidden' }); return false; }
    return true;
  };

  // pages
  if (method === 'GET' && p === '/') return user ? sendFile(res, path.join(PUBLIC_DIR, 'app.html')) : redirect(res, '/login');
  if (method === 'GET' && p === '/login') return user ? redirect(res, '/') : sendFile(res, path.join(PUBLIC_DIR, 'login.html'));
  if (method === 'GET' && p === '/healthz') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });

  // api
  if (p === '/api/login' && method === 'POST') {
    const ip = clientIp(req), f = fails.get(ip);
    if (f && f.n >= 10 && Date.now() - f.t < 600e3) return json(res, 429, { error: 'too_many' });
    const body = await readJson(req);
    const username = String(body.username || '').trim().toLowerCase();
    const u = USERS.find(x => x.username === username);
    if (!u || !safeEq(u.password, String(body.password || ''))) {
      fails.set(ip, { n: (f && Date.now() - f.t < 600e3 ? f.n : 0) + 1, t: Date.now() });
      return json(res, 401, { error: 'bad_login' });
    }
    fails.delete(ip);
    const cookie = `vd_session=${makeToken(u)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 3600}` + (isHttps(req) ? '; Secure' : '');
    return json(res, 200, { ok: true, role: u.role }, { 'Set-Cookie': cookie });
  }
  if (p === '/api/logout' && method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': 'vd_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  if (p === '/api/config' && method === 'GET') {
    return json(res, 200, { demoLogins: SHOW_DEMO_LOGINS && usingDemoPasswords ? USERS.map(u => ({ username: u.username, password: u.password, role: u.role })) : [] });
  }
  if (p === '/api/me' && method === 'GET') { if (!need()) return; return json(res, 200, { username: user.username, name: user.name, role: user.role }); }
  if (p === '/api/visits' && method === 'GET') {
    if (!need()) return;
    if (url.searchParams.get('since') === version) return json(res, 200, { version, unchanged: true });
    return json(res, 200, { version, visits: db.visits.map(publicVisit) });
  }
  if (p === '/api/visits' && method === 'POST') {
    if (!need(['secretary', 'manager'])) return;
    const body = await readJson(req);
    const guestName = clean(body.guestName, 120), purpose = clean(body.purpose, 500);
    if (!guestName || !purpose) return json(res, 400, { error: 'missing_fields' });
    const v = { id: crypto.randomUUID(), serial: db.nextSerial++, guestName, purpose, createdBy: user.username, createdAt: Date.now(),
      status: 'pending', comment: '', commentAt: null, decidedAt: null, decidedBy: null, adjournedAt: null, adjournedBy: null };
    db.visits.push(v); await touch();
    return json(res, 201, publicVisit(v));
  }
  const m = p.match(/^\/api\/visits\/([0-9a-f-]{36})\/(comment|decision|adjourn|remind)$/);
  if (m && method === 'POST') {
    const [, id, action] = m;
    if (!need(action === 'adjourn' || action === 'remind' ? ['secretary', 'manager'] : ['manager'])) return;
    const v = db.visits.find(x => x.id === id);
    if (!v) return json(res, 404, { error: 'not_found' });
    const body = await readJson(req);
    if (action === 'comment') { v.comment = clean(body.comment, 500); v.commentAt = Date.now(); }
    if (action === 'decision') {
      if (!['accepted', 'declined', 'pending'].includes(body.status)) return json(res, 400, { error: 'bad_status' });
      v.status = body.status;
      v.decidedAt = body.status === 'pending' ? null : Date.now();
      v.decidedBy = body.status === 'pending' ? null : user.username;
    }
    if (action === 'adjourn' && !v.adjournedAt) { v.adjournedAt = Date.now(); v.adjournedBy = user.username; }
    if (action === 'remind') { // secretary nudges the Chairman about a waiting visit: plays his chime and highlights it
      if (v.status !== 'pending' || v.adjournedAt) return json(res, 409, { error: 'not_waiting' });
      if (v.remindedAt && Date.now() - v.remindedAt < REMIND_COOLDOWN_MS) return json(res, 429, { error: 'too_soon' });
      v.remindedAt = Date.now(); v.remindedBy = user.username; v.remindCount = (v.remindCount || 0) + 1;
    }
    await touch();
    return json(res, 200, publicVisit(v));
  }
  if (p === '/api/reset' && method === 'POST') { // Chairman only: wipe all visits (handy between demos)
    if (!need(['manager'])) return;
    const body = await readJson(req);
    if (body.confirm !== 'RESET') return json(res, 400, { error: 'confirm_required' });
    db.visits = []; db.nextSerial = 1; await touch();
    return json(res, 200, { ok: true });
  }
  if (p.startsWith('/api/')) return json(res, 404, { error: 'not_found' });

  // static files from /public (no directory listing, no path escapes)
  if (method === 'GET' || method === 'HEAD') {
    const file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(p)));
    if (file.startsWith(PUBLIC_DIR + path.sep) && !file.endsWith('.html')) return sendFile(res, file, 'no-cache');
  }
  return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
}

http.createServer((req, res) => {
  handle(req, res).catch(err => {
    if (res.headersSent) return res.end();
    json(res, err && (err.message === 'bad_json' || err.message === 'too_large') ? 400 : 500, { error: 'server_error' });
    if (!(err && (err.message === 'bad_json' || err.message === 'too_large'))) console.error(err);
  });
}).listen(PORT, () => {
  console.log(`Visitor Approval Desk running on http://localhost:${PORT}`);
  if (!process.env.SESSION_SECRET) console.log('Note: SESSION_SECRET not set - everyone is signed out when the server restarts.');
  if (usingDemoPasswords) console.log('Note: using demo passwords (chairman/chairman123, secretary/secretary123).');
});
