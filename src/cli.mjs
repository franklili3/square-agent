#!/usr/bin/env node
// cli.mjs — SquareAgent CLI（开源版）
//
// 用法：
//   square publish --text "内容" [--platform binance,x,telegram]
//   square generate --topic "BTC价格分析"
//   square health

import { publishToAll } from './connectors/registry.mjs';

const SERVER_URL = process.env.SQUARE_SERVER || 'http://127.0.0.1:5577';

// ============ 参数解析 ============
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

// ============ 命令处理 ============

async function cmdPublish(args) {
  const text = args.text || args._[0];
  if (!text) {
    console.error('❌ Missing content: use --text "content"');
    process.exit(1);
  }

  const platforms = (args.platform || 'binance').split(',');

  console.log(`📤 Publishing to ${platforms.length} platform(s): ${platforms.join(', ')}`);
  const { results, summary } = await publishToAll(text, platforms, {
    images: args.image ? [args.image] : undefined,
  });

  for (const [platform, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`  ✅ ${platform}: ${result.postUrl || result.postId || 'OK'}`);
    } else {
      console.log(`  ❌ ${platform}: ${result.error}`);
    }
  }

  console.log(`\n📊 ${summary.success}/${summary.total} succeeded`);
}

async function cmdGenerate(args) {
  const topic = args.topic || args._[0];
  if (!topic) {
    console.error('❌ Missing topic: use --topic "topic"');
    process.exit(1);
  }

  console.log(`🤖 Generating content: ${topic}`);

  try {
    const { generateContent } = await import('../news-pipeline/news-generator.mjs');
    const content = await generateContent(topic, { template: args.template });
    console.log('\n' + content);
  } catch (e) {
    console.error('❌ Generation failed:', e.message);
  }
}

async function cmdHealth() {
  // 简单 ping server，不依赖 health-monitor
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    console.log('✅ Server healthy:', JSON.stringify(data));
  } catch {
    console.log(`⚠️  Server not responding at ${SERVER_URL}`);
    console.log('   (Connectors can still be used directly)');
  }
}

// ============ 入口 ============
const args = parseArgs(process.argv);
const command = args._[0] || '';
args._ = args._.slice(1);

switch (command) {
  case 'publish': await cmdPublish(args); break;
  case 'generate': await cmdGenerate(args); break;
  case 'health': await cmdHealth(); break;
  default:
    console.log(`SquareAgent CLI

Usage:
  square publish --text "content" [--platform binance,x]
  square generate --topic "topic" [--template breaking_news]
  square health
`);
}
