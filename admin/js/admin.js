// admin.js — Rayl Me v6

let currentUser   = null;
let editingPostId = null;
let editingUserId = null;
let pendingImageFile = null;
let pendingAudioFile = null;
let existingImageUrl = null;
let existingAudioUrl = null;
let isFeatured       = false;
let commentsEnabled  = false;
let allPosts = [], allUsers = [], allSubs = [], allComments = [];
let commentFilter = 'pending';

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('rm_admin');
  if (saved) { currentUser = JSON.parse(saved); showShell(); }

  document.querySelectorAll('.admin-nav-item').forEach(item =>
    item.addEventListener('click', () => goSection(item.dataset.section)));

  ['post-modal','user-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', ev => {
      if (ev.target === document.getElementById(id)) closeModal(id);
    });
  });

  // Enable styleWithCSS for better inline formatting
  try { document.execCommand('styleWithCSS', false, true); } catch(e) {}
});

// ── AUTH ─────────────────────────────────────────────────────

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  document.getElementById('login-error').style.display = 'none';

  if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
    currentUser = { email, role: 'publisher', name: 'Khahlil Louisy' };
    sessionStorage.setItem('rm_admin', JSON.stringify(currentUser));
    showShell(); return;
  }
  try {
    const res  = await fetch(`${SUPABASE_URL}/rest/v1/team_users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(pass)}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const list = await res.json();
    if (list?.length > 0) {
      const u = list[0];
      currentUser = { email: u.email, role: u.role, name: `${u.fname} ${u.lname||''}`.trim() };
      sessionStorage.setItem('rm_admin', JSON.stringify(currentUser));
      showShell(); return;
    }
  } catch(e) { console.error(e); }
  document.getElementById('login-error').style.display = 'block';
}

function doLogout() {
  sessionStorage.removeItem('rm_admin'); currentUser = null;
  document.getElementById('admin-shell').style.display = 'none';
  document.getElementById('admin-login').style.display = 'flex';
  document.getElementById('login-password').value = '';
}

function showShell() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-shell').style.display = 'flex';
  if (currentUser?.name)
    document.getElementById('dash-greeting').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}.`;
  renderDashboard();
}

function toggleSidebar() { document.getElementById('admin-sidebar').classList.toggle('open'); }

// ── SECTIONS ─────────────────────────────────────────────────

function goSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-'+id)?.classList.add('active');
  document.querySelector(`[data-section="${id}"]`)?.classList.add('active');
  document.getElementById('admin-sidebar').classList.remove('open');
  const map = { dashboard: renderDashboard, posts: renderPosts, categories: renderCategories,
    users: renderUsers, comments: renderComments, subscribers: renderSubscribers,
    settings: loadSettings };
  map[id]?.();
}

// ── DASHBOARD ────────────────────────────────────────────────

async function renderDashboard() {
  try {
    const [posts, subs, users, pending] = await Promise.all([
      dbGetAllPosts(), dbGetSubscribers(), dbGetUsers(), dbGetPendingComments()
    ]);
    allPosts = posts; allSubs = subs; allUsers = users;
    document.getElementById('s-posts').textContent   = posts.filter(p => p.status==='published').length;
    document.getElementById('s-subs').textContent    = subs.length;
    document.getElementById('s-users').textContent   = users.length + 1;
    document.getElementById('s-pending').textContent = pending.length;

    if (pending.length > 0) {
      const badge = document.getElementById('comments-badge');
      badge.textContent = pending.length; badge.style.display = 'inline';
    }

    document.getElementById('dash-recent').innerHTML = posts.slice(0,5).map(p =>
      `<tr>
        <td class="td-title">${x(p.title)}${p.featured ? ' ⭐' : ''}</td>
        <td><span class="tag tag-${p.category}">${cl(p.category)}</span></td>
        <td><span class="td-status-${p.status}">${p.status}</span></td>
        <td>${fmtDate(p.created_at)}</td>
      </tr>`).join('') || emptyRow(4, 'No posts yet.');
  } catch(e) { toast('Error loading dashboard.'); console.error(e); }
}

// ── POSTS ─────────────────────────────────────────────────────

