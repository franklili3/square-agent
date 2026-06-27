#!/usr/bin/env node
// mcp-server.mjs — SquareAgent MCP Server (stdio)（开源版）
//
// 把 SquareAgent 核心能力暴露为 MCP 工具，供 AI Agent 调用
//
// 工具列表:
//   publish_post     — 发布帖子
//   generate_content — 生成内容
//   check_health     — 健康检查

import { createInterface } from 'readline';
import { publishToAll } from './connectors/registry.mjs';

// ============ MCP Protocol ============

const TOOLS = [
  {
    name: 'publish_post',
    description: 'Publish a post to Binance Square / X / Telegram',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Post content' },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['binance', 'x', 'telegram'] },
          description: 'Target platforms (default: ["binance"])',
        },
        images: { type: 'array', items: { type: 'string' }, description: 'Image URL list' },
      },
      required: ['content'],
    },
  },
  {
    name: 'generate_content',
    description: 'Generate crypto content via LLM',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Content topic' },
        template: {
          type: 'string',
          enum: ['breaking_news', 'price_move'],
          description: 'Content template',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'check_health',
    description: 'Check system health status',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ============ 工具实现 ============

async function publishPost(args) {
  const platforms = args.platforms || ['binance'];
  try {
    const { results, summary } = await publishToAll(args.content, platforms, {
      images: args.images,
    });

    const lines = [`📊 ${summary.success}/${summary.total} platforms succeeded`];
    for (const [p, r] of Object.entries(results)) {
      lines.push(`  ${r.success ? '✅' : '❌'} ${p}: ${r.postUrl || r.error || 'OK'}`);
    }
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `❌ Publish failed: ${e.message}` }], isError: true };
  }
}

async function generateContent(args) {
  try {
    const { generateContent: gen } = await import('../news-pipeline/news-generator.mjs');
    const content = await gen(args.topic, { template: args.template });
    return { content: [{ type: 'text', text: content }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `❌ ${e.message}` }], isError: true };
  }
}

async function checkHealth() {
  // 简单返回健康状态，不依赖 health-monitor
  return { content: [{ type: 'text', text: '✅ healthy' }] };
}

const TOOL_HANDLERS = {
  publish_post: publishPost,
  generate_content: generateContent,
  check_health: checkHealth,
};

// ============ MCP stdio 通信 ============

const rl = createInterface({ input: process.stdin });

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);

    if (msg.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'square-agent', version: '1.0.0' },
        },
      });
    } else if (msg.method === 'tools/list') {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOLS },
      });
    } else if (msg.method === 'tools/call') {
      const handler = TOOL_HANDLERS[msg.params.name];
      if (handler) {
        handler(msg.params.arguments || {}).then(result => {
          send({ jsonrpc: '2.0', id: msg.id, result });
        }).catch(e => {
          send({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32603, message: e.message },
          });
        });
      } else {
        send({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32601, message: `Unknown tool: ${msg.params.name}` },
        });
      }
    }
  } catch {
    // Ignore parse errors
  }
});

console.error('SquareAgent MCP Server running (stdio)');
