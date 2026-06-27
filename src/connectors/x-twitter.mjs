// x-twitter.mjs — X/Twitter Connector（开源版）
//
// 使用 X API v2（OAuth 2.0）发帖，token 从环境变量读取

import { BaseConnector } from './base.mjs';

const X_API_BASE = 'https://api.twitter.com/2';
const MAX_TEXT = 280;

export class XTwitterConnector extends BaseConnector {
  constructor(config = {}) {
    super(config);
    this.name = 'X/Twitter';
    this.platform = 'x';
    this.capabilities = {
      text: true,
      image: true,
      video: true,
      poll: true,
      longArticle: false,
      delete: true,
      stats: true,
    };
    this.token = config.token || process.env.X_OAUTH_TOKEN || '';
  }

  async publish(content, options = {}) {
    if (!this.token) {
      return { success: false, error: 'X_OAUTH_TOKEN not set' };
    }

    let text = content;
    if (text.length > MAX_TEXT) {
      text = text.substring(0, MAX_TEXT - 3) + '...';
    }

    const body = { text };

    try {
      const res = await fetch(`${X_API_BASE}/tweets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.data?.id) {
        return {
          success: true,
          postId: data.data.id,
          postUrl: `https://x.com/i/web/status/${data.data.id}`,
        };
      }

      return { success: false, error: JSON.stringify(data).substring(0, 200) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async delete(postId) {
    if (!this.token || !postId) return { success: false, error: 'missing token or postId' };
    try {
      const res = await fetch(`${X_API_BASE}/tweets/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` },
      });
      const data = await res.json();
      return { success: data.data?.deleted || false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getStats(postId) {
    if (!this.token || !postId) return { views: 0, likes: 0, comments: 0, shares: 0 };
    try {
      const res = await fetch(
        `${X_API_BASE}/tweets?ids=${postId}&tweet.fields=public_metrics,non_public_metrics`,
        { headers: { 'Authorization': `Bearer ${this.token}` } }
      );
      const data = await res.json();
      const m = data.data?.[0]?.public_metrics || {};
      return {
        views: m.impression_count || 0,
        likes: m.like_count || 0,
        comments: m.reply_count || 0,
        shares: m.retweet_count || 0,
      };
    } catch {
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  async checkHealth() {
    if (!this.token) return { healthy: false, issues: ['OAuth token not configured'], warnings: [] };
    return { healthy: true, issues: [], warnings: [] };
  }
}
