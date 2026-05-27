// ── Flarrd Admin JS — Complete Version with Live Console ─────────────────────

var allUsers = [], allLinks = [], allSessions = [];
var currentDrawerUserId = null, currentRecoveryUserId = null, currentDeleteUserId = null;
var actLog = JSON.parse(sessionStorage.getItem('Flarrd_admin_log') || '[]');
var liveInterval = null, consoleInterval = null;

// ── REST helper (works with new sb_publishable key format) ────────────────────
async function rest(table, query) {
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + query, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Accept': 'application/json' }
    });
    return r.ok ? r.json() : [];
  } catch(e) { return []; }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
if (sessionStorage.getItem('Flarrd_admin') === '1') {
  document.addEventListener('DOMContentLoaded', bootAdmin);
}

document.addEventListener('DOMContentLoaded', function() {
  var ap = document.getElementById('ap'), au = document.getElementById('au');
  if (ap) ap.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
  if (au) au.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
});

function adminLogin() {
  var u = document.getElementById('au').value.trim();
  var p = document.getElementById('ap').value;
  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    sessionStorage.setItem('Flarrd_admin', '1');
    document.getElementById('l-err').classList.remove('show');
    bootAdmin();
  } else {
    document.getElementById('l-err').classList.add('show');
    addLog('⚠️ Failed login attempt from browser');
    setTimeout(() => document.getElementById('l-err').classList.remove('show'), 3000);
  }
}

function adminLogout() {
  sessionStorage.removeItem('Flarrd_admin');
  clearInterval(liveInterval); clearInterval(consoleInterval);
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('au').value = ''; document.getElementById('ap').value = '';
}

function bootAdmin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  startClock(); loadAll(); addLog('✅ Admin signed in'); renderLog();
}

function startClock() {
  const tick = () => { var el = document.getElementById('clock'); if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false }); };
  tick(); setInterval(tick, 1000);
}

function showSec(name, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  var sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  var titles = { overview:'Dashboard', users:'All Users', sessions:'Sessions', links:'All Links', live:'Live Visitors', analytics:'Analytics', console:'Live Console', activity:'Activity Log', info:'Info' };
  setText('tb-title', titles[name] || name);
  clearInterval(liveInterval); clearInterval(consoleInterval);
  if (name === 'live')      startLivePolling();
  if (name === 'console')   startConsolePolling();
  if (name === 'sessions')  renderSessions();
  if (name === 'analytics') renderAnalyticsGraphs();
  if (name === 'links')     renderLinks(allLinks);
  if (name === 'activity')  renderLog();
}

async function loadAll() {
  await Promise.all([loadUsers(), loadAdminLinks()]);
  renderOverview(); renderUsersTable(allUsers);
}

async function loadUsers() {
  var data = await rest('profiles', 'order=created_at.desc');
  allUsers = data || [];
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  setText('s-u', allUsers.length);
  setText('s-n', allUsers.filter(u => new Date(u.created_at) > weekAgo).length);
  setText('s-g', allUsers.filter(u => u.provider === 'google').length);
  setText('s-v', allUsers.reduce((s, u) => s + (u.profile_views || 0), 0));
}

