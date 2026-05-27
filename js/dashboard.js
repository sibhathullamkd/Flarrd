// ── Flarrd Dashboard JS — Fixed Version ──────────────────────────────────────

var SUPABASE_URL = 'https://ftnykcpmtwusryrivvwe.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_Z3RDyV6ZIwZ09EhfHMjZrA_WfXOI1KF';
var SITE_URL = 'https://flarrd.pages.dev';

var currentUser = null, profile = null, allLinks = [], selectedTheme = 'dark';

// ── Init Supabase — use singleton from config.js ──────────────────────────────
var sb = null;
function getSb() {
  if (!sb) {
    sb = window._supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return sb;
}

// ── REST helpers (for anon reads) ─────────────────────────────────────────────
async function sbRest(table, query) {
  try {
    var r = await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+query, {
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Accept':'application/json'}
    });
    return r.json();
  } catch(e) { return []; }
}

// ── Platform icons ────────────────────────────────────────────────────────────
var PLATFORMS = [
  {id:'instagram',label:'Instagram',icon:'fa-brands fa-instagram',color:'#e1306c'},
  {id:'twitter',label:'Twitter / X',icon:'fa-brands fa-x-twitter',color:'#1da1f2'},
  {id:'youtube',label:'YouTube',icon:'fa-brands fa-youtube',color:'#ff0000'},
  {id:'tiktok',label:'TikTok',icon:'fa-brands fa-tiktok',color:'#69c9d0'},
  {id:'facebook',label:'Facebook',icon:'fa-brands fa-facebook',color:'#1877f2'},
  {id:'linkedin',label:'LinkedIn',icon:'fa-brands fa-linkedin',color:'#0a66c2'},
  {id:'github',label:'GitHub',icon:'fa-brands fa-github',color:'#f0f6fc'},
  {id:'twitch',label:'Twitch',icon:'fa-brands fa-twitch',color:'#9146ff'},
  {id:'discord',label:'Discord',icon:'fa-brands fa-discord',color:'#5865f2'},
  {id:'telegram',label:'Telegram',icon:'fa-brands fa-telegram',color:'#2aabee'},
  {id:'whatsapp',label:'WhatsApp',icon:'fa-brands fa-whatsapp',color:'#25d366'},
  {id:'spotify',label:'Spotify',icon:'fa-brands fa-spotify',color:'#1db954'},
  {id:'soundcloud',label:'SoundCloud',icon:'fa-brands fa-soundcloud',color:'#ff5500'},
  {id:'pinterest',label:'Pinterest',icon:'fa-brands fa-pinterest',color:'#e60023'},
  {id:'reddit',label:'Reddit',icon:'fa-brands fa-reddit',color:'#ff4500'},
  {id:'medium',label:'Medium',icon:'fa-brands fa-medium',color:'#fff'},
  {id:'behance',label:'Behance',icon:'fa-brands fa-behance',color:'#1769ff'},
  {id:'dribbble',label:'Dribbble',icon:'fa-brands fa-dribbble',color:'#ea4c89'},
  {id:'patreon',label:'Patreon',icon:'fa-brands fa-patreon',color:'#ff424d'},
  {id:'website',label:'Website',icon:'fa-solid fa-globe',color:'#7c3aed'},
  {id:'email',label:'Email',icon:'fa-solid fa-envelope',color:'#6b6b8a'},
  {id:'other',label:'Other',icon:'fa-solid fa-link',color:'#6b6b8a'},
];

