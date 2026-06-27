// news-monitor.mjs — RSS 新闻采集（开源版）
//
// 聚合多个 RSS 源，关键词过滤后输出到 data/news-queue.json
// 每 5 分钟轮询一次

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { CONFIG } from './config.mjs';

const DATA_DIR = CONFIG.dataDir;
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ============ 去重 ============
function loadSeen() {
  try {
    return JSON.parse(readFileSync(`${DATA_DIR}/seen.json`, 'utf8'));
  } catch {
    return { hashes: {}, lastCleanup: Date.now() };
  }
}

function saveSeen(seen) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const cleaned = {};
  for (const [k, v] of Object.entries(seen.hashes)) {
    if (v > cutoff) cleaned[k] = v;
  }
  seen.hashes = cleaned;
  seen.lastCleanup = Date.now();
  writeFileSync(`${DATA_DIR}/seen.json`, JSON.stringify(seen, null, 2));
}

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return 'h' + Math.abs(h).toString(36);
}

function isDuplicate(seen, text) {
  const h = hash(text.toLowerCase().slice(0, 200));
  if (seen.hashes[h]) return true;
  seen.hashes[h] = Date.now();
  return false;
}

// ============ 关键词过滤 ============
function matchesKeywords(text) {
  const lower = text.toLowerCase();
  return CONFIG.keywords.some(kw => lower.includes(kw));
}

// ============ RSS 抓取 ============
async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
    });
    const xml = await res.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1]
                 || block.match(/<title>(.*?)<\/title>/s)?.[1] || '';
      const link = block.match(/<link>(.*?)<\/link>/s)?.[1]?.trim() || '';
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1]?.trim() || '';
      const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1]
                || block.match(/<description>(.*?)<\/description>/s)?.[1] || '';
      items.push({
        title: title.trim(),
        link,
        pubDate,
        description: desc.replace(/<[^>]+>/g, '').trim().slice(0, 500),
      });
    }
    return items;
  } catch (e) {
    console.error(`  ❌ RSS fetch failed: ${url} — ${e.message}`);
    return [];
  }
}

// ============ 队列管理 ============
function loadQueue() {
  try {
    return JSON.parse(readFileSync(`${DATA_DIR}/news-queue.json`, 'utf8'));
  } catch { return []; }
}

function saveQueue(queue) {
  const pending = queue.filter(n => !n.processed);
  const processed = queue.filter(n => n.processed).slice(-50);
  writeFileSync(`${DATA_DIR}/news-queue.json`, JSON.stringify([...pending, ...processed], null, 2));
}

// ============ 轮询 ============
async function pollRSS(seen, queue) {
  console.log(`📰 Polling RSS feeds... [${new Date().toISOString()}]`);
  let added = 0;

  const allFeeds = await Promise.all(
    CONFIG.rssSources.map(async src => {
      const items = await fetchRSS(src.url);
      return items.map(item => ({ ...item, source: src.name, priority: src.priority }));
    })
  );

  for (const items of allFeeds) {
    for (const item of items) {
      if (!matchesKeywords(item.title + ' ' + item.description)) continue;
      if (isDuplicate(seen, item.title)) continue;

      queue.push({
        id: hash(item.title + Date.now()),
        type: 'rss',
        ...item,
        addedAt: new Date().toISOString(),
        processed: false,
      });
      added++;
    }
  }

  console.log(`  ✅ ${added} new articles added`);
  return added;
}

// ============ 主循环 ============
async function main() {
  console.log(`\n🤖 News Monitor started at ${new Date().toISOString()}`);
  console.log(`   RSS sources: ${CONFIG.rssSources.length}`);
  console.log(`   Keywords: ${CONFIG.keywords.length}`);

  const seen = loadSeen();
  let queue = loadQueue();

  // 首次立即执行
  await pollRSS(seen, queue);
  saveQueue(queue);
  saveSeen(seen);

  console.log(`\n📋 Queue: ${queue.filter(n => !n.processed).length} pending`);

  // 每 5 分钟轮询
  const interval = parseInt(process.env.POLL_INTERVAL_MS) || 5 * 60 * 1000;
  setInterval(async () => {
    await pollRSS(seen, queue);
    saveQueue(queue);
    saveSeen(seen);
  }, interval);

  console.log(`\n✅ Monitor running (interval: ${interval / 1000}s). Press Ctrl+C to stop.\n`);
}

main().catch(console.error);