async function loadAdminLinks() {
  var data = await rest('links', 'order=clicks.desc');
  allLinks = data || [];
  setText('s-l', allLinks.length);
  setText('s-c', allLinks.reduce((s, l) => s + (l.clicks || 0), 0));
}

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function renderOverview() {
  var tbody = document.getElementById('rec-tbody');
  var recent = allUsers.slice(0, 10);
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No users yet.</td></tr>'; }
  else {
    tbody.innerHTML = recent.map(u => {
      var init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
      var av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
      var lc = allLinks.filter(l => l.user_id === u.id).length;
      var tc = allLinks.filter(l => l.user_id === u.id).reduce((s, l) => s + (l.clicks || 0), 0);
      return '<tr onclick="openDrawer(\'' + u.id + '\')">' +
        '<td><div class="uc"><div class="uav">' + av + '</div><div><div style="font-weight:500">' + esc(u.full_name||'Unknown') + '</div><div style="font-size:10px;color:var(--muted)">' + esc(u.email||'') + '</div></div></div></td>' +
        '<td style="color:var(--muted);font-size:11px">' + (u.username ? '@'+u.username : '—') + '</td>' +
        '<td><span class="badge ' + (u.provider==='google'?'bb':'bg') + '">' + (u.provider||'email') + '</span></td>' +
        '<td style="font-size:11px;color:var(--muted)">' + fd(u.created_at) + '</td>' +
        '<td>' + lc + '</td><td style="color:var(--acc2)">' + tc + '</td>' +
      '</tr>';
    }).join('');
  }
  var ltbody = document.getElementById('top-links-tbody');
  var topLinks = allLinks.slice(0, 10);
  if (!topLinks.length) { ltbody.innerHTML = '<tr><td colspan="4" class="empty">No links yet.</td></tr>'; }
  else {
    ltbody.innerHTML = topLinks.map(l => {
      var owner = allUsers.find(u => u.id === l.user_id);
      return '<tr>' +
        '<td>' + esc(l.title) + '</td>' +
        '<td style="font-size:11px;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.url) + '</td>' +
        '<td style="font-size:11px">' + (owner ? esc(owner.full_name||owner.email) : '—') + '</td>' +
        '<td style="color:var(--acc2)">' + (l.clicks||0) + '</td>' +
      '</tr>';
    }).join('');
  }
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function renderUsersTable(users) {
  var tbody = document.getElementById('u-tbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">No users.</td></tr>'; return; }
  tbody.innerHTML = users.map(u => {
    var init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
    var av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
    var lc = allLinks.filter(l => l.user_id === u.id).length;
    var tc = allLinks.filter(l => l.user_id === u.id).reduce((s, l) => s + (l.clicks || 0), 0);
    return '<tr onclick="openDrawer(\'' + u.id + '\')">' +
      '<td><div class="uc"><div class="uav">' + av + '</div><div><div style="font-weight:500">' + esc(u.full_name||'Unknown') + '</div></div></div></td>' +
      '<td style="font-size:11px;color:var(--muted)">' + (u.username ? '@'+u.username : '—') + '</td>' +
      '<td style="font-size:11px">' + esc(u.email||'') + '</td>' +
      '<td><span class="badge ' + (u.provider==='google'?'bb':'bg') + '">' + (u.provider||'email') + '</span></td>' +
      '<td style="font-size:11px;color:var(--muted)">' + fd(u.created_at) + '</td>' +
      '<td style="font-size:11px;color:var(--muted)">' + fd(u.last_sign_in) + '</td>' +
      '<td>' + lc + '</td><td style="color:var(--acc2)">' + tc + '</td>' +
      '<td><button class="btn btn-p" onclick="event.stopPropagation();openDrawer(\'' + u.id + '\')">Details</button></td>' +
    '</tr>';
  }).join('');
}

function filterUsers(q) {
  var f = allUsers.filter(u => (u.full_name||'').toLowerCase().includes(q.toLowerCase()) || (u.email||'').toLowerCase().includes(q.toLowerCase()) || (u.username||'').toLowerCase().includes(q.toLowerCase()));
  renderUsersTable(f);
}

// ── SESSIONS ─────────────────────────────────────────────────────────────────
async function renderSessions() {
  var data = await rest('user_sessions', 'order=last_seen.desc&limit=100');
  allSessions = data || [];
  var tbody = document.getElementById('sess-tbody');
  if (!allSessions.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">No sessions found.</td></tr>'; return; }
  var now = Date.now();
  tbody.innerHTML = allSessions.map(s => {
    var user = allUsers.find(u => u.id === s.user_id);
    var isRecent = (now - new Date(s.last_seen).getTime()) < 10 * 60 * 1000;
    return '<tr>' +
      '<td>' + (user ? esc(user.full_name||user.email||'Unknown') : 'Unknown') + '</td>' +
      '<td style="font-size:11px;color:var(--muted)">' + (user ? esc(user.email||'') : '') + '</td>' +
      '<td style="font-size:11px">' + esc(s.browser||'?') + ' / ' + esc(s.os||'?') + '</td>' +
      '<td style="font-size:11px;color:var(--muted)">' + esc(s.device||'?') + '</td>' +
      '<td style="font-size:11px;color:var(--muted)">' + fd(s.created_at) + '</td>' +
      '<td style="font-size:11px;color:var(--muted)">' + timeAgo(s.last_seen) + '</td>' +
      '<td><span class="badge ' + (isRecent?'bg':'') + '" style="' + (!isRecent?'background:rgba(107,107,138,0.1);color:var(--muted)':'') + '">' + (isRecent?'Active':'Inactive') + '</span></td>' +
      '<td><button class="btn btn-d" onclick="killAdminSession(\'' + s.id + '\',this)">Revoke</button></td>' +
    '</tr>';
  }).join('');
}

async function killAdminSession(id, btn) {
  btn.textContent = '...'; btn.disabled = true;
  await rest('user_sessions', 'id=eq.' + id); // just to test, use supabase for PATCH
  // Use fetch PATCH directly
  await fetch(SUPABASE_URL + '/rest/v1/user_sessions?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: false })
  });
  addLog('🔐 Admin revoked session ' + id.slice(0,8));
  toast('Session revoked');
  await renderSessions();
}

// ── LINKS ─────────────────────────────────────────────────────────────────────
function renderLinks(links) {
  var tbody = document.getElementById('l-tbody');
  if (!links.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No links.</td></tr>'; return; }
  tbody.innerHTML = links.map(l => {
    var owner = allUsers.find(u => u.id === l.user_id);
    return '<tr>' +
      '<td style="font-weight:500">' + esc(l.title) + '</td>' +
      '<td style="font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.url) + '</td>' +
      '<td style="font-size:11px">' + (owner ? esc(owner.full_name||owner.email) : '—') + '</td>' +
      '<td><span class="badge bp">' + (l.category||'general') + '</span></td>' +
      '<td style="color:var(--acc2)">' + (l.clicks||0) + '</td>' +
      '<td><span class="badge ' + (l.active!==false?'bg':'br') + '">' + (l.active!==false?'Active':'Hidden') + '</span></td>' +
      '<td><button class="btn btn-d" onclick="adminDeleteLink(\'' + l.id + '\',this)">Delete</button></td>' +
    '</tr>';
  }).join('');
}

function filterLinks(q) {
  var f = allLinks.filter(l => (l.title||'').toLowerCase().includes(q.toLowerCase()) || (l.url||'').toLowerCase().includes(q.toLowerCase()));
  renderLinks(f);
}

async function adminDeleteLink(id, btn) {
  if (!confirm('Delete this link?')) return;
  btn.textContent = '...'; btn.disabled = true;
  await fetch(SUPABASE_URL + '/rest/v1/links?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  addLog('🗑 Admin deleted link ' + id.slice(0,8));
  toast('Link deleted');
  await loadAdminLinks();
  renderLinks(allLinks);
}

// ── LIVE VISITORS ─────────────────────────────────────────────────────────────
function startLivePolling() {
  updateLive();
  liveInterval = setInterval(updateLive, 8000);
}

async function updateLive() {
  var cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await fetch(SUPABASE_URL + '/rest/v1/live_presence?last_seen=lt.' + cutoff, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  var data = await rest('live_presence', 'order=last_seen.desc&limit=50');
  data = data || [];
  setText('live-count', data.length);
  var el = document.getElementById('live-list');
  if (!el) return;
  if (!data.length) { el.innerHTML = '<div class="empty" style="padding:32px">No active visitors right now.</div>'; return; }
  el.innerHTML = data.map(p => {
    var ua = p.user_agent || '';
    var browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
    var os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'Mac' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Unknown';
    return '<div class="live-row">' +
      '<div class="live-dot"></div>' +
      '<div class="live-info"><div class="live-page">📄 ' + esc(p.page || 'unknown') + '</div>' +
      '<div class="live-meta">' + browser + ' · ' + os + ' · ' + timeAgo(p.last_seen) + '</div></div>' +
      '<div class="live-id">' + esc((p.visitor_id||'').slice(0,8)) + '</div>' +
    '</div>';
  }).join('');
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
async function renderAnalyticsGraphs() {
  var byMonth = {};
  allUsers.forEach(u => {
    var mo = (u.created_at||'').slice(0,7);
    if (mo) byMonth[mo] = (byMonth[mo]||0) + 1;
  });
  var months = Object.keys(byMonth).sort().slice(-7);
  var maxU = Math.max(...months.map(m => byMonth[m]), 1);
  var usersChart = document.getElementById('users-chart');
  if (usersChart) {
    usersChart.innerHTML = '<div class="chart-bars">' + months.map(m => {
      var h = Math.round((byMonth[m] / maxU) * 100);
      return '<div class="chart-bar-col"><div class="chart-bar" style="height:' + Math.max(h,2) + '%"></div><div class="chart-bar-lbl">' + m.slice(5) + '</div></div>';
    }).join('') + '</div>';
  }
  var byUser = {};
  allLinks.forEach(l => { byUser[l.user_id] = (byUser[l.user_id]||0) + (l.clicks||0); });
  var topUsers = Object.entries(byUser).sort((a,b) => b[1]-a[1]).slice(0,8);
  var maxC = Math.max(...topUsers.map(([,c]) => c), 1);
  var clicksChart = document.getElementById('clicks-chart');
  if (clicksChart) {
    clicksChart.innerHTML = '<div class="chart-bars">' + topUsers.map(([uid, c]) => {
      var user = allUsers.find(u => u.id === uid);
      var label = user ? (user.username || user.full_name || 'User').slice(0,6) : 'User';
      var h = Math.round((c/maxC)*100);
      return '<div class="chart-bar-col"><div class="chart-bar" style="height:' + Math.max(h,2) + '%;background:linear-gradient(180deg,var(--green),rgba(16,185,129,0.3))"></div><div class="chart-bar-lbl">' + esc(label) + '</div></div>';
    }).join('') + '</div>';
  }
  setText('an-total-users',  allUsers.length);
  setText('an-total-links',  allLinks.length);
  setText('an-total-clicks', allLinks.reduce((s,l)=>s+(l.clicks||0),0));
  setText('an-total-views',  allUsers.reduce((s,u)=>s+(u.profile_views||0),0));
}

// ── LIVE CONSOLE ──────────────────────────────────────────────────────────────
var consoleLogs  = [];
var _cQueue      = [];   // pending lines to drip
var _cTimer      = null; // setTimeout handle for drip
var _lastStats   = {};   // snapshot for delta detection

// Drip one line every 950ms — true terminal feel, not a wall of text
function _drip() {
  if (!_cQueue.length) { _cTimer = null; return; }
  var item = _cQueue.shift();
  consoleLogs.unshift(item);
  if (consoleLogs.length > 400) consoleLogs.pop();
  _renderConsole();
  _cTimer = setTimeout(_drip, 950);
}

// Queue a line (printed one-per-second)
function addConsoleLog(type, msg) {
  _cQueue.push({ time: new Date().toLocaleTimeString('en-US', { hour12: false }), type: type, msg: msg });
  if (!_cTimer) _drip();
}

// Print immediately without queue (separators, headers)
function _cNow(type, msg) {
  consoleLogs.unshift({ time: new Date().toLocaleTimeString('en-US', { hour12: false }), type: type, msg: msg });
  if (consoleLogs.length > 400) consoleLogs.pop();
  _renderConsole();
}

function _renderConsole() {
  var el = document.getElementById('console-output');
  if (!el) return;
  // Color map: [tag-color, message-color]
  var C = {
    sys:   ['#475569', '#64748b'],   // slate   — separators & heartbeats
    info:  ['#67e8f9', '#cffafe'],   // cyan    — connection & config
    stat:  ['#38bdf8', '#bae6fd'],   // sky     — numeric metrics
    data:  ['#c4b5fd', '#ede9fe'],   // violet  — named values
    user:  ['#34d399', '#d1fae5'],   // emerald — user activity
    event: ['#4ade80', '#bbf7d0'],   // green   — positive events (clicks etc)
    warn:  ['#fbbf24', '#fef3c7'],   // amber   — warnings
    error: ['#f87171', '#fecaca'],   // red     — errors
    api:   ['#818cf8', '#e0e7ff'],   // indigo  — API / DB calls
    live:  ['#fb923c', '#ffedd5'],   // orange  — live visitor events
  };
  el.innerHTML = consoleLogs.map(function(l, i) {
    var cc = C[l.type] || ['#94a3b8','#e2e8f0'];
    var tag = ('[' + l.type.toUpperCase() + ']').padEnd(9);
    var rowBg = i === 0 ? 'background:rgba(255,255,255,0.025);' : '';
    return '<div class="console-line" style="' + rowBg + '">' +
      '<span class="console-time">' + l.time + '</span>' +
      '<span class="console-tag" style="color:' + cc[0] + '">' + tag + '</span>' +
      '<span class="console-msg" style="color:' + cc[1] + '">' + esc(l.msg) + '</span>' +
    '</div>';
  }).join('');
  el.scrollTop = 0; // newest always at top
}

function clearConsole() {
  consoleLogs = []; _cQueue = [];
  if (_cTimer) { clearTimeout(_cTimer); _cTimer = null; }
  _renderConsole();
}

function startConsolePolling() {
  clearConsole();
  clearInterval(consoleInterval);

  // ── Header (immediate, no queue) ──────────────────────────────────────────
  _cNow('sys', '╔══════════════════════════════════════════╗');
  _cNow('sys', '║   FLARRD ADMIN CONSOLE                   ║');
  _cNow('sys', '╚══════════════════════════════════════════╝');

  // ── Startup stats drip into queue ─────────────────────────────────────────
  var totalClicks = allLinks.reduce(function(s,l){ return s+(l.clicks||0); },0);
  var totalViews  = allUsers.reduce(function(s,u){ return s+(u.profile_views||0); },0);
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  var newThisWeek  = allUsers.filter(function(u){ return new Date(u.created_at)>weekAgo; }).length;
  var googleCount  = allUsers.filter(function(u){ return u.provider==='google'; }).length;
  var emailCount   = allUsers.filter(function(u){ return u.provider!=='google'; }).length;
  var topLink      = allLinks.slice().sort(function(a,b){ return (b.clicks||0)-(a.clicks||0); })[0];

  addConsoleLog('info',  'Supabase connection    →  OK');
  addConsoleLog('info',  'Admin authenticated    →  session active');
  addConsoleLog('sys',   '──────────────────────────────────────────');
  addConsoleLog('stat',  'Total users    :  ' + allUsers.length);
  addConsoleLog('stat',  'Total links    :  ' + allLinks.length);
  addConsoleLog('stat',  'Total clicks   :  ' + totalClicks);
  addConsoleLog('stat',  'Profile views  :  ' + totalViews);
  addConsoleLog('sys',   '──────────────────────────────────────────');
  addConsoleLog('data',  'New users (7d)       :  ' + newThisWeek);
  addConsoleLog('data',  'Google auth users    :  ' + googleCount);
  addConsoleLog('data',  'Email auth users     :  ' + emailCount);
  if (topLink) addConsoleLog('data', 'Top link             :  "' + topLink.title + '"  (' + (topLink.clicks||0) + ' clicks)');
  addConsoleLog('sys',   '──────────────────────────────────────────');
  addConsoleLog('info',  'Live monitoring      →  started  (15s cycle)');
  addConsoleLog('sys',   '──────────────────────────────────────────');

  // ── Snapshot baseline ─────────────────────────────────────────────────────
  _lastStats = { users: allUsers.length, links: allLinks.length, clicks: totalClicks, views: totalViews };

  var tick = 0;

  consoleInterval = setInterval(async function() {
    tick++;

    // ── Every 15s: live presence check ───────────────────────────────────────
    try {
      var presence = await rest('live_presence', 'order=last_seen.desc&limit=30');
      presence = presence || [];
      var active = presence.filter(function(p){ return (Date.now()-new Date(p.last_seen).getTime())<3*60*1000; });
      if (active.length > 0) {
        addConsoleLog('live', 'Live visitors  →  ' + active.length + ' active right now');
        active.slice(0,3).forEach(function(p) {
          var ua = p.user_agent||'';
          var br = ua.includes('Chrome')?'Chrome':ua.includes('Firefox')?'Firefox':ua.includes('Safari')?'Safari':'Browser';
          var os = ua.includes('Windows')?'Win':ua.includes('Mac')?'Mac':ua.includes('Android')?'Android':ua.includes('iPhone')?'iOS':'Linux';
          addConsoleLog('live', '  ↳  ' + br + '/' + os + '  →  ' + esc(p.page||'unknown page'));
        });
      } else {
        addConsoleLog('api', 'presence poll  →  0 active visitors');
      }
    } catch(e) {
      addConsoleLog('error', 'presence fetch FAILED  →  ' + e.message);
    }

    // ── Every 2nd tick (30s): delta check ─────────────────────────────────────
    if (tick % 2 === 0) {
      try {
        var fp = await rest('profiles', 'order=created_at.desc&limit=200');
        fp = fp || [];
        var fl = await rest('links', 'order=clicks.desc&limit=300');
        fl = fl || [];

        var newUC  = fp.length;
        var newCL  = fl.reduce(function(s,l){ return s+(l.clicks||0); },0);
        var newVW  = fp.reduce(function(s,u){ return s+(u.profile_views||0); },0);
        var dU = newUC - _lastStats.users;
        var dC = newCL - _lastStats.clicks;
        var dV = newVW - _lastStats.views;

        if (dU > 0) {
          addConsoleLog('user',  '🆕  New signup     →  total: ' + newUC + '  (+' + dU + ')');
          allUsers = fp;
          _lastStats.users = newUC;
        }
        if (dC > 0) {
          addConsoleLog('event', '🖱   Link clicked   →  total: ' + newCL + '  (+' + dC + ')');
          var top = fl.slice().sort(function(a,b){ return (b.clicks||0)-(a.clicks||0); })[0];
          if (top) addConsoleLog('data', '     top link    :  "' + top.title + '"  →  ' + (top.clicks||0) + ' clicks');
          _lastStats.clicks = newCL;
        }
        if (dV > 0) {
          addConsoleLog('stat', '👁   Profile view   →  total: ' + newVW + '  (+' + dV + ')');
          _lastStats.views = newVW;
        }
        if (dU === 0 && dC === 0 && dV === 0) {
          addConsoleLog('sys', 'delta check  →  no changes detected');
        }
      } catch(e) {
        addConsoleLog('error', 'delta fetch FAILED  →  ' + e.message);
      }
    }

    // ── Every 5th tick (75s): full snapshot ──────────────────────────────────
    if (tick % 5 === 0) {
      try {
        var sc = (await rest('links',    'select=clicks&limit=500')    ||[]).reduce(function(s,l){ return s+(l.clicks||0); },0);
        var sv = (await rest('profiles', 'select=profile_views&limit=500')||[]).reduce(function(s,u){ return s+(u.profile_views||0); },0);
        addConsoleLog('sys',  '── snapshot  ' + new Date().toLocaleTimeString('en-US',{hour12:false}) + '  ──────────────────');
        addConsoleLog('stat', 'users: ' + allUsers.length + '   links: ' + allLinks.length + '   clicks: ' + sc + '   views: ' + sv);
      } catch(e) {
        addConsoleLog('error', 'snapshot FAILED  →  ' + e.message);
      }
    }

  }, 15000); // 15-second cycle
}

// ── DRAWER ────────────────────────────────────────────────────────────────────
function openDrawer(uid) {
  currentDrawerUserId = uid;
  var u = allUsers.find(function(x){ return x.id===uid; });
  if (!u) return;
  var init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
  var av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
  var lc = allLinks.filter(function(l){ return l.user_id===uid; }).length;
  var tc = allLinks.filter(function(l){ return l.user_id===uid; }).reduce(function(s,l){ return s+(l.clicks||0); },0);
  var userSessions = allSessions.filter(function(s){ return s.user_id===uid; });

  document.getElementById('dr-body').innerHTML =
    '<div class="dr-av"><div class="dr-av-img">' + av + '</div>' +
    '<div><div class="dr-name">' + esc(u.full_name||'Unknown') + '</div><div class="dr-email">' + esc(u.email||'') + '</div></div></div>' +
    '<div class="ig">' +
      '<div class="ib"><label>Username</label><span>@' + (u.username||'—') + '</span></div>' +
      '<div class="ib"><label>Provider</label><span>' + (u.provider||'email') + '</span></div>' +
      '<div class="ib"><label>Links</label><span>' + lc + '</span></div>' +
      '<div class="ib"><label>Total Clicks</label><span>' + tc + '</span></div>' +
      '<div class="ib"><label>Profile Views</label><span>' + (u.profile_views||0) + '</span></div>' +
      '<div class="ib"><label>Theme</label><span>' + (u.theme||'dark') + '</span></div>' +
      '<div class="ib"><label>Joined</label><span>' + fd(u.created_at) + '</span></div>' +
      '<div class="ib"><label>Last Login</label><span>' + fd(u.last_sign_in) + '</span></div>' +
      '<div class="ib full"><label>User ID</label><span class="mono">' + u.id + '</span></div>' +
    '</div>' +
    '<div class="ds">Active Sessions (' + userSessions.length + ')</div>' +
    '<div class="al">' + (userSessions.length
      ? userSessions.map(function(s) {
          var isR = (Date.now()-new Date(s.last_seen).getTime())<10*60*1000;
          return '<div style="padding:9px 12px;background:var(--s2);border-radius:8px;margin-bottom:6px;font-size:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="color:' + (isR?'var(--green)':'var(--muted)') + '">● ' + (s.browser||'?') + ' / ' + (s.os||'?') + ' · ' + (s.device||'?') + '</span>' +
            '<button class="btn btn-d" onclick="killSessionFromDrawer(\'' + s.id + '\',this)" style="font-size:10px">Revoke</button></div>' +
            '<div style="color:var(--muted);margin-top:3px">Last seen ' + timeAgo(s.last_seen) + '</div>' +
          '</div>';
        }).join('')
      : '<div style="color:var(--muted);font-size:12px;padding:8px 0">No sessions found.</div>'
    ) + '</div>' +
    '<div class="ds">Actions</div>' +
    '<div class="al">' +
      '<button class="ab" onclick="openRenameModal()"><span class="ai">✏️</span><div><span class="at">Rename User</span><span class="ad">Change display name</span></div></button>' +
      '<button class="ab" onclick="openRecovery(\'' + u.id + '\')"><span class="ai">🔑</span><div><span class="at">Send Password Reset</span><span class="ad">Email a recovery link</span></div></button>' +
      '<a class="ab" href="' + SITE_URL + '/u/profile.html?u=' + (u.username||'') + '" target="_blank" onclick="event.stopPropagation()"><span class="ai">👁</span><div><span class="at">View Public Profile</span><span class="ad">Open in new tab</span></div></a>' +
      '<button class="ab danger" onclick="openDeleteModal(\'' + u.id + '\')"><span class="ai">🗑</span><div><span class="at" style="color:var(--red)">Delete All Data</span><span class="ad">Remove profile and links</span></div></button>' +
    '</div>';

  document.getElementById('dr-bg').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  addLog('👁 Viewed: ' + (u.full_name || u.email));
}

function closeDrawer() {
  document.getElementById('dr-bg').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

async function killSessionFromDrawer(id, btn) {
  btn.textContent = '...'; btn.disabled = true;
  await fetch(SUPABASE_URL + '/rest/v1/user_sessions?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: false })
  });
  addLog('🔐 Session revoked for ' + (currentDrawerUserId||'').slice(0,8));
  toast('Session revoked');
  await renderSessions();
  openDrawer(currentDrawerUserId);
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function cm(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }

function openRenameModal() {
  var u = allUsers.find(function(x){ return x.id===currentDrawerUserId; });
  if (!u) return;
  document.getElementById('m-rn-nm').value = u.full_name||'';
  document.getElementById('m-rn').classList.add('open');
}

function openRecovery(uid) {
  currentRecoveryUserId = uid;
  var u = allUsers.find(function(x){ return x.id===uid; });
  if (u) document.getElementById('m-pw-em').textContent = u.email;
  document.getElementById('m-pw').classList.add('open');
}

function openDeleteModal(uid) {
  currentDeleteUserId = uid;
  var u = allUsers.find(function(x){ return x.id===uid; });
  document.getElementById('m-del-nm').textContent = (u ? (u.full_name||u.email) : uid);
  document.getElementById('m-del').classList.add('open');
}

async function doSendRecovery() {
  var u = allUsers.find(function(x){ return x.id===currentRecoveryUserId; });
  if (!u) return;
  // Use supabase SDK for auth operations
  var sb2 = window._supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  var res = await sb2.auth.resetPasswordForEmail(u.email, { redirectTo: SITE_URL + '/dashboard.html' });
  cm('m-pw');
  if (res.error) { toast('Error: ' + res.error.message); addLog('❌ Recovery email failed for ' + u.email); }
  else { toast('Recovery email sent'); addLog('🔑 Sent recovery email to ' + u.email); }
}

async function doDeleteUser() {
  if (!currentDeleteUserId) return;
  var u = allUsers.find(function(x){ return x.id===currentDeleteUserId; });
  var name = u ? (u.full_name||u.email) : currentDeleteUserId;
  await fetch(SUPABASE_URL + '/rest/v1/links?user_id=eq.' + currentDeleteUserId, { method:'DELETE', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY} });
  await fetch(SUPABASE_URL + '/rest/v1/user_sessions?user_id=eq.' + currentDeleteUserId, { method:'DELETE', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY} });
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + currentDeleteUserId, { method:'DELETE', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY} });
  cm('m-del'); closeDrawer();
  addLog('🗑 Deleted all data for ' + name);
  toast('User data deleted');
  await loadAll();
}

async function doRenameUser() {
  var name = document.getElementById('m-rn-nm').value.trim();
  if (!name) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + currentDrawerUserId, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: name })
  });
  cm('m-rn');
  addLog('✏️ Renamed user to ' + name);
  toast('User renamed');
  await loadAll();
  openDrawer(currentDrawerUserId);
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
function addLog(msg) {
  actLog.unshift({ msg: msg, time: new Date().toISOString() });
  if (actLog.length > 200) actLog.length = 200;
  sessionStorage.setItem('Flarrd_admin_log', JSON.stringify(actLog));
}

function renderLog() {
  var el = document.getElementById('act-log');
  if (!el) return;
  if (!actLog.length) { el.innerHTML = '<div class="empty">No activity yet.</div>'; return; }
  el.innerHTML = actLog.map(function(l) {
    return '<div class="li"><div class="ld"></div><div><div class="lt">' + esc(l.msg) + '</div><div class="ltime">' + fdf(l.time) + '</div></div></div>';
  }).join('');
}

function clearLog() {
  actLog = []; sessionStorage.removeItem('Flarrd_admin_log'); renderLog(); toast('Log cleared');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); }, 2800);
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setText(id, val) { var el=document.getElementById(id); if(el) el.textContent=val; }
function fd(iso) { if(!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}); }
function fdf(iso) { if(!iso) return '—'; return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
function timeAgo(iso) {
  var diff = (Date.now()-new Date(iso).getTime())/1000;
  if (diff<60) return 'just now';
  if (diff<3600) return Math.floor(diff/60)+'m ago';
  if (diff<86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}