var THEMES = [
  {id:'dark',name:'Dark Night',bg:'#0a0a0f',card:'#111118',accent:'#7c3aed',text:'#f4f4f8',btnBg:'#7c3aed',btnText:'#fff'},
  {id:'light',name:'Clean Light',bg:'#f5f5fa',card:'#ffffff',accent:'#7c3aed',text:'#0f0f1a',btnBg:'#7c3aed',btnText:'#fff'},
  {id:'midnight',name:'Midnight Blue',bg:'#080c1e',card:'#0e1228',accent:'#3b82f6',text:'#e2e8f0',btnBg:'#3b82f6',btnText:'#fff'},
  {id:'rose',name:'Rose Garden',bg:'#0f0709',card:'#1a0d12',accent:'#ec4899',text:'#fce7f3',btnBg:'#ec4899',btnText:'#fff'},
  {id:'forest',name:'Forest',bg:'#030d06',card:'#081509',accent:'#10b981',text:'#d1fae5',btnBg:'#10b981',btnText:'#fff'},
  {id:'sunset',name:'Sunset',bg:'#0f0800',card:'#1a1000',accent:'#f97316',text:'#fff7ed',btnBg:'#f97316',btnText:'#fff'},
  {id:'nord',name:'Nord',bg:'#2e3440',card:'#3b4252',accent:'#88c0d0',text:'#eceff4',btnBg:'#88c0d0',btnText:'#2e3440'},
  {id:'candy',name:'Candy',bg:'#130918',card:'#1e1028',accent:'#c084fc',text:'#fdf4ff',btnBg:'#c084fc',btnText:'#fff'},
];

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    sb = getSb();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    currentUser = session.user;

    // Listen for auth state changes (handles token refresh & sign out)
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        window.location.href = 'index.html';
      }
    });

    await loadProfile();
    await loadLinks();
    await loadAnalyticsStats();
    initUI();
    renderThemes();
    registerSession();
  } catch(e) {
    console.error('Boot error:', e);
    window.location.href = 'index.html';
  }
})();

async function loadProfile() {
  const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (error) console.error('Profile load error:', error);
  profile = data || {};
  // Ensure email is set
  if (!profile.email) profile.email = currentUser.email;
  selectedTheme = profile.theme || 'dark';
  updateSidebarUser();
  fillProfileForm();
  fillAccountForm();
  updateOverview();
}

async function loadLinks() {
  const { data, error } = await sb.from('links').select('*').eq('user_id', currentUser.id).order('position', { ascending: true });
  if (error) console.error('Links load error:', error);
  allLinks = data || [];
  renderLinks();
  renderOverviewLinks();
  renderAnalytics();
  updateStats();
}

// Load real analytics data from analytics_events table
async function loadAnalyticsStats() {
  try {
    var sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    var data = await sbRest('analytics_events',
      'user_id=eq.' + currentUser.id +
      '&created_at=gte.' + sevenDaysAgo.toISOString() +
      '&select=event_type,created_at'
    );
    if (Array.isArray(data)) {
      var views = data.filter(e => e.event_type === 'profile_view').length;
      var clicks = data.filter(e => e.event_type === 'link_click').length;
      // Update profile_views from actual profile record (already loaded)
    }
  } catch(e) { console.error('Analytics stats error:', e); }
}

function updateSidebarUser() {
  // Determine best display name
  var displayName = profile.full_name ||
    (currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name)) ||
    (profile.email || currentUser.email || '').split('@')[0] ||
    'User';

  setText('s-name', displayName);
  setText('s-handle', '@' + (profile.username || '...'));

  const av = document.getElementById('s-avatar');
  if (av) {
    if (profile.avatar_url) {
      av.innerHTML = '<img src="' + profile.avatar_url + '" alt="avatar" onerror="this.parentElement.textContent=\'' + displayName.charAt(0).toUpperCase() + '\'"/>';
    } else {
      av.textContent = displayName.charAt(0).toUpperCase();
    }
    av.onclick = () => showTab('profile', null);
  }

  const hour = new Date().getHours();
  const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  setText('greeting', g + ', ' + displayName.split(' ')[0] + '!');

  const url = SITE_URL + '/u/profile.html?u=' + (profile.username || '');
  const plb = document.getElementById('preview-link-btn');
  if (plb) plb.href = url;
}

function fillProfileForm() {
  setVal('p-name', profile.full_name || '');
  setVal('p-username', profile.username || '');
  setVal('p-bio', profile.bio || '');
  setVal('p-location', profile.location || '');
  setVal('p-website', profile.website || '');
  setVal('quick-bio', profile.bio || '');
  const bigAv = document.getElementById('big-avatar');
  if (bigAv) {
    var name = profile.full_name || 'U';
    if (profile.avatar_url) {
      bigAv.innerHTML = '<img src="' + profile.avatar_url + '" alt="avatar"/><div class="avatar-edit-overlay"><i class="fa-solid fa-camera"></i></div>';
    } else {
      bigAv.innerHTML = name.charAt(0).toUpperCase() + '<div class="avatar-edit-overlay"><i class="fa-solid fa-camera"></i></div>';
    }
    bigAv.onclick = () => openAvatarModal();
  }
  renderProfilePreview();
}

