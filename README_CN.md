# SquareAgent — 加密社媒自动化工具

[English](README.md) | 中文文档

定时采集加密新闻，用大模型生成内容，一键发布到币安广场、X/Twitter、Telegram。

## ⚠️ 免责声明

本软件**不包含**内容安全过滤、频率限制或合规审查功能。
用户需自行确保遵守平台服务条款和当地法律法规。
**风险自负。**

## 功能

- **多平台发布** — 币安广场、X/Twitter、Telegram 频道
- **RSS 新闻聚合** — 从多个来源自动采集加密新闻
- **大模型内容生成** — 把原始新闻转化为社媒帖子
- **MCP Server** — 对接 AI Agent（Claude、OpenClaw 等）
- **CLI 命令行** — 快速发布、生成、健康检查
- **零依赖** — 纯 Node.js（>= 18），使用原生 `fetch`
- **Docker 一键部署**

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/franklili3/square-agent.git
cd square-agent

# 2. 配置
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 3. 启动管道（RSS → 大模型生成 → 发布）
npm start

# 或单独运行某个组件：
node news-pipeline/news-monitor.mjs     # RSS 采集器
node news-pipeline/pipeline.mjs --watch # 完整管道
node src/cli.mjs publish --text "你好"   # 快速发布
node src/mcp-server.mjs                 # MCP Server
```

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env
docker compose up -d
```

## 架构

```
RSS 源 ──→ news-monitor.mjs ──→ news-queue.json
                                        │
                              pipeline.mjs
                                        │
                              news-generator.mjs（大模型）
                                        │
                              registry.mjs ──→ 币安广场
                                            ──→ X/Twitter
                                            ──→ Telegram
```

详见 [docs/architecture.md](docs/architecture.md)。

## 平台连接器

### 币安广场
- 通过官方 OpenAPI 发送文本 + 图片帖子
- 在 `.env` 中设置 `BINANCE_SQUARE_API_KEY`

### X/Twitter
- 通过 X API v2 发送文本帖子
- 在 `.env` 中设置 `X_OAUTH_TOKEN`

### Telegram 频道
- 通过 Bot API 发送文本 + 图片帖子
- 在 `.env` 中设置 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHANNEL_ID`

### 自定义平台
继承 `BaseConnector`，实现 `publish()` 方法：
```javascript
import { BaseConnector } from 'square-agent/connectors/base';

class MyConnector extends BaseConnector {
  async publish(content, options = {}) {
    // 你的逻辑
    return { success: true, postId: '123' };
  }
}
```

## MCP 集成

SquareAgent 内置 MCP（Model Context Protocol）Server：

```json
{
  "mcpServers": {
    "square-agent": {
      "command": "node",
      "args": ["/path/to/square-agent/src/mcp-server.mjs"]
    }
  }
}
```

可用工具：`publish_post`、`generate_content`、`check_health`。

## 配置

复制 `news-pipeline/config.example.mjs` 为 `news-pipeline/config.mjs`，自定义：

- RSS 新闻源
- 关键词过滤
- 大模型端点
- 发布平台

## 开源 vs 商业版

| 能力 | 开源版 | 商业版 |
|---|---|---|
| RSS 新闻采集 | ✅ | ✅ |
| 大模型内容生成 | ✅ 基础 | ✅ 调优 |
| 多平台发布 | ✅ | ✅ |
| MCP / CLI | ✅ | ✅ |
| Docker 部署 | ✅ | ✅ |
| 敏感词过滤 | ❌ | ✅ |
| 风险提示注入 | ❌ | ✅ |
| 内容去重 | ❌ | ✅ |
| 发布频率控制 | ❌ | ✅ |
| 审批流 | ❌ | ✅ |
| 账号健康监控 | ❌ | ✅ |

需要完整风控能力？联系：348104201@qq.com

## 许可证

MIT — 详见 [LICENSE](LICENSE)
