#!/usr/bin/env node

// RSS feed generator — zero npm dependencies
// Scans docs/*/index.html for article pages, extracts metadata from <meta> tags,
// and generates docs/rss.xml

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs');
const siteUrl = 'https://enumeratethis.com';

function extractMeta(html, name) {
  // Match both name="..." and property="..." attributes
  const namePattern = new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`, 'i');
  const contentFirst = new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:name|property)="${name}"`, 'i');
  const match = html.match(namePattern) || html.match(contentFirst);
  return match ? match[1] : null;
}

function extractTitle(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  if (!match) return null;
  // Remove " — James Miles' AI Coding Adventures" suffix
  return match[1].replace(/\s*[—–-]\s*James Miles' AI Coding Adventures$/, '').trim();
}

function getArticles() {
  const articles = [];
  const entries = readdirSync(docsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip non-article directories
    if (['css', 'js', 'images'].includes(entry.name)) continue;

    const indexPath = join(docsDir, entry.name, 'index.html');
    try {
      statSync(indexPath);
    } catch {
      continue;
    }

    const html = readFileSync(indexPath, 'utf-8');
    const title = extractTitle(html);
    const description = extractMeta(html, 'description');
    const date = extractMeta(html, 'article:date');

    if (!title) continue;

    articles.push({
      title,
      description: description || '',
      date: date || '2026-01-01',
      slug: entry.name,
      link: `${siteUrl}/${entry.name}/`,
    });
  }

  // Sort newest first
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  return articles;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRss(articles) {
  const items = articles.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${a.link}</link>
      <guid>${a.link}</guid>
      <description>${escapeXml(a.description)}</description>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>James Miles' AI Coding Adventures</title>
    <description>Exploring the frontier of AI-assisted coding — experiments, insights, and adventures in building with AI.</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

const articles = getArticles();
const rss = generateRss(articles);
const outputPath = join(docsDir, 'rss.xml');
writeFileSync(outputPath, rss, 'utf-8');
console.log(`Generated rss.xml with ${articles.length} article(s)`);
