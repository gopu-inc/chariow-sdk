import chalk from 'chalk';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';

const VERSION = '2.2.0';

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

function log(method: string, url: string, status: number, ms: number) {
  const mc = method === 'POST' || method === 'DELETE' ? C.accent : C.success;
  const sc = status < 300 ? C.success : status < 400 ? C.warning : C.error;
  const icon = status < 300 ? '✓' : status < 400 ? '→' : '✗';
  console.log(`  ${ts()} ${mc(method.padEnd(7))} ${C.primary(url.padEnd(50))} ${sc(icon + ' ' + status)} ${C.dim(ms + 'ms')}`);
}

function jsonRes(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Key, Idempotency-Key',
    'X-Powered-By':                `ChariowPay-Serve/${VERSION}`,
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
  const k = req.headers['x-api-key'];
  if (k) return String(k);
  return fallback ?? null;
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

// ─── Request handler (same gateway as func + /serve/* routes) ─────────────
async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  defaultApiKey?: string,
): Promise<{ status: number }> {
  const url    = new URL(req.url || '/', 'http://localhost');
  const p      = url.pathname;
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, Idempotency-Key',
    });
    res.end();
    return { status: 204 };
  }

  const apiKey = getApiKey(req, defaultApiKey);
  if (!apiKey) {
    jsonRes(res, 401, { error: { code: 'missing_api_key', message: 'Pass key via  Authorization: Bearer <key>  or  X-API-Key: <key>' } });
    return { status: 401 };
  }

  const client = new Chariow(apiKey);
  const body   = (method === 'POST' || method === 'PUT' || method === 'PATCH')
    ? await readBody(req) : {};

  // ── Health ─────────────────────────────────────────────────────────────
  if (p === '/' || p === '/health') {
    jsonRes(res, 200, { ok: true, service: 'chariow-serve', version: VERSION, timestamp: new Date().toISOString() });
    return { status: 200 };
  }

  // ── Payment Intents ────────────────────────────────────────────────────
  if (p === '/v1/payment_intents' && method === 'POST') {
    const { amount, currency, payment_method_types, customer_email, customer_name, metadata, items } = body;
    if (!amount || !currency) {
      jsonRes(res, 400, { error: { code: 'missing_params', message: 'amount and currency required' } });
      return { status: 400 };
    }
    try {
      const intentId = newId('pi');
      let checkout: any = null;
      if (items?.length) {
        checkout = await client.pay.checkout({
          items,
          customer_email, customer_name,
          payment_method: { type: payment_method_types?.[0] ?? 'card' },
          currency, metadata,
        });
      }
      jsonRes(res, 201, {
        id:                   checkout?.id ?? intentId,
        object:               'payment_intent',
        amount, currency:     currency.toLowerCase(),
        status:               'requires_payment_method',
        payment_method_types: payment_method_types ?? ['card'],
        customer_email:       customer_email ?? null,
        checkout_url:         checkout?.checkout_url ?? null,
        client_secret:        `${intentId}_secret_${crypto.randomBytes(8).toString('hex')}`,
        created:              Math.floor(Date.now() / 1000),
        chariow_payment:      checkout ?? null,
      });
      return { status: 201 };
    } catch (err: any) {
      jsonRes(res, 422, { error: { code: 'intent_failed', message: err.message } });
      return { status: 422 };
    }
  }

  const piMatch = p.match(/^\/v1\/payment_intents\/([^/]+)(\/confirm|\/cancel)?$/);
  if (piMatch) {
    const id  = piMatch[1];
    const sub = piMatch[2];
    if (method === 'GET' && !sub) {
      try {
        const payment = await client.pay.get(id);
        jsonRes(res, 200, { ...payment, object: 'payment_intent' });
        return { status: 200 };
      } catch { jsonRes(res, 404, { error: { code: 'not_found', message: `No payment intent: ${id}` } }); return { status: 404 }; }
    }
    if (method === 'POST' && sub === '/confirm') {
      try {
        const payment = await client.pay.capture(id);
        jsonRes(res, 200, { ...payment, object: 'payment_intent', status: 'succeeded' });
        return { status: 200 };
      } catch (err: any) { jsonRes(res, 422, { error: { code: 'confirm_failed', message: err.message } }); return { status: 422 }; }
    }
    if (method === 'POST' && sub === '/cancel') {
      jsonRes(res, 200, { id, object: 'payment_intent', status: 'canceled', canceled_at: Math.floor(Date.now() / 1000) });
      return { status: 200 };
    }
  }

  // ── Charges ────────────────────────────────────────────────────────────
  if (p === '/v1/charges' && method === 'POST') {
    const { amount, currency, product_id, items, customer_email, customer_name, payment_method, metadata } = body;
    if (!amount || !currency) {
      jsonRes(res, 400, { error: { code: 'missing_params', message: 'amount and currency required' } });
      return { status: 400 };
    }
    try {
      const chargeItems = items ?? (product_id ? [{ product_id, quantity: body.quantity ?? 1 }] : []);
      let payment: any = null;
      if (chargeItems.length > 0) {
        payment = await client.pay.checkout({
          items: chargeItems, customer_email, customer_name,
          payment_method: payment_method ?? { type: 'card' },
          currency, metadata,
        });
      }
      jsonRes(res, 201, {
        id:           payment?.id ?? newId('ch'),
        object:       'charge',
        amount, currency: currency.toLowerCase(),
        status:       payment ? 'pending' : 'succeeded',
        paid:         !!payment,
        customer_email, checkout_url: payment?.checkout_url ?? null,
        receipt_url:  payment?.receipt_url ?? null,
        created:      Math.floor(Date.now() / 1000),
        chariow_payment: payment ?? null,
      });
      return { status: 201 };
    } catch (err: any) {
      jsonRes(res, 422, { error: { code: 'charge_failed', message: err.message } });
      return { status: 422 };
    }
  }

  if (p === '/v1/charges' && method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const resp  = await client.pay.list({ per_page: limit });
      jsonRes(res, 200, { object: 'list', data: (resp.data || []).map((x: any) => ({ ...x, object: 'charge' })), has_more: false });
      return { status: 200 };
    } catch (err: any) { jsonRes(res, 500, { error: { code: 'list_failed', message: err.message } }); return { status: 500 }; }
  }

  const chargeMatch = p.match(/^\/v1\/charges\/([^/]+)$/);
  if (chargeMatch && method === 'GET') {
    try {
      const payment = await client.pay.get(chargeMatch[1]);
      jsonRes(res, 200, { ...payment, object: 'charge' });
      return { status: 200 };
    } catch { jsonRes(res, 404, { error: { code: 'not_found', message: `No charge: ${chargeMatch[1]}` } }); return { status: 404 }; }
  }

  // ── Refunds ────────────────────────────────────────────────────────────
  if (p === '/v1/refunds' && method === 'POST') {
    const { payment_intent, charge, amount, reason } = body;
    const payId = payment_intent || charge;
    if (!payId) { jsonRes(res, 400, { error: { code: 'missing_params', message: 'payment_intent or charge required' } }); return { status: 400 }; }
    try {
      const refund = await client.pay.refund(payId, { amount, reason });
      jsonRes(res, 201, {
        id: newId('re'), object: 'refund', amount: amount ?? refund.amount, currency: refund.currency,
        status: 'succeeded', payment_intent: payment_intent ?? null, charge: charge ?? null,
        reason: reason ?? 'requested_by_customer', created: Math.floor(Date.now() / 1000), chariow_payment: refund,
      });
      return { status: 201 };
    } catch (err: any) { jsonRes(res, 422, { error: { code: 'refund_failed', message: err.message } }); return { status: 422 }; }
  }

  // ── Customers ──────────────────────────────────────────────────────────
  if (p === '/v1/customers' && method === 'POST') {
    const { email, name, phone, metadata } = body;
    if (!email) { jsonRes(res, 400, { error: { code: 'missing_params', message: 'email required' } }); return { status: 400 }; }
    jsonRes(res, 201, { id: newId('cus'), object: 'customer', email, name: name ?? null, phone: phone ?? null, metadata: metadata ?? {}, created: Math.floor(Date.now() / 1000) });
    return { status: 201 };
  }

  // ── Balance ────────────────────────────────────────────────────────────
  if (p === '/v1/balance' && method === 'GET') {
    try {
      const store  = await client.store.getInfo();
      const sales  = await client.sales.list(undefined, 100);
      const total  = (sales.data || []).reduce((s: number, x: any) => s + (x.total || 0), 0);
      const cur    = (store as any).currency ?? 'usd';
      jsonRes(res, 200, {
        object: 'balance', livemode: false,
        available: [{ amount: Math.round(total * 100), currency: cur }],
        pending:   [{ amount: 0, currency: cur }],
        chariow_store: store.name ?? null,
      });
      return { status: 200 };
    } catch (err: any) { jsonRes(res, 500, { error: { code: 'balance_failed', message: err.message } }); return { status: 500 }; }
  }

  if (p === '/v1/balance/transactions' && method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const resp  = await client.sales.list(undefined, limit);
      const txns  = (resp.data || []).map((s: any) => ({
        id: newId('txn'), object: 'balance_transaction',
        amount: Math.round((s.total || 0) * 100), currency: (s.currency || 'usd').toLowerCase(),
        description: s.reference ?? `Sale ${s.id}`, fee: 0, net: Math.round((s.total || 0) * 100),
        status: 'available', type: 'payment',
        created: s.created_at ? Math.floor(new Date(s.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
      }));
      jsonRes(res, 200, { object: 'list', data: txns, has_more: false });
      return { status: 200 };
    } catch (err: any) { jsonRes(res, 500, { error: { code: 'txn_failed', message: err.message } }); return { status: 500 }; }
  }

  // ── Products ───────────────────────────────────────────────────────────
  if (p === '/v1/products' && method === 'GET') {
    try {
      const perPage = parseInt(url.searchParams.get('per_page') || url.searchParams.get('limit') || '50');
      const status  = url.searchParams.get('status') || undefined;
      const resp    = await client.products.list({ per_page: perPage, status });
      jsonRes(res, 200, { object: 'list', ...resp });
      return { status: 200 };
    } catch (err: any) { jsonRes(res, 500, { error: { code: 'list_failed', message: err.message } }); return { status: 500 }; }
  }

  const productMatch = p.match(/^\/v1\/products\/([^/]+)$/);
  if (productMatch && method === 'GET') {
    try {
      const product = await client.products.get(productMatch[1]);
      jsonRes(res, 200, { object: 'product', ...product });
      return { status: 200 };
    } catch { jsonRes(res, 404, { error: { code: 'not_found', message: `Product not found: ${productMatch[1]}` } }); return { status: 404 }; }
  }

  // ── 404 ───────────────────────────────────────────────────────────────
  jsonRes(res, 404, { error: { code: 'route_not_found', message: `${method} ${p}` } });
  return { status: 404 };
}