async function renderPosts() {
  document.getElementById('posts-table').innerHTML = loadingRow(7);
  try {
    allPosts = await dbGetAllPosts();
    document.getElementById('posts-count').textContent = `All posts (${allPosts.length})`;
    document.getElementById('posts-table').innerHTML = allPosts.length
      ? allPosts.map(p =>
        `<tr>
          <td class="td-title">${x(p.title)}${p.featured ? ' ⭐' : ''}</td>
          <td><span class="tag tag-${p.category}">${cl(p.category)}</span></td>
          <td style="color:var(--text3);">${[p.image_url&&'🖼',p.video_url&&'▶',p.audio_url&&'♪'].filter(Boolean).join(' ')||'—'}</td>
          <td><span class="${p.comments_enabled ? 'td-status-published' : 'td-status-draft'}">${p.comments_enabled ? 'on' : 'off'}</span></td>
          <td><span class="td-status-${p.status}">${p.status}</span></td>
          <td>${fmtDate(p.created_at)}</td>
          <td class="td-actions">
            <button class="admin-btn" onclick="openEditPost('${p.id}')">Edit</button>
            <button class="admin-btn admin-btn-danger" onclick="deletePost('${p.id}')">Delete</button>
          </td>
        </tr>`).join('')
      : emptyRow(7, 'No posts yet.');
  } catch(e) { toast('Error loading posts.'); console.error(e); }
}

// ── FEATURED / COMMENTS TOGGLES ───────────────────────────────

function toggleFeatured() {
  isFeatured = !isFeatured;
  document.getElementById('featured-toggle').classList.toggle('active', isFeatured);
  const c = document.getElementById('featured-check');
  c.classList.toggle('checked', isFeatured); c.textContent = isFeatured ? '✓' : '';
}

function toggleComments() {
  commentsEnabled = !commentsEnabled;
  document.getElementById('comments-toggle').classList.toggle('active', commentsEnabled);
  const c = document.getElementById('comments-check');
  c.classList.toggle('checked', commentsEnabled); c.textContent = commentsEnabled ? '✓' : '';
}

function setFeaturedUI(val) {
  isFeatured = !!val;
  document.getElementById('featured-toggle').classList.toggle('active', isFeatured);
  const c = document.getElementById('featured-check');
  c.classList.toggle('checked', isFeatured); c.textContent = isFeatured ? '✓' : '';
}

function setCommentsUI(val) {
  commentsEnabled = !!val;
  document.getElementById('comments-toggle').classList.toggle('active', commentsEnabled);
  const c = document.getElementById('comments-check');
  c.classList.toggle('checked', commentsEnabled); c.textContent = commentsEnabled ? '✓' : '';
}

// ── AUTO READ TIME ────────────────────────────────────────────

function autoReadTime() {
  const editor = document.getElementById('editor');
  if (!editor) return;
  const text = editor.innerText || editor.textContent || '';
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 10) { document.getElementById('p-time').value = ''; return; }
  const mins = Math.max(1, Math.ceil(wordCount / 238));
  document.getElementById('p-time').value = `${mins} min read`;
}

// ── POST OPEN/SAVE ────────────────────────────────────────────

