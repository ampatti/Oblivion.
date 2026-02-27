import express from 'express';
import { createServer } from 'http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteHTML, rewriteCSS } from './engine.js';

const __dir = fileURLToPath(new URL('.', import.meta.url));
const app = express();

// Simple encode/decode — just encodeURIComponent, easy to debug
export function enc(url) { return encodeURIComponent(url); }
export function dec(url) { try { return decodeURIComponent(url); } catch { return null; } }

// ── Proxy route ───────────────────────────────────────────────────────────────
app.use('/proxy', async (req, res) => {
  // URL is everything after /proxy?url=...  OR  /proxy/https%3A%2F%2F...
  let targetUrl = req.query.url;

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Bad proxy URL: ' + targetUrl);
  }

  console.log(`[Oblivion] Fetching: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method === 'GET' ? 'GET' : req.method,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'accept': req.headers['accept'] || '*/*',
        'accept-language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    const isHTML = contentType.includes('text/html');
    const isCSS  = contentType.includes('text/css');

    // Copy safe headers
    const skip = new Set(['content-encoding','content-security-policy','x-frame-options',
      'strict-transport-security','cross-origin-embedder-policy','cross-origin-opener-policy',
      'cross-origin-resource-policy','x-content-type-options','content-length']);

    for (const [k, v] of response.headers.entries()) {
      if (!skip.has(k.toLowerCase())) res.setHeader(k, v);
    }
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('x-frame-options', 'ALLOWALL');

    const finalUrl = response.url || targetUrl;

    if (isHTML) {
      const text = await response.text();
      const rewritten = rewriteHTML(text, finalUrl);
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.status(response.status).send(rewritten);
    }

    if (isCSS) {
      const text = await response.text();
      res.setHeader('content-type', 'text/css; charset=utf-8');
      return res.status(response.status).send(rewriteCSS(text, finalUrl));
    }

    // Everything else — stream it
    res.status(response.status);
    const buf = await response.arrayBuffer();
    return res.end(Buffer.from(buf));

  } catch (err) {
    console.error(`[Oblivion] FAILED: ${targetUrl} — ${err.message}`);
    return res.status(500).send(`
      <html><head><meta charset="utf-8"></head>
      <body style="background:#04000e;color:#f0e8ff;font-family:monospace;padding:40px;margin:0">
        <h2 style="color:#a855f7;margin-bottom:16px">Connection Failed</h2>
        <p style="color:#f43f5e;margin-bottom:12px">${err.message}</p>
        <p style="opacity:0.4;font-size:0.85rem">→ ${targetUrl}</p>
      </body></html>`);
  }
});

// ── Client hook ───────────────────────────────────────────────────────────────
app.get('/engine.client.js', (req, res) => {
  res.setHeader('content-type', 'application/javascript');
  res.sendFile(join(__dir, 'static', 'engine.client.js'));
});

// ── Frontend ──────────────────────────────────────────────────────────────────
app.use(express.static(join(__dir, 'static')));
app.get('*', (req, res) => res.sendFile(join(__dir, 'static', 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 80;
createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Oblivion custom engine → http://localhost:${PORT}\n`);
});