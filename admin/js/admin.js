// ── Flarrd Admin JS — Full Enhanced Version ──────────────────────────────────
var SUPABASE_URL = 'https://ftnykcpmtwusryrivvwe.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_Z3RDyV6ZIwZ09EhfHMjZrA_WfXOI1KF';

var allUsers = [], allLinks = [], allSessions = [];
var currentDrawerUserId = null, confirmCallback = null;
var actLog = JSON.parse(sessionStorage.getItem('flarrd_admin_log') || '[]');
var liveInterval = null, consoleInterval = null;
var _sb = null;

function getSb() {
  if (!_sb) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{persistSession:false}});
  return _sb;
}
var sb;

// REST helper for anon reads
async function rest(table, query) {
  var r = await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+query, {
    headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Accept':'application/json'}
  });
  return r.ok ? r.json() : [];
}

if (sessionStorage.getItem('flarrd_admin') === '1') bootAdmin();

document.getElementById('ap').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
document.getElementById('au').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

function adminLogin() {
  var u = document.getElementById('au').value.trim();
  var p = document.getElementById('ap').value;
  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    sessionStorage.setItem('flarrd_admin', '1');
    document.getElementById('l-err').classList.remove('show');
    bootAdmin();
  } else {
    document.getElementById('l-err').classList.add('show');
    addLog('⚠️ Failed login attempt from browser');
    setTimeout(() => document.getElementById('l-err').classList.remove('show'), 3000);
  }
}

function adminLogout() {
  sessionStorage.removeItem('flarrd_admin');
  clearInterval(liveInterval); clearInterval(consoleInterval);
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('au').value = ''; document.getElementById('ap').value = '';
}

function bootAdmin() {
  sb = getSb();
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  startClock(); loadAll(); addLog('✅ Admin signed in'); renderLog();
}

function startClock() {
  const tick = () => { const el = document.getElementById('clock'); if (el) el.textContent = new Date().toLocaleTimeString(); };
  tick(); setInterval(tick, 1000);
}

function showSec(name, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  const titles = {overview:'Dashboard',users:'All Users',sessions:'Sessions',links:'All Links',live:'Live Visitors',analytics:'Analytics',console:'Live Console',activity:'Activity Log',info:'Info'};
  setText('tb-title', titles[name] || name);
  clearInterval(liveInterval); clearInterval(consoleInterval);
  if (name === 'live') startLivePolling();
  if (name === 'console') startConsolePolling();
  if (name === 'sessions') renderSessions();
  if (name === 'analytics') renderAnalyticsGraphs();
  if (name === 'links') renderLinks(allLinks);
  if (name === 'activity') renderLog();
}

async function loadAll() {
  await Promise.all([loadUsers(), loadAdminLinks()]);
  renderOverview(); renderUsersTable(allUsers);
}

async function loadUsers() {
  var data = await rest('profiles', 'order=created_at.desc');
  allUsers = data || [];
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  var newCount = allUsers.filter(u => new Date(u.created_at) > weekAgo).length;
  var googleCount = allUsers.filter(u => u.provider === 'google').length;
  var totalViews = allUsers.reduce((s, u) => s + (u.profile_views || 0), 0);
  setText('s-u', allUsers.length); setText('s-n', newCount); setText('s-g', googleCount); setText('s-v', totalViews);
}

