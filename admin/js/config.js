var SUPABASE_URL = 'https://ftnykcpmtwusryrivvwe.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_Z3RDyV6ZIwZ09EhfHMjZrA_WfXOI1KF';
var ADMIN_USERNAME = 'admin';
var ADMIN_PASSWORD = 'fhzadmin2026';
var SITE_URL = 'https://flarrd.pages.dev/';

if (!window._supabaseClient) {
  window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
}
var supabase = window._supabaseClient;
