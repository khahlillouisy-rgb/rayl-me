// main.js — Rayl Me v6

let currentCat    = 'all';
let currentPage   = 0;
let allLoaded     = false;
let currentPostId = null;
let siteSettings  = {};
const PAGE_SIZE   = 9;

// SVG icons for social platforms
const SOCIAL_SVGS = {
  instagram: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
};

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  // Load settings (social links) first
  try {
    siteSettings = await dbGetSettings();
    renderSocialIcons();
  } catch(e) { console.warn('Could not load settings:', e); }
  initView();
});

window.addEventListener('hashchange', initView);

function initView() {
  const hash = window.location.hash;
  if (hash.startsWith('#article/')) {
    openArticleById(hash.replace('#article/', ''));
  } else if (hash.startsWith('#category/')) {
    const cat = hash.replace('#category/', '');
    setCategory(cat);
  } else {
    setCategory('all');
  }
}

// ── SOCIAL ICONS ─────────────────────────────────────────────

function absoluteUrl(url) {
  if (!url) return '';
  url = url.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return 'https://' + url;
}

function renderSocialIcons() {
  const platforms = ['instagram','twitter','tiktok','facebook','youtube','linkedin'];
  const icons = platforms
    .filter(p => siteSettings[`social_${p}`])
    .map(p => `<a href="${absoluteUrl(siteSettings[`social_${p}`])}" target="_blank" rel="noopener noreferrer" class="social-icon" title="${p}">${SOCIAL_SVGS[p]}</a>`)
    .join('');

  ['topbar-social','footer-social','article-footer-social'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icons;
  });
}

// ── NAV ──────────────────────────────────────────────────────

function setupNav() {
  document.getElementById('main-nav').querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      const cat = a.dataset.cat;
      window.location.hash = cat === 'all' ? '' : `#category/${cat}`;
    });
  });
}

