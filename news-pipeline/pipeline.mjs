#!/usr/bin/env node
// pipeline.mjs — 新闻→帖子主管道（开源版）
//
// 固定 5 分钟间隔：RSS 队列 → LLM 生成 → 直接发布
// 无去重、无评分过滤、无合规检查、无审批流
//
// 用法：
//   node pipeline.mjs           # 单次运行
//   node pipeline.mjs --watch   # 守护模式

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { CONFIG } from './config.mjs';
import { generateContent, getMarketContext } from './news-generator.mjs';
import { publishToAll } from '../src/connectors/registry.mjs';

const DATA_DIR = CONFIG.dataDir;
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ============ 队列读取 ============
function loadQueue() {
  try {
    return JSON.parse(readFileSync(`${DATA_DIR}/news-queue.json`, 'utf8'));
  } catch { return []; }
}

function saveQueue(queue) {
  writeFileSync(`${DATA_DIR}/news-queue.json`, JSON.stringify(queue, null, 2));
}

// ============ 单轮处理 ============
async function runCycle() {
  const queue = loadQueue();
  const pending = queue.filter(n => !n.processed);

  console.log(`\n[${new Date().toISOString()}] Cycle start — ${pending.length} pending`);

  if (pending.length === 0) {
    console.log('  ⏳ Nothing new. Waiting...');
    return 0;
  }

  // 获取行情上下文
  const marketCtx = await getMarketContext();
  if (marketCtx) console.log(`  📊 Market: ${marketCtx.split('\n')[0]}`);

  let published = 0;

  for (const item of pending) {
    console.log(`  📰 Processing: ${item.title.slice(0, 60)}...`);

    try {
      // 直接 LLM 生成，无评分、无过滤
      const content = await generateContent(item.title, {
        template: 'breaking_news',
        marketCtx,
        source: item.source,
        desc: item.description,
      });

      if (content && content.length > 20) {
        console.log(`    ✅ Generated ${content.length} chars`);

        // 直接发布，无审批
        const { results, summary } = await publishToAll(content, CONFIG.publishPlatforms);
        for (const [platform, r] of Object.entries(results)) {
          console.log(`    📤 ${platform}: ${r.success ? '✅ ' + (r.postUrl || 'OK') : '❌ ' + r.error}`);
        }

        if (summary.success > 0) published++;
      } else {
        console.log(`    ⚠️ Empty response, skipping`);
      }
    } catch (e) {
      console.error(`    ❌ ${e.message}`);
    }

    // 标记已处理
    item.processed = true;

    // 间隔 3 秒
    await new Promise(r => setTimeout(r, 3000));
  }

  saveQueue(queue);
  console.log(`  ✅ Cycle done: ${published} published`);
  return published;
}

// ============ 入口 ============
async function main() {
  const watchMode = process.argv.includes('--watch');
  const interval = parseInt(process.env.POLL_INTERVAL_MS) || 5 * 60 * 1000;

  console.log(`🤖 SquareAgent Pipeline | Model: ${CONFIG.llm.model}`);
  console.log(`   Platforms: ${CONFIG.publishPlatforms.join(', ')}`);
  console.log(`   Mode: ${watchMode ? 'WATCH (daemon)' : 'ONCE'}`);

  if (!watchMode) {
    await runCycle();
    console.log('\n✅ Done.');
    return;
  }

  // 守护模式：固定 5 分钟间隔
  console.log(`   Interval: ${interval / 1000}s\n`);

  await runCycle();
  setInterval(runCycle, interval);

  console.log('\n✅ Watch mode running. Ctrl+C to stop.');
}

main().catch(console.error);
