// ============================================================
// db.js — all Supabase interactions
// ============================================================

const API = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const BUCKET = 'raylme-media';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// ── POSTS ────────────────────────────────────────────────────

async function dbGetPublishedPosts(limit = 9, offset = 0, category = null) {
  let url = `${API}/posts?status=eq.published&order=created_at.desc&limit=${limit}&offset=${offset}`;
  if (category && category !== 'all') url += `&category=eq.${category}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbGetAllPosts() {
  const res = await fetch(`${API}/posts?order=created_at.desc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbGetPost(id) {
  const res = await fetch(`${API}/posts?id=eq.${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

async function dbCreatePost(post) {
  const res = await fetch(`${API}/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(post),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbUpdatePost(id, post) {
  const res = await fetch(`${API}/posts?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(post),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbDeletePost(id) {
  const res = await fetch(`${API}/posts?id=eq.${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// ── SUBSCRIBERS ──────────────────────────────────────────────

async function dbGetSubscribers() {
  const res = await fetch(`${API}/subscribers?order=created_at.desc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbAddSubscriber(email, source = 'homepage') {
  const res = await fetch(`${API}/subscribers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, source }),
  });
  if (res.status === 409) throw new Error('already_subscribed');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── TEAM USERS ───────────────────────────────────────────────

async function dbGetUsers() {
  const res = await fetch(`${API}/team_users?order=created_at.asc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbCreateUser(user) {
  const res = await fetch(`${API}/team_users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbUpdateUser(id, user) {
  const res = await fetch(`${API}/team_users?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbDeleteUser(id) {
  const res = await fetch(`${API}/team_users?id=eq.${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// ── STORAGE (images / audio) ─────────────────────────────────

async function uploadFile(file, folder = 'images') {
  const ext  = file.name.split('.').pop();
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const res  = await fetch(`${STORAGE}/object/${BUCKET}/${name}`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  file.type,
    },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text());
  return `${STORAGE}/object/public/${BUCKET}/${name}`;
}

// ── VIDEO EMBED HELPERS ──────────────────────────────────────

function videoEmbedUrl(url) {
  if (!url) return null;
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?color=ffffff&title=0&byline=0&portrait=0`;
  return null;
}

function isVideoUrl(url) {
  return !!(url && (url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo')));
}

// ── SITE SETTINGS ────────────────────────────────────────────

async function dbGetSettings() {
  const res = await fetch(`${API}/site_settings`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  return obj;
}

async function dbSetSetting(key, value) {
  const res = await fetch(`${API}/site_settings`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// ── FEATURED POST ────────────────────────────────────────────

async function dbGetFeaturedPost() {
  const res = await fetch(`${API}/posts?status=eq.published&featured=eq.true&limit=1`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

async function dbSetFeatured(id) {
  // Unfeature all first, then feature the selected one
  await fetch(`${API}/posts?status=eq.published`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ featured: false }),
  });
  const res = await fetch(`${API}/posts?id=eq.${id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ featured: true }),
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// ── COMMENTS ─────────────────────────────────────────────────

async function dbGetApprovedComments(postId) {
  const res = await fetch(`${API}/comments?post_id=eq.${postId}&status=eq.approved&order=created_at.asc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbGetAllComments() {
  const res = await fetch(`${API}/comments?order=created_at.desc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbGetPendingComments() {
  const res = await fetch(`${API}/comments?status=eq.pending&order=created_at.desc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbSubmitComment(postId, authorName, authorEmail, body) {
  const res = await fetch(`${API}/comments`, {
    method: 'POST', headers,
    body: JSON.stringify({ post_id: postId, author_name: authorName, author_email: authorEmail || null, body }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbModerateComment(id, status) {
  const res = await fetch(`${API}/comments?id=eq.${id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbDeleteComment(id) {
  const res = await fetch(`${API}/comments?id=eq.${id}`, {
    method: 'DELETE', headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}