function setCategory(cat) {
  currentCat  = cat;
  currentPage = 0;
  allLoaded   = false;
  document.querySelectorAll('.nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.cat === cat));
  showView('view-home');
  if (cat === 'all') {
    showHomeSections(true);
    document.getElementById('feed-label').textContent = 'Latest';
    loadHero();
    loadPosts(true);
  } else {
    showHomeSections(false);
    loadCategoryView(cat);
  }
}

function showHomeSections(show) {
  document.getElementById('home-sections').style.display = show ? '' : 'none';
}

// ── HERO ─────────────────────────────────────────────────────

async function loadHero() {
  const wrap = document.getElementById('hero-wrap');
  wrap.innerHTML = staticHero();
  try {
    const featured = await dbGetFeaturedPost();
    if (featured) wrap.innerHTML = dynamicHero(featured);
  } catch(e) { console.error('Hero:', e); }
}

function dynamicHero(post) {
  let heroBg = '';
  if (post.video_url) {
    const embed = videoEmbedUrl(post.video_url);
    if (embed) heroBg = `<iframe src="${embed}?autoplay=1&muted=1&loop=1&controls=0&background=1" class="hero-video-bg" allowfullscreen></iframe>`;
  }
  if (!heroBg && post.image_url) {
    heroBg = `<div class="hero-bg-img" style="background-image:url('${esc(post.image_url)}')"></div>`;
  }
  if (!heroBg) {
    heroBg = `<div class="hero-bg"></div><div class="hero-orb"></div><span class="hero-img-label">Feature image</span>`;
  }
  return `<div class="hero hero-full">
    <div class="hero-main" onclick="window.location.hash='#article/${post.id}'">
      ${heroBg}
      <div class="hero-overlay"></div>
      <div class="hero-main-content">
        <span class="tag tag-${esc(post.category)}">${catLabel(post.category)}</span>
        <div class="hero-main-title">${esc(post.title)}</div>
        <div class="hero-main-byline">${post.author ? esc(post.author) + ' &nbsp;·&nbsp; ' : ''}${post.read_time ? esc(post.read_time) : ''}</div>
      </div>
    </div>
  </div>`;
}

function staticHero() {
  return `<div class="hero hero-full">
    <div class="hero-main">
      <div class="hero-bg"></div><div class="hero-orb"></div>
      <span class="hero-img-label">Feature image</span>
      <div class="hero-overlay"></div>
      <div class="hero-main-content">
        <span class="tag tag-scene">Scene</span>
        <div class="hero-main-title">What underground party promoters actually think about consent culture — and what they don't</div>
        <div class="hero-main-byline">By Khahlil Louisy &nbsp;·&nbsp; 12 min read</div>
      </div>
    </div>
  </div>`;
}

// ── CATEGORY VIEW ─────────────────────────────────────────────

async function loadCategoryView(cat) {
  document.getElementById('feed-label').textContent = catLabel(cat);
  document.getElementById('hero-wrap').innerHTML = '';
  document.getElementById('posts-grid').innerHTML = skeletons(PAGE_SIZE);
  document.getElementById('load-more-wrap').style.display = 'none';
  try {
    const heroPosts = await dbGetPublishedPosts(1, 0, cat);
    if (heroPosts.length > 0) {
      document.getElementById('hero-wrap').innerHTML = dynamicHero(heroPosts[0]);
    } else {
      document.getElementById('hero-wrap').innerHTML = categoryEmptyHero(catLabel(cat));
    }
    const posts = await dbGetPublishedPosts(PAGE_SIZE, 1, cat);
    renderPosts(posts, true);
    document.getElementById('load-more-wrap').style.display = posts.length === PAGE_SIZE ? 'block' : 'none';
    currentPage = 1;
  } catch(e) { console.error(e); }
}

function categoryEmptyHero(label) {
  return `<div class="category-empty-hero"><div class="category-empty-label">${label}</div><div class="category-empty-sub">No posts in this category yet.</div></div>`;
}

// ── POSTS FEED ────────────────────────────────────────────────

async function loadPosts(reset = false) {
  if (reset) {
    currentPage = 0; allLoaded = false;
    document.getElementById('posts-grid').innerHTML = skeletons(PAGE_SIZE);
    document.getElementById('load-more-wrap').style.display = 'none';
  }
  try {
    const offset = currentCat === 'all' && currentPage === 0 ? 1 : currentPage * PAGE_SIZE;
    const posts = await dbGetPublishedPosts(PAGE_SIZE, offset, currentCat === 'all' ? null : currentCat);
    renderPosts(posts, reset);
    document.getElementById('load-more-wrap').style.display = posts.length === PAGE_SIZE ? 'block' : 'none';
    if (posts.length < PAGE_SIZE) allLoaded = true;
    currentPage++;
  } catch(e) {
    document.getElementById('posts-grid').innerHTML =
      `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;grid-column:1/-1;padding:20px 0;">Could not load posts.</div>`;
  }
}

function loadMorePosts() { if (!allLoaded) loadPosts(false); }

function renderPosts(posts, reset) {
  const grid = document.getElementById('posts-grid');
  if (reset) grid.innerHTML = '';
  if (!posts.length && reset) {
    grid.innerHTML = `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;grid-column:1/-1;padding:20px 0;">No posts yet.</div>`;
    return;
  }
  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => { window.location.hash = `#article/${post.id}`; };
    card.innerHTML = `
      <div class="card-img">${post.image_url ? `<img src="${esc(post.image_url)}" alt="${esc(post.title)}" loading="lazy">` : `<span class="card-img-placeholder">Image</span>`}</div>
      <span class="tag tag-${esc(post.category)}">${catLabel(post.category)}</span>
      <div class="card-title">${esc(post.title)}</div>
      <div class="card-byline">${post.author ? esc(post.author) + ' &nbsp;·&nbsp; ' : ''}${post.read_time || ''}</div>`;
    grid.appendChild(card);
  });
}

function skeletons(n) { return Array(n).fill('<div class="skeleton-card"></div>').join(''); }

