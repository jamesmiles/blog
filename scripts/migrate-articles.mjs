#!/usr/bin/env node

// Bulk convert WordPress article JSON files to static HTML pages
// Reads from articles/*.json and wordpress-feed-pages-6-7.json
// Generates docs/{slug}/index.html for each article

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const docsDir = join(rootDir, 'docs');
const articlesDir = join(rootDir, 'articles');

function cleanHtml(html) {
  if (!html) return '<p>(Content not available)</p>';
  // Strip WordPress style spans: <span style="color:...">text</span> -> text
  let cleaned = html.replace(/<span[^>]*style="[^"]*color:[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  // Strip font tags
  cleaned = cleaned.replace(/<\/?font[^>]*>/gi, '');
  // Strip class attributes from WordPress
  cleaned = cleaned.replace(/ class="[^"]*wlWriterEditableSmartContent[^"]*"/gi, '');
  cleaned = cleaned.replace(/ class="MsoNormal"/gi, '');
  cleaned = cleaned.replace(/ class="Section1"/gi, '');
  // Strip inline style attributes
  cleaned = cleaned.replace(/ style="[^"]*"/gi, '');
  // Strip WordPress smart content div wrappers
  cleaned = cleaned.replace(/<div[^>]*class="wlWriterEditableSmartContent"[^>]*>/gi, '');
  // Clean up empty divs
  cleaned = cleaned.replace(/<div>\s*<\/div>/gi, '');
  // Convert WordPress pre blocks to clean code blocks
  cleaned = cleaned.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, content) => {
    // Strip remaining HTML tags inside pre blocks but keep the text
    let code = content.replace(/<br\s*\/?>/gi, '\n');
    code = code.replace(/<\/?[^>]+(>|$)/g, '');
    // Decode HTML entities
    code = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    code = code.replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"');
    code = code.replace(/&#160;/g, ' ');
    return `<pre><code>${code}</code></pre>`;
  });
  // Fix non-breaking spaces
  cleaned = cleaned.replace(/&#160;/g, ' ');
  cleaned = cleaned.replace(/&#8217;/g, "'");
  cleaned = cleaned.replace(/&#8220;/g, '"');
  cleaned = cleaned.replace(/&#8221;/g, '"');
  cleaned = cleaned.replace(/&#8211;/g, '–');
  cleaned = cleaned.replace(/&#8230;/g, '…');
  return cleaned;
}

function extractDescription(html) {
  if (!html) return '';
  // Get first paragraph text, strip HTML tags
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!match) return '';
  let desc = match[1].replace(/<[^>]+>/g, '').trim();
  // Decode entities
  desc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  desc = desc.replace(/&#8217;/g, "'").replace(/&#8211;/g, '–').replace(/&#8230;/g, '…');
  // Truncate
  if (desc.length > 200) desc = desc.substring(0, 197) + '...';
  // Escape for HTML attributes
  desc = desc.replace(/"/g, '&quot;');
  return desc;
}

function guessTag(slug, title) {
  const tags = [];
  const combined = (slug + ' ' + title).toLowerCase();
  if (combined.includes('rx') || combined.includes('reactive')) tags.push('reactive-extensions');
  if (combined.includes('linq') && !combined.includes('linqpad')) tags.push('linq');
  if (combined.includes('linqpad')) tags.push('linqpad');
  if (combined.includes('azure')) tags.push('azure');
  if (combined.includes('c#') || combined.includes('c-5') || combined.includes('c-6')) tags.push('c#');
  if (combined.includes('puzzle') || combined.includes('quiz')) tags.push('puzzles');
  if (combined.includes('nirvana')) tags.push('nirvana');
  if (combined.includes('rxx')) tags.push('rxx');
  if (combined.includes('performance')) tags.push('performance');
  if (combined.includes('pattern') || combined.includes('design')) tags.push('design-patterns');
  if (tags.length === 0) tags.push('general');
  return tags;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatMonthYear(dateStr) {
  const d = new Date(dateStr);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function isoDate(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

function generateArticlePage(article) {
  const tags = article.tags || guessTag(article.slug, article.title);
  const desc = article.description || extractDescription(article.content_html);
  const content = cleanHtml(article.content_html);
  const date = isoDate(article.date);
  const dateFormatted = formatDate(article.date);
  const tagHtml = tags.map(t => `<span class="tag">${t}</span>`).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)} — James Miles' AI Engineering Adventures</title>
  <meta name="description" content="${desc}">
  <meta name="article:date" content="${date}">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="article">
  <link rel="alternate" type="application/rss+xml" title="James Miles' AI Engineering Adventures RSS" href="../rss.xml">
  <link rel="stylesheet" href="../css/tokens.css">
  <link rel="stylesheet" href="../css/styles.css">
  <script src="../js/theme.js"></script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="../index.html" class="site-title">James Miles' AI Engineering Adventures</a>
      <nav class="header-nav">
        <a href="../all-posts.html">All Posts</a>
        <a href="../rss.xml">RSS</a>
        <button class="theme-toggle" aria-label="Toggle theme"></button>
        <button class="share-btn" aria-label="Share" onclick="shareLink(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </nav>
      <button class="burger-menu" aria-label="Menu" onclick="document.querySelector('.mobile-nav').classList.toggle('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
    </div>
    <nav class="mobile-nav">
      <a href="../all-posts.html">All Posts</a>
      <a href="../rss.xml">RSS</a>
      <button class="mobile-theme-toggle" aria-label="Toggle theme" onclick="document.querySelector('.mobile-nav').classList.remove('open')"><span class="mobile-theme-label"></span></button>
      <button class="mobile-share-btn" onclick="shareLink(this); document.querySelector('.mobile-nav').classList.remove('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    </nav>
  </header>

  <main class="main-content">
    <a href="../index.html" class="back-link">&larr; Back to all articles</a>

    <header class="article-header">
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <time datetime="${date}">${dateFormatted}</time>
        ${tagHtml}
      </div>
    </header>

    <div class="article-body">
      ${content}
    </div>

    <section class="comments-section">
      <h2>Comments</h2>
      <script src="https://utteranc.es/client.js"
        repo="jamesmiles/blog"
        issue-term="pathname"
        theme="github-light"
        crossorigin="anonymous"
        async>
      </script>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span>&copy; 2026 James Miles' AI Engineering Adventures</span>
      <div class="footer-links">
        <a href="../rss.xml">RSS</a>
        <a href="https://github.com/jamesmiles/blog">GitHub</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function escapeHtml(str) {
  // Decode first to avoid double-encoding
  let decoded = str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return decoded.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Load all articles
const allArticles = [];

// From articles/ directory (JSON files)
if (existsSync(articlesDir)) {
  const files = readdirSync(articlesDir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(articlesDir, file), 'utf-8'));
    allArticles.push(data);
  }
}

// From wordpress-feed-pages-6-7.json (keyed by page_6, page_7)
const feedFile67 = join(rootDir, 'wordpress-feed-pages-6-7.json');
if (existsSync(feedFile67)) {
  const data = JSON.parse(readFileSync(feedFile67, 'utf-8'));
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      for (const article of data[key]) {
        if (!allArticles.find(a => a.slug === article.slug)) {
          allArticles.push(article);
        }
      }
    }
  }
}

// From wordpress-articles-pages-3-5.json
const feedFile35 = join(rootDir, 'wordpress-articles-pages-3-5.json');
if (existsSync(feedFile35)) {
  const data = JSON.parse(readFileSync(feedFile35, 'utf-8'));
  if (Array.isArray(data)) {
    for (const article of data) {
      if (!allArticles.find(a => a.slug === article.slug)) {
        allArticles.push(article);
      }
    }
  } else {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        for (const article of data[key]) {
          if (!allArticles.find(a => a.slug === article.slug)) {
            allArticles.push(article);
          }
        }
      }
    }
  }
}

// Generate HTML pages for articles that don't already have one
let created = 0;
let skipped = 0;

for (const article of allArticles) {
  const slugDir = join(docsDir, article.slug);
  const indexFile = join(slugDir, 'index.html');

  if (existsSync(indexFile)) {
    skipped++;
    continue;
  }

  // Normalize content field name
  if (!article.content_html && article.html_content) {
    article.content_html = article.html_content;
  }
  mkdirSync(slugDir, { recursive: true });
  writeFileSync(indexFile, generateArticlePage(article), 'utf-8');
  created++;
}

console.log(`Created ${created} article pages, skipped ${skipped} existing`);

// Now collect ALL articles (including pre-existing ones) for index/archive
const allSlugs = readdirSync(docsDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && !['css', 'js', 'images'].includes(d.name))
  .map(d => d.name);

const allPagesData = [];
for (const slug of allSlugs) {
  const htmlPath = join(docsDir, slug, 'index.html');
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, 'utf-8');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/\s*[—–-]\s*James Miles.*$/, '').trim() : slug;

  const dateMatch = html.match(/<meta\s+name="article:date"\s+content="([^"]*)"/);
  const date = dateMatch ? dateMatch[1] : '2026-01-01';

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  const description = descMatch ? descMatch[1] : '';

  allPagesData.push({ slug, title, date, description });
}

// Sort newest first
allPagesData.sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate all-posts.html
const monthGroups = {};
for (const article of allPagesData) {
  const key = formatMonthYear(article.date);
  if (!monthGroups[key]) monthGroups[key] = [];
  monthGroups[key].push(article);
}

const archiveSections = Object.entries(monthGroups).map(([month, articles]) => {
  const items = articles.map(a => `        <li class="archive-item">
          <time datetime="${a.date}">${formatShortDate(a.date)}</time>
          <a href="${a.slug}/index.html">${escapeHtml(a.title)}</a>
        </li>`).join('\n');
  return `    <section class="archive-month">
      <h2 class="archive-month-title">${month}</h2>
      <ul class="archive-list">
${items}
      </ul>
    </section>`;
}).join('\n\n');

const allPostsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Posts — James Miles' AI Engineering Adventures</title>
  <meta name="description" content="Archive of all posts on James Miles' AI Engineering Adventures.">
  <link rel="alternate" type="application/rss+xml" title="James Miles' AI Engineering Adventures RSS" href="rss.xml">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/styles.css">
  <script src="js/theme.js"></script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="site-title">James Miles' AI Engineering Adventures</a>
      <nav class="header-nav">
        <a href="all-posts.html">All Posts</a>
        <a href="rss.xml">RSS</a>
        <button class="theme-toggle" aria-label="Toggle theme"></button>
        <button class="share-btn" aria-label="Share" onclick="shareLink(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </nav>
      <button class="burger-menu" aria-label="Menu" onclick="document.querySelector('.mobile-nav').classList.toggle('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
    </div>
    <nav class="mobile-nav">
      <a href="all-posts.html">All Posts</a>
      <a href="rss.xml">RSS</a>
      <button class="mobile-theme-toggle" aria-label="Toggle theme" onclick="document.querySelector('.mobile-nav').classList.remove('open')"><span class="mobile-theme-label"></span></button>
      <button class="mobile-share-btn" onclick="shareLink(this); document.querySelector('.mobile-nav').classList.remove('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    </nav>
  </header>

  <main class="main-content">
    <h1 class="page-title">All Posts</h1>

${archiveSections}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span>&copy; 2026 James Miles' AI Engineering Adventures</span>
      <div class="footer-links">
        <a href="rss.xml">RSS</a>
        <a href="https://github.com/jamesmiles/blog">GitHub</a>
      </div>
    </div>
  </footer>
</body>
</html>`;

writeFileSync(join(docsDir, 'all-posts.html'), allPostsHtml, 'utf-8');
console.log(`Updated all-posts.html with ${allPagesData.length} articles`);

// Update index.html with ALL articles inline (hidden beyond first batch)
const batchSize = 5;

const indexArticles = allPagesData.map((a, i) => {
  const htmlPath = join(docsDir, a.slug, 'index.html');
  const html = readFileSync(htmlPath, 'utf-8');

  // Extract article body content
  const bodyMatch = html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<section/);
  const body = bodyMatch ? bodyMatch[1].trim() : '';

  // Extract tags
  const tagMatches = [...html.matchAll(/<span class="tag">([^<]*)<\/span>/g)];
  const tagHtml = tagMatches.map(m => `            <span class="tag">${m[1]}</span>`).join('\n');

  const hidden = i >= batchSize ? ' style="display:none"' : '';
  return `      <article class="article-item"${hidden}>
        <header class="article-item-header">
          <h2 class="article-item-title">
            <a href="${a.slug}/index.html">${escapeHtml(a.title)}</a>
          </h2>
          <div class="article-item-meta">
            <time datetime="${a.date}">${formatDate(a.date)}</time>
${tagHtml}
          </div>
        </header>
        <div class="article-body">
          ${body}
        </div>
        <a href="${a.slug}/index.html" class="read-more">Continue reading &amp; comments &rarr;</a>
      </article>`;
}).join('\n\n');

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>James Miles' AI Engineering Adventures</title>
  <meta name="description" content="Exploring the frontier of AI-assisted coding — experiments, insights, and adventures in building with AI.">
  <meta property="og:title" content="James Miles' AI Engineering Adventures">
  <meta property="og:description" content="Exploring the frontier of AI-assisted coding.">
  <meta property="og:type" content="website">
  <link rel="alternate" type="application/rss+xml" title="James Miles' AI Engineering Adventures RSS" href="rss.xml">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/styles.css">
  <script src="js/theme.js"></script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="site-title">James Miles' AI Engineering Adventures</a>
      <nav class="header-nav">
        <a href="all-posts.html">All Posts</a>
        <a href="rss.xml">RSS</a>
        <button class="theme-toggle" aria-label="Toggle theme"></button>
        <button class="share-btn" aria-label="Share" onclick="shareLink(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </nav>
      <button class="burger-menu" aria-label="Menu" onclick="document.querySelector('.mobile-nav').classList.toggle('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
    </div>
    <nav class="mobile-nav">
      <a href="all-posts.html">All Posts</a>
      <a href="rss.xml">RSS</a>
      <button class="mobile-theme-toggle" aria-label="Toggle theme" onclick="document.querySelector('.mobile-nav').classList.remove('open')"><span class="mobile-theme-label"></span></button>
      <button class="mobile-share-btn" onclick="shareLink(this); document.querySelector('.mobile-nav').classList.remove('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    </nav>
    <div class="sticky-article-bar-wrapper">
      <div class="sticky-article-bar" id="sticky-article-bar"></div>
    </div>
  </header>

  <main class="main-content">
    <h1 class="page-title">Latest Posts</h1>

    <div class="article-list">
${indexArticles}
    </div>

    <button class="load-more" id="load-more">Load more posts</button>
    <script>
      (function() {
        var btn = document.getElementById('load-more');
        var articles = document.querySelectorAll('.article-item');
        var shown = ${batchSize};
        var batch = ${batchSize};
        var total = articles.length;
        if (shown >= total) btn.style.display = 'none';
        btn.addEventListener('click', function() {
          var end = Math.min(shown + batch, total);
          for (var i = shown; i < end; i++) {
            articles[i].style.display = '';
          }
          shown = end;
          if (shown >= total) btn.style.display = 'none';
        });
      })();
    </script>
    <script>
      (function() {
        var bar = document.getElementById('sticky-article-bar');
        var pageTitle = document.querySelector('.page-title');
        bar.textContent = 'Latest Posts';
        var articles = document.querySelectorAll('.article-item');

        function setBar(title) {
          bar.textContent = 'Currently Reading: ' + title;
        }
        function updateBar() {
          var headerBottom = pageTitle ? pageTitle.getBoundingClientRect().bottom : 0;
          if (headerBottom > 0) {
            setBar('Latest Posts');
            return;
          }
          for (var i = articles.length - 1; i >= 0; i--) {
            if (articles[i].style.display === 'none') continue;
            var rect = articles[i].getBoundingClientRect();
            if (rect.top < 120) {
              var titleEl = articles[i].querySelector('.article-item-title a');
              if (titleEl) setBar(titleEl.textContent);
              return;
            }
          }
          setBar('Latest Posts');
        }

        window.addEventListener('scroll', updateBar, { passive: true });
        updateBar();
      })();
    </script>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span>&copy; 2026 James Miles' AI Engineering Adventures</span>
      <div class="footer-links">
        <a href="rss.xml">RSS</a>
        <a href="https://github.com/jamesmiles/blog">GitHub</a>
      </div>
    </div>
  </footer>
</body>
</html>`;

writeFileSync(join(docsDir, 'index.html'), indexHtml, 'utf-8');
console.log(`Updated index.html with ${allPagesData.length} articles (${batchSize} visible, rest behind "Load more")`);
