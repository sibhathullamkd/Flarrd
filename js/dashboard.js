// Flarrd DASHBOARD

var currentUser = null, profile = null, allLinks = [], selectedTheme = 'dark';

const THEMES = [
  { id:'dark', name:'Dark Night', bg:'#07070f', card:'#0f0f1a', accent:'#7c3aed', text:'#f0f0fa', btnBg:'#7c3aed', btnText:'#fff' },
  { id:'light', name:'Clean Light', bg:'#f8f8ff', card:'#ffffff', accent:'#7c3aed', text:'#1a1a2e', btnBg:'#7c3aed', btnText:'#fff' },
  { id:'midnight', name:'Midnight Blue', bg:'#0a0e27', card:'#111535', accent:'#3b82f6', text:'#e2e8f0', btnBg:'#3b82f6', btnText:'#fff' },
  { id:'rose', name:'Rose Garden', bg:'#0f0709', card:'#1a0d12', accent:'#ec4899', text:'#fce7f3', btnBg:'#ec4899', btnText:'#fff' },
  { id:'forest', name:'Forest', bg:'#040d06', card:'#0a1a0d', accent:'#10b981', text:'#d1fae5', btnBg:'#10b981', btnText:'#fff' },
  { id:'sunset', name:'Sunset', bg:'#0f0800', card:'#1a1000', accent:'#f97316', text:'#fff7ed', btnBg:'#f97316', btnText:'#fff' },
  { id:'nord', name:'Nord', bg:'#2e3440', card:'#3b4252', accent:'#88c0d0', text:'#eceff4', btnBg:'#88c0d0', btnText:'#2e3440' },
  { id:'candy', name:'Candy', bg:'#1a0a1a', card:'#2d1432', accent:'#c084fc', text:'#fdf4ff', btnBg:'linear-gradient(135deg,#c084fc,#ec4899)', btnText:'#fff' }
];

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;
  await loadProfile();
  await loadLinks();
  initUI();
  renderThemes();
})();

async function loadProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  profile = data || {};
  selectedTheme = profile.theme || 'dark';
  updateSidebarUser();
  fillProfileForm();
  fillAccountForm();
  updateOverview();
}

async function loadLinks() {
  const { data } = await supabase.from('links').select('*').eq('user_id', currentUser.id).order('position', { ascending: true });
  allLinks = data || [];
  renderLinks();
  renderOverviewLinks();
  renderAnalytics();
  updateStats();
}

function updateSidebarUser() {
  const name = profile.full_name || currentUser.email.split('@')[0];
  document.getElementById('s-name').textContent = name;
  document.getElementById('s-handle').textContent = '@' + (profile.username || '...');
  const av = document.getElementById('s-avatar');
  if (profile.avatar_url) { av.innerHTML = '<img src="'+profile.avatar_url+'" alt="avatar"/>'; }
  else { av.textContent = name.charAt(0).toUpperCase(); }
  const hour = new Date().getHours();
  const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = g + ', ' + name.split(' ')[0] + '! 👋';
  const profileUrl = SITE_URL + '/u/profile.html?u=' + (profile.username || '');
  document.getElementById('view-profile-btn').href = profileUrl;
  const plb = document.getElementById('preview-link-btn');
  if (plb) plb.href = profileUrl;
}

function fillProfileForm() {
  document.getElementById('p-name').value = profile.full_name || '';
  document.getElementById('p-username').value = profile.username || '';
  document.getElementById('p-bio').value = profile.bio || '';
  document.getElementById('p-location').value = profile.location || '';
  document.getElementById('p-website').value = profile.website || '';
  document.getElementById('quick-bio').value = profile.bio || '';
  renderProfilePreview();
}

function fillAccountForm() {
  document.getElementById('acc-name').value = profile.full_name || '';
  document.getElementById('acc-email').value = profile.email || currentUser.email;
}

function updateStats() {
  const totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);
  document.getElementById('stat-links').textContent = allLinks.length;
  document.getElementById('stat-clicks').textContent = totalClicks;
  document.getElementById('stat-views').textContent = profile.profile_views || 0;
  const top = allLinks.sort((a,b) => (b.clicks||0) - (a.clicks||0))[0];
  document.getElementById('stat-top').textContent = top ? (top.title.substring(0,10) + (top.title.length>10?'...':'')) : '—';
  document.getElementById('an-clicks').textContent = totalClicks;
  document.getElementById('an-links').textContent = allLinks.filter(l=>l.active!==false).length;
  document.getElementById('an-today').textContent = profile.clicks_today || 0;
}

function updateOverview() {
  const url = SITE_URL + '/u/profile.html?u=' + (profile.username || '');
  document.getElementById('view-profile-btn').href = url;
}

