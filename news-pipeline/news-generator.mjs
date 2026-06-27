// news-generator.mjs — LLM 内容生成（开源版）
//
// 直接调用 LLM API 生成内容，无过滤、无价格校验、无审批流

import crypto from 'crypto';
import { CONFIG } from './config.mjs';

// ============ LLM JWT（智谱 AI 等） ============
function generateJWT(apiKey) {
  const [id, secret] = apiKey.split('.');
  if (!id || !secret) return null; // 非智谱格式，直接返回 null（用 Bearer）
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' })).toString('base64url');
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ api_key: id, exp: now + 3600000, timestamp: now })).toString('base64url');
  const sign = crypto.createHmac('sha256', secret).update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + sign;
}

function getAuthHeader(apiKey) {
  // 智谱 API Key 格式：id.secret → 需要 JWT
  if (apiKey.includes('.')) {
    return 'Bearer ' + generateJWT(apiKey);
  }
  // 其他 API（OpenAI 等）直接用 Bearer
  return 'Bearer ' + apiKey;
}

/**
 * 生成内容
 * @param {string} topic - 主题或新闻标题
 * @param {object} options - { template, marketCtx, source, desc }
 * @returns {string} 生成的帖子内容
 */
export async function generateContent(topic, options = {}) {
  const { template = 'breaking_news', marketCtx = '', source = '', desc = '' } = options;
  const { apiKey, baseUrl, model } = CONFIG.llm;

  if (!apiKey) throw new Error('LLM_API_KEY not set');

  // 动态导入 prompt 模板
  const { buildPrompt } = await import('../prompts/templates.mjs');
  const { system, user } = buildPrompt(template, {
    title: topic,
    desc: desc || topic,
    source: source || 'RSS',
    marketCtx,
  });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(apiKey),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(90000),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content || content.length < 20) {
    throw new Error('LLM returned empty or too-short content');
  }

  return content;
}

/**
 * 获取行情上下文（可选，用于丰富生成内容）
 */
export async function getMarketContext() {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { signal: AbortSignal.timeout(5000) }),
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { signal: AbortSignal.timeout(5000) }),
    ]);
    const btc = await btcRes.json();
    const eth = await ethRes.json();
    return `BTC: $${parseFloat(btc.lastPrice).toLocaleString()} (24h ${parseFloat(btc.priceChangePercent).toFixed(2)}%)\nETH: $${parseFloat(eth.lastPrice).toLocaleString()} (24h ${parseFloat(eth.priceChangePercent).toFixed(2)}%)`;
  } catch {
    return '';
  }
}
