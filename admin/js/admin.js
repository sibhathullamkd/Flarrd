// Flarrd ADMIN — Full Logic

var allUsers = [], allLinks = [];
var currentDrawerUserId = null, currentRecoveryUserId = null, currentDeleteUserId = null;
var actLog = JSON.parse(sessionStorage.getItem('Flarrd_admin_log') || '[]');

if (sessionStorage.getItem('Flarrd_admin') === '1') bootAdmin();

document.getElementById('ap').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
document.getElementById('au').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

function adminLogin() {
  var u = document.getElementById('au').value.trim();
  var p = document.getElementById('ap').value;
  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    sessionStorage.setItem('Flarrd_admin', '1');
    document.getElementById('l-err').classList.remove('show');
    bootAdmin();
  } else {
    document.getElementById('l-err').classList.add('show');
    addLog('⚠️ Failed login attempt');
    setTimeout(() => document.getElementById('l-err').classList.remove('show'), 3000);
  }
}

function adminLogout() {
  sessionStorage.removeItem('Flarrd_admin');
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
  const tick = () => { const el = document.getElementById('clock'); if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false }); };
  tick(); setInterval(tick, 1000);
}

function showSec(name, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  const titles = { overview: 'Dashboard', users: 'All Users', sessions: 'Sessions', links: 'All Links', activity: 'Activity Log', info: 'Info & Limits' };
  const t = document.getElementById('tb-title'); if (t) t.textContent = titles[name] || name;
  if (name === 'sessions') renderSessions();
  if (name === 'links') renderLinks(allLinks);
  if (name === 'activity') renderLog();
}

async function loadAll() {
  await Promise.all([loadUsers(), loadLinks()]);
  renderOverview(); renderUsersTable(allUsers);
}

async function loadUsers() {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  allUsers = data || [];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const newCount = allUsers.filter(u => new Date(u.created_at) > weekAgo).length;
  const googleCount = allUsers.filter(u => u.provider === 'google').length;
  const totalViews = allUsers.reduce((s, u) => s + (u.profile_views || 0), 0);
  setText('s-u', allUsers.length);
  setText('s-n', newCount);
  setText('s-g', googleCount);
  setText('s-v', totalViews);
}

async function loadLinks() {
  const { data } = await supabase.from('links').select('*').order('clicks', { ascending: false });
  allLinks = data || [];
  const totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);
  setText('s-l', allLinks.length);
  setText('s-c', totalClicks);
}

function userName(uid) { const u = allUsers.find(x => x.id === uid); return u ? (u.full_name || u.email || 'Unknown') : 'Unknown'; }
function userHandle(uid) { const u = allUsers.find(x => x.id === uid); return u ? ('@' + (u.username || '—')) : '—'; }

