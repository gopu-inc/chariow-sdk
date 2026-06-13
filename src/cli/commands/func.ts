import chalk from 'chalk';
import http from 'http';
import crypto from 'crypto';
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

function log(method: string, path: string, status: number, ms: number) {
  const methodColor = method === 'POST' || method === 'DELETE' ? C.accent : C.cyan;
  const statusColor = status < 300 ? C.success : status < 400 ? C.warning : C.error;
  const statusBadge = status < 300 ? '✓' : status < 400 ? '→' : '✗';
  console.log(`  ${ts()} ${methodColor(method.padEnd(7))} ${C.primary(path.padEnd(48))} ${statusColor(statusBadge + ' ' + status)} ${C.dim(ms + 'ms')}`);
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Key, Idempotency-Key',
    'X-Powered-By':                'Chariow-Func/2.2',
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

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler — Stripe/bank-style gateway
// ─────────────────────────────────────────────────────────────────────────────
async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  defaultApiKey?: string,
): Promise<{ status: number }> {
  const url    = new URL(req.url || '/', 'http://localhost');
  const path   = url.pathname;
  const method = (req.method || 'GET').toUpperCase();

  // ── CORS preflight ─────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Key, Idempotency-Key',
    });
    res.end();
    return { status: 204 };
  }

  const apiKey = getApiKey(req, defaultApiKey);

  if (!apiKey) {
    json(res, 401, {
      error: { code: 'missing_api_key', message: 'Provide your key via  Authorization: Bearer <key>  or  X-API-Key: <key>' },
    });
    return { status: 401 };
  }

  const client = new Chariow(apiKey);
  const body   = (method === 'POST' || method === 'PUT' || method === 'PATCH')
    ? await readBody(req) : {};

  // ══════════════════════════════════════════════════════════════════════════
  // ── HEALTH / STATUS ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  if (path === '/' || path === '/health') {
    json(res, 200, {
      ok: true,
      service: 'chariow-func',
      version: VERSION,
      timestamp: now(),
      docs: 'https://docs.chariow.com/func',
    });
    return { status: 200 };
  }

  if (path === '/v1/status') {
    json(res, 200, {
      ok: true, service: 'chariow-func', version: VERSION,
      timestamp: now(),
      endpoints: ENDPOINT_LIST,
    });
    return { status: 200 };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── PAYMENT INTENTS  (Stripe-style) ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // POST /v1/payment_intents
  if (path === '/v1/payment_intents' && method === 'POST') {
    const { amount, currency, payment_method_types, customer_email, customer_name,
            metadata, description, items, confirm: autoConfirm } = body;

    if (!amount || !currency) {
      json(res, 400, { error: { code: 'missing_params', message: 'amount and currency are required' } });
      return { status: 400 };
    }

    try {
      const intentId = newId('pi');
      let checkoutResult: any = null;

      if (items && Array.isArray(items) && items.length > 0) {
        checkoutResult = await client.pay.checkout({
          items,
          customer_email,
          customer_name,
          payment_method: { type: payment_method_types?.[0] ?? 'card' },
          currency,
          metadata,
        });
      }

      const intent = {
        id:                   checkoutResult?.id ?? intentId,
        object:               'payment_intent',
        amount,
        currency:             currency.toLowerCase(),
        status:               autoConfirm ? 'processing' : 'requires_payment_method',
        payment_method_types: payment_method_types ?? ['card'],
        customer_email:       customer_email ?? null,
        customer_name:        customer_name ?? null,
        description:          description ?? null,
        metadata:             metadata ?? {},
        checkout_url:         checkoutResult?.checkout_url ?? null,
        receipt_url:          checkoutResult?.receipt_url ?? null,
        client_secret:        `${intentId}_secret_${crypto.randomBytes(8).toString('hex')}`,
        created:              Math.floor(Date.now() / 1000),
        livemode:             false,
        chariow_payment:      checkoutResult ?? null,
      };

      json(res, 201, intent);
      return { status: 201 };
    } catch (err: any) {
      json(res, 422, { error: { code: 'payment_failed', message: err.message, details: err.data } });
      return { status: 422 };
    }
  }

  // GET /v1/payment_intents/:id
  const piMatch = path.match(/^\/v1\/payment_intents\/([^/]+)$/);
  if (piMatch && method === 'GET') {
    try {
      const payment = await client.pay.get(piMatch[1]);
      json(res, 200, { ...payment, object: 'payment_intent', id: piMatch[1] });
      return { status: 200 };
    } catch (err: any) {
      json(res, 404, { error: { code: 'not_found', message: `No payment intent: ${piMatch[1]}` } });
      return { status: 404 };
    }
  }

  // POST /v1/payment_intents/:id/confirm
  const piConfirmMatch = path.match(/^\/v1\/payment_intents\/([^/]+)\/confirm$/);
  if (piConfirmMatch && method === 'POST') {
    try {
      const payment = await client.pay.capture(piConfirmMatch[1]);
      json(res, 200, { ...payment, object: 'payment_intent', status: 'succeeded' });
      return { status: 200 };
    } catch (err: any) {
      json(res, 422, { error: { code: 'confirm_failed', message: err.message } });
      return { status: 422 };
    }
  }

  // POST /v1/payment_intents/:id/cancel
  const piCancelMatch = path.match(/^\/v1\/payment_intents\/([^/]+)\/cancel$/);
  if (piCancelMatch && method === 'POST') {
    json(res, 200, {
      id: piCancelMatch[1], object: 'payment_intent',
      status: 'canceled', canceled_at: Math.floor(Date.now() / 1000),
    });
    return { status: 200 };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── CHARGES ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // POST /v1/charges
  if (path === '/v1/charges' && method === 'POST') {
    const { amount, currency, customer_email, customer_name, product_id,
            items, payment_method, description, metadata } = body;

    if (!amount || !currency) {
      json(res, 400, { error: { code: 'missing_params', message: 'amount and currency are required' } });
      return { status: 400 };
    }

    try {
      const chargeItems = items ?? (product_id ? [{ product_id, quantity: body.quantity ?? 1 }] : []);
      let payment: any = null;

      if (chargeItems.length > 0) {
        payment = await client.pay.checkout({
          items: chargeItems,
          customer_email,
          customer_name,
          payment_method: payment_method ?? { type: 'card' },
          currency,
          metadata,
        });
      }

      const charge = {
        id:             payment?.id ?? newId('ch'),
        object:         'charge',
        amount,
        currency:       currency.toLowerCase(),
        status:         payment ? 'pending' : 'succeeded',
        paid:           !!payment,
        description:    description ?? null,
        customer_email: customer_email ?? null,
        customer_name:  customer_name ?? null,
        metadata:       metadata ?? {},
        receipt_url:    payment?.receipt_url ?? null,
        checkout_url:   payment?.checkout_url ?? null,
        created:        Math.floor(Date.now() / 1000),
        livemode:       false,
        chariow_payment: payment ?? null,
      };

      json(res, 201, charge);
      return { status: 201 };
    } catch (err: any) {
      json(res, 422, { error: { code: 'charge_failed', message: err.message } });
      return { status: 422 };
    }
  }

  // GET /v1/charges/:id
  const chargeMatch = path.match(/^\/v1\/charges\/([^/]+)$/);
  if (chargeMatch && method === 'GET') {
    try {
      const payment = await client.pay.get(chargeMatch[1]);
      json(res, 200, { ...payment, object: 'charge', id: chargeMatch[1] });
      return { status: 200 };
    } catch (err: any) {
      json(res, 404, { error: { code: 'not_found', message: `No charge: ${chargeMatch[1]}` } });
      return { status: 404 };
    }
  }

  // GET /v1/charges
  if (path === '/v1/charges' && method === 'GET') {
    try {
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
      const resp  = await client.pay.list({ per_page: limit });
      json(res, 200, {
        object: 'list',
        data:   (resp.data || []).map((p: any) => ({ ...p, object: 'charge' })),
        has_more: false,
      });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { error: { code: 'list_failed', message: err.message } });
      return { status: 500 };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── REFUNDS ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // POST /v1/refunds
  if (path === '/v1/refunds' && method === 'POST') {
    const { payment_intent, charge, amount, reason } = body;
    const paymentId = payment_intent || charge;

    if (!paymentId) {
      json(res, 400, { error: { code: 'missing_params', message: 'payment_intent or charge is required' } });
      return { status: 400 };
    }

    try {
      const refund = await client.pay.refund(paymentId, { amount, reason });
      json(res, 201, {
        id:      newId('re'),
        object:  'refund',
        amount:  amount ?? refund.amount,
        currency: refund.currency,
        status:  'succeeded',
        payment_intent: payment_intent ?? null,
        charge:  charge ?? null,
        reason:  reason ?? 'requested_by_customer',
        created: Math.floor(Date.now() / 1000),
        chariow_payment: refund,
      });
      return { status: 201 };
    } catch (err: any) {
      json(res, 422, { error: { code: 'refund_failed', message: err.message } });
      return { status: 422 };
    }
  }

  // GET /v1/refunds/:id
  const refundMatch = path.match(/^\/v1\/refunds\/([^/]+)$/);
  if (refundMatch && method === 'GET') {
    json(res, 200, {
      id: refundMatch[1], object: 'refund', status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
    });
    return { status: 200 };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── CUSTOMERS ────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // POST /v1/customers
  if (path === '/v1/customers' && method === 'POST') {
    const { email, name, phone, metadata } = body;
    if (!email) {
      json(res, 400, { error: { code: 'missing_params', message: 'email is required' } });
      return { status: 400 };
    }
    json(res, 201, {
      id:       newId('cus'),
      object:   'customer',
      email, name: name ?? null, phone: phone ?? null,
      metadata: metadata ?? {},
      created:  Math.floor(Date.now() / 1000),
      livemode: false,
    });
    return { status: 201 };
  }

  // GET /v1/customers
  if (path === '/v1/customers' && method === 'GET') {
    try {
      const resp = await client.sales.list(undefined, 50);
      const customers = [...new Map(
        (resp.data || [])
          .filter((s: any) => s.customer_email)
          .map((s: any) => [s.customer_email, {
            id:      newId('cus'),
            object:  'customer',
            email:   s.customer_email,
            name:    s.customer_name ?? null,
            created: Math.floor(Date.now() / 1000),
          }])
      ).values()];
      json(res, 200, { object: 'list', data: customers, has_more: false });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { error: { code: 'list_failed', message: err.message } });
      return { status: 500 };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BALANCE ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  if (path === '/v1/balance' && method === 'GET') {
    try {
      const store  = await client.store.getInfo();
      const sales  = await client.sales.list(undefined, 100);
      const total  = (sales.data || []).reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      json(res, 200, {
        object: 'balance',
        livemode: false,
        available: [{ amount: Math.round(total * 100), currency: (store as any).currency ?? 'usd', source_types: { card: Math.round(total * 100) } }],
        pending:   [{ amount: 0, currency: (store as any).currency ?? 'usd' }],
        connect_reserved: [],
        chariow_store: store.name ?? null,
      });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { error: { code: 'balance_failed', message: err.message } });
      return { status: 500 };
    }
  }

  // GET /v1/balance/transactions
  if (path === '/v1/balance/transactions' && method === 'GET') {
    try {
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
      const resp  = await client.sales.list(undefined, limit);
      const txns  = (resp.data || []).map((s: any) => ({
        id:          newId('txn'),
        object:      'balance_transaction',
        amount:      Math.round((s.total || 0) * 100),
        currency:    (s.currency || 'usd').toLowerCase(),
        description: s.reference ?? `Sale ${s.id}`,
        fee:         0,
        net:         Math.round((s.total || 0) * 100),
        status:      'available',
        type:        'payment',
        created:     s.created_at ? Math.floor(new Date(s.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
        source:      s.id,
      }));
      json(res, 200, { object: 'list', data: txns, has_more: false });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { error: { code: 'txn_failed', message: err.message } });
      return { status: 500 };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── PRODUCTS (legacy /api/function/* + /v1/products) ────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  if ((path === '/v1/products' || path === '/api/function/products') && method === 'GET') {
    try {
      const perPage = parseInt(url.searchParams.get('per_page') || url.searchParams.get('limit') || '50');
      const status  = url.searchParams.get('status') || undefined;
      const cursor  = url.searchParams.get('cursor') || undefined;
      const resp    = await client.products.list({ per_page: perPage, status, cursor });
      json(res, 200, { object: 'list', ...resp });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { error: { code: 'list_failed', message: err.message } });
      return { status: 500 };
    }
  }

  const productMatchV1 = path.match(/^\/v1\/products\/([^/]+)$/)
    || path.match(/^\/api\/function\/product\/([^/]+)$/);
  if (productMatchV1 && method === 'GET') {
    try {
      const product = await client.products.get(productMatchV1[1]);
      json(res, 200, { object: 'product', ...product });
      return { status: 200 };
    } catch (err: any) {
      json(res, 404, { error: { code: 'not_found', message: `Product not found: ${productMatchV1[1]}` } });
      return { status: 404 };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── LEGACY api.function.pay endpoints (kept for backward compat) ─────────
  // ══════════════════════════════════════════════════════════════════════════

  if (path === '/api/function/pay' && method === 'POST') {
    const { product_id, quantity, customer_email, customer_name, payment_method, currency, metadata } = body;
    if (!product_id) {
      json(res, 400, { error: { code: 'missing_params', message: 'product_id is required' } });
      return { status: 400 };
    }
    try {
      const payment = await client.pay.checkout({
        items: [{ product_id, quantity: quantity ?? 1 }],
        customer_email, customer_name,
        payment_method: payment_method ?? { type: 'card' },
        currency: currency ?? 'USD', metadata,
      });
      json(res, 200, { ok: true, payment });
      return { status: 200 };
    } catch (err: any) {
      json(res, 422, { ok: false, error: err.message, details: err.data });
      return { status: 422 };
    }
  }

  if (path === '/api/function/checkout' && method === 'POST') {
    if (!body.items || !Array.isArray(body.items)) {
      json(res, 400, { error: { code: 'missing_params', message: 'items (array) is required' } });
      return { status: 400 };
    }
    try {
      const payment = await client.pay.checkout(body);
      json(res, 200, { ok: true, payment });
      return { status: 200 };
    } catch (err: any) {
      json(res, 422, { ok: false, error: err.message });
      return { status: 422 };
    }
  }

  if (path === '/api/function/store' && method === 'GET') {
    try {
      const store = await client.store.getInfo();
      json(res, 200, { ok: true, object: 'store', store });
      return { status: 200 };
    } catch (err: any) {
      json(res, 500, { ok: false, error: err.message });
      return { status: 500 };
    }
  }

  if (path === '/api/function/sales' || path === '/v1/sales') {
    if (method === 'GET') {
      try {
        const perPage = parseInt(url.searchParams.get('per_page') || url.searchParams.get('limit') || '20');
        const resp    = await client.sales.list(undefined, perPage);
        json(res, 200, { ok: true, object: 'list', ...resp });
        return { status: 200 };
      } catch (err: any) {
        json(res, 500, { ok: false, error: err.message });
        return { status: 500 };
      }
    }
  }

  if (path === '/api/function/payments' || path === '/v1/payments') {
    if (method === 'GET') {
      try {
        const perPage = parseInt(url.searchParams.get('per_page') || url.searchParams.get('limit') || '20');
        const resp    = await client.pay.list({ per_page: perPage });
        json(res, 200, { ok: true, object: 'list', ...resp });
        return { status: 200 };
      } catch (err: any) {
        json(res, 500, { ok: false, error: err.message });
        return { status: 500 };
      }
    }
  }

  const paymentMatchLegacy = path.match(/^\/api\/function\/payment\/([^/]+)$/)
    || path.match(/^\/v1\/payments\/([^/]+)$/);
  if (paymentMatchLegacy && method === 'GET') {
    try {
      const payment = await client.pay.get(paymentMatchLegacy[1]);
      json(res, 200, { ok: true, object: 'payment', payment });
      return { status: 200 };
    } catch (err: any) {
      json(res, 404, { ok: false, error: err.message });
      return { status: 404 };
    }
  }

  if (path === '/api/function/webhook/verify' && method === 'POST') {
    const signature = req.headers['x-chariow-signature'] as string | undefined;
    json(res, 200, { ok: true, received: true, signature_present: !!signature, payload: body });
    return { status: 200 };
  }

  // ── 404 ─────────────────────────────────────────────────────────────────
  json(res, 404, {
    error: { code: 'route_not_found', message: `${method} ${path} — use GET /v1/status for the endpoint list` },
  });
  return { status: 404 };
}

// ─── Endpoint list (for display + /v1/status) ─────────────────────────────
const ENDPOINT_LIST = [
  // Health
  { method: 'GET',  path: '/health',                            description: 'Health check' },
  { method: 'GET',  path: '/v1/status',                         description: 'Status & full endpoint list' },
  // Payment Intents (Stripe-style)
  { method: 'POST', path: '/v1/payment_intents',                description: 'Create payment intent  { amount, currency, items?, customer_email }' },
  { method: 'GET',  path: '/v1/payment_intents/:id',            description: 'Retrieve payment intent' },
  { method: 'POST', path: '/v1/payment_intents/:id/confirm',    description: 'Confirm / capture payment intent' },
  { method: 'POST', path: '/v1/payment_intents/:id/cancel',     description: 'Cancel payment intent' },
  // Charges
  { method: 'POST', path: '/v1/charges',                        description: 'Create charge  { amount, currency, product_id? }' },
  { method: 'GET',  path: '/v1/charges',                        description: 'List charges' },
  { method: 'GET',  path: '/v1/charges/:id',                    description: 'Retrieve charge' },
  // Refunds
  { method: 'POST', path: '/v1/refunds',                        description: 'Issue refund  { payment_intent|charge, amount? }' },
  { method: 'GET',  path: '/v1/refunds/:id',                    description: 'Retrieve refund' },
  // Customers
  { method: 'POST', path: '/v1/customers',                      description: 'Create customer  { email, name? }' },
  { method: 'GET',  path: '/v1/customers',                      description: 'List customers (from sales)' },
  // Balance
  { method: 'GET',  path: '/v1/balance',                        description: 'Account balance' },
  { method: 'GET',  path: '/v1/balance/transactions',           description: 'Balance transactions' },
  // Products
  { method: 'GET',  path: '/v1/products',                       description: 'List products  ?per_page=50&status=published' },
  { method: 'GET',  path: '/v1/products/:id',                   description: 'Retrieve product' },
  // Sales & Payments
  { method: 'GET',  path: '/v1/sales',                          description: 'List sales' },
  { method: 'GET',  path: '/v1/payments',                       description: 'List payments' },
  { method: 'GET',  path: '/v1/payments/:id',                   description: 'Retrieve payment' },
  // Legacy
  { method: 'POST', path: '/api/function/pay',                  description: '[legacy] Buy a product  { product_id }' },
  { method: 'POST', path: '/api/function/checkout',             description: '[legacy] Multi-item checkout' },
];

// ─── Entry ────────────────────────────────────────────────────────────────
export async function funcCommand(options: any) {
  const config = getConfig();
  const port   = options.port ? parseInt(options.port) : 4242;
  const defaultApiKey = config?.apiKey;

  console.log(C.primary.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║   ⚡  CHARIOW FUNC  —  Payment Gateway (Stripe-compatible)                  ║
║   api.function.pay  ·  v${VERSION}  ·  localhost:${String(port).padEnd(4)}                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
`));

  if (!defaultApiKey) {
    console.log(C.warning('  ⚠  No API key in CLI config — pass key via header per request\n'));
  }

  const server = http.createServer(async (req, res) => {
    const start  = Date.now();
    const method = req.method || 'GET';
    const reqUrl = req.url || '/';
    let status   = 200;
    try {
      const result = await handleRequest(req, res, defaultApiKey);
      status = result.status;
    } catch (err: any) {
      json(res, 500, { error: { code: 'internal', message: err.message } });
      status = 500;
    }
    log(method, reqUrl, status, Date.now() - start);
  });

  server.listen(port, '127.0.0.1', () => {
    const base = `http://localhost:${port}`;

    // Group endpoints by section
    const sections: Array<{ title: string; color: string; routes: typeof ENDPOINT_LIST }> = [
      { title: 'HEALTH',           color: '#94a3b8', routes: ENDPOINT_LIST.slice(0, 2) },
      { title: 'PAYMENT INTENTS',  color: '#6366f1', routes: ENDPOINT_LIST.slice(2, 6) },
      { title: 'CHARGES',          color: '#8b5cf6', routes: ENDPOINT_LIST.slice(6, 9) },
      { title: 'REFUNDS',          color: '#f59e0b', routes: ENDPOINT_LIST.slice(9, 11) },
      { title: 'CUSTOMERS',        color: '#10b981', routes: ENDPOINT_LIST.slice(11, 13) },
      { title: 'BALANCE',          color: '#3b82f6', routes: ENDPOINT_LIST.slice(13, 15) },
      { title: 'PRODUCTS',         color: '#3b82f6', routes: ENDPOINT_LIST.slice(15, 17) },
      { title: 'SALES & PAYMENTS', color: '#10b981', routes: ENDPOINT_LIST.slice(17, 20) },
      { title: 'LEGACY (backward-compat)', color: '#94a3b8', routes: ENDPOINT_LIST.slice(20) },
    ];

    sections.forEach(({ title, color, routes }) => {
      console.log(chalk.hex(color).bold(`  ${title}`));
      routes.forEach(({ method: m, path: p, description: d }) => {
        const mc = m === 'POST' ? C.accent : m === 'DELETE' ? C.error : C.success;
        console.log(`    ${mc(m.padEnd(5))} ${C.primary(`${base}${p}`).padEnd(0)}  ${C.dim(d)}`);
      });
      console.log('');
    });

    console.log(C.bold('  USAGE EXAMPLES:\n'));

    const examples = [
      {
        title: 'Create a Payment Intent (Stripe-style)',
        cmd: `curl -X POST ${base}/v1/payment_intents \\
    -H "Authorization: Bearer <key>" \\
    -H "Content-Type: application/json" \\
    -d '{"amount":5000,"currency":"usd","customer_email":"user@example.com","items":[{"product_id":"<id>","quantity":1}]}'`,
      },
      {
        title: 'Direct charge',
        cmd: `curl -X POST ${base}/v1/charges \\
    -H "Authorization: Bearer <key>" \\
    -H "Content-Type: application/json" \\
    -d '{"amount":2000,"currency":"eur","product_id":"<id>","customer_email":"user@example.com"}'`,
      },
      {
        title: 'Refund',
        cmd: `curl -X POST ${base}/v1/refunds \\
    -H "Authorization: Bearer <key>" \\
    -d '{"payment_intent":"pi_xxx","reason":"requested_by_customer"}'`,
      },
      {
        title: 'Account balance',
        cmd: `curl ${base}/v1/balance -H "Authorization: Bearer <key>"`,
      },
      {
        title: 'JavaScript (fetch)',
        cmd: `const pi = await fetch('${base}/v1/payment_intents', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <key>', 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 1000, currency: 'usd', customer_email: 'user@example.com',
                         items: [{ product_id: '<id>', quantity: 1 }] })
}).then(r => r.json());
window.open(pi.checkout_url); // redirect to Chariow payment page`,
      },
    ];

    examples.forEach(({ title, cmd }) => {
      console.log(`  ${C.text('# ' + title)}`);
      cmd.split('\n').forEach(line => console.log(`  ${C.dim(line)}`));
      console.log('');
    });

    console.log(C.dim('  Press Ctrl+C to stop\n'));
    console.log(C.text('  Incoming requests:\n'));
  });

  process.on('SIGINT', () => {
    console.log(C.warning('\n\n  Shutting down Chariow Func gateway...\n'));
    server.close(() => process.exit(0));
  });
}
