// registry.mjs — Connector 注册与路由（开源版）
//
// 统一管理所有平台 Connector 实例，固定间隔 3 秒

import { BinanceSquareConnector } from './binance-square.mjs';
import { XTwitterConnector } from './x-twitter.mjs';
import { TelegramChannelConnector } from './telegram-channel.mjs';

const _instances = {};

/**
 * 获取指定平台的 Connector 实例（单例）
 * @param {string} platform - binance | x | telegram
 * @param {object} config - 可选配置覆盖
 */
export function getConnector(platform, config = {}) {
  if (_instances[platform]) return _instances[platform];

  let instance;
  switch (platform) {
    case 'binance':
    case 'binance-square':
      instance = new BinanceSquareConnector(config);
      break;
    case 'x':
    case 'twitter':
      instance = new XTwitterConnector(config);
      break;
    case 'telegram':
    case 'telegram-channel':
      instance = new TelegramChannelConnector(config);
      break;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  _instances[platform] = instance;
  return instance;
}

/**
 * 多平台分发
 * @param {string} content - 内容
 * @param {string[]} platforms - 平台列表 ['binance', 'x', 'telegram']
 * @param {object} options - 发布选项
 * @returns {object} { results, summary }
 */
export async function publishToAll(content, platforms = ['binance'], options = {}) {
  const results = {};

  for (const platform of platforms) {
    try {
      const connector = getConnector(platform);
      results[platform] = await connector.publish(content, options);
    } catch (e) {
      results[platform] = { success: false, error: e.message };
    }

    // 平台间固定 3 秒间隔
    if (platform !== platforms[platforms.length - 1]) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const successCount = Object.values(results).filter(r => r.success).length;
  const summary = {
    total: platforms.length,
    success: successCount,
    failed: platforms.length - successCount,
  };

  return { results, summary };
}

/**
 * 获取所有已注册 Connector 的健康状态
 */
export async function checkAllHealth() {
  const platforms = Object.keys(_instances);
  const report = {};
  for (const platform of platforms) {
    try {
      report[platform] = await _instances[platform].checkHealth();
    } catch (e) {
      report[platform] = { healthy: false, issues: [e.message], warnings: [] };
    }
  }
  return report;
}

/**
 * 列出支持的平台
 */
export function listPlatforms() {
  return [
    { id: 'binance', name: 'Binance Square', capabilities: ['text', 'image', 'longArticle'] },
    { id: 'x', name: 'X/Twitter', capabilities: ['text', 'image', 'video', 'poll', 'stats', 'delete'] },
    { id: 'telegram', name: 'Telegram Channel', capabilities: ['text', 'image', 'poll', 'longArticle', 'delete'] },
  ];
}
