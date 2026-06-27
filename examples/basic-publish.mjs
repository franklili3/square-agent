// basic-publish.mjs — 最简发帖示例
//
// 演示如何用 3 行代码发布到币安广场

import { getConnector } from '../src/connectors/registry.mjs';

async function main() {
  const binance = getConnector('binance');

  const result = await binance.publish('Hello from SquareAgent! 🚀');

  if (result.success) {
    console.log('✅ Published:', result.postUrl || result.postId);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

main();
