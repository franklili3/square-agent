// config.example.mjs — 新闻管道配置模板（开源版）
//
// 复制为 config.mjs 并修改为你自己的配置

export const CONFIG = {
  // RSS 数据源
  rssSources: [
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', priority: 3 },
    { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', priority: 3 },
    { name: 'Bitcoinist', url: 'https://bitcoinist.com/feed/', priority: 2 },
    { name: 'NewsBTC', url: 'https://www.newsbtc.com/feed/', priority: 2 },
    { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', priority: 2 },
    { name: 'The Block', url: 'https://www.theblock.co/rss.xml', priority: 3 },
  ],

  // 关键词过滤（标题/描述包含任一即通过）
  keywords: [
    'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
    'blockchain', 'defi', 'nft', 'web3', 'altcoin', 'stablecoin',
    'exchange', 'wallet', 'mining', 'halving', 'etf', 'sec',
    'regulation', 'hack', 'exploit', 'binance', 'coinbase',
    'fed', 'interest rate', 'inflation', 'cpi',
  ],

  // LLM 配置
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4',
    model: process.env.LLM_MODEL || 'glm-5.2',
  },

  // 发布平台（管道自动发布）
  publishPlatforms: ['binance'],

  // 代理（可选，用于访问被墙的 RSS 源和 LLM API）
  // 设置后 pipeline 会自动启用 Node.js 原生代理支持
  // 支持 HTTP 代理，格式：http://host:port
  proxy: process.env.HTTPS_PROXY || '',

  // 数据目录
  dataDir: './data',
};