async function loadAdminLinks() {
  var data = await rest('links', 'order=clicks.desc');
  allLinks = data || [];
  var totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);
  setText('s-l', allLinks.length); setText('s-c', totalClicks);
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function renderOverview() {
  const tbody = document.getElementById('rec-tbody');
  const recent = allUsers.slice(0, 10);
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No users yet.</td></tr>'; }
  else {
    tbody.innerHTML = recent.map(u => {
      var init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
      var av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
      var lc = allLinks.filter(l => l.user_id === u.id).length;
      var tc = allLinks.filter(l => l.user_id === u.id).reduce((s, l) => s + (l.clicks || 0), 0);
      return `<tr onclick="openDrawer('${u.id}')">
        <td><div class="uc"><div class="uav">${av}</div><div><div style="font-weight:500">${esc(u.full_name||'Unknown')}</div><div style="font-size:10px;color:var(--muted)">${esc(u.email||'')}</div></div></div></td>
        <td style="color:var(--muted);font-size:11px">${u.username ? '@'+u.username : '—'}</td>
        <td><span class="badge ${u.provider==='google'?'bb':'bg'}">${u.provider||'email'}</span></td>
        <td style="font-size:11px;color:var(--muted)">${fmtDate(u.created_at)}</td>
        <td>${lc}</td><td style="color:var(--acc2)">${tc}</td>
      </tr>`;
    }).join('');
  }
  // Top links
  const ltbody = document.getElementById('top-links-tbody');
  const topLinks = allLinks.slice(0, 10);
  if (!topLinks.length) { ltbody.innerHTML = '<tr><td colspan="4" class="empty">No links yet.</td></tr>'; }
  else {
    ltbody.innerHTML = topLinks.map(l => {
      var owner = allUsers.find(u => u.id === l.user_id);
      return `<tr>
        <td>${esc(l.title)}</td>
        <td style="font-size:11px;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</td>
        <td style="font-size:11px">${owner ? esc(owner.full_name||owner.email) : '—'}</td>
        <td style="color:var(--acc2)">${l.clicks||0}</td>
      </tr>`;
    }).join('');
  }
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function renderUsersTable(users) {
  const tbody = document.getElementById('u-tbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">No users.</td></tr>'; return; }
  tbody.innerHTML = users.map(u => {
    var init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
    var av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
    var lc = allLinks.filter(l => l.user_id === u.id).length;
    var tc = allLinks.filter(l => l.user_id === u.id).reduce((s, l) => s + (l.clicks || 0), 0);
    return `<tr onclick="openDrawer('${u.id}')">
      <td><div class="uc"><div class="uav">${av}</div><div><div style="font-weight:500">${esc(u.full_name||'Unknown')}</div></div></div></td>
      <td style="font-size:11px;color:var(--muted)">${u.username ? '@'+u.username : '—'}</td>
      <td style="font-size:11px">${esc(u.email||'')}</td>
      <td><span class="badge ${u.provider==='google'?'bb':'bg'}">${u.provider||'email'}</span></td>
      <td style="font-size:11px;color:var(--muted)">${fmtDate(u.created_at)}</td>
      <td style="font-size:11px;color:var(--muted)">${fmtDate(u.last_sign_in)}</td>
      <td>${lc}</td>
      <td style="color:var(--acc2)">${tc}</td>
      <td><button class="btn btn-p" onclick="event.stopPropagation();openDrawer('${u.id}')">Details</button></td>
    </tr>`;
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
  const tbody = document.getElementById('sess-tbody');
  if (!allSessions.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">No sessions found.</td></tr>'; return; }
  var now = Date.now();
  tbody.innerHTML = allSessions.map(s => {
    var user = allUsers.find(u => u.id === s.user_id);
    var isRecent = (now - new Date(s.last_seen).getTime()) < 10 * 60 * 1000;
    return `<tr>
      <td>${user ? esc(user.full_name||user.email||'Unknown') : 'Unknown'}</td>
      <td style="font-size:11px;color:var(--muted)">${user ? esc(user.email||'') : ''}</td>
      <td style="font-size:11px">${esc(s.browser||'?')} / ${esc(s.os||'?')}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(s.device||'?')}</td>
      <td style="font-size:11px;color:var(--muted)">${fmtDate(s.created_at)}</td>
      <td style="font-size:11px;color:var(--muted)">${timeAgo(s.last_seen)}</td>
      <td><span class="badge ${isRecent ? 'bg' : ''}" style="${!isRecent ? 'background:rgba(107,107,138,0.1);color:var(--muted)' : ''}">${isRecent ? 'Active' : 'Inactive'}</span></td>
      <td><button class="btn btn-d" onclick="killAdminSession('${s.id}',this)">Revoke</button></td>
    </tr>`;
  }).join('');
}

async function killAdminSession(id, btn) {
  btn.textContent = '...'; btn.disabled = true;
  await sb.from('user_sessions').update({ is_active: false }).eq('id', id);
  addLog('🔐 Admin revoked session ' + id.slice(0,8));
  toast('Session revoked');
  await renderSessions();
}

// ── LINKS ─────────────────────────────────────────────────────────────────────
function renderLinks(links) {
  const tbody = document.getElementById('l-tbody');
  if (!links.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No links.</td></tr>'; return; }
  tbody.innerHTML = links.map(l => {
    var owner = allUsers.find(u => u.id === l.user_id);
    return `<tr>
      <td style="font-weight:500">${esc(l.title)}</td>
      <td style="font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</td>
      <td style="font-size:11px">${owner ? esc(owner.full_name||owner.email) : '—'}</td>
      <td><span class="badge bp">${l.category||'general'}</span></td>
      <td style="color:var(--acc2)">${l.clicks||0}</td>
      <td><span class="badge ${l.active!==false?'bg':'br'}">${l.active!==false?'Active':'Hidden'}</span></td>
      <td><button class="btn btn-d" onclick="adminDeleteLink('${l.id}',this)">Delete</button></td>
    </tr>`;
  }).join('');
}

function filterLinks(q) {
  var f = allLinks.filter(l => (l.title||'').toLowerCase().includes(q.toLowerCase()) || (l.url||'').toLowerCase().includes(q.toLowerCase()));
  renderLinks(f);
}

async function adminDeleteLink(id, btn) {
  if (!confirm('Delete this link?')) return;
  btn.textContent = '...'; btn.disabled = true;
  await sb.from('links').delete().eq('id', id);
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
  // Clean old presence (>3min)
  var cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await sb.from('live_presence').delete().lt('last_seen', cutoff);

  var data = await rest('live_presence', 'order=last_seen.desc&limit=50');
  data = data || [];
  setText('live-count', data.length);

  const el = document.getElementById('live-list');
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<div class="empty" style="padding:32px">No active visitors right now.</div>';
    return;
  }
  el.innerHTML = data.map(p => {
    var ago = timeAgo(p.last_seen);
    var ua = p.user_agent || '';
    var browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
    var os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'Mac' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Unknown';
    return `<div class="live-row">
      <div class="live-dot"></div>
      <div class="live-info">
        <div class="live-page">📄 ${esc(p.page || p.profile_username || 'Unknown page')}</div>
        <div class="live-meta">${browser} · ${os} · ${ago}</div>
      </div>
      <div class="live-id">${esc((p.visitor_id||'').slice(0,8))}</div>
    </div>`;
  }).join('');
}

// ── ANALYTICS GRAPHS ──────────────────────────────────────────────────────────
async function renderAnalyticsGraphs() {
  // Total users over time (by created_at month)
  var byMonth = {};
  allUsers.forEach(u => {
    var mo = (u.created_at||'').slice(0,7);
    if (mo) byMonth[mo] = (byMonth[mo]||0)+1;
  });
  var months = Object.keys(byMonth).sort().slice(-7);
  var maxU = Math.max(...months.map(m => byMonth[m]), 1);

  const usersChart = document.getElementById('users-chart');
  if (usersChart) {
    usersChart.innerHTML = '<div class="chart-bars">' + months.map(m => {
      var h = Math.round((byMonth[m] / maxU) * 100);
      var label = m.slice(5); // MM
      return `<div class="chart-bar-col">
        <div class="chart-bar" style="height:${Math.max(h,2)}%"></div>
        <div class="chart-bar-lbl">${label}</div>
      </div>`;
    }).join('') + '</div>';
  }

  // Click distribution
  var byUser = {};
  allLinks.forEach(l => { byUser[l.user_id] = (byUser[l.user_id]||0) + (l.clicks||0); });
  var topUsers = Object.entries(byUser).sort((a,b) => b[1]-a[1]).slice(0,8);
  var maxC = Math.max(...topUsers.map(([,c]) => c), 1);
  const clicksChart = document.getElementById('clicks-chart');
  if (clicksChart) {
    clicksChart.innerHTML = '<div class="chart-bars">' + topUsers.map(([uid, c]) => {
      var user = allUsers.find(u => u.id === uid);
      var label = user ? (user.username || user.full_name || 'User').slice(0,6) : 'User';
      var h = Math.round((c/maxC)*100);
      return `<div class="chart-bar-col">
        <div class="chart-bar" style="height:${Math.max(h,2)}%;background:linear-gradient(180deg,var(--green),rgba(16,185,129,0.3))"></div>
        <div class="chart-bar-lbl">${esc(label)}</div>
      </div>`;
    }).join('') + '</div>';
  }

  // Summary stats
  setText('an-total-users', allUsers.length);
  setText('an-total-links', allLinks.length);
  setText('an-total-clicks', allLinks.reduce((s,l)=>s+(l.clicks||0),0));
  setText('an-total-views', allUsers.reduce((s,u)=>s+(u.profile_views||0),0));
}

// ── LIVE CONSOLE ──────────────────────────────────────────────────────────────
var consoleLogs = [];
function startConsolePolling() {
  addConsoleLog('info', 'Console connected');
  addConsoleLog('info', 'Total users: ' + allUsers.length);
  addConsoleLog('info', 'Total links: ' + allLinks.length);
  addConsoleLog('info', 'Total clicks: ' + allLinks.reduce((s,l)=>s+(l.clicks||0),0));
  renderConsole();
  consoleInterval = setInterval(async () => {
    var presence = await rest('live_presence', 'order=last_seen.desc&limit=5');
    addConsoleLog('event', 'Live visitors: ' + (presence||[]).length);
    renderConsole();
  }, 15000);
}

function addConsoleLog(type, msg) {
  consoleLogs.unshift({ time: new Date().toLocaleTimeString(), type, msg });
  if (consoleLogs.length > 200) consoleLogs.pop();
}

function renderConsole() {
  const el = document.getElementById('console-output');
  if (!el) return;
  const colors = { info:'#88c0d0', event:'#10b981', warn:'#f97316', error:'#ef4444' };
  el.innerHTML = consoleLogs.map(l =>
    `<div class="console-line"><span class="console-time">${l.time}</span><span class="console-type" style="color:${colors[l.type]||'#aaa'}">[${l.type.toUpperCase()}]</span><span class="console-msg">${esc(l.msg)}</span></div>`
  ).join('');
}

function clearConsole() { consoleLogs = []; renderConsole(); }

// ── DRAWER ────────────────────────────────────────────────────────────────────
function openDrawer(uid) {
  currentDrawerUserId = uid;
  var u = allUsers.find(x => x.id === uid);
  if (!u) return;
  var init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
  var av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
  var lc = allLinks.filter(l => l.user_id === uid).length;
  var tc = allLinks.filter(l => l.user_id === uid).reduce((s,l)=>s+(l.clicks||0),0);
  var userSessions = allSessions.filter(s => s.user_id === uid);

  document.getElementById('dr-body').innerHTML = `
    <div class="dr-av">
      <div class="dr-av-img">${av}</div>
      <div><div class="dr-name">${esc(u.full_name||'Unknown')}</div><div class="dr-email">${esc(u.email||'')}</div></div>
    </div>
    <div class="ig">
      <div class="ib"><label>Username</label><span>@${u.username||'—'}</span></div>
      <div class="ib"><label>Provider</label><span>${u.provider||'email'}</span></div>
      <div class="ib"><label>Links</label><span>${lc}</span></div>
      <div class="ib"><label>Total Clicks</label><span>${tc}</span></div>
      <div class="ib"><label>Profile Views</label><span>${u.profile_views||0}</span></div>
      <div class="ib"><label>Theme</label><span>${u.theme||'dark'}</span></div>
      <div class="ib"><label>Joined</label><span>${fmtDate(u.created_at)}</span></div>
      <div class="ib"><label>Last Login</label><span>${fmtDate(u.last_sign_in)}</span></div>
      <div class="ib full"><label>User ID</label><span class="mono">${u.id}</span></div>
    </div>
    <div class="ds">Active Sessions (${userSessions.length})</div>
    <div class="al">
      ${userSessions.length ? userSessions.map(s => {
        var isRecent = (Date.now() - new Date(s.last_seen).getTime()) < 10*60*1000;
        return `<div style="padding:9px 12px;background:var(--s2);border-radius:8px;margin-bottom:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:${isRecent?'var(--green)':'var(--muted)'}">● ${s.browser} / ${s.os} · ${s.device}</span>
            <button class="btn btn-d" onclick="killAdminSessionDrawer('${s.id}',this)" style="font-size:10px">Revoke</button>
          </div>
          <div style="color:var(--muted);margin-top:3px">Last seen ${timeAgo(s.last_seen)}</div>
        </div>`;
      }).join('') : '<div style="color:var(--muted);font-size:12px;padding:8px 0">No sessions found.</div>'}
    </div>
    <div class="ds">Actions</div>
    <div class="al">
      <button class="ab" onclick="openRenameModal()"><span class="ai">✏️</span><div><span class="at">Rename User</span><span class="ad">Change display name</span></div></button>
      <button class="ab" onclick="openPwModal()"><span class="ai">🔑</span><div><span class="at">Send Password Reset</span><span class="ad">Email a recovery link</span></div></button>
      <a class="ab" href="${SITE_URL}/u/profile.html?u=${u.username}" target="_blank" onclick="event.stopPropagation()"><span class="ai">👁</span><div><span class="at">View Public Profile</span><span class="ad">Open in new tab</span></div></a>
      <button class="ab danger" onclick="openDelModal()"><span class="ai">🗑</span><div><span class="at" style="color:var(--red)">Delete All Data</span><span class="ad">Remove profile and links</span></div></button>
    </div>`;

  document.getElementById('dr-bg').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('dr-bg').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
  // reload sessions
  if (document.getElementById('sec-sessions')?.classList.contains('active')) renderSessions();
}

async function killAdminSessionDrawer(id, btn) {
  btn.textContent = '...'; btn.disabled = true;
  await sb.from('user_sessions').update({ is_active: false }).eq('id', id);
  addLog('🔐 Session revoked for user ' + (currentDrawerUserId||'').slice(0,8));
  toast('Session revoked');
  await renderSessions();
  openDrawer(currentDrawerUserId); // refresh drawer
}

var SITE_URL = 'https://flarrd.pages.dev';

// ── MODALS ────────────────────────────────────────────────────────────────────
function cm(id) { document.getElementById(id).classList.remove('open'); }
function openPwModal() { var u = allUsers.find(x=>x.id===currentDrawerUserId); if(!u) return; document.getElementById('m-pw-em').textContent=u.email; document.getElementById('m-pw').classList.add('open'); }
function openDelModal() { var u = allUsers.find(x=>x.id===currentDrawerUserId); if(!u) return; document.getElementById('m-del-nm').textContent=u.full_name||u.email; document.getElementById('m-del').classList.add('open'); }
function openRenameModal() { var u = allUsers.find(x=>x.id===currentDrawerUserId); if(!u) return; document.getElementById('m-rn-nm').value=u.full_name||''; document.getElementById('m-rn').classList.add('open'); }

async function doSendRecovery() {
  var u = allUsers.find(x => x.id === currentDrawerUserId);
  if (!u) return;
  const { error } = await sb.auth.resetPasswordForEmail(u.email, { redirectTo: SITE_URL + '/dashboard.html' });
  cm('m-pw');
  if (error) { toast('Error: ' + error.message); addLog('❌ Recovery email failed for ' + u.email); }
  else { toast('Recovery email sent'); addLog('🔑 Sent recovery email to ' + u.email); }
}

async function doDeleteUser() {
  if (!currentDrawerUserId) return;
  var u = allUsers.find(x=>x.id===currentDrawerUserId);
  await sb.from('links').delete().eq('user_id', currentDrawerUserId);
  await sb.from('profiles').delete().eq('id', currentDrawerUserId);
  await sb.from('user_sessions').delete().eq('user_id', currentDrawerUserId);
  cm('m-del'); closeDrawer();
  addLog('🗑 Deleted all data for ' + (u?.email||currentDrawerUserId));
  toast('User data deleted');
  await loadAll();
}

async function doRenameUser() {
  var name = document.getElementById('m-rn-nm').value.trim();
  if (!name) return;
  await sb.from('profiles').update({ full_name: name }).eq('id', currentDrawerUserId);
  cm('m-rn');
  addLog('✏️ Renamed user ' + currentDrawerUserId.slice(0,8) + ' to ' + name);
  toast('User renamed');
  await loadAll();
  openDrawer(currentDrawerUserId);
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
function addLog(msg) {
  actLog.unshift({ t: new Date().toLocaleTimeString(), m: msg });
  if (actLog.length > 100) actLog.pop();
  sessionStorage.setItem('flarrd_admin_log', JSON.stringify(actLog));
}
function renderLog() {
  const el = document.getElementById('act-log');
  if (!el) return;
  if (!actLog.length) { el.innerHTML = '<div class="empty">No activity yet.</div>'; return; }
  el.innerHTML = actLog.map(l => `<div class="li"><div class="ld"></div><div><div class="lt">${esc(l.m)}</div><div class="ltime">${l.t}</div></div></div>`).join('');
}
function clearLog() { actLog = []; sessionStorage.removeItem('flarrd_admin_log'); renderLog(); }

// ── HELPERS ───────────────────────────────────────────────────────────────────
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'2-digit'}); }
function timeAgo(iso) {
  var diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60)+'m ago';
  if (diff < 86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}