// ── ARTICLE ──────────────────────────────────────────────────

async function openArticleById(id) {
  currentPostId = id;
  showView('view-article');
  document.getElementById('art-title').textContent = 'Loading…';
  document.getElementById('art-body').innerHTML = '';
  document.getElementById('art-media').innerHTML = '';
  document.getElementById('comments-section').style.display = 'none';

  try {
    const post = await dbGetPost(id);
    if (!post) { goHome(); return; }
    renderArticle(post);

    if (post.comments_enabled) {
      document.getElementById('comments-section').style.display = 'block';
      const comments = await dbGetApprovedComments(id).catch(() => []);
      renderComments(comments);
    }
  } catch(e) {
    document.getElementById('art-title').textContent = 'Could not load article.';
    console.error(e);
  }
}

function renderArticle(post) {
  document.getElementById('art-tag').className = `tag tag-${post.category}`;
  document.getElementById('art-tag').textContent = catLabel(post.category);
  document.getElementById('art-title').textContent = post.title;
  document.getElementById('art-byline').textContent = post.author || '';
  document.getElementById('art-sep').style.display = post.author && post.read_time ? '' : 'none';
  document.getElementById('art-time').textContent = post.read_time || '';

  const mediaEl = document.getElementById('art-media');
  if (post.video_url) {
    const embed = videoEmbedUrl(post.video_url);
    if (embed) mediaEl.innerHTML = `<div class="article-media"><iframe src="${embed}" allowfullscreen></iframe></div>`;
  } else if (post.image_url) {
    mediaEl.innerHTML = `<div class="article-media"><img src="${esc(post.image_url)}" alt="${esc(post.title)}"></div>`;
  } else if (post.audio_url) {
    mediaEl.innerHTML = `<div class="article-media"><audio src="${esc(post.audio_url)}" controls></audio></div>`;
  } else {
    mediaEl.innerHTML = `<div class="article-media-placeholder">Feature image</div>`;
  }

  // Render body — stored as HTML from rich editor, render directly
  document.getElementById('art-body').innerHTML = post.body || '';
  window.scrollTo(0, 0);

  // Update article footer social icons
  renderSocialIcons();
}

// ── COMMENTS ─────────────────────────────────────────────────

function renderComments(comments) {
  const list = document.getElementById('comments-list');
  if (!comments.length) {
    list.innerHTML = `<div class="comments-empty">No comments yet. Be the first.</div>`;
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment">
      <div class="comment-meta">
        <span class="comment-author">${esc(c.author_name)}</span>
        <span class="comment-date">${fmtDate(c.created_at)}</span>
      </div>
      <div class="comment-body">${esc(c.body)}</div>
    </div>`).join('');
}

async function submitComment() {
  const name  = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const body  = document.getElementById('c-body').value.trim();
  if (!name || !body) { toast('Name and comment are required.'); return; }
  const btn = document.querySelector('.comment-submit');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await dbSubmitComment(currentPostId, name, email, body);
    document.getElementById('c-name').value  = '';
    document.getElementById('c-email').value = '';
    document.getElementById('c-body').value  = '';
    toast('Comment submitted — pending moderation. ✓');
  } catch(e) {
    toast('Could not submit comment. Try again.');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit comment';
  }
}

// ── NEWSLETTER ────────────────────────────────────────────────

async function subscribe() {
  const input = document.getElementById('newsletter-email');
  const email = input.value.trim();
  if (!email || !email.includes('@')) { toast('Please enter a valid email.'); return; }
  try {
    await dbAddSubscriber(email);
    input.value = '';
    toast('Subscribed! Welcome to Rayl Me. ✓');
  } catch(e) {
    toast(e.message === 'already_subscribed' ? 'Already subscribed!' : 'Something went wrong.');
  }
}

// ── UTILS ─────────────────────────────────────────────────────

function goHome() {
  window.location.hash = '';
  setCategory('all');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function catLabel(id) { return CATEGORIES.find(c => c.id === id)?.label || id; }

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}
