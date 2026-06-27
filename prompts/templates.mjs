// prompts/templates.mjs — 通用模板（开源版）
//
// 两个基础模板：breaking_news / price_move

import { GENERATION_SYSTEM_PROMPT, GENERATION_USER_TEMPLATE } from './generation.mjs';

export const SYSTEM_PROMPT = GENERATION_SYSTEM_PROMPT;

export const TEMPLATE_MAP = {
  breaking_news: {
    name: '📰 Breaking News',
    build: (data) => ({
      system: SYSTEM_PROMPT,
      user: `写一条突发新闻帖子。

标题：${data.title}
描述：${data.desc}
来源：${data.source}

市场背景：
${data.marketCtx || '无'}

直接输出帖子内容：`,
    }),
  },

  price_move: {
    name: '🚨 Price Movement',
    build: (data) => ({
      system: SYSTEM_PROMPT,
      user: `写一条价格异动帖子。

${data.symbol || 'BTC'} 24h ${data.change || '未知'}

市场背景：
${data.marketCtx || '无'}

直接输出帖子内容：`,
    }),
  },
};

export function buildPrompt(type, data) {
  const tpl = TEMPLATE_MAP[type] || TEMPLATE_MAP.breaking_news;
  return tpl.build(data);
}
