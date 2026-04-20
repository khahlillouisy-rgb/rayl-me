// ============================================================
// main.js — public site logic
// ============================================================

let currentCat   = 'all';
let currentPage  = 0;
const PAGE_SIZE  = 9;
let allLoaded    = false;

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  loadPosts(true);
  handleHash();
});

window.addEventListener('hashchange', handleHash);

function handleHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#article/')) {
    const id = hash.replace('#article/', '');
    openArticleById(id);
  } else {
    showHome();
  }
}

// ── NAV ──────────────────────────────────────────────────────

function setupNav() {
  document.getElementById('main-nav').querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelectorAll('.nav a').forEach(n => n.classList.remove('active'));
      a.classList.add('active');
      currentCat  = a.dataset.cat;
      currentPage = 0;
      allLoaded   = false;
      loadPosts(true);
    });
  });
}

// ── POSTS ─────────────────────────────────────────────────────

async function loadPosts(reset = false) {
  if (reset) {
    currentPage = 0;
    allLoaded   = false;
    document.getElementById('posts-grid').innerHTML = skeletons(PAGE_SIZE);
    document.getElementById('load-more-wrap').style.display = 'none';
  }

  try {
    const posts = await dbGetPublishedPosts(PAGE_SIZE, currentPage * PAGE_SIZE, currentCat);
    renderPosts(posts, reset);
    if (posts.length === PAGE_SIZE) {
      document.getElementById('load-more-wrap').style.display = 'block';
    } else {
      document.getElementById('load-more-wrap').style.display = 'none';
      allLoaded = true;
    }
    currentPage++;
  } catch (e) {
    document.getElementById('posts-grid').innerHTML = `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;grid-column:1/-1;padding:20px 0;">Could not load posts. Check connection.</div>`;
    console.error(e);
  }
}

function loadMorePosts() {
  if (allLoaded) return;
  loadPosts(false);
}

function renderPosts(posts, reset) {
  const grid = document.getElementById('posts-grid');
  if (reset) grid.innerHTML = '';

  if (posts.length === 0 && reset) {
    grid.innerHTML = `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;grid-column:1/-1;padding:20px 0;">No posts in this category yet.</div>`;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => { window.location.hash = `#article/${post.id}`; };

    const imgHtml = post.image_url
      ? `<img src="${esc(post.image_url)}" alt="${esc(post.title)}" loading="lazy">`
      : `<span class="card-img-placeholder">Image</span>`;

    card.innerHTML = `
      <div class="card-img">${imgHtml}</div>
      <span class="tag tag-${esc(post.category)}">${catLabel(post.category)}</span>
      <div class="card-title">${esc(post.title)}</div>
      <div class="card-byline">${post.author ? esc(post.author) + ' &nbsp;·&nbsp; ' : ''}${post.read_time ? esc(post.read_time) : ''}</div>
    `;
    grid.appendChild(card);
  });
}

function skeletons(n) {
  return Array(n).fill('<div class="skeleton-card"></div>').join('');
}

// ── ARTICLE ──────────────────────────────────────────────────

async function openArticleById(id) {
  showView('view-article');
  document.getElementById('art-title').textContent = 'Loading…';
  document.getElementById('art-body').innerHTML = '';
  document.getElementById('art-media').innerHTML = '';

  try {
    const post = await dbGetPost(id);
    if (!post) { showHome(); return; }
    renderArticle(post);
  } catch (e) {
    document.getElementById('art-title').textContent = 'Could not load article.';
    console.error(e);
  }
}

function renderArticle(post) {
  document.getElementById('art-tag').className = `tag tag-${post.category}`;
  document.getElementById('art-tag').textContent = catLabel(post.category);
  document.getElementById('art-title').textContent = post.title;
  document.getElementById('art-byline').textContent = post.author || '';
  document.getElementById('art-sep').style.display  = post.author && post.read_time ? '' : 'none';
  document.getElementById('art-time').textContent   = post.read_time || '';

  // Media
  const mediaEl = document.getElementById('art-media');
  if (post.video_url) {
    const embed = videoEmbedUrl(post.video_url);
    if (embed) {
      mediaEl.innerHTML = `<div class="article-media"><iframe src="${embed}" allowfullscreen></iframe></div>`;
    }
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

function showHome() {
  window.location.hash = '';
  showView('view-home');
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
  } catch (e) {
    if (e.message === 'already_subscribed') toast('You\'re already subscribed.');
    else toast('Something went wrong. Try again.');
    console.error(e);
  }
}

// ── UTILS ─────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function catLabel(id) {
  const c = CATEGORIES.find(c => c.id === id);
  return c ? c.label : id;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