function openNewPost() {
  editingPostId = null; pendingImageFile = null; pendingAudioFile = null;
  existingImageUrl = null; existingAudioUrl = null;
  document.getElementById('post-modal-title').textContent = 'New post';
  ['p-title','p-author','p-time','p-video'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-cat').value = 'bodies';
  document.getElementById('editor').innerHTML = '';
  setFeaturedUI(false); setCommentsUI(false);
  resetImagePreview(); resetAudioPreview();
  document.getElementById('post-modal').classList.add('open');
  setTimeout(() => document.getElementById('p-title').focus(), 120);
}

async function openEditPost(id) {
  editingPostId = id;
  const p = allPosts.find(q => q.id === id); if (!p) return;
  pendingImageFile = null; pendingAudioFile = null;
  existingImageUrl = p.image_url || null; existingAudioUrl = p.audio_url || null;
  document.getElementById('post-modal-title').textContent = 'Edit post';
  document.getElementById('p-title').value  = p.title || '';
  document.getElementById('p-cat').value    = p.category || 'bodies';
  document.getElementById('p-author').value = p.author || '';
  document.getElementById('p-time').value   = p.read_time || '';
  document.getElementById('p-video').value  = p.video_url || '';
  document.getElementById('editor').innerHTML = p.body || '';
  setFeaturedUI(p.featured || false);
  setCommentsUI(p.comments_enabled || false);
  p.image_url ? showImageCurrent(p.image_url) : resetImagePreview();
  p.audio_url ? showAudioCurrent(p.audio_url) : resetAudioPreview();
  document.getElementById('post-modal').classList.add('open');
}

async function savePost(forcedStatus) {
  const title = document.getElementById('p-title').value.trim();
  if (!title) { toast('Title is required.'); return; }
  document.getElementById('modal-saving').style.display = 'inline';
  try {
    let imageUrl = existingImageUrl;
    if (pendingImageFile) imageUrl = await uploadFile(pendingImageFile, 'images');
    let audioUrl = existingAudioUrl;
    if (pendingAudioFile) audioUrl = await uploadFile(pendingAudioFile, 'audio');

    const body = document.getElementById('editor').innerHTML;
    const post = {
      title, category: document.getElementById('p-cat').value, status: forcedStatus,
      author: document.getElementById('p-author').value.trim() || null,
      read_time: document.getElementById('p-time').value.trim() || null,
      video_url: document.getElementById('p-video').value.trim() || null,
      body, image_url: imageUrl || null, audio_url: audioUrl || null,
      featured: isFeatured, comments_enabled: commentsEnabled,
      updated_at: new Date().toISOString()
    };

    if (editingPostId) {
      await dbUpdatePost(editingPostId, post);
      if (isFeatured) await dbSetFeatured(editingPostId);
      toast('Post updated ✓');
    } else {
      const created = await dbCreatePost(post);
      if (isFeatured && created?.[0]?.id) await dbSetFeatured(created[0].id);
      toast(forcedStatus === 'published' ? 'Published ✓' : 'Draft saved ✓');
    }
    closeModal('post-modal'); renderPosts(); renderDashboard();
  } catch(e) { toast('Error saving: ' + e.message); console.error(e); }
  finally { document.getElementById('modal-saving').style.display = 'none'; }
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  try { await dbDeletePost(id); toast('Deleted.'); renderPosts(); renderDashboard(); }
  catch(e) { toast('Error deleting.'); console.error(e); }
}

// ── RICH TEXT EDITOR (fixed) ──────────────────────────────────
// Use onmousedown + preventDefault to keep editor focus, then execCommand

function e(ev, cmd) {
  ev.preventDefault(); // CRITICAL: prevents editor from losing focus
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(cmd, false, null);
}

function eBlock(tag) {
  if (!tag) return;
  const editor = document.getElementById('editor');
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('formatBlock', false, tag);
}

function eFont(font) {
  if (!font) return;
  const editor = document.getElementById('editor');
  editor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  document.execCommand('styleWithCSS', false, true);
  // Wrap selection in a span with font-family
  wrapSelection('span', { fontFamily: font });
}

function eSize(size) {
  if (!size) return;
  const editor = document.getElementById('editor');
  editor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  wrapSelection('span', { fontSize: size });
}

function eColor(color) {
  const editor = document.getElementById('editor');
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, color);
}

function eAlign(ev, cmd) {
  ev.preventDefault();
  const editor = document.getElementById('editor');
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(cmd, false, null);
}

