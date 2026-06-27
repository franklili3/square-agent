// custom-connector.mjs — 自定义平台示例
//
// 演示如何继承 BaseConnector 创建新的平台 Connector

import { BaseConnector } from '../src/connectors/base.mjs';
import { publishToAll } from '../src/connectors/registry.mjs';

// 示例：一个只打印不发帖的 "console" Connector
class ConsoleConnector extends BaseConnector {
  constructor(config = {}) {
    super(config);
    this.name = 'Console';
    this.platform = 'console';
    this.capabilities = { text: true, image: false, video: false, poll: false, longArticle: false, delete: false, stats: false };
  }

  async publish(content, options = {}) {
    console.log('\n┌─────────── Console Connector ───────────┐');
    console.log(content);
    console.log('└──────────────────────────────────────────┘\n');
    return { success: true, postId: 'console-' + Date.now(), postUrl: null };
  }
}

// 使用示例
async function main() {
  const connector = new ConsoleConnector();
  await connector.publish('Hello from custom connector! 🎉');
}

main();