// ─── Nginx config generator ────────────────────────────────────────────────
function generateNginxConfig(port: number, domain: string, ssl: boolean): string {
  const upstreamPort = port;
  const serverName   = domain || '_';

  if (ssl) {
    return `# Chariow Payment Gateway — nginx SSL config
# Generated by chariow-sdk v${VERSION}

upstream chariow_gateway {
    server 127.0.0.1:${upstreamPort};
    keepalive 64;
}

server {
    listen 80;
    server_name ${serverName};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${serverName};

    ssl_certificate     /etc/letsencrypt/live/${serverName}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${serverName}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options          "SAMEORIGIN"    always;
    add_header X-Content-Type-Options   "nosniff"       always;
    add_header X-XSS-Protection         "1; mode=block" always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # CORS for payment API
    add_header Access-Control-Allow-Origin  "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key, Idempotency-Key" always;

    location / {
        proxy_pass         http://chariow_gateway;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_buffer_size  16k;
        proxy_buffers      4 32k;
    }

    # Larger body for payment webhooks
    client_max_body_size 10M;

    access_log  /var/log/nginx/chariow-access.log;
    error_log   /var/log/nginx/chariow-error.log warn;
}
`;
  }

  return `# Chariow Payment Gateway — nginx config (HTTP)
# Generated by chariow-sdk v${VERSION}
# For SSL, run: chariow serve --ssl --domain your.domain.com

upstream chariow_gateway {
    server 127.0.0.1:${upstreamPort};
    keepalive 64;
}

server {
    listen 80;
    server_name ${serverName};

    # CORS for payment API
    add_header Access-Control-Allow-Origin  "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key, Idempotency-Key" always;

    location / {
        proxy_pass         http://chariow_gateway;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    client_max_body_size 10M;

    access_log  /var/log/nginx/chariow-access.log;
    error_log   /var/log/nginx/chariow-error.log warn;
}
`;
}