function fillAccountForm() {
  setVal('acc-name', profile.full_name || '');
  setVal('acc-email', profile.email || currentUser.email || '');
}

async function updateStats() {
  const totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);
  setText('stat-links', allLinks.length);
  setText('stat-clicks', totalClicks);
  setText('an-clicks', totalClicks);
  setText('an-links', allLinks.filter(l => l.active !== false).length);
  const top = [...allLinks].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
  setText('stat-top', top ? (top.title.substring(0, 12) + (top.title.length > 12 ? '…' : '')) : '—');
  // Always fetch fresh profile_views from DB (not cached value)
  try {
    var fresh = await sbRest('profiles', 'id=eq.' + currentUser.id + '&select=profile_views');
    var views = (fresh && fresh[0]) ? (fresh[0].profile_views || 0) : (profile.profile_views || 0);
    setText('stat-views', views);
    setText('an-views', views);
    profile.profile_views = views;
  } catch(e) {
    setText('stat-views', profile.profile_views || 0);
    setText('an-views', profile.profile_views || 0);
  }
}

function updateOverview() {
  const url = SITE_URL + '/u/profile.html?u=' + (profile.username || '');
  const btn = document.getElementById('view-profile-btn');
  if (btn) btn.href = url;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.s-item').forEach(i => i.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
  else { const b = document.querySelector('[data-tab="' + name + '"]'); if (b) b.classList.add('active'); }
  if (name === 'profile') renderProfilePreview();
  if (name === 'analytics') renderAnalytics();
  if (name === 'account') loadSessions();
  if (window.innerWidth <= 700) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('open');
}

function initUI() {
  document.querySelector('[data-tab="overview"]')?.classList.add('active');
}

