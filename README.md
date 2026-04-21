# Rayl Me

Sexual Health. Consent. Culture.

## Structure

```
rayl-me/
├── index.html          ← Public homepage
├── css/
│   └── style.css       ← Public site styles
├── js/
│   ├── config.js       ← Supabase keys + shared constants
│   ├── db.js           ← All Supabase database calls
│   └── main.js         ← Public site logic
└── admin/
    ├── index.html      ← Admin portal
    ├── css/
    │   └── admin.css   ← Admin styles
    └── js/
        └── admin.js    ← Admin logic
```

## Deploying to GitHub Pages

1. Create a new GitHub repo (e.g. `rayl-me`)
2. Push this folder as the root of the repo
3. Go to repo Settings → Pages → Source: `main` branch, root `/`
4. Your site will be live at `https://yourusername.github.io/rayl-me/`
5. Admin panel will be at `https://yourusername.github.io/rayl-me/admin/`

## Custom domain (rayl.me)

1. In GitHub Pages settings, add custom domain: `rayl.me`
2. In your DNS provider, add:
   - A record → `185.199.108.153`
   - A record → `185.199.109.153`
   - A record → `185.199.110.153`
   - A record → `185.199.111.153`
3. Enable "Enforce HTTPS" in Pages settings

## Supabase

Database: `ayiwoadvzozoqwmnwdjp.supabase.co`

Tables:
- `posts` — all editorial content
- `subscribers` — newsletter signups
- `team_users` — team members and roles

Storage bucket: `raylme-media` (images, audio)

## Video

Videos are embedded via YouTube or Vimeo URL — no direct uploads.
Paste the URL in the admin post form and it renders as a responsive embed.