// Reliable selection wrapper for font/size (avoids execCommand fontName issues)
function wrapSelection(tag, styles) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  try {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    range.surroundContents(el);
    // Restore selection
    const newRange = document.createRange();
    newRange.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } catch(err) {
    // surroundContents fails on partial node selections; use insertHTML fallback
    const html = range.toString();
    if (!html) return;
    const styleStr = Object.entries(styles).map(([k,v]) => `${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';');
    document.execCommand('insertHTML', false, `<${tag} style="${styleStr}">${html}</${tag}>`);
  }
}

function insertLink(ev) {
  ev.preventDefault();
  const url = prompt('Enter URL (include https://):');
  if (!url) return;
  document.getElementById('editor').focus();
  document.execCommand('createLink', false, url);
  document.getElementById('editor').querySelectorAll('a:not([target])').forEach(a => {
    a.target = '_blank'; a.rel = 'noopener noreferrer';
  });
}

function insertDivider(ev) {
  ev.preventDefault();
  document.getElementById('editor').focus();
  document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;"><p><br></p>');
}

function insertInlineImage(ev) {
  ev.preventDefault();
  document.getElementById('inline-img-input').click();
}

async function handleInlineImage(input) {
  const file = input.files[0]; if (!file) return; input.value = '';
  toast('Uploading…');
  try {
    const url = await uploadFile(file, 'inline');
    document.getElementById('editor').focus();
    const caption = prompt('Caption (optional — press Cancel to skip):');
    let html = `<img src="${url}" alt="${caption||''}" style="max-width:100%;border-radius:4px;margin:20px 0;display:block;">`;
    if (caption) html += `<p style="font-size:12px;color:#888;text-align:center;margin-top:-12px;margin-bottom:16px;font-family:'DM Mono',monospace;">${caption}</p>`;
    html += '<p><br></p>';
    document.execCommand('insertHTML', false, html);
    toast('Image inserted ✓');
    autoReadTime();
  } catch(e) { toast('Upload failed.'); console.error(e); }
}

function insertVideoEmbed(ev) {
  ev.preventDefault();
  const url = prompt('Paste YouTube or Vimeo URL:');
  if (!url) return;
  const embed = videoEmbedUrl(url);
  if (!embed) { toast('Not a valid YouTube or Vimeo URL.'); return; }
  document.getElementById('editor').focus();
  const html = `<iframe src="${embed}" style="width:100%;aspect-ratio:16/9;border:none;border-radius:4px;margin:20px 0;display:block;" allowfullscreen></iframe><p><br></p>`;
  document.execCommand('insertHTML', false, html);
}

// ── FEATURE IMAGE / AUDIO ─────────────────────────────────────

function handleImageUpload(input) {
  const file = input.files[0]; if (!file) return;
  pendingImageFile = file; showImageCurrent(URL.createObjectURL(file), file.name); input.value = '';
}
function showImageCurrent(url, name) {
  document.getElementById('img-upload-area').style.display = 'none';
  const el = document.getElementById('img-current'); el.style.display = 'flex';
  el.innerHTML = `<img src="${url}" alt=""><span class="current-media-name">${name||url.split('/').pop()}</span><span class="current-media-remove" onclick="clearImage()">✕</span>`;
}
function clearImage() { pendingImageFile = null; existingImageUrl = null; resetImagePreview(); }
function resetImagePreview() {
  document.getElementById('img-upload-area').style.display = 'block';
  document.getElementById('img-current').style.display = 'none'; document.getElementById('img-current').innerHTML = '';
}
function handleAudioUpload(input) {
  const file = input.files[0]; if (!file) return;
  pendingAudioFile = file; showAudioCurrent(file.name); input.value = '';
}
function showAudioCurrent(n) {
  document.getElementById('audio-upload-area').style.display = 'none';
  const el = document.getElementById('audio-current'); el.style.display = 'flex';
  el.innerHTML = `<span style="font-size:18px;">♪</span><span class="current-media-name">${n.split('/').pop()}</span><span class="current-media-remove" onclick="clearAudio()">✕</span>`;
}
function clearAudio() { pendingAudioFile = null; existingAudioUrl = null; resetAudioPreview(); }
function resetAudioPreview() {
  document.getElementById('audio-upload-area').style.display = 'block';
  document.getElementById('audio-current').style.display = 'none'; document.getElementById('audio-current').innerHTML = '';
}

// ── CATEGORIES ───────────────────────────────────────────────

async function renderCategories() {
  try {
    if (!allPosts.length) allPosts = await dbGetAllPosts();
    document.getElementById('cats-table').innerHTML = CATEGORIES.map(c => {
      const n = allPosts.filter(p => p.category === c.id).length;
      return `<tr><td><span class="tag tag-${c.id}">${c.label}</span></td><td style="color:var(--text3);font-family:var(--mono);font-size:11px;">${c.id}</td><td style="color:var(--text2);font-family:var(--mono);font-size:11px;">${n}</td></tr>`;
    }).join('');
  } catch(e) { console.error(e); }
}

// ── COMMENTS ─────────────────────────────────────────────────

async function renderComments() {
  document.getElementById('comments-mod-list').innerHTML = loadingRow(1);
  try {
    allComments = await dbGetAllComments();
    document.getElementById('comments-badge').style.display = 'none';
    filterComments(commentFilter);
  } catch(e) { toast('Error loading comments.'); console.error(e); }
}

function filterComments(filter) {
  commentFilter = filter;
  ['pending','approved','rejected','all-c'].forEach(f => {
    document.getElementById(`filter-${f}`)?.classList.remove('active');
  });
  const btnId = filter === 'all' ? 'filter-all-c' : `filter-${filter}`;
  document.getElementById(btnId)?.classList.add('active');

  const filtered = filter === 'all' ? allComments : allComments.filter(c => c.status === filter);
  const list = document.getElementById('comments-mod-list');
  if (!filtered.length) {
    list.innerHTML = `<div style="color:var(--text3);font-family:var(--mono);font-size:12px;padding:20px 0;">No ${filter === 'all' ? '' : filter} comments.</div>`;
    return;
  }
  list.innerHTML = filtered.map(c => `
    <div class="comment-mod-item">
      <div class="comment-mod-header">
        <div class="comment-mod-meta"><strong>${x(c.author_name)}</strong>${c.author_email ? ` · ${x(c.author_email)}` : ''} · ${fmtDate(c.created_at)}</div>
        <span class="status-${c.status}">${c.status}</span>
      </div>
      <div class="comment-mod-body">${x(c.body)}</div>
      <div class="comment-mod-actions">
        ${c.status !== 'approved' ? `<button class="admin-btn" onclick="moderateComment('${c.id}','approved')">✓ Approve</button>` : ''}
        ${c.status !== 'rejected' ? `<button class="admin-btn admin-btn-danger" onclick="moderateComment('${c.id}','rejected')">✕ Reject</button>` : ''}
        <button class="admin-btn admin-btn-danger" onclick="removeComment('${c.id}')">Delete</button>
      </div>
    </div>`).join('');
}

async function moderateComment(id, status) {
  try {
    await dbModerateComment(id, status);
    const c = allComments.find(c => c.id === id); if (c) c.status = status;
    filterComments(commentFilter);
    toast(status === 'approved' ? 'Comment approved ✓' : 'Comment rejected.');
  } catch(e) { toast('Error.'); console.error(e); }
}

async function removeComment(id) {
  if (!confirm('Delete this comment?')) return;
  try {
    await dbDeleteComment(id);
    allComments = allComments.filter(c => c.id !== id);
    filterComments(commentFilter);
    toast('Deleted.');
  } catch(e) { toast('Error.'); console.error(e); }
}

// ── USERS ─────────────────────────────────────────────────────

async function renderUsers() {
  document.getElementById('users-table').innerHTML = loadingRow(5);
  try {
    allUsers = await dbGetUsers();
    const adminRow = `<tr><td class="td-title">Khahlil Louisy</td><td style="color:var(--text3);font-family:var(--mono);font-size:11px;">${ADMIN_EMAIL}</td><td><span class="role-badge role-publisher">Publisher</span></td><td style="color:var(--text3);font-family:var(--mono);font-size:11px;">Owner</td><td></td></tr>`;
    document.getElementById('users-table').innerHTML = adminRow + allUsers.map(u =>
      `<tr>
        <td class="td-title">${x(u.fname+' '+(u.lname||''))}</td>
        <td style="color:var(--text3);font-family:var(--mono);font-size:11px;">${x(u.email)}</td>
        <td><span class="role-badge role-${u.role}">${ROLE_LABELS[u.role]||u.role}</span></td>
        <td style="color:var(--text3);font-family:var(--mono);font-size:11px;">${fmtDate(u.created_at)}</td>
        <td class="td-actions">
          <button class="admin-btn" onclick="openEditUser('${u.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteUser('${u.id}')">Remove</button>
        </td>
      </tr>`).join('');
  } catch(e) { toast('Error loading users.'); console.error(e); }
}

function openNewUser() {
  editingUserId = null;
  document.getElementById('user-modal-title').textContent = 'New user';
  ['u-fname','u-lname','u-email','u-bio'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-role').value = 'writer';
  document.getElementById('user-modal').classList.add('open');
}

function openEditUser(id) {
  const u = allUsers.find(q => q.id === id); if (!u) return;
  editingUserId = id;
  document.getElementById('user-modal-title').textContent = 'Edit user';
  document.getElementById('u-fname').value = u.fname || '';
  document.getElementById('u-lname').value = u.lname || '';
  document.getElementById('u-email').value = u.email || '';
  document.getElementById('u-role').value  = u.role || 'writer';
  document.getElementById('u-bio').value   = u.bio || '';
  document.getElementById('user-modal').classList.add('open');
}

async function saveUser() {
  const fname = document.getElementById('u-fname').value.trim();
  const email = document.getElementById('u-email').value.trim();
  if (!fname || !email) { toast('Name and email required.'); return; }
  document.getElementById('user-saving').style.display = 'inline';
  try {
    const user = { fname, email, lname: document.getElementById('u-lname').value.trim()||null, role: document.getElementById('u-role').value, bio: document.getElementById('u-bio').value.trim()||null };
    if (editingUserId) { await dbUpdateUser(editingUserId, user); toast('User updated ✓'); }
    else { await dbCreateUser(user); toast('User added ✓'); }
    closeModal('user-modal'); renderUsers(); renderDashboard();
  } catch(e) { toast('Error saving user.'); console.error(e); }
  finally { document.getElementById('user-saving').style.display = 'none'; }
}

async function deleteUser(id) {
  if (!confirm('Remove this user?')) return;
  try { await dbDeleteUser(id); toast('Removed.'); renderUsers(); renderDashboard(); }
  catch(e) { toast('Error.'); console.error(e); }
}

// ── SUBSCRIBERS ───────────────────────────────────────────────

async function renderSubscribers() {
  document.getElementById('subs-table').innerHTML = loadingRow(3);
  try {
    allSubs = await dbGetSubscribers();
    document.getElementById('subs-count').textContent = `All subscribers (${allSubs.length})`;
    document.getElementById('subs-table').innerHTML = allSubs.length
      ? allSubs.map(s =>
        `<tr>
          <td style="color:var(--text);font-family:var(--mono);font-size:12px;">${x(s.email)}</td>
          <td style="color:var(--text3);font-family:var(--mono);font-size:12px;">${s.source||'homepage'}</td>
          <td style="color:var(--text3);font-family:var(--mono);font-size:12px;">${fmtDate(s.created_at)}</td>
        </tr>`).join('')
      : emptyRow(3, 'No subscribers yet.');
  } catch(e) { toast('Error loading subscribers.'); console.error(e); }
}

function exportSubs() {
  if (!allSubs.length) { toast('No subscribers to export.'); return; }
  const csv = 'Email,Source,Date\n' + allSubs.map(s => `${s.email},${s.source||'homepage'},${fmtDate(s.created_at)}`).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `rayl-me-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ── SETTINGS / SOCIAL LINKS ───────────────────────────────────

async function loadSettings() {
  try {
    const settings = await dbGetSettings();
    ['instagram','twitter','tiktok','facebook','youtube','linkedin'].forEach(p => {
      const el = document.getElementById(`s-${p}`);
      if (el) el.value = settings[`social_${p}`] || '';
    });
  } catch(e) { console.error('Error loading settings:', e); }
}

async function saveSocialLinks() {
  const platforms = ['instagram','twitter','tiktok','facebook','youtube','linkedin'];
  try {
    await Promise.all(platforms.map(p => {
      const val = document.getElementById(`s-${p}`)?.value.trim() || '';
      return dbSetSetting(`social_${p}`, val);
    }));
    const msg = document.getElementById('social-save-msg');
    msg.style.display = 'inline';
    setTimeout(() => msg.style.display = 'none', 2500);
    toast('Social links saved ✓');
  } catch(e) { toast('Error saving social links.'); console.error(e); }
}

// ── UTILS ─────────────────────────────────────────────────────

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function cl(id) { return CATEGORIES.find(c => c.id === id)?.label || id; }
function x(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
function loadingRow(c) { return `<tr><td colspan="${c}" style="color:var(--text3);text-align:center;padding:24px;font-family:var(--mono);font-size:11px;">Loading…</td></tr>`; }
function emptyRow(c, m) { return `<tr><td colspan="${c}" style="color:var(--text3);text-align:center;padding:28px;font-family:var(--mono);font-size:11px;">${m}</td></tr>`; }
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}
