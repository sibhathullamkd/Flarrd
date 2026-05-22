(async function(){
  try {
    var hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      var res = await supabase.auth.getSession();
      if (res.data && res.data.session) {
        await upsertProfile(res.data.session.user);
        window.location.href = 'dashboard.html'; return;
      }
    }
    var res = await supabase.auth.getSession();
    if (res.data && res.data.session) window.location.href = 'dashboard.html';
  } catch(e){ console.error(e); }
})();

async function upsertProfile(user) {
  var name = user.user_metadata.full_name || user.user_metadata.name || user.email.split('@')[0];
  var ex = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!ex.data) {
    var base = name.toLowerCase().replace(/[^a-z0-9_]/g,'').substring(0,12) || 'user';
    var username = base + Math.floor(Math.random()*9999);
    await supabase.from('profiles').insert({
      id: user.id, full_name: name, email: user.email, username: username,
      avatar_url: user.user_metadata.avatar_url || null,
      provider: user.app_metadata.provider || 'email',
      bio: '', theme: 'dark', created_at: new Date().toISOString(), last_sign_in: new Date().toISOString()
    });
  } else {
    await supabase.from('profiles').update({ last_sign_in: new Date().toISOString() }).eq('id', user.id);
  }
}

function openAuth(tab) { document.getElementById('auth-modal').classList.add('open'); switchTab(tab||'login'); }
function closeAuth() { document.getElementById('auth-modal').classList.remove('open'); }

document.addEventListener('keydown', function(e){
  if (e.key==='Escape') closeAuth();
  if (e.key==='Enter' && document.getElementById('auth-modal').classList.contains('open')) {
    var loginVis = document.getElementById('form-login').style.display !== 'none';
    if (loginVis) doLogin(); else doSignup();
  }
});

function switchTab(tab) {
  var isLogin = tab==='login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('form-login').style.display = isLogin ? 'block' : 'none';
  document.getElementById('form-signup').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-sub').textContent = isLogin ? 'Sign in to your Flarrd' : 'Create your free profile';
}

function setLoad(id, on) { var b=document.getElementById(id); if(on) b.classList.add('loading'); else b.classList.remove('loading'); b.disabled=on; }
function showAlert(id, msg, type) { var el=document.getElementById(id); el.textContent=msg; el.className='auth-alert '+type; }

async function doLogin() {
  var email=document.getElementById('li-email').value.trim();
  var pass=document.getElementById('li-pass').value;
  if (!email||!pass){showAlert('li-alert','Fill in all fields.','error');return;}
  setLoad('btn-login',true);
  try {
    var r = await supabase.auth.signInWithPassword({email,password:pass});
    if (r.error){showAlert('li-alert',r.error.message,'error');setLoad('btn-login',false);return;}
    await supabase.from('profiles').update({last_sign_in:new Date().toISOString()}).eq('id',r.data.user.id);
    showAlert('li-alert','Welcome back! Redirecting...','success');
    setTimeout(()=>window.location.href='dashboard.html',600);
  } catch(e){showAlert('li-alert','Connection error.','error');setLoad('btn-login',false);}
}

async function doSignup() {
  var name=document.getElementById('su-name').value.trim();
  var username=document.getElementById('su-username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  var email=document.getElementById('su-email').value.trim();
  var pass=document.getElementById('su-pass').value;
  if (!name||!username||!email||!pass){showAlert('su-alert','Fill in all fields.','error');return;}
  if (username.length<3){showAlert('su-alert','Username min 3 characters.','error');return;}
  if (pass.length<6){showAlert('su-alert','Password min 6 characters.','error');return;}
  // Check username taken
  var taken = await supabase.from('profiles').select('id').eq('username',username).maybeSingle();
  if (taken.data){showAlert('su-alert','Username already taken.','error');return;}
  setLoad('btn-signup',true);
  try {
    var r = await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name}}});
    if (r.error){showAlert('su-alert',r.error.message,'error');setLoad('btn-signup',false);return;}
    if (r.data&&r.data.user) {
      await supabase.from('profiles').insert({
        id:r.data.user.id, full_name:name, email:email, username:username,
        avatar_url:null, provider:'email', bio:'', theme:'dark',
        created_at:new Date().toISOString(), last_sign_in:new Date().toISOString()
      });
    }
    if (r.data&&r.data.session) {
      showAlert('su-alert','Account created! Redirecting...','success');
      setTimeout(()=>window.location.href='dashboard.html',600);
    } else {
      showAlert('su-alert','Account created! Check your email to confirm, then sign in.','success');
      setLoad('btn-signup',false);
    }
  } catch(e){showAlert('su-alert','Error: '+e.message,'error');setLoad('btn-signup',false);}
}

async function handleGoogle() {
  try {
    var r = await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:SITE_URL+'/'}});
    if (r.error) alert('Google error: '+r.error.message);
  } catch(e){alert('Google sign-in failed.');}
}