// ── LINKS ─────────────────────────────────────────────────────────────────────
function renderLinks() {
  const el = document.getElementById('links-list');
  if (!el) return;
  if (!allLinks.length) {
    el.innerHTML = '<div class="empty-links"><i class="fa-solid fa-link" style="font-size:28px;opacity:0.3;display:block;margin-bottom:12px"></i>No links yet.<br>Click <strong style="color:var(--text)">+ Add Link</strong> to get started.</div>';
    return;
  }
  el.innerHTML = allLinks.map((l, i) => {
    var iconHtml = l.icon && l.icon.startsWith('fa-') ? '<i class="' + l.icon + '"></i>' : (l.icon || '🔗');
    return `<div class="link-item ${l.active === false ? 'inactive' : ''}" id="link-${l.id}">
      <div class="drag-handle" title="Drag to reorder">⠿</div>
      <div class="link-icon-box">${iconHtml}</div>
      <div class="link-info">
        <div class="link-title">${esc(l.title)}</div>
        <div class="link-url">${esc(l.url)}</div>
      </div>
      <div class="link-clicks"><i class="fa-solid fa-arrow-pointer"></i> ${l.clicks || 0}</div>
      <div class="link-actions">
        <button class="link-action-btn" onclick="toggleLink('${l.id}',${l.active !== false})" title="${l.active === false ? 'Enable' : 'Disable'}">
          <i class="fa-solid fa-${l.active === false ? 'eye-slash' : 'eye'}"></i>
        </button>
        <button class="link-action-btn" onclick="editLink('${l.id}')" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="link-action-btn del" onclick="confirmDeleteLink('${l.id}')" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderOverviewLinks() {
  const el = document.getElementById('overview-links');
  if (!el) return;
  if (!allLinks.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">No links yet.</div>'; return; }
  const active = allLinks.filter(l => l.active !== false).slice(0, 5);
  el.innerHTML = active.map(l => {
    var iconHtml = l.icon && l.icon.startsWith('fa-') ? '<i class="' + l.icon + '"></i>' : (l.icon || '🔗');
    return `<div class="ov-link">
      <span class="ov-link-icon">${iconHtml}</span>
      <span class="ov-link-title">${esc(l.title)}</span>
      <span class="ov-link-clicks"><i class="fa-solid fa-arrow-pointer"></i> ${l.clicks || 0}</span>
    </div>`;
  }).join('');
}

// ── LINK MODAL ────────────────────────────────────────────────────────────────
var selectedIcon = 'fa-solid fa-link';

function openLinkModal(link = null) {
  setVal('link-id', link ? link.id : '');
  setVal('link-title', link ? link.title : '');
  setVal('link-url', link ? link.url : '');
  setVal('link-cat', link ? (link.category || 'general') : 'general');
  selectedIcon = link ? (link.icon || 'fa-solid fa-link') : 'fa-solid fa-link';
  setText('link-modal-title', link ? 'Edit Link' : 'Add Link');
  renderIconGrid();
  updateIconPreview();
  if (link) detectPlatformFromUrl(link.url);
  document.getElementById('link-modal').classList.add('open');
  setTimeout(() => document.getElementById('link-title')?.focus(), 100);
}

function renderIconGrid() {
  const grid = document.getElementById('icon-picker-grid');
  if (!grid) return;
  grid.innerHTML = PLATFORMS.map(p =>
    `<button type="button" class="icon-opt ${selectedIcon === p.icon ? 'selected' : ''}" onclick="pickIcon('${p.icon}','${p.label}')" title="${p.label}">
      <i class="${p.icon}"></i>
    </button>`
  ).join('');
}

function pickIcon(icon, label) {
  selectedIcon = icon;
  renderIconGrid();
  updateIconPreview();
}

function updateIconPreview() {
  const preview = document.getElementById('icon-preview');
  if (preview) preview.innerHTML = selectedIcon.startsWith('fa-') ? '<i class="' + selectedIcon + '" style="font-size:20px"></i>' : selectedIcon;
}

function detectPlatformFromUrl(url) {
  if (!url) return;
  try {
    var host = new URL(url).hostname.replace('www.', '');
    var found = PLATFORMS.find(p => p.id !== 'other' && p.id !== 'website' && host.includes(p.id));
    if (found) { selectedIcon = found.icon; renderIconGrid(); updateIconPreview(); }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('link-url');
  if (urlInput) urlInput.addEventListener('input', () => detectPlatformFromUrl(urlInput.value));
});

function closeLinkModal() { document.getElementById('link-modal').classList.remove('open'); }
function editLink(id) { openLinkModal(allLinks.find(l => l.id === id)); }

async function saveLink() {
  const id = getVal('link-id');
  const title = getVal('link-title').trim();
  const url = getVal('link-url').trim();
  const category = getVal('link-cat');
  if (!title || !url) { toast('Title and URL are required', 'error'); return; }
  if (!url.startsWith('http')) { toast('URL must start with http:// or https://', 'error'); return; }
  if (id) {
    const { error } = await sb.from('links').update({ title, url, icon: selectedIcon, category, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Link updated');
  } else {
    const { error } = await sb.from('links').insert({ title, url, icon: selectedIcon, category, user_id: currentUser.id, clicks: 0, active: true, position: allLinks.length, created_at: new Date().toISOString() });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Link added');
  }
  closeLinkModal();
  await loadLinks();
}

async function toggleLink(id, currentActive) {
  await sb.from('links').update({ active: !currentActive }).eq('id', id);
  await loadLinks();
}

function confirmDeleteLink(id) {
  var link = allLinks.find(l => l.id === id);
  showConfirm({
    icon: '🗑️',
    title: 'Delete Link?',
    message: 'Delete "' + (link ? esc(link.title) : 'this link') + '"? This cannot be undone.',
    confirmText: 'Delete',
    danger: true,
    onConfirm: async () => {
      await sb.from('links').delete().eq('id', id);
      toast('Link deleted');
      await loadLinks();
    }
  });
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
async function saveProfile() {
  const name = getVal('p-name').trim();
  const username = getVal('p-username').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const bio = getVal('p-bio').trim();
  const location = getVal('p-location').trim();
  const website = getVal('p-website').trim();
  const msg = document.getElementById('profile-msg');
  if (!name || !username) { showMsg(msg, 'Name and username are required', true); return; }
  if (username.length < 3) { showMsg(msg, 'Username must be at least 3 characters', true); return; }
  const { data: taken } = await sb.from('profiles').select('id').eq('username', username).neq('id', currentUser.id).maybeSingle();
  if (taken) { showMsg(msg, 'Username already taken', true); return; }
  const { error } = await sb.from('profiles').update({ full_name: name, username, bio, location, website }).eq('id', currentUser.id);
  if (error) { showMsg(msg, error.message, true); return; }
  showMsg(msg, 'Profile saved ✓');
  await loadProfile();
  setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
}

async function saveQuickBio() {
  const bio = getVal('quick-bio').trim();
  await sb.from('profiles').update({ bio }).eq('id', currentUser.id);
  toast('Bio saved');
  await loadProfile();
}

function renderProfilePreview() {
  const el = document.getElementById('profile-preview-box');
  if (!el) return;
  const name = getVal('p-name') || profile.full_name || 'Your Name';
  const bio = getVal('p-bio') || profile.bio || '';
  const init = name.charAt(0).toUpperCase();
  const activeLinks = allLinks.filter(l => l.active !== false).slice(0, 4);
  el.innerHTML = `
    <div class="pp-avatar">${profile.avatar_url ? '<img src="' + profile.avatar_url + '"/>' : init}</div>
    <div class="pp-name">${esc(name)}</div>
    ${bio ? '<div class="pp-bio">' + esc(bio) + '</div>' : ''}
    ${activeLinks.map(l => {
      var icon = l.icon && l.icon.startsWith('fa-') ? '<i class="' + l.icon + '" style="width:16px;text-align:center"></i>' : (l.icon || '🔗');
      return '<a class="pp-link" href="' + esc(l.url) + '" target="_blank">' + icon + ' ' + esc(l.title) + '</a>';
    }).join('')}
    ${!activeLinks.length ? '<div style="color:var(--muted);font-size:12px;padding:8px 0">Add links to see them here</div>' : ''}
  `;
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
var cropData = {x:0,y:0,size:100};

function openAvatarModal() {
  document.getElementById('avatar-modal').classList.add('open');
}
function closeAvatarModal() {
  document.getElementById('avatar-modal').classList.remove('open');
  document.getElementById('avatar-file').value = '';
  document.getElementById('crop-area').style.display = 'none';
}

function initAvatarUpload() {
  const zone = document.getElementById('avatar-drop-zone');
  const fileInput = document.getElementById('avatar-file');
  if (!zone || !fileInput) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); handleAvatarFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => handleAvatarFile(fileInput.files[0]));
}

function handleAvatarFile(file) {
  if (!file || !file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('crop-img');
    img.src = e.target.result;
    document.getElementById('crop-area').style.display = 'block';
    img.onload = () => { cropData = {x:0,y:0,size:Math.min(img.naturalWidth,img.naturalHeight)}; drawCrop(); };
  };
  reader.readAsDataURL(file);
}

function drawCrop() {
  const canvas = document.getElementById('crop-canvas');
  const img = document.getElementById('crop-img');
  if (!canvas || !img.src) return;
  const size = 200;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,size,size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size/2,size/2,size/2,0,Math.PI*2);
  ctx.clip();
  var scale = img.naturalWidth / img.width || 1;
  var sx = cropData.x * scale, sy = cropData.y * scale, sw = cropData.size * scale;
  ctx.drawImage(img, sx, sy, sw, sw, 0, 0, size, size);
  ctx.restore();
}

async function saveAvatar() {
  const canvas = document.getElementById('crop-canvas');
  if (!canvas) return;
  canvas.toBlob(async blob => {
    const fileName = currentUser.id + '_avatar_' + Date.now() + '.jpg';
    const { data, error } = await sb.storage.from('avatars').upload(fileName, blob, { contentType:'image/jpeg', upsert:true });
    if (error) { toast('Upload failed: ' + error.message, 'error'); return; }
    const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(fileName);
    await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
    toast('Avatar updated!');
    closeAvatarModal();
    await loadProfile();
  }, 'image/jpeg', 0.92);
}

// ── THEMES ────────────────────────────────────────────────────────────────────
function renderThemes() {
  const el = document.getElementById('themes-grid');
  if (!el) return;
  el.innerHTML = THEMES.map(t => `
    <div class="theme-card ${selectedTheme === t.id ? 'selected' : ''}" onclick="selectTheme('${t.id}',this)" style="background:${t.card}">
      <div class="theme-preview" style="background:${t.bg}">
        <div class="theme-dot" style="background:${t.btnBg}"></div>
        <div class="theme-bar" style="background:${t.text};opacity:0.6"></div>
        <div class="theme-bar" style="background:${t.text};opacity:0.3;width:40%"></div>
      </div>
      <div class="theme-name" style="color:${t.text}">${t.name}</div>
    </div>
  `).join('');
}

function selectTheme(id, el) {
  selectedTheme = id;
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

async function saveTheme() {
  await sb.from('profiles').update({ theme: selectedTheme }).eq('id', currentUser.id);
  profile.theme = selectedTheme;
  setText('theme-msg', 'Theme applied ✓');
  toast('Theme saved');
  setTimeout(() => setText('theme-msg', ''), 3000);
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
async function renderAnalytics() {
  const el = document.getElementById('analytics-list');
  if (!el) return;
  if (!allLinks.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px">No links yet.</div>'; return; }
  const sorted = [...allLinks].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  const max = Math.max(sorted[0]?.clicks || 1, 1);
  el.innerHTML = sorted.map(l => {
    var icon = l.icon && l.icon.startsWith('fa-') ? '<i class="' + l.icon + '"></i>' : (l.icon || '🔗');
    return `<div class="an-bar-wrap">
      <div class="an-bar-top">
        <span style="display:flex;align-items:center;gap:7px">${icon} ${esc(l.title)}</span>
        <span style="color:var(--accent2);font-size:12px">${l.clicks || 0} clicks</span>
      </div>
      <div class="an-bar-bg"><div class="an-bar-fill" style="width:${Math.round(((l.clicks || 0) / max) * 100)}%"></div></div>
    </div>`;
  }).join('');

  await renderMiniChart();
}

async function renderMiniChart() {
  const el = document.getElementById('views-chart');
  if (!el || !currentUser) return;

  var sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  var events = [];
  try {
    events = await sbRest('analytics_events',
      'user_id=eq.' + currentUser.id +
      '&created_at=gte.' + sevenDaysAgo.toISOString() +
      '&order=created_at.asc'
    );
  } catch(e) { console.error('Chart data error:', e); }

  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(0,10),
      label: d.toLocaleDateString('en',{weekday:'short'}).slice(0,2),
      views: 0,
      clicks: 0
    });
  }

  (events || []).forEach(ev => {
    var day = days.find(d => d.date === ev.created_at.slice(0,10));
    if (day) {
      if (ev.event_type === 'profile_view') day.views++;
      else if (ev.event_type === 'link_click') day.clicks++;
    }
  });

  var maxVal = Math.max(...days.map(d => d.views + d.clicks), 1);
  el.innerHTML = '<div class="chart-bars">' + days.map(d => {
    var h = Math.round(((d.views + d.clicks) / maxVal) * 100);
    return `<div class="chart-bar-col">
      <div class="chart-bar" style="height:${Math.max(h,2)}%"></div>
      <div class="chart-bar-lbl">${d.label}</div>
    </div>`;
  }).join('') + '</div>';
}

// ── SESSIONS ──────────────────────────────────────────────────────────────────
async function registerSession() {
  try {
    var ua = navigator.userAgent;
    var browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : ua.includes('Edge') ? 'Edge' : 'Other';
    var os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : (ua.includes('iPhone')||ua.includes('iPad')) ? 'iOS' : 'Unknown';
    var device = (ua.includes('Mobile') || ua.includes('Android')) ? 'Mobile' : 'Desktop';
    var existing = await sb.from('user_sessions').select('id').eq('user_id', currentUser.id).eq('user_agent', ua).maybeSingle();
    if (existing.data) {
      await sb.from('user_sessions').update({ last_seen: new Date().toISOString(), is_active: true }).eq('id', existing.data.id);
    } else {
      await sb.from('user_sessions').insert({ user_id: currentUser.id, user_agent: ua, browser, os, device, is_active: true });
    }
  } catch(e) { console.error('Session register error:', e); }
}

async function loadSessions() {
  const el = document.getElementById('sessions-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px">Loading sessions...</div>';
  try {
    var data = await sbRest('user_sessions', 'user_id=eq.' + currentUser.id + '&order=last_seen.desc');
    if (!data || !data.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px">No sessions found.</div>'; return; }
    var now = Date.now();
    el.innerHTML = data.map(s => {
      var ago = timeAgo(s.last_seen);
      var isRecent = (now - new Date(s.last_seen).getTime()) < 5 * 60 * 1000;
      return `<div class="session-item">
        <div class="session-dot ${isRecent ? '' : 'old'}"></div>
        <div class="session-info">
          <div class="session-device"><i class="fa-solid fa-${s.device === 'Mobile' ? 'mobile' : 'desktop'}" style="margin-right:6px;opacity:0.6"></i>${esc(s.browser)} on ${esc(s.os)}</div>
          <div class="session-meta">${esc(s.device)} · Last seen ${ago}</div>
        </div>
        ${isRecent ?
          '<span style="font-size:10px;color:var(--green);background:rgba(16,185,129,0.1);padding:3px 8px;border-radius:20px">Current</span>' :
          '<button class="session-kill" onclick="killSession(\'' + s.id + '\',this)">Revoke</button>'}
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px">Error loading sessions.</div>';
  }
}

async function killSession(id, btn) {
  btn.textContent = '...';
  await sb.from('user_sessions').update({ is_active: false }).eq('id', id);
  await loadSessions();
  toast('Session revoked');
}

// ── ACCOUNT ───────────────────────────────────────────────────────────────────
async function saveAccount() {
  const name = getVal('acc-name').trim();
  const email = getVal('acc-email').trim();
  const msg = document.getElementById('acc-msg');
  if (!name || !email) { showMsg(msg, 'Fill in all fields', true); return; }
  await sb.from('profiles').update({ full_name: name, email }).eq('id', currentUser.id);
  if (email !== currentUser.email) {
    const { error } = await sb.auth.updateUser({ email });
    if (error) { showMsg(msg, error.message, true); return; }
    showMsg(msg, 'Check your new email to confirm ✓');
  } else {
    showMsg(msg, 'Info updated ✓');
  }
  await loadProfile();
  setTimeout(() => { if (msg) msg.textContent = ''; }, 4000);
}

async function changePassword() {
  const pw = getVal('acc-pw'), pw2 = getVal('acc-pw2');
  const msg = document.getElementById('pw-msg');
  if (!pw) { showMsg(msg, 'Enter a new password', true); return; }
  if (pw.length < 6) { showMsg(msg, 'Password min 6 characters', true); return; }
  if (pw !== pw2) { showMsg(msg, 'Passwords do not match', true); return; }
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) { showMsg(msg, error.message, true); return; }
  showMsg(msg, 'Password updated ✓');
  setVal('acc-pw', ''); setVal('acc-pw2', '');
  setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
}

