# Architecture

## Overview

SquareAgent is a lightweight pipeline that fetches crypto news from RSS feeds, generates social media posts via LLM, and publishes them to multiple platforms.

```
┌─────────────────────────────────────────────────────────┐
│                     SquareAgent                          │
│                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────┐  │
│  │ news-monitor │────→│  pipeline    │────→│ publish │  │
│  │  (RSS poll)  │     │ (generate +  │     │         │  │
│  └──────────────┘     │  publish)    │     └─────────┘  │
│         │             └──────┬───────┘          │       │
│         │                    │                  │       │
│         ▼                    ▼                  ▼       │
│   news-queue.json    news-generator      connectors     │
│                      (LLM API call)      ├── binance    │
│                                          ├── x-twitter  │
│                                          └── telegram   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                  Interfaces                        │   │
│  │  ├── CLI (src/cli.mjs)                            │   │
│  │  └── MCP Server (src/mcp-server.mjs)              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. News Monitor (`news-pipeline/news-monitor.mjs`)

- Polls RSS feeds every 5 minutes
- Filters by crypto keywords
- Deduplicates by title hash
- Outputs to `data/news-queue.json`

### 2. Pipeline (`news-pipeline/pipeline.mjs`)

- Reads unprocessed items from queue
- Calls LLM to generate post content
- Publishes to configured platforms
- Marks items as processed

### 3. News Generator (`news-pipeline/news-generator.mjs`)

- Calls LLM API (default: GLM, compatible with OpenAI API format)
- Uses prompt templates (`prompts/templates.mjs`)
- Returns generated text ready for publishing

### 4. Connectors (`src/connectors/`)

Each platform implements the `BaseConnector` interface:

| Method | Description |
|--------|-------------|
| `publish(content, options)` | Publish a post |
| `delete(postId)` | Delete a post (if supported) |
| `getStats(postId)` | Get engagement metrics |
| `checkHealth()` | Check account status |

### 5. Registry (`src/connectors/registry.mjs`)

- Manages connector singletons
- `publishToAll()` — Multi-platform broadcasting with 3s interval
- `getConnector()` — Get specific platform instance

### 6. CLI (`src/cli.mjs`)

```
square publish --text "content" [--platform binance,x]
square generate --topic "topic"
square health
```

### 7. MCP Server (`src/mcp-server.mjs`)

Exposes tools via Model Context Protocol for AI agent integration:

- `publish_post` — Publish to platforms
- `generate_content` — LLM content generation
- `check_health` — Simple health check

## Data Flow

1. **RSS Sources** → `news-monitor.mjs` fetches & filters
2. **Queue** → `data/news-queue.json` stores unprocessed items
3. **Pipeline** → reads queue, calls `news-generator.mjs` for LLM content
4. **Publish** → `registry.mjs` broadcasts to all configured platforms
5. **Mark processed** → queue items flagged as `processed: true`

## Configuration

- Environment variables (`.env`) for API keys
- `news-pipeline/config.mjs` for RSS sources, keywords, LLM settings
- Default LLM: GLM (compatible endpoint), swappable to any OpenAI-compatible API

## Design Principles

- **Zero external dependencies** — uses Node.js native `fetch`
- **ES Modules** — `.mjs` throughout, no build step
- **Surgical pipeline** — RSS → LLM → publish, nothing extra
- **Extensible connectors** — implement `BaseConnector` for new platforms
