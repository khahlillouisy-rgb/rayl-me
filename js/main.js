// main.js — Rayl Me public site

let currentCat  = 'all';
let currentPage = 0;
let allLoaded   = false;
let currentPostId = null;
const PAGE_SIZE = 9;

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
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
    showView('view-home');
  } else {
    showView('view-home');
    if (currentCat === 'all') {
      loadHero();
      loadPosts(true);
      showHomeSections(true);
    }
  }
}

// ── NAV ──────────────────────────────────────────────────────

function setupNav() {
  document.getElementById('main-nav').querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      const cat = a.dataset.cat;
      window.location.hash = cat === 'all' ? '' : `#category/${cat}`;
      setCategory(cat);
    });
  });
}

function setCategory(cat) {
  currentCat  = cat;
  currentPage = 0;
  allLoaded   = false;

  // Update nav active state
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.cat === cat);
  });

  showView('view-home');

  if (cat === 'all') {
    loadHero();
    showHomeSections(true);
    document.getElementById('feed-label').textContent = 'Latest';
    loadPosts(true);
  } else {
    showHomeSections(false);
    loadCategoryView(cat);
  }
}

function showHomeSections(show) {
  document.getElementById('home-sections').style.display = show ? '' : 'none';
}

// ── HERO (featured post or static fallback) ───────────────────

async function loadHero() {
  const wrap = document.getElementById('hero-wrap');
  wrap.innerHTML = staticHero(); // show immediately, replace if featured exists
  try {
    const featured = await dbGetFeaturedPost();
    if (featured) {
      wrap.innerHTML = dynamicHero(featured);
    }
  } catch(e) {
    console.error('Hero load error:', e);
  }
}

function dynamicHero(post) {
  const bgStyle = post.image_url
    ? `style="background-image:url('${esc(post.image_url)}');background-size:cover;background-position:center;"`
    : '';
  const videoEmbed = post.video_url ? videoEmbedUrl(post.video_url) : null;

  let heroBg = '';
  if (videoEmbed) {
    heroBg = `<iframe src="${videoEmbed}?autoplay=1&muted=1&loop=1&controls=0&background=1" class="hero-video-bg" allowfullscreen></iframe>`;
  } else if (post.image_url) {
    heroBg = `<div class="hero-bg-img" style="background-image:url('${esc(post.image_url)}')"></div>`;
  } else {
    heroBg = `<div class="hero-bg"></div><div class="hero-orb"></div><span class="hero-img-label">Feature image</span>`;
  }

  return `<div class="hero">
    <div class="hero-main" onclick="window.location.hash='#article/${post.id}'">
      ${heroBg}
      <div class="hero-overlay"></div>
      <div class="hero-main-content">
        <span class="tag tag-${esc(post.category)}">${catLabel(post.category)}</span>
        <div class="hero-main-title">${esc(post.title)}</div>
        <div class="hero-main-byline">${post.author ? esc(post.author) + ' &nbsp;·&nbsp; ' : ''}${post.read_time ? esc(post.read_time) : ''}</div>
      </div>
    </div>
    <div class="hero-side" id="hero-side-posts"></div>
  </div>`;
}

function staticHero() {
  return `<div class="hero">
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
    <div class="hero-side">
      <div class="hero-side-item">
        <div><span class="tag tag-bodies">Bodies</span><div class="hero-side-title">The STI conversation nobody is having at college orientation</div></div>
        <div class="hero-side-byline">Anonymous &nbsp;·&nbsp; 6 min read</div>
      </div>
      <div class="hero-side-item">
        <div><span class="tag tag-verified">Verified</span><div class="hero-side-title">"Health transparency shouldn't feel like a clinical transaction"</div></div>
        <div class="hero-side-byline">Interview &nbsp;·&nbsp; 8 min read</div>
      </div>
    </div>
  </div>`;
}

// ── CATEGORY VIEW ─────────────────────────────────────────────