// ─── Entry ────────────────────────────────────────────────────────────────
export async function serveCommand(options: any) {
  const config       = getConfig();
  const port         = options.port   ? parseInt(options.port)   : 4242;
  const domain       = options.domain ?? '_';
  const ssl          = !!options.ssl;
  const outputFile   = options.output ?? 'nginx-chariow.conf';
  const defaultApiKey= config?.apiKey;

  // ── Banner ──────────────────────────────────────────────────────────────
  console.log(C.primary.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║   ⚡  CHARIOW SERVE  —  Payment Gateway + nginx                             ║
║   Stripe-compatible  ·  v${VERSION}  ·  localhost:${String(port).padEnd(4)}${' '.repeat(38 - String(port).length)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`));

  if (!defaultApiKey) {
    console.log(C.warning('  ⚠  No API key configured — pass key per request via header\n'));
  }

  // ── Generate nginx config ───────────────────────────────────────────────
  const nginxConf = generateNginxConfig(port, domain, ssl);
  const confPath  = path.join(process.cwd(), outputFile);

  try {
    fs.writeFileSync(confPath, nginxConf, 'utf-8');
    console.log(C.success(`  ✓ nginx config saved to: ${C.bold(outputFile)}\n`));
  } catch (e) {
    console.log(C.warning(`  ⚠ Could not save nginx config: ${(e as any).message}\n`));
  }

  // ── Print nginx config snippet ──────────────────────────────────────────
  console.log(C.accent.bold('  NGINX SETUP INSTRUCTIONS:\n'));
  console.log(C.dim('  ┌─────────────────────────────────────────────────────────────────┐'));
  console.log(C.dim('  │') + C.text('  1. Copy the generated config to nginx sites-available:'));
  console.log(C.dim('  │') + C.cyan(`       sudo cp ${outputFile} /etc/nginx/sites-available/chariow`));
  console.log(C.dim('  │'));
  console.log(C.dim('  │') + C.text('  2. Enable it:'));
  console.log(C.dim('  │') + C.cyan('       sudo ln -s /etc/nginx/sites-available/chariow /etc/nginx/sites-enabled/'));
  console.log(C.dim('  │'));
  if (ssl) {
    console.log(C.dim('  │') + C.text('  3. Get SSL certificate (Let\'s Encrypt):'));
    console.log(C.dim('  │') + C.cyan(`       sudo certbot --nginx -d ${domain}`));
    console.log(C.dim('  │'));
    console.log(C.dim('  │') + C.text('  4. Reload nginx:'));
    console.log(C.dim('  │') + C.cyan('       sudo nginx -t && sudo systemctl reload nginx'));
  } else {
    console.log(C.dim('  │') + C.text('  3. Test & reload nginx:'));
    console.log(C.dim('  │') + C.cyan('       sudo nginx -t && sudo systemctl reload nginx'));
    console.log(C.dim('  │'));
    console.log(C.dim('  │') + C.warning('  4. For SSL: add --ssl --domain your.domain.com'));
  }
  console.log(C.dim('  │'));
  console.log(C.dim('  │') + C.text(`  5. Keep this gateway running:`));
  console.log(C.dim('  │') + C.cyan('       chariow serve &                   # background'));
  console.log(C.dim('  │') + C.cyan('       pm2 start "chariow serve" --name chariow-gateway'));
  console.log(C.dim('  └─────────────────────────────────────────────────────────────────┘\n'));

  // ── Show SDK usage ──────────────────────────────────────────────────────
  console.log(C.primary.bold('  USE FROM YOUR APP:\n'));

  const examples = [
    {
      title: 'TypeScript / Node.js (SDK)',
      lang:  'typescript',
      code: `import { ChariowPay } from "chariow-sdk"

const pay = new ChariowPay({
  Crud:   "your-api-key",
  Server: "localhost:${port}",
  Type:   "APP",
  Devis:  "USD, XAF"
})

// Register routes
pay.get("/", "html", (req, res) => {
  return pay.load("index.html")
})

pay.post("/pay", "json", async (req, res) => {
  const payment = await pay.checkout({
    items: [{ product_id: req.body.product_id, quantity: 1 }],
    customer_email: req.body.email,
    currency: req.body.currency ?? "USD"
  })
  return res.json(payment)
})

pay.listen(${port})`,
    },
    {
      title: 'curl — Payment Intent',
      lang:  'bash',
      code: `curl -X POST http://localhost:${port}/v1/payment_intents \\
  -H "Authorization: Bearer <api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":5000,"currency":"usd","items":[{"product_id":"<id>"}],"customer_email":"user@example.com"}'`,
    },
    {
      title: 'JavaScript (browser / React / Vue)',
      lang:  'js',
      code: `const res = await fetch("http://localhost:${port}/v1/charges", {
  method: "POST",
  headers: {
    "Authorization": "Bearer <api-key>",
    "Content-Type":  "application/json"
  },
  body: JSON.stringify({
    amount:         1000,
    currency:       "usd",
    product_id:     "<id>",
    customer_email: "user@example.com"
  })
})
const charge = await res.json()
window.open(charge.checkout_url) // redirect to Chariow Pay page`,
    },
  ];

  examples.forEach(({ title, code }) => {
    console.log(`  ${C.accent.bold('▸ ' + title)}`);
    code.split('\n').forEach(line => console.log(`  ${C.dim(line)}`));
    console.log('');
  });

  // ── Available endpoints ─────────────────────────────────────────────────
  console.log(C.primary.bold('  ENDPOINTS  (base: http://localhost:' + port + ')\n'));

  const groups: Array<{ section: string; color: string; routes: Array<[string, string, string]> }> = [
    { section: 'PAYMENT INTENTS', color: '#6366f1', routes: [
      ['POST', '/v1/payment_intents',              '{ amount, currency, items?, customer_email }'],
      ['GET',  '/v1/payment_intents/:id',          'Retrieve intent'],
      ['POST', '/v1/payment_intents/:id/confirm',  'Confirm / capture'],
      ['POST', '/v1/payment_intents/:id/cancel',   'Cancel'],
    ]},
    { section: 'CHARGES', color: '#8b5cf6', routes: [
      ['POST', '/v1/charges',       '{ amount, currency, product_id? }'],
      ['GET',  '/v1/charges',       'List  ?limit=20'],
      ['GET',  '/v1/charges/:id',   'Retrieve'],
    ]},
    { section: 'REFUNDS', color: '#f59e0b', routes: [
      ['POST', '/v1/refunds',       '{ payment_intent|charge, amount? }'],
      ['GET',  '/v1/refunds/:id',   'Retrieve'],
    ]},
    { section: 'CUSTOMERS', color: '#10b981', routes: [
      ['POST', '/v1/customers',    '{ email, name? }'],
      ['GET',  '/v1/customers',    'List customers'],
    ]},
    { section: 'BALANCE', color: '#3b82f6', routes: [
      ['GET', '/v1/balance',               'Account balance'],
      ['GET', '/v1/balance/transactions',  'Transactions  ?limit=20'],
    ]},
    { section: 'CATALOG', color: '#3b82f6', routes: [
      ['GET', '/v1/products',     'List products'],
      ['GET', '/v1/products/:id', 'Retrieve product'],
    ]},
  ];

  groups.forEach(({ section, color, routes }) => {
    console.log(chalk.hex(color).bold(`    ${section}`));
    routes.forEach(([m, ep, desc]) => {
      const mc = m === 'POST' ? C.accent : C.success;
      console.log(`      ${mc(m.padEnd(5))} ${C.primary(ep.padEnd(40))} ${C.dim(desc)}`);
    });
    console.log('');
  });

  console.log(C.dim('  Press Ctrl+C to stop the gateway\n'));
  console.log(C.text('  Incoming requests:\n'));

  // ── Start server ────────────────────────────────────────────────────────
  const server = http.createServer(async (req, res) => {
    const start  = Date.now();
    const method = req.method || 'GET';
    const reqUrl = req.url || '/';
    let status   = 200;
    try {
      const result = await handleRequest(req, res, defaultApiKey);
      status = result.status;
    } catch (err: any) {
      jsonRes(res, 500, { error: { code: 'internal', message: err.message } });
      status = 500;
    }
    log(method, reqUrl, status, Date.now() - start);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(C.success(`  ✓ Chariow Serve gateway listening on port ${port}\n`));
    if (domain !== '_') {
      console.log(C.success(`  ✓ Proxied via nginx → http://${domain}/\n`));
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(C.error(`\n  ✗ Port ${port} is already in use. Try: chariow serve --port 4243\n`));
    } else {
      console.log(C.error(`\n  ✗ ${err.message}\n`));
    }
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log(C.warning('\n\n  Shutting down Chariow Serve...\n'));
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}