function renderOverview() {
  // Recent signups
  const tbody = document.getElementById('rec-tbody');
  const recent = allUsers.slice(0, 8);
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No users yet.</td></tr>'; }
  else {
    tbody.innerHTML = recent.map(u => {
      const init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
      const av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
      const lc = allLinks.filter(l => l.user_id === u.id).length;
      const tc = allLinks.filter(l => l.user_id === u.id).reduce((s, l) => s + (l.clicks || 0), 0);
      const prov = u.provider || 'email';
      return `<tr onclick="openDrawer('${u.id}')" >
        <td><div class="uc"><div class="uav">${av}</div><div><div style="font-weight:500">${esc(u.full_name||'Unknown')}</div><div style="font-size:10px;color:var(--muted)">${esc(u.email)}</div></div></div></td>
        <td style="color:var(--muted);font-size:11px">${u.username ? '@'+u.username : '—'}</td>
        <td><span class="badge ${prov==='google'?'bb':'bp'}">${prov}</span></td>
        <td style="color:var(--muted);font-size:11px">${fd(u.created_at)}</td>
        <td><span class="badge bb">${lc}</span></td>
        <td><span class="badge bg">${tc}</span></td>
      </tr>`;
    }).join('');
  }
  // Top links
  const tlTbody = document.getElementById('top-links-tbody');
  const topLinks = [...allLinks].sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,8);
  if (!topLinks.length) { tlTbody.innerHTML = '<tr><td colspan="4" class="empty">No links yet.</td></tr>'; }
  else {
    tlTbody.innerHTML = topLinks.map(l => `<tr>
      <td style="font-weight:500">${l.icon||'🔗'} ${esc(l.title)}</td>
      <td style="font-size:10px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</td>
      <td style="font-size:11px">${esc(userName(l.user_id))}</td>
      <td><span class="badge bg">${l.clicks||0}</span></td>
    </tr>`).join('');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('u-tbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">No users.</td></tr>'; return; }
  tbody.innerHTML = users.map(u => {
    const init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
    const av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
    const lc = allLinks.filter(l => l.user_id === u.id).length;
    const tc = allLinks.filter(l => l.user_id === u.id).reduce((s, l) => s + (l.clicks || 0), 0);
    const prov = u.provider || 'email';
    const lastLogin = u.last_sign_in ? fdf(u.last_sign_in) : '<span style="color:var(--muted)">Never</span>';
    return `<tr>
      <td><div class="uc"><div class="uav">${av}</div><div><div style="font-weight:500;font-size:12px">${esc(u.full_name||'Unknown')}</div><div style="font-size:10px;color:var(--muted);font-family:var(--fm)">${u.id.substring(0,10)}...</div></div></div></td>
      <td style="font-size:11px;color:var(--muted)">${u.username?'@'+u.username:'—'}</td>
      <td style="font-size:11px">${esc(u.email)}</td>
      <td><span class="badge ${prov==='google'?'bb':'bp'}">${prov}</span></td>
      <td style="color:var(--muted);font-size:11px">${fd(u.created_at)}</td>
      <td style="font-size:11px">${lastLogin}</td>
      <td><span class="badge bb">${lc}</span></td>
      <td><span class="badge bg">${tc}</span></td>
      <td><button class="btn" onclick="openDrawer('${u.id}')">Manage</button></td>
    </tr>`;
  }).join('');
}

function filterUsers(q) {
  const f = allUsers.filter(u => (u.email||'').toLowerCase().includes(q.toLowerCase()) || (u.full_name||'').toLowerCase().includes(q.toLowerCase()) || (u.username||'').toLowerCase().includes(q.toLowerCase()));
  renderUsersTable(f);
}

