// binance-square.mjs — 币安广场 Connector（开源版）
//
// 支持纯文本 + 图片发帖，API Key 从环境变量读取

import { BaseConnector } from './base.mjs';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const API_ENDPOINT = 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi';
const API_ENDPOINT_V2 = 'https://www.binance.com/bapi/composite/v2/public/pgc/openApi';
const MAX_IMAGES = 4;

export class BinanceSquareConnector extends BaseConnector {
  constructor(config = {}) {
    super(config);
    this.name = 'Binance Square';
    this.platform = 'binance';
    this.capabilities = {
      text: true,
      image: true,
      video: false,
      poll: false,
      longArticle: true,
      delete: false,
      stats: false,
    };
    this.apiKey = config.apiKey || process.env.BINANCE_SQUARE_API_KEY || '';
  }

  async publish(content, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: 'BINANCE_SQUARE_API_KEY not set' };
    }

    // 直接用原文，不修改内容
    let imageList = undefined;
    if (options.images?.length > 0) {
      imageList = await this._uploadImages(options.images);
    }

    const contentType = options.title ? 2 : 1;
    const body = { contentType, bodyTextOnly: content };
    if (options.title) body.title = options.title;
    if (imageList?.length > 0) body.imageList = imageList;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const res = await fetch(`${API_ENDPOINT}/content/add`, {
          method: 'POST',
          headers: {
            'X-Square-OpenAPI-Key': this.apiKey,
            'Content-Type': 'application/json',
            'clienttype': 'binanceSkill',
          },
          body: JSON.stringify(body),
        });

        if (res.status === 504) {
          return { success: true, postId: null, postUrl: null, note: 'timeout but likely posted' };
        }

        const json = await res.json();
        if (String(json.code) === '000000') {
          const postId = String(json.data?.id || '');
          const postUrl = postId ? `https://www.binance.com/square/post/${postId}` : null;
          return { success: true, postId, postUrl };
        }

        if (['10004'].includes(String(json.code)) && attempt < 5) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }

        return { success: false, error: `${json.code}: ${json.message || 'unknown'}` };
      } catch (e) {
        if (attempt < 5) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        return { success: false, error: e.message };
      }
    }

    return { success: false, error: 'max retries exceeded' };
  }

  async _uploadImages(imageUrls) {
    const uploaded = [];
    for (const url of imageUrls.slice(0, MAX_IMAGES)) {
      const result = await this._uploadSingleImage(url);
      if (result) uploaded.push(result);
    }
    return uploaded.length > 0 ? uploaded : undefined;
  }

  async _uploadSingleImage(imageUrl) {
    try {
      const tmpFile = `/tmp/sa-img-${Date.now()}.${imageUrl.split('?')[0].split('.').pop().toLowerCase()}`;
      execSync(`curl -sL --max-time 15 -o "${tmpFile}" "${imageUrl}"`, { timeout: 20000 });
      if (!existsSync(tmpFile)) return null;

      const imageName = tmpFile.split('/').pop();
      const ext = imageName.split('.').pop();
      const ct = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';

      // 1. 获取 presigned URL
      const preRes = await fetch(`${API_ENDPOINT_V2}/image/presignedUrl`, {
        method: 'POST',
        headers: { 'X-Square-OpenAPI-Key': this.apiKey, 'Content-Type': 'application/json', 'clienttype': 'binanceSkill' },
        body: JSON.stringify({ imageName }),
      });
      const preJson = await preRes.json();
      if (String(preJson.code) !== '000000') return null;

      const { presignedUrl, fileTicket } = preJson.data;

      // 2. 上传到 S3
      const imgBuf = readFileSync(tmpFile);
      await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': ct }, body: imgBuf });

      // 3. 轮询上传状态
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const sRes = await fetch(`${API_ENDPOINT_V2}/image/imageStatus`, {
          method: 'POST',
          headers: { 'X-Square-OpenAPI-Key': this.apiKey, 'Content-Type': 'application/json', 'clienttype': 'binanceSkill' },
          body: JSON.stringify({ fileTicket }),
        });
        const sJson = await sRes.json();
        if (String(sJson.code) === '000000' && sJson.data?.status === 1) {
          unlinkSync(tmpFile);
          return sJson.data.imageUrl;
        }
        if (String(sJson.code) === '000000' && sJson.data?.status === 2) break;
      }
      unlinkSync(tmpFile);
      return null;
    } catch {
      return null;
    }
  }

  async checkHealth() {
    if (!this.apiKey) return { healthy: false, issues: ['API Key not configured'], warnings: [] };
    return { healthy: true, issues: [], warnings: [] };
  }
}