// ── NAVIGATION ──
function showTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.s-item').forEach(i => i.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  else { const b = document.querySelector('[onclick*="\''+name+'\'"]'); if (b) b.classList.add('active'); }
  if (name === 'profile') renderProfilePreview();
  if (name === 'analytics') renderAnalytics();
  if (window.innerWidth <= 700) { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

function initUI() {
  document.querySelector('[onclick*="overview"]')?.classList.add('active');
}

// ── LINKS ──
function renderLinks() {
  const el = document.getElementById('links-list');
  if (!allLinks.length) {
    el.innerHTML = '<div class="empty-links">No links yet.<br>Click "+ Add Link" to get started.</div>';
    return;
  }
  el.innerHTML = allLinks.map(l => `
    <div class="link-item ${l.active===false?'inactive':''}" id="link-${l.id}">
      <div class="drag-handle">⠿</div>
      <div class="link-icon-box">${l.icon||'🔗'}</div>
      <div class="link-info">
        <div class="link-title">${esc(l.title)}</div>
        <div class="link-url">${esc(l.url)}</div>
      </div>
      <div class="link-clicks">👆 ${l.clicks||0}</div>
      <div class="link-actions">
        <button class="link-btn" onclick="toggleLink('${l.id}',${l.active!==false})" title="${l.active===false?'Enable':'Disable'}">${l.active===false?'🔴':'🟢'}</button>
        <button class="link-btn" onclick="editLink('${l.id}')" title="Edit">✏️</button>
        <button class="link-btn del" onclick="deleteLink('${l.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

function renderOverviewLinks() {
  const el = document.getElementById('overview-links');
  if (!allLinks.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0">No links yet.</div>'; return; }
  const active = allLinks.filter(l => l.active !== false).slice(0, 5);
  el.innerHTML = active.map(l => `
    <div class="ov-link">
      <span class="ov-link-icon">${l.icon||'🔗'}</span>
      <span class="ov-link-title">${esc(l.title)}</span>
      <span class="ov-link-clicks">👆 ${l.clicks||0}</span>
    </div>
  `).join('');
}

function openLinkModal(link = null) {
  document.getElementById('link-id').value = link ? link.id : '';
  document.getElementById('link-title').value = link ? link.title : '';
  document.getElementById('link-url').value = link ? link.url : '';
  document.getElementById('link-icon').value = link ? (link.icon||'') : '🔗';
  document.getElementById('link-cat').value = link ? (link.category||'general') : 'general';
  document.getElementById('link-modal-title').textContent = link ? 'Edit Link' : 'Add Link';
  document.getElementById('link-modal').classList.add('open');
  setTimeout(() => document.getElementById('link-title').focus(), 100);
}

function closeLinkModal() { document.getElementById('link-modal').classList.remove('open'); }

function editLink(id) { openLinkModal(allLinks.find(l => l.id === id)); }

async function saveLink() {
  const id = document.getElementById('link-id').value;
  const title = document.getElementById('link-title').value.trim();
  const url = document.getElementById('link-url').value.trim();
  const icon = document.getElementById('link-icon').value.trim() || '🔗';
  const category = document.getElementById('link-cat').value;
  if (!title || !url) { toast('Title and URL are required'); return; }
  if (!url.startsWith('http')) { toast('URL must start with http:// or https://'); return; }
  if (id) {
    await supabase.from('links').update({ title, url, icon, category, updated_at: new Date().toISOString() }).eq('id', id);
    toast('Link updated ✓');
  } else {
    const pos = allLinks.length;
    await supabase.from('links').insert({ title, url, icon, category, user_id: currentUser.id, clicks: 0, active: true, position: pos, created_at: new Date().toISOString() });
    toast('Link added ✓');
  }
  closeLinkModal();
  await loadLinks();
}

async function toggleLink(id, currentActive) {
  await supabase.from('links').update({ active: !currentActive }).eq('id', id);
  await loadLinks();
}

async function deleteLink(id) {
  if (!confirm('Delete this link?')) return;
  await supabase.from('links').delete().eq('id', id);
  toast('Link deleted');
  await loadLinks();
}

// ── PROFILE ──
async function saveProfile() {
  const name = document.getElementById('p-name').value.trim();
  const username = document.getElementById('p-username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const bio = document.getElementById('p-bio').value.trim();
  const location = document.getElementById('p-location').value.trim();
  const website = document.getElementById('p-website').value.trim();
  const msg = document.getElementById('profile-msg');
  if (!name || !username) { msg.textContent = 'Name and username are required'; msg.className = 'save-msg error'; return; }
  if (username.length < 3) { msg.textContent = 'Username min 3 characters'; msg.className = 'save-msg error'; return; }
  // Check username not taken by someone else
  const { data: taken } = await supabase.from('profiles').select('id').eq('username', username).neq('id', currentUser.id).maybeSingle();
  if (taken) { msg.textContent = 'Username already taken'; msg.className = 'save-msg error'; return; }
  await supabase.from('profiles').update({ full_name: name, username, bio, location, website }).eq('id', currentUser.id);
  msg.textContent = 'Profile saved ✓'; msg.className = 'save-msg';
  await loadProfile();
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

async function saveQuickBio() {
  const bio = document.getElementById('quick-bio').value.trim();
  await supabase.from('profiles').update({ bio }).eq('id', currentUser.id);
  toast('Bio saved ✓');
  await loadProfile();
}

function renderProfilePreview() {
  const el = document.getElementById('profile-preview-box');
  if (!el) return;
  const name = document.getElementById('p-name')?.value || profile.full_name || 'Your Name';
  const bio = document.getElementById('p-bio')?.value || profile.bio || '';
  const init = name.charAt(0).toUpperCase();
  const activeLinks = allLinks.filter(l => l.active !== false).slice(0, 4);
  el.innerHTML = `
    <div class="pp-avatar">${profile.avatar_url ? '<img src="'+profile.avatar_url+'"/>' : init}</div>
    <div class="pp-name">${esc(name)}</div>
    ${bio ? '<div class="pp-bio">'+esc(bio)+'</div>' : ''}
    ${activeLinks.map(l => '<a class="pp-link" href="'+esc(l.url)+'" target="_blank">'+( l.icon||'🔗')+' '+esc(l.title)+'</a>').join('')}
    ${!activeLinks.length ? '<div style="color:var(--muted);font-size:12px;padding:8px 0">Add links to see them here</div>' : ''}
  `;
}

// ── THEMES ──
function renderThemes() {
  const el = document.getElementById('themes-grid');
  if (!el) return;
  el.innerHTML = THEMES.map(t => `
    <div class="theme-card ${selectedTheme === t.id ? 'selected' : ''}" onclick="selectTheme('${t.id}')" style="background:${t.card}">
      <div class="theme-preview" style="background:${t.bg}">
        <div class="theme-dot" style="background:${t.btnBg.includes('linear')?'#a78bfa':t.btnBg}"></div>
        <div class="theme-bar" style="background:${t.text};opacity:0.6"></div>
        <div class="theme-bar" style="background:${t.text};opacity:0.3;width:40%"></div>
      </div>
      <div class="theme-name" style="color:${t.text}">${t.name}</div>
    </div>
  `).join('');
}

function selectTheme(id) {
  selectedTheme = id;
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

async function saveTheme() {
  await supabase.from('profiles').update({ theme: selectedTheme }).eq('id', currentUser.id);
  profile.theme = selectedTheme;
  document.getElementById('theme-msg').textContent = 'Theme applied ✓';
  setTimeout(() => { document.getElementById('theme-msg').textContent = ''; }, 3000);
  toast('Theme saved ✓');
}

// ── ANALYTICS ──
function renderAnalytics() {
  const el = document.getElementById('analytics-list');
  if (!el) return;
  if (!allLinks.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px">No links yet.</div>'; return; }
  const sorted = [...allLinks].sort((a,b) => (b.clicks||0) - (a.clicks||0));
  const max = sorted[0]?.clicks || 1;
  el.innerHTML = sorted.map(l => `
    <div class="an-bar-wrap">
      <div class="an-bar-top">
        <span>${l.icon||'🔗'} ${esc(l.title)}</span>
        <span style="color:var(--accent2)">${l.clicks||0} clicks</span>
      </div>
      <div class="an-bar-bg">
        <div class="an-bar-fill" style="width:${Math.round(((l.clicks||0)/max)*100)}%"></div>
      </div>
    </div>
  `).join('');
}

// ── ACCOUNT ──
async function saveAccount() {
  const name = document.getElementById('acc-name').value.trim();
  const email = document.getElementById('acc-email').value.trim();
  const msg = document.getElementById('acc-msg');
  if (!name || !email) { msg.textContent = 'Fill in all fields'; msg.className = 'save-msg error'; return; }
  await supabase.from('profiles').update({ full_name: name, email }).eq('id', currentUser.id);
  if (email !== currentUser.email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) { msg.textContent = error.message; msg.className = 'save-msg error'; return; }
    msg.textContent = 'Check your new email to confirm the change ✓';
  } else {
    msg.textContent = 'Info updated ✓';
  }
  msg.className = 'save-msg';
  await loadProfile();
  setTimeout(() => { msg.textContent = ''; }, 4000);
}

async function changePassword() {
  const pw = document.getElementById('acc-pw').value;
  const pw2 = document.getElementById('acc-pw2').value;
  const msg = document.getElementById('pw-msg');
  if (!pw) { msg.textContent = 'Enter a new password'; msg.className = 'save-msg error'; return; }
  if (pw.length < 6) { msg.textContent = 'Password min 6 characters'; msg.className = 'save-msg error'; return; }
  if (pw !== pw2) { msg.textContent = 'Passwords do not match'; msg.className = 'save-msg error'; return; }
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) { msg.textContent = error.message; msg.className = 'save-msg error'; return; }
  msg.textContent = 'Password updated ✓'; msg.className = 'save-msg';
  document.getElementById('acc-pw').value = ''; document.getElementById('acc-pw2').value = '';
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

async function deleteAccount() {
  if (!confirm('Delete your account?\n\nAll your links and profile data will be permanently removed.\n\nThis cannot be undone.')) return;
  await supabase.from('links').delete().eq('user_id', currentUser.id);
  await supabase.from('profiles').delete().eq('id', currentUser.id);
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ── HELPERS ──
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLinkModal(); });
