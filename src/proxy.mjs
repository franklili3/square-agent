// proxy.mjs — Proxy helper for Node.js fetch
//
// Node.js 24+ supports NODE_USE_ENV_PROXY=1 which makes native fetch
// respect HTTP_PROXY / HTTPS_PROXY env vars.
//
// This module auto-enables it if CONFIG.proxy is set,
// so users don't need to set NODE_USE_ENV_PROXY manually.

let initialized = false;

/**
 * Initialize proxy support for native fetch.
 * Call once at the top of entry files.
 * @param {string} proxyUrl - HTTP proxy URL (e.g. http://127.0.0.1:7890)
 */
export function initProxy(proxyUrl) {
  if (initialized) return;
  if (!proxyUrl) return;

  // Set env vars for Node.js native fetch proxy support (Node >= 24)
  process.env.NODE_USE_ENV_PROXY = '1';
  process.env.HTTP_PROXY = proxyUrl;
  process.env.HTTPS_PROXY = proxyUrl;

  initialized = true;
  console.log(`🌐 Proxy enabled: ${proxyUrl}`);
}