function confirmDeleteAccount() {
  showConfirm({
    icon: '⚠️',
    title: 'Delete Account?',
    message: 'All your links and profile data will be permanently removed.',
    warning: 'This cannot be undone.',
    confirmText: 'Delete My Account',
    danger: true,
    onConfirm: async () => {
      await sb.from('links').delete().eq('user_id', currentUser.id);
      await sb.from('profiles').delete().eq('id', currentUser.id);
      await sb.auth.signOut();
      window.location.href = 'index.html';
    }
  });
}

// ── SIGN OUT ──────────────────────────────────────────────────────────────────
async function signOut() {
  try {
    await sb.auth.signOut();
  } catch(e) {
    console.error('SignOut error:', e);
  } finally {
    // Always redirect, even if signOut throws
    window.location.href = 'index.html';
  }
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
var confirmCallback = null;
function showConfirm({ icon, title, message, warning, confirmText, danger, onConfirm }) {
  confirmCallback = onConfirm;
  document.getElementById('confirm-icon').textContent = icon || '❓';
  setText('confirm-title', title || 'Are you sure?');
  setText('confirm-msg', message || '');
  setText('confirm-warning', warning || '');
  const btn = document.getElementById('confirm-ok');
  btn.textContent = confirmText || 'Confirm';
  btn.className = danger ? 'btn-danger' : 'btn-primary';
  document.getElementById('confirm-modal').classList.add('open');
}
function closeConfirm() { document.getElementById('confirm-modal').classList.remove('open'); confirmCallback = null; }
function doConfirm() { closeConfirm(); if (confirmCallback) confirmCallback(); }

// ── HELPERS ───────────────────────────────────────────────────────────────────
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.innerHTML = '<i class="fa-solid fa-' + (type === 'error' ? 'circle-xmark' : 'circle-check') + '"></i> ' + msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id) { return (document.getElementById(id) || {}).value || ''; }
function showMsg(el, msg, isError) { if (!el) return; el.textContent = msg; el.className = 'save-msg' + (isError ? ' error' : ''); }
function timeAgo(iso) {
  var diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLinkModal(); closeConfirm(); closeAvatarModal(); }
});
document.addEventListener('DOMContentLoaded', initAvatarUpload);
