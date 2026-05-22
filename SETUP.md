# Flarrd — Setup Guide

## File Structure
```
Flarrd/
├── index.html              ← Landing + auth page
├── dashboard.html          ← User dashboard (after login)
├── SETUP_SQL.sql           ← Paste this in Supabase SQL Editor
├── js/
│   ├── config.js           ← Supabase keys (already filled in)
│   ├── auth.js             ← Login/signup/Google OAuth
│   └── dashboard.js        ← Dashboard app logic
├── css/
│   └── dashboard.css       ← Dashboard styles
├── u/
│   └── profile.html        ← Public profile page
└── admin/
    ├── index.html          ← Admin panel (hidden)
    └── js/
        ├── config.js       ← Same as js/config.js
        └── admin.js        ← Admin logic
```

---

## STEP 1 — Run SQL in Supabase
1. Go to supabase.com → your project
2. Click **SQL Editor** → **New Query**
3. Paste the entire contents of **SETUP_SQL.sql**
4. Click **Run and enable RLS**

---

## STEP 2 — Enable Google OAuth
1. Supabase → **Authentication** → **Providers** → **Google**
2. Toggle **Enable**
3. Go to console.cloud.google.com → New Project → APIs → OAuth consent screen
4. Create OAuth credentials → copy **Client ID** and **Client Secret**
5. Paste into Supabase → Save
6. Copy the **Callback URL** from Supabase → paste into Google's Authorized redirect URIs

---

## STEP 3 — Disable Email Confirmation (optional)
Supabase → Authentication → Providers → Email → turn OFF **Confirm email**

---

## STEP 4 — Deploy to GitHub Pages
1. Create GitHub repo named `Flarrd`
2. Upload all files keeping the folder structure
3. Settings → Pages → Deploy from main branch
4. Your site: `https://yourusername.github.io/Flarrd/`

---

## STEP 5 — Update SITE_URL in config.js
Change this line to your real URL:
```js
var SITE_URL = 'https://yourusername.github.io/Flarrd';
```

---

## Access Admin Panel
Go to: `yoursite.com/admin/`
Login: **admin** / **fhzadmin2026**

---

## What Users Can Do
- Sign up with email or Google OAuth
- Create a profile with username, bio, location, website
- Add unlimited links with icons and categories
- Choose from 8 beautiful themes
- See click analytics per link
- Change password, update email
- Delete their own account

## What Admin Can Do
- View all users with join date, last login, sign-in method
- See total links and clicks per user
- View top links by click count
- Send password recovery emails
- Rename users' display names
- View and delete any link
- Delete user accounts (profile + links)
- Activity log of all admin actions

## Limitations
- Password reset requires user to click recovery link (Supabase handles this)
- Changing user email must be done via Supabase Dashboard
- IP tracking not available (frontend only)
- Deleting auth account requires Supabase Dashboard → Auth → Users
