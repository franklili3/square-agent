// news-to-post.mjs — 新闻→帖子完整流程示例
//
// 演示：读取一条新闻 → LLM 生成内容 → 多平台发布

import { generateContent, getMarketContext } from '../news-pipeline/news-generator.mjs';
import { publishToAll } from '../src/connectors/registry.mjs';

async function main() {
  // 1. 模拟一条新闻
  const news = {
    title: 'SEC approves spot Bitcoin ETF applications',
    source: 'CoinDesk',
    description: 'The U.S. Securities and Exchange Commission has approved spot Bitcoin ETFs.',
  };

  console.log('📰 News:', news.title);

  // 2. 获取行情上下文（可选）
  const marketCtx = await getMarketContext();
  console.log('📊 Market:', marketCtx);

  // 3. LLM 生成帖子内容
  console.log('🤖 Generating content...');
  const content = await generateContent(news.title, {
    template: 'breaking_news',
    marketCtx,
    source: news.source,
    desc: news.description,
  });

  console.log('--- Generated Content ---');
  console.log(content);
  console.log('--- End ---\n');

  // 4. 多平台发布
  const platforms = ['binance']; // 也可以 ['binance', 'x', 'telegram']
  console.log(`📤 Publishing to: ${platforms.join(', ')}`);

  const { results, summary } = await publishToAll(content, platforms);

  for (const [platform, result] of Object.entries(results)) {
    console.log(`  ${result.success ? '✅' : '❌'} ${platform}: ${result.postUrl || result.error}`);
  }

  console.log(`\n📊 ${summary.success}/${summary.total} succeeded`);
}

main().catch(console.error);
