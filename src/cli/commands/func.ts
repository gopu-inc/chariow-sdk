import chalk from 'chalk';
import http from 'http';
import { getConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';

const C = {
  primary: chalk.hex('#6366f1'),
  success: chalk.hex('#10b981'),
  warning: chalk.hex('#f59e0b'),
  error:   chalk.hex('#ef4444'),
  accent:  chalk.hex('#8b5cf6'),
  text:    chalk.hex('#94a3b8'),
  dim:     chalk.dim,
  bold:    chalk.bold,
  cyan:    chalk.cyan,
};

function ts(): string {
  return chalk.dim(`[${new Date().toLocaleTimeString()}]`);
}

function log(method: string, path: string, status: number, ms: number) {
  const methodColor = method === 'POST' ? C.accent : C.cyan;
  const statusColor = status < 300 ? C.success : status < 400 ? C.warning : C.error;
  console.log(`  ${ts()} ${methodColor(method.padEnd(6))} ${path.padEnd(40)} ${statusColor(String(status))} ${C.dim(ms + 'ms')}`);
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  });
  res.end(body);
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
  });
}

function getApiKey(req: http.IncomingMessage, fallback?: string): string | null {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const header = req.headers['x-api-key'];
  if (header) return String(header);
  return fallback || null;
}

// ─── Route handler ────────────────────────────────────────────────────────
async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  defaultApiKey?: string
): Promise<{ status: number }> {
  const url = new URL(req.url || '/', `http://localhost`);
  const path = url.pathname;
  const method = req.method || 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    });
    res.end();
    return { status: 204 };
  }

  const apiKey = getApiKey(req, defaultApiKey);

  if (!apiKey) {
    json(res, 401, { error: 'Missing API key. Pass via Authorization: Bearer <key> or X-API-Key header.' });
    return { status: 401 };
  }

  const client = new Chariow(apiKey);

  // ── GET /api/function/status ───────────────────────────────────────────
  if (path === '/api/function/status' && method === 'GET') {
    json(res, 200, {
      ok: true,
      service: 'chariow-func',
      version: '2.1.3',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /api/function/pay',
        'GET  /api/function/products',
        'GET  /api/function/product/:id',
        'GET  /api/function/store',
        'GET  /api/function/sales',
        'GET  /api/function/payments',
        'POST /api/function/checkout',
        'POST /api/function/webhook/verify',
      ],
    });
    return { status: 200 };
  }

  // ── POST /api/function/pay — buy a product ─────────────────────────────
  if (path === '/api/function/pay' && method === 'POST') {
    const body = await readBody(req);
    const { product_id, quantity, customer_email, customer_name, payment_method, currency, metadata } = body;

    if (!product_id) {
      json(res, 400, { error: 'Missing required field: product_id' });
      return { status: 400 };
    }

    try {
      const payment = await client.pay.checkout({
        items: [{ product_id, quantity: quantity ?? 1 }],
        customer_email,
        customer_name,
        payment_method: payment_method ?? { type: 'card' },
        currency: currency ?? 'USD',
        metadata,
      });
      json(res, 200, { ok: true, payment });
      return { status: 200 };
    } catch (err: any) {
      json(res, 422, { ok: false, error: err.message, details: err.data });
      return { status: 422 };
    }
  }

  // ── POST /api/function/checkout — multi-item checkout ─────────────────
  if (path === '/api/function/checkout' && method === 'POST') {
    const body = await readBody(req);

    if (!body.items || !Array.isArray(body.items)) {
      json(res, 400, { error: 'Missing required field: items (array)' });
      return { status: 400 };
    }

    try {
      const payment = await client.pay.checkout(body);
      json(res, 200, { ok: true, payment });
      return { status: 200 };
    } catch (err: any) {
      json(res, 422, { ok: false, error: err.message, details: err.data });
      return { status: 422 };
    }
  }

  // ── GET /api/function/products ─────────────────────────────────────────
  if (path === '/api/function/products' && method === 'GET') {
    try {
      const perPage = url.searchParams.get('per_page') ? parseInt(url.searchParams.get('per_page')!) : 50;
      const status  = url.searchParams.get('status') || undefined;
      const cursor  = url.searchParams.get('cursor') || undefined;
      const resp = await client.products.list({ per_page: perPage, status, cursor });
      json(res, 200, { ok: true, ...resp });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { ok: false, error: err.message });
      return { status: 500 };
    }
  }

  // ── GET /api/function/product/:id ──────────────────────────────────────
  const productMatch = path.match(/^\/api\/function\/product\/([^/]+)$/);
  if (productMatch && method === 'GET') {
    try {
      const product = await client.products.get(productMatch[1]);
      json(res, 200, { ok: true, product });
      return { status: 200 };
    } catch (err: any) {
      json(res, 404, { ok: false, error: err.message });
      return { status: 404 };
    }
  }

  // ── GET /api/function/store ────────────────────────────────────────────
  if (path === '/api/function/store' && method === 'GET') {
    try {
      const store = await client.store.getInfo();
      json(res, 200, { ok: true, store });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { ok: false, error: err.message });
      return { status: 500 };
    }
  }

  // ── GET /api/function/sales ────────────────────────────────────────────
  if (path === '/api/function/sales' && method === 'GET') {
    try {
      const perPage = url.searchParams.get('per_page') ? parseInt(url.searchParams.get('per_page')!) : 20;
      const resp = await client.sales.list(undefined, perPage);
      json(res, 200, { ok: true, ...resp });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { ok: false, error: err.message });
      return { status: 500 };
    }
  }

  // ── GET /api/function/payments ─────────────────────────────────────────
  if (path === '/api/function/payments' && method === 'GET') {
    try {
      const perPage = url.searchParams.get('per_page') ? parseInt(url.searchParams.get('per_page')!) : 20;
      const resp = await client.pay.list({ per_page: perPage });
      json(res, 200, { ok: true, ...resp });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { ok: false, error: err.message });
      return { status: 500 };
    }
  }

  // ── GET /api/function/payment/:id ──────────────────────────────────────
  const paymentMatch = path.match(/^\/api\/function\/payment\/([^/]+)$/);
  if (paymentMatch && method === 'GET') {
    try {
      const payment = await client.pay.get(paymentMatch[1]);
      json(res, 200, { ok: true, payment });
      return { status: 200 };
    } catch (err: any) {
      json(res, 404, { ok: false, error: err.message });
      return { status: 404 };
    }
  }

  // ── POST /api/function/webhook/verify ──────────────────────────────────
  if (path === '/api/function/webhook/verify' && method === 'POST') {
    const body = await readBody(req);
    const signature = req.headers['x-chariow-signature'] as string | undefined;
    json(res, 200, { ok: true, received: true, signature_present: !!signature, payload: body });
    return { status: 200 };
  }

  // ── 404 ────────────────────────────────────────────────────────────────
  json(res, 404, {
    ok: false,
    error: `Route not found: ${method} ${path}`,
    available: [
      'GET  /api/function/status',
      'POST /api/function/pay',
      'POST /api/function/checkout',
      'GET  /api/function/products',
      'GET  /api/function/product/:id',
      'GET  /api/function/store',
      'GET  /api/function/sales',
      'GET  /api/function/payments',
      'GET  /api/function/payment/:id',
      'POST /api/function/webhook/verify',
    ],
  });
  return { status: 404 };
}

