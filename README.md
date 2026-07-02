# Nume Brand — site + backend (Supabase)

Your site is now connected to a backend. Two things work live:

- **Content** — edit in `admin.html`, press **Publică pe site**, and every visitor sees the change immediately.
- **Enquiries** — the contact form saves submissions to your database; you read them in the admin under **Solicitări**.

The public pages still show fully-rendered HTML instantly (good for speed and SEO) and then quietly refresh with the latest published content.

---

## Files in this folder
- `index.html` + `proiect-*.html` — the public website (4 pages)
- `admin.html` — your private editor (login required)
- `config.js` — where your Supabase keys go *(edit this)*
- `supabase-setup.sql` — database setup (run once)

Keep all of these in the **same folder**, with these exact names.

---

## Step 1 — Create a Supabase project (free)
1. Go to supabase.com → sign up → **New project**. Pick a name and a database password (save it).
2. Wait ~2 minutes for it to finish provisioning.

## Step 2 — Create the database
1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase-setup.sql`, copy everything, paste it in, press **Run**.
   This creates two tables (`site_content`, `leads`) and their security rules.

## Step 3 — Connect your keys
1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `config.js` and paste them in:
   ```js
   window.SB_CONFIG = {
     url: "https://abcd1234.supabase.co",
     anonKey: "eyJhbGciOi...your-anon-key..."
   };
   ```
   The anon key is safe to ship publicly — the database rules (RLS) decide what it can do (read content, submit a lead; nothing else).

## Step 4 — Create your admin login
1. In Supabase: **Authentication → Users → Add user**.
2. Enter your email and a password, and turn on **Auto Confirm User** so you can log in right away.
   That email + password is what you'll use in `admin.html`.

## Step 5 — Publish your starting content
1. Open `admin.html` (locally is fine for this step), log in, then press **Publică pe site** once.
   This writes your current content into the database so the live site reads from it.

## Step 6 — Put it online (you said you have no host yet)
Any static host works. Easiest, free, with a custom domain:

- **Netlify Drop** — go to app.netlify.com/drop and drag this whole folder onto the page. Done; you get a live URL in seconds. Add your domain under **Domain settings**.
- **Cloudflare Pages** — create a project → **Upload assets** → drag the folder. Add your domain under **Custom domains**.

After deploying, open `https://your-site/admin.html` to manage everything from anywhere.

---

## Daily use
- **Change wording or photos:** `admin.html` → edit → **Publică pe site**.
- **Read enquiries:** `admin.html` → **Solicitări**.
- **Backups:** **Exportă ciornă** saves all content as a `.json`; **Descarcă toate** saves standalone copies of the pages.

## Good to know
- The contact form currently stores text fields. File attachments are **not** uploaded yet — visitors can still describe the project and you can request files by email. (We can add file uploads via Supabase Storage later.)
- Want an email each time someone submits? In Supabase you can add a **Database Webhook** on the `leads` table later — optional.
- `admin.html` is protected by login, but it's good practice not to link to it from the public site.
- Replace the placeholder brand name, email and phone in the admin before going live.

If anything errors, tell me the message shown and I'll sort it.