function renderSessions() {
  const tbody = document.getElementById('sess-tbody');
  if (!allUsers.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No users.</td></tr>'; return; }
  const now = new Date();
  const sorted = [...allUsers].sort((a,b) => {
    if (!a.last_sign_in && !b.last_sign_in) return 0;
    if (!a.last_sign_in) return 1; if (!b.last_sign_in) return -1;
    return new Date(b.last_sign_in) - new Date(a.last_sign_in);
  });
  tbody.innerHTML = sorted.map(u => {
    const init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
    const av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
    const ll = u.last_sign_in ? new Date(u.last_sign_in) : null;
    const isToday = ll && (now - ll) < 86400000;
    const isWeek = ll && (now - ll) < 604800000;
    const status = !ll ? '<span style="color:var(--muted);font-size:11px">Never</span>'
      : isToday ? '<span class="badge bg">🟢 Today</span>'
      : isWeek ? '<span class="badge bo">🟡 This week</span>'
      : '<span class="badge" style="color:var(--muted)">⚫ Inactive</span>';
    const prov = u.provider || 'email';
    return `<tr onclick="openDrawer('${u.id}')">
      <td><div class="uc"><div class="uav">${av}</div><span style="font-size:12px;font-weight:500">${esc(u.full_name||'Unknown')}</span></div></td>
      <td style="font-size:11px">${esc(u.email)}</td>
      <td><span class="badge ${prov==='google'?'bb':'bp'}">${prov}</span></td>
      <td style="color:var(--muted);font-size:11px">${fd(u.created_at)}</td>
      <td style="font-size:11px">${ll ? fdf(u.last_sign_in) : '—'}</td>
      <td>${status}</td>
      <td><button class="btn btn-g" onclick="event.stopPropagation();openRecovery('${u.id}')">Send Recovery</button></td>
    </tr>`;
  }).join('');
}

function renderLinks(links) {
  const tbody = document.getElementById('l-tbody');
  if (!links.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No links.</td></tr>'; return; }
  tbody.innerHTML = links.map(l => {
    const owner = userName(l.user_id);
    return `<tr>
      <td style="font-weight:500">${l.icon||'🔗'} ${esc(l.title)}</td>
      <td style="font-size:10px;color:var(--muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="${esc(l.url)}" target="_blank" style="color:var(--blue)">${esc(l.url)}</a></td>
      <td style="font-size:11px">${esc(owner)}</td>
      <td><span class="badge bb">${l.category||'general'}</span></td>
      <td><span class="badge bg">${l.clicks||0}</span></td>
      <td><span class="badge ${l.active!==false?'bg':'br'}">${l.active!==false?'Active':'Off'}</span></td>
      <td><button class="btn btn-d" onclick="adminDeleteLink('${l.id}')">Delete</button></td>
    </tr>`;
  }).join('');
}

function filterLinks(q) {
  const f = allLinks.filter(l => (l.title||'').toLowerCase().includes(q.toLowerCase()) || (l.url||'').toLowerCase().includes(q.toLowerCase()));
  renderLinks(f);
}

async function adminDeleteLink(id) {
  if (!confirm('Delete this link?')) return;
  await supabase.from('links').delete().eq('id', id);
  addLog('🗑 Deleted link: ' + id.substring(0,8));
  toast('Link deleted');
  await loadLinks(); renderLinks(allLinks);
}

function openDrawer(userId) {
  currentDrawerUserId = userId;
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;
  const init = (u.full_name || u.email || '?').charAt(0).toUpperCase();
  const av = u.avatar_url ? '<img src="' + u.avatar_url + '"/>' : init;
  const lc = allLinks.filter(l => l.user_id === u.id).length;
  const tc = allLinks.filter(l => l.user_id === u.id).reduce((s,l)=>s+(l.clicks||0),0);
  const userLinks = allLinks.filter(l => l.user_id === u.id).sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,6);
  const prov = u.provider || 'email';

  document.getElementById('dr-body').innerHTML = `
    <div class="dr-av">
      <div class="dr-av-img">${av}</div>
      <div><div class="dr-name">${esc(u.full_name||'Unknown')}</div>
      <div class="dr-email">${esc(u.email)}</div>
      <div style="margin-top:4px"><span class="badge ${prov==='google'?'bb':'bp'}">${prov}</span></div></div>
    </div>
    <div class="ig">
      <div class="ib full"><label>User ID</label><span class="mono">${u.id}</span></div>
      <div class="ib"><label>Username</label><span>${u.username?'@'+u.username:'—'}</span></div>
      <div class="ib"><label>Email</label><span>${esc(u.email)}</span></div>
      <div class="ib"><label>Sign-in</label><span>${prov}</span></div>
      <div class="ib"><label>Joined</label><span>${fdf(u.created_at)}</span></div>
      <div class="ib"><label>Last Login</label><span>${u.last_sign_in?fdf(u.last_sign_in):'Never'}</span></div>
      <div class="ib"><label>Links</label><span>${lc}</span></div>
      <div class="ib"><label>Total Clicks</label><span>${tc}</span></div>
      <div class="ib"><label>Profile Views</label><span>${u.profile_views||0}</span></div>
      <div class="ib"><label>Theme</label><span>${u.theme||'dark'}</span></div>
    </div>
    <div class="ds">Admin Actions</div>
    <div class="al">
      <button class="ab" onclick="openRecovery('${u.id}')">
        <span class="ai">📧</span><span><span class="at">Send Password Recovery</span><span class="ad">Email reset link to ${esc(u.email)}</span></span></button>
      <button class="ab" onclick="toggleRenameForm()">
        <span class="ai">✏️</span><span><span class="at">Change Display Name</span><span class="ad">Update user's name</span></span></button>
      <div class="ri-wrap" id="ri-wrap">
        <input id="ri-inp" placeholder="New display name" value="${esc(u.full_name||'')}"/>
        <button class="btn btn-p" onclick="doRename('${u.id}')">Save Name</button>
      </div>
      <button class="ab" onclick="viewPublicProfile('${u.username}')">
        <span class="ai">👁</span><span><span class="at">View Public Profile</span><span class="ad">Open ${u.username?'@'+u.username:'their'} profile page</span></span></button>
      <button class="ab danger" onclick="openDeleteModal('${u.id}')">
        <span class="ai">🗑</span><span><span class="at">Delete All Data</span><span class="ad">Remove profile + all links</span></span></button>
    </div>
    <div class="ds">Top Links (${lc} total)</div>
    ${userLinks.length ? userLinks.map(l=>`
      <div class="udm">
        <span>${l.icon||'🔗'} ${esc(l.title)}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--acc2);font-size:10px">👆${l.clicks||0}</span>
          <button class="btn btn-d" style="padding:2px 7px;font-size:10px" onclick="adminDeleteLink('${l.id}')">×</button>
        </div>
      </div>`).join('') : '<div style="color:var(--muted);font-size:11px;padding:6px 0">No links yet</div>'}
  `;

  document.getElementById('dr-bg').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  addLog('👁 Viewed: ' + (u.full_name || u.email));
}