// ─── Entry ────────────────────────────────────────────────────────────────
export async function funcCommand(options: any) {
  const config = getConfig();
  const port = options.port ? parseInt(options.port) : 4242;
  const defaultApiKey = config?.apiKey;

  if (!defaultApiKey) {
    console.log(C.warning('\n⚠  No API key in config. Clients must pass their own via header.\n'));
  }

  console.log(C.primary.bold(`
╔══════════════════════════════════════════════════════════════════╗
║   ⚡  CHARIOW FUNC  —  api.function.pay  Local Gateway          ║
╚══════════════════════════════════════════════════════════════════╝
`));

  const server = http.createServer(async (req, res) => {
    const start = Date.now();
    const method = req.method || 'GET';
    const url = req.url || '/';
    let status = 200;
    try {
      const result = await handleRequest(req, res, defaultApiKey);
      status = result.status;
    } catch (err: any) {
      json(res, 500, { ok: false, error: err.message });
      status = 500;
    }
    log(method, url, status, Date.now() - start);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(C.success(`  ✓ Chariow Func server running on port ${port}\n`));
    console.log(C.bold('  AVAILABLE ENDPOINTS:\n'));

    const endpoints = [
      ['GET',  `/api/function/status`,       'Health check & endpoint list'],
      ['POST', `/api/function/pay`,           'Buy a product  { product_id, customer_email, ... }'],
      ['POST', `/api/function/checkout`,      'Multi-item checkout  { items: [...], ... }'],
      ['GET',  `/api/function/products`,      'List products  ?per_page=50&status=published'],
      ['GET',  `/api/function/product/:id`,   'Get product by ID'],
      ['GET',  `/api/function/store`,         'Store info'],
      ['GET',  `/api/function/sales`,         'Sales list'],
      ['GET',  `/api/function/payments`,      'Payment history'],
      ['GET',  `/api/function/payment/:id`,   'Get payment details'],
      ['POST', `/api/function/webhook/verify`,'Webhook payload receiver'],
    ];

    endpoints.forEach(([m, p, d]) => {
      const mc = m === 'POST' ? C.accent : C.success;
      console.log(`  ${mc(m.padEnd(5))} ${C.primary(`http://localhost:${port}${p.padEnd(38)}`)} ${C.dim(d)}`);
    });

    console.log('\n' + C.bold('  USAGE FROM ANY APP:\n'));
    console.log(C.dim(`  # Buy a product (Node.js / fetch / curl):`));
    console.log(C.text(`  curl -X POST http://localhost:${port}/api/function/pay \\`));
    console.log(C.text(`    -H "Content-Type: application/json" \\`));
    console.log(C.text(`    -H "Authorization: Bearer <your_api_key>" \\`));
    console.log(C.text(`    -d '{"product_id":"<id>","customer_email":"user@example.com"}'\n`));
    console.log(C.dim(`  # JavaScript (React, Vue, etc.):`));
    console.log(C.text(`  fetch('http://localhost:${port}/api/function/pay', {`));
    console.log(C.text(`    method: 'POST',`));
    console.log(C.text(`    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <key>' },`));
    console.log(C.text(`    body: JSON.stringify({ product_id: '<id>', customer_email: 'user@example.com' })`));
    console.log(C.text(`  })\n`));
    console.log(C.dim('  Press Ctrl+C to stop the server\n'));
    console.log(C.text('  Incoming requests:\n'));
  });

  process.on('SIGINT', () => {
    console.log(C.warning('\n\n  Shutting down Chariow Func server...\n'));
    server.close(() => process.exit(0));
  });
}