async function loadCategoryView(cat) {
  const label = catLabel(cat);
  document.getElementById('feed-label').textContent = label;

  // Hero: most recent published post in this category
  const heroWrap = document.getElementById('hero-wrap');
  heroWrap.innerHTML = '';

  // Posts grid reset
  document.getElementById('posts-grid').innerHTML = skeletons(PAGE_SIZE);
  document.getElementById('load-more-wrap').style.display = 'none';

  try {
    // Load category hero (first post = most recent)
    const heroPosts = await dbGetPublishedPosts(1, 0, cat);
    if (heroPosts.length > 0) {
      heroWrap.innerHTML = dynamicHero(heroPosts[0]);
    } else {
      heroWrap.innerHTML = categoryEmptyHero(label);
    }

    // Load all posts in category (skip first if used as hero)
    const posts = await dbGetPublishedPosts(PAGE_SIZE, 1, cat);
    renderPosts(posts, true);
    document.getElementById('load-more-wrap').style.display = posts.length === PAGE_SIZE ? 'block' : 'none';
    currentPage = 1;
  } catch(e) {
    console.error(e);
  }
}

function categoryEmptyHero(label) {
  return `<div class="category-empty-hero">
    <div class="category-empty-label">${label}</div>
    <div class="category-empty-sub">No posts in this category yet.</div>
  </div>`;
}

// ── POSTS FEED ────────────────────────────────────────────────

async function loadPosts(reset = false) {
  if (reset) {
    currentPage = 0; allLoaded = false;
    document.getElementById('posts-grid').innerHTML = skeletons(PAGE_SIZE);
    document.getElementById('load-more-wrap').style.display = 'none';
  }
  try {
    // For 'all' on home, skip offset 0 which is the featured post if it exists
    const offset = currentCat === 'all' && currentPage === 0 ? 1 : currentPage * PAGE_SIZE;
    const posts = await dbGetPublishedPosts(PAGE_SIZE, offset, currentCat === 'all' ? null : currentCat);
    renderPosts(posts, reset);
    if (posts.length === PAGE_SIZE) {
      document.getElementById('load-more-wrap').style.display = 'block';
    } else {
      document.getElementById('load-more-wrap').style.display = 'none';
      allLoaded = true;
    }
    currentPage++;
  } catch(e) {
    document.getElementById('posts-grid').innerHTML =
      `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;grid-column:1/-1;padding:20px 0;">Could not load posts.</div>`;
  }
}

function loadMorePosts() {
  if (allLoaded) return;
  loadPosts(false);
}

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

function skeletons(n) {
  return Array(n).fill('<div class="skeleton-card"></div>').join('');
}

// ── ARTICLE ──────────────────────────────────────────────────

async function openArticleById(id) {
  currentPostId = id;
  showView('view-article');
  document.getElementById('art-title').textContent = 'Loading…';
  document.getElementById('art-body').innerHTML = '';
  document.getElementById('art-media').innerHTML = '';
  document.getElementById('comments-list').innerHTML = '';

  try {
    const [post, comments] = await Promise.all([
      dbGetPost(id),
      dbGetApprovedComments(id).catch(() => []),
    ]);
    if (!post) { goHome(); return; }
    renderArticle(post);
    renderComments(comments);
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

  document.getElementById('art-body').innerHTML = post.body || '';
  window.scrollTo(0, 0);
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
  if (!currentPostId)  { toast('Error: no post selected.'); return; }

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
    console.error(e);
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

// ── NAV HELPERS ───────────────────────────────────────────────

function goHome() {
  window.location.hash = '';
  currentCat  = 'all';
  currentPage = 0;
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.cat === 'all'));
  showView('view-home');
  loadHero();
  loadPosts(true);
  showHomeSections(true);
  document.getElementById('feed-label').textContent = 'Latest';
}

// ── UTILS ─────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function catLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || id;
}

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