function closeDrawer() {
  document.getElementById('dr-bg').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

function toggleRenameForm() {
  const el = document.getElementById('ri-wrap');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function doRename(userId) {
  const inp = document.getElementById('ri-inp');
  const name = inp ? inp.value.trim() : '';
  if (!name) { toast('Enter a name'); return; }
  const u = allUsers.find(x => x.id === userId);
  await supabase.from('profiles').update({ full_name: name }).eq('id', userId);
  addLog('✏️ Renamed ' + (u?.email||userId) + ' → ' + name);
  toast('Name updated ✓');
  await loadUsers(); renderUsersTable(allUsers); openDrawer(userId);
}

function viewPublicProfile(username) {
  if (!username) { toast('User has no username set'); return; }
  window.open(SITE_URL + '/u/profile.html?u=' + username, '_blank');
}

function openRecovery(userId) {
  currentRecoveryUserId = userId;
  const u = allUsers.find(x => x.id === userId);
  if (u) document.getElementById('m-pw-em').textContent = u.email;
  document.getElementById('m-pw').classList.add('open');
}

async function doSendRecovery() {
  const u = allUsers.find(x => x.id === currentRecoveryUserId);
  if (!u) return;
  const res = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: SITE_URL + '/' });
  if (res.error) { toast('Error: ' + res.error.message); }
  else { addLog('📧 Recovery email → ' + u.email); toast('Recovery email sent ✓'); }
  cm('m-pw');
}

function openDeleteModal(userId) {
  currentDeleteUserId = userId;
  const u = allUsers.find(x => x.id === userId);
  document.getElementById('m-del-nm').textContent = (u?.full_name || u?.email || userId);
  document.getElementById('m-del').classList.add('open');
}

async function doDeleteUser() {
  const u = allUsers.find(x => x.id === currentDeleteUserId);
  const name = u ? (u.full_name || u.email) : currentDeleteUserId;
  await Promise.all([
    supabase.from('links').delete().eq('user_id', currentDeleteUserId),
    supabase.from('profiles').delete().eq('id', currentDeleteUserId)
  ]);
  addLog('❌ Deleted account: ' + name);
  toast('Account deleted. Remove auth from Supabase Dashboard too.');
  cm('m-del'); closeDrawer(); await loadAll();
}

function cm(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

function addLog(msg) {
  actLog.unshift({ msg, time: new Date().toISOString() });
  if (actLog.length > 200) actLog.length = 200;
  sessionStorage.setItem('Flarrd_admin_log', JSON.stringify(actLog));
}

function renderLog() {
  const el = document.getElementById('act-log');
  if (!el) return;
  if (!actLog.length) { el.innerHTML = '<div class="empty">No activity yet.</div>'; return; }
  el.innerHTML = actLog.map(l => `
    <div class="li">
      <div class="ld"></div>
      <div><div class="lt">${esc(l.msg)}</div><div class="ltime">${fdf(l.time)}</div></div>
    </div>`).join('');
}

function clearLog() {
  if (!confirm('Clear log?')) return;
  actLog = []; sessionStorage.removeItem('Flarrd_admin_log'); renderLog(); toast('Log cleared');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fd(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function fdf(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
