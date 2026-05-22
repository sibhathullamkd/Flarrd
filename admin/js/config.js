var SUPABASE_URL = 'https://zrdnishiposoqeibpkjo.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_0yeM3W6jMofbPoHvgxchoA_0dU-iUo8';
var ADMIN_USERNAME = 'admin';
var ADMIN_PASSWORD = 'fhzadmin2026';
var SITE_URL = 'https://sibhathullamkd.github.io/Flarrd';

if (!window._supabaseClient) {
  window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
}
var supabase = window._supabaseClient;
