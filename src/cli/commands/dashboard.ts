#!/usr/bin/env node

import chalk from 'chalk';
import readline from 'readline';
import { getConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';
import type { Store } from '../../types/product.js';
import type { Sale } from '../../modules/sales.js';

// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  primary:  chalk.hex('#6366f1'),
  success:  chalk.hex('#10b981'),
  warning:  chalk.hex('#f59e0b'),
  error:    chalk.hex('#ef4444'),
  info:     chalk.hex('#3b82f6'),
  border:   chalk.hex('#334155'),
  text:     chalk.hex('#94a3b8'),
  accent:   chalk.hex('#8b5cf6'),
  white:    chalk.white,
  dim:      chalk.dim,
  bold:     chalk.bold,
  cyan:     chalk.cyan,
};

const W = 76; // total inner width of box

function pad(s: string, n: number): string {
  const vis = stripAnsi(s);
  return vis.length >= n ? s : s + ' '.repeat(n - vis.length);
}
function rpad(s: string, n: number): string {
  const vis = stripAnsi(s);
  return vis.length >= n ? s : ' '.repeat(n - vis.length) + s;
}
function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*m/g, '');
}
function truncate(s: string, max: number): string {
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
function center(s: string, width: number): string {
  const vis = stripAnsi(s);
  const left = Math.floor((width - vis.length) / 2);
  const right = width - vis.length - left;
  return ' '.repeat(Math.max(0, left)) + s + ' '.repeat(Math.max(0, right));
}
function row(content: string): string {
  const vis = stripAnsi(content);
  const pad = W - vis.length;
  return C.border('│') + content + ' '.repeat(Math.max(0, pad)) + C.border('│');
}
function divider(l = '├', m = '─', r = '┤'): string {
  return C.border(l + m.repeat(W) + r);
}
function top(): string    { return C.border('┌' + '─'.repeat(W) + '┐'); }
function bottom(): string { return C.border('└' + '─'.repeat(W) + '┘'); }

// ─── State ─────────────────────────────────────────────────────────────────
type Tab = 'products' | 'sales' | 'store' | 'config';

interface DashState {
  tab: Tab;
  products: any[];
  sales: Sale[];
  store: Store | null;
  selIdx: number;
  loading: boolean;
  loadingMsg: string;
  err: string | null;
  lastSync: Date;
  wsActive: boolean;
  wsTimer: ReturnType<typeof setInterval> | null;
}

const TABS: Tab[] = ['products', 'sales', 'store', 'config'];
const TAB_LABELS: Record<Tab, string> = {
  products: '📦 Products',
  sales:    '🛒 Sales',
  store:    '🏪 Store',
  config:   '⚙️  Config',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtPrice(product: any): string {
  const p = product.pricing?.current_price;
  if (!p) return 'Free';
  if (p.formatted) return p.formatted;
  if (p.value) {
    const cur = p.currency || 'XAF';
    const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur === 'XAF' ? 'FCFA' : cur;
    return `${sym} ${p.value.toLocaleString()}`;
  }
  return 'Free';
}
function priceVal(product: any): number {
  const p = product.pricing?.current_price;
  if (!p) return 0;
  return typeof p.value === 'number' ? p.value : typeof p.amount === 'number' ? p.amount : 0;
}
function salesCount(p: any): number {
  if (typeof p.sales_count === 'number') return p.sales_count;
  if (typeof p.sales === 'number') return p.sales;
  return 0;
}
function bar(val: number, max: number, width = 24): string {
  const pct = Math.min(1, Math.max(0, val / (max || 1)));
  const filled = Math.round(width * pct);
  return C.success('█'.repeat(filled)) + C.text('░'.repeat(width - filled));
}

// ─── Render ────────────────────────────────────────────────────────────────
function renderHeader(st: DashState): void {
  const title = C.primary.bold('⚡  CHARIOW CLI  ') + C.text('Enterprise Commerce Platform');
  const ver   = C.dim('v2.1.3');
  console.log(top());
  console.log(row(center(title + '  ' + ver, W)));
  console.log(divider());

  // Tabs
  const tabLine = TABS.map(t => {
    const lbl = TAB_LABELS[t];
    return t === st.tab
      ? C.primary.bold(` ${lbl} `)
      : C.text(` ${lbl} `);
  }).join(C.border('│'));
  console.log(row(' ' + tabLine));
  console.log(divider());
}

function renderFooter(st: DashState): void {
  const connected = getConfig()?.apiKey;
  const status = connected ? C.success('● CONNECTED') : C.error('○ OFFLINE');
  const ws     = st.wsActive ? C.success('🔌 Realtime ON') : C.text('○ Realtime OFF');
  const sync   = C.dim(`Last sync: ${st.lastSync.toLocaleTimeString()}`);
  console.log(bottom());
  
  // Keys
  let keys = '';
  if (st.tab === 'products') {
    keys = C.dim('  ↑↓ Navigate   Enter View   r Refresh   Tab Switch   s Search   q Quit');
  } else if (st.tab === 'sales') {
    keys = C.dim('  ↑↓ Navigate   r Refresh   Tab Switch   q Quit');
  } else {
    keys = C.dim('  r Refresh   Tab Switch   q Quit');
  }
  console.log(keys);
  console.log(C.text(`\n  ${status}  │  ${ws}  │  ${sync}\n`));
}

function renderMetrics(st: DashState): void {
  if (st.loading) {
    console.log(row(C.text(`  ⏳  ${st.loadingMsg}`)));
    console.log(divider());
    return;
  }
  if (st.err) {
    console.log(row(C.error(`  ✗  ${st.err}`)));
    console.log(divider());
    return;
  }

  const { products, sales } = st;
  const totalRevenue = products.reduce((s, p) => s + priceVal(p) * salesCount(p), 0);
  const totalSales   = products.reduce((s, p) => s + salesCount(p), 0);
  const published    = products.filter(p => p.status === 'published').length;
  const avgRating    = products.length
    ? products.reduce((s, p) => s + (p.rating?.average || 0), 0) / products.length
    : 0;

  const salesRevenue = sales.reduce((s, o) => s + (o.amount || 0), 0);
  const salesCur     = sales[0]?.currency || '';

  const c1 = `  💰 Revenue    ${rpad(C.success(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue)), 16)}`;
  const c2 = `  📦 Published  ${rpad(C.success(String(published)), 5)} / ${C.info(String(products.length))} total`;
  console.log(row(pad(c1, 38) + C.border('│') + ' ' + c2));

  const c3 = `  🛒 Orders     ${rpad(C.accent(String(totalSales)), 16)}`;
  const c4 = `  ⭐ Avg Rating  ${rpad(C.warning(avgRating ? avgRating.toFixed(1) + ' ★' : 'N/A'), 10)}`;
  console.log(row(pad(c3, 38) + C.border('│') + ' ' + c4));

  const c5 = `  💳 Sales API  ${rpad(C.success(salesRevenue ? salesRevenue.toLocaleString() + ' ' + salesCur : '—'), 16)}`;
  const c6 = `  🔄 Draft      ${rpad(C.warning(String(products.length - published)), 10)}`;
  console.log(row(pad(c5, 38) + C.border('│') + ' ' + c6));

  const health = products.length ? (published / products.length) * 100 : 0;
  console.log(divider());
  console.log(row(`  Store Health  ${bar(health, 100, 30)}  ${C.success(Math.round(health) + '%')}`));
  console.log(divider());
}

function renderProducts(st: DashState): void {
  const { products, selIdx } = st;
  const title = `  📦 PRODUCTS${products.length ? ' (' + products.length + ')' : ''}`;
  console.log(row(C.bold(title)));
  console.log(divider());

  if (st.loading) {
    console.log(row(C.text('  ⏳ Fetching products...')));
  } else if (st.err) {
    console.log(row(C.error('  ✗ ' + st.err)));
  } else if (products.length === 0) {
    console.log(row(C.text('  ℹ  No products found. Create one in your Chariow dashboard.')));
  } else {
    const start = Math.max(0, Math.min(selIdx - 4, products.length - 10));
    const end   = Math.min(products.length, start + 10);

    for (let i = start; i < end; i++) {
      const p = products[i];
      const selected = i === selIdx;
      const arrow    = selected ? C.accent.bold('▶') : ' ';
      const status   = p.status === 'published' ? C.success('●') : C.warning('○');
      const name     = truncate(p.name || 'Unnamed', 32);
      const price    = truncate(fmtPrice(p), 14);
      const sales    = salesCount(p);
      const rating   = p.rating?.average ? `${p.rating.average}★` : '—  ';

      const nameC  = selected ? C.primary.bold(pad(name, 32)) : C.white(pad(name, 32));
      const priceC = selected ? C.success.bold(rpad(price, 14)) : C.success(rpad(price, 14));

      const line = ` ${arrow} ${status} ${nameC}  ${priceC}  ${C.text(rpad(String(sales), 6) + ' sales')}  ${C.warning(rating)}`;
      console.log(row(line));
    }

    if (products.length > 10) {
      const page = Math.floor(selIdx / 10) + 1;
      const total = Math.ceil(products.length / 10);
      console.log(divider());
      console.log(row(C.dim(`  Page ${page}/${total} · ↑↓ to navigate`)));
    }
  }
}

function renderSales(st: DashState): void {
  const { sales } = st;
  const title = `  🛒 SALES${sales.length ? ' (' + sales.length + ')' : ''}`;
  console.log(row(C.bold(title)));
  console.log(divider());

  if (st.loading) {
    console.log(row(C.text('  ⏳ Fetching sales...')));
  } else if (sales.length === 0) {
    console.log(row(C.text('  ℹ  No sales data available.')));
  } else {
    const header = `  ${'ID'.padEnd(24)}  ${'Product'.padEnd(22)}  ${'Amount'.padEnd(12)}  ${'Status'.padEnd(12)}  Date`;
    console.log(row(C.cyan(header)));
    console.log(divider('├', '─', '┤'));

    sales.slice(0, 12).forEach(s => {
      const id   = truncate(s.id, 22);
      const prod = truncate(s.product_id, 20);
      const amt  = `${s.amount.toLocaleString()} ${s.currency}`;
      const stat = s.status === 'completed' ? C.success('✓ ' + s.status) : C.warning(s.status);
      const date = new Date(s.created_at).toLocaleDateString();
      const line = `  ${C.dim(pad(id, 24))}  ${C.text(pad(prod, 22))}  ${C.success(pad(amt, 12))}  ${pad(stat, 12)}  ${C.dim(date)}`;
      console.log(row(line));
    });
  }
}

function renderStore(st: DashState): void {
  const s = st.store;
  console.log(row(C.bold('  🏪 STORE INFORMATION')));
  console.log(divider());

  if (st.loading) {
    console.log(row(C.text('  ⏳ Loading store info...')));
    return;
  }
  if (!s) {
    console.log(row(C.text('  ℹ  No store data. Ensure API key is set.')));
    return;
  }

  const field = (label: string, value: string) => {
    return row(`  ${C.cyan(pad(label, 16))}  ${value}`);
  };

  console.log(field('Name:', C.bold(s.name || '—')));
  console.log(field('ID:', C.dim(s.id || '—')));
  console.log(field('URL:', C.primary(s.url || '—')));
  console.log(field('Status:', s.status === 'active' ? C.success('● Active') : C.warning(s.status || '—')));
  console.log(field('Description:', C.text(truncate(s.description || '—', 48))));
  console.log(divider());

  const socials = s.social_links ? Object.entries(s.social_links).filter(([, v]) => v) : [];
  if (socials.length > 0) {
    console.log(row(C.bold('  🌐 Social Links')));
    socials.forEach(([k, v]) => {
      console.log(row(`  ${C.text(pad(k + ':', 14))} ${C.dim(truncate(String(v), 56))}`));
    });
    console.log(divider());
  }

  if (s.appearance) {
    const a = s.appearance;
    console.log(row(C.bold('  🎨 Appearance')));
    console.log(row(`  ${C.text(pad('Theme:', 14))} ${C.white(a.theme?.label || a.theme?.value || '—')}`));
    console.log(row(`  ${C.text(pad('Font:', 14))} ${C.white(a.font?.primary?.display_name || '—')}`));
    const hex = a.color?.primary?.hex;
    console.log(row(`  ${C.text(pad('Color:', 14))} ${hex ? chalk.hex(hex)(hex) : '—'}`));
    console.log(row(`  ${C.text(pad('Products/Row:', 14))} ${C.white(String(a.products_per_row || '—'))}`));
  }
}

function renderConfig(): void {
  const cfg = getConfig();
  console.log(row(C.bold('  ⚙️  CONFIGURATION')));
  console.log(divider());

  if (cfg?.apiKey) {
    const masked = cfg.apiKey.slice(0, 6) + '••••••••' + cfg.apiKey.slice(-4);
    console.log(row(C.success('  ✓ API Key configured')));
    console.log(row(C.dim('  ' + masked)));
  } else {
    console.log(row(C.warning('  ⚠ No API Key configured')));
  }

  console.log(divider());
  console.log(row(C.text('  Commands to manage your API key:')));
  console.log(row(''));
  console.log(row(`  ${C.accent('chariow config --set <your_api_key>')}`));
  console.log(row(`  ${C.accent('chariow config --get')}`));
  console.log(row(`  ${C.accent('chariow config --remove')}`));
  console.log(row(''));
  console.log(row(C.text('  Get your API key at:')));
  console.log(row(`  ${C.primary('https://app.chariow.com/settings/api')}`));
}

// ─── Full render ───────────────────────────────────────────────────────────
function render(st: DashState): void {
  console.clear();
  renderHeader(st);

  if (!st.loading) {
    renderMetrics(st);
  } else {
    console.log(row(C.text(`  ⏳  ${st.loadingMsg}`)));
    console.log(divider());
  }

  if (st.tab === 'products') renderProducts(st);
  else if (st.tab === 'sales') renderSales(st);
  else if (st.tab === 'store') renderStore(st);
  else if (st.tab === 'config') renderConfig();

  renderFooter(st);
}

// ─── Product detail view ───────────────────────────────────────────────────
async function showProductDetail(product: any): Promise<void> {
  console.clear();
  console.log(top());
  console.log(row(center(C.primary.bold('📦  PRODUCT DETAILS'), W)));
  console.log(divider());

  const f = (label: string, val: string) =>
    row(`  ${C.cyan(pad(label, 16))} ${val}`);

  console.log(f('Name:', C.bold(product.name || '—')));
  console.log(f('ID:', C.dim(product.id || '—')));
  console.log(f('Status:', product.status === 'published' ? C.success('● Published') : C.warning('○ Draft')));
  console.log(f('Price:', C.success(fmtPrice(product))));
  console.log(f('Sales:', C.accent(String(salesCount(product)))));
  console.log(f('Revenue:', C.success(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceVal(product) * salesCount(product)))));
  console.log(f('Category:', C.text(product.category?.label || 'Uncategorized')));
  console.log(f('Type:', C.text(product.type || '—')));
  console.log(f('Rating:', product.rating?.average ? C.warning(`${product.rating.average} ★`) + C.dim(` (${product.rating.count} reviews)`) : C.dim('No ratings')));
  console.log(f('On Sale Until:', C.text(product.on_sale_until || '—')));

  if (product.quantity) {
    console.log(f('Qty Total:', C.text(String(product.quantity.total || '—'))));
    console.log(f('Qty Sold:', C.text(product.quantity.sold?.value != null ? String(product.quantity.sold.value) : '—')));
  }

  if (product.description) {
    console.log(divider());
    console.log(row(C.cyan('  Description:')));
    const desc = truncate(product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), 400);
    const lines = desc.match(/.{1,68}/g) || [];
    lines.slice(0, 6).forEach(l => console.log(row(`  ${C.text(l)}`)));
  }

  if (product.seo) {
    console.log(divider());
    console.log(row(C.cyan('  SEO:')));
    if (product.seo.title) console.log(row(`  ${C.text(pad('Title:', 12))} ${truncate(product.seo.title, 56)}`));
    if (product.seo.description) console.log(row(`  ${C.text(pad('Description:', 12))} ${truncate(product.seo.description, 56)}`));
  }

  console.log(divider());
  console.log(row(`  ${C.text('🔗 URL:')} ${C.primary(`https://app.chariow.com/products/${product.id}`)}`));
  console.log(bottom());
  console.log(C.dim('\n  Press any key to return...\n'));
}

// ─── Interactive search ────────────────────────────────────────────────────
async function doSearch(st: DashState): Promise<void> {
  process.stdin.setRawMode(false);
  console.clear();
  console.log(top());
  console.log(row(center(C.primary.bold('🔎  REAL-TIME SEARCH'), W)));
  console.log(bottom());

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question(C.cyan('\n  Search (or "q" to exit): '), async (query) => {
      if (query === 'q' || query === 'exit' || query === 'quit') {
        rl.close();
        process.stdin.setRawMode(true);
        render(st);
        return;
      }
      if (!query.trim()) { ask(); return; }

      const config = getConfig();
      if (!config?.apiKey) {
        console.log(C.error('\n  ❌ API key required.\n'));
        ask();
        return;
      }

      try {
        const client = new Chariow(config.apiKey);
        const resp = await client.products.list({ per_page: 100 });
        const q = query.toLowerCase();
        const hits = resp.data.filter(p =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.label?.toLowerCase().includes(q)
        );

        if (hits.length === 0) {
          console.log(C.warning(`\n  No results for "${query}".\n`));
        } else {
          console.log(C.success(`\n  ✓ Found ${hits.length} result(s) for "${query}"\n`));
          hits.slice(0, 12).forEach((p, i) => {
            console.log(`  ${C.dim((i + 1) + '.')} ${C.white(p.name)}  ${C.success(fmtPrice(p))}  ${p.status === 'published' ? C.success('●') : C.warning('○')}`);
          });
          console.log('');
        }
      } catch (err: any) {
        console.log(C.error(`\n  Error: ${err.message}\n`));
      }

      ask();
    });
  };

  ask();
}

// ─── Entry point ───────────────────────────────────────────────────────────
export async function interactiveMode(): Promise<void> {
  console.clear();
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  const st: DashState = {
    tab: 'products',
    products: [],
    sales: [],
    store: null,
    selIdx: 0,
    loading: true,
    loadingMsg: 'Loading data...',
    err: null,
    lastSync: new Date(),
    wsActive: false,
    wsTimer: null,
  };

  const loadAll = async () => {
    st.loading = true;
    st.err = null;
    st.loadingMsg = 'Connecting to Chariow API...';
    render(st);

    const config = getConfig();
    if (!config?.apiKey) {
      st.loading = false;
      st.err = 'No API key configured. Press C to open Config tab.';
      render(st);
      return;
    }

    try {
      const client = new Chariow(config.apiKey);

      st.loadingMsg = 'Fetching products...';
      render(st);
      const pResp = await client.products.list({ per_page: 100 });
      st.products = pResp.data || [];

      st.loadingMsg = 'Fetching sales...';
      render(st);
      try {
        const sResp = await client.sales.list(undefined, 50);
        st.sales = sResp.data || [];
      } catch {
        st.sales = [];
      }

      st.loadingMsg = 'Fetching store info...';
      render(st);
      try {
        st.store = await client.store.getInfo();
      } catch {
        st.store = null;
      }

      st.lastSync = new Date();
      st.wsActive = true;

      if (!st.wsTimer) {
        st.wsTimer = setInterval(async () => {
          try {
            const c2 = new Chariow(config.apiKey!);
            const pr = await c2.products.list({ per_page: 100 });
            st.products = pr.data || [];
            try {
              const sr = await c2.sales.list(undefined, 50);
              st.sales = sr.data || [];
            } catch { /* silent */ }
            st.lastSync = new Date();
            render(st);
          } catch { /* silent */ }
        }, 60_000);
      }
    } catch (err: any) {
      st.err = err.message || 'Failed to load data';
    } finally {
      st.loading = false;
      render(st);
    }
  };

  const onKey = async (_str: string, key: any) => {
    if (!key) return;

    if (key.ctrl && key.name === 'c') {
      cleanup(st);
    } else if (key.name === 'q') {
      cleanup(st);
    } else if (key.name === 'tab') {
      const i = TABS.indexOf(st.tab);
      st.tab = TABS[(i + 1) % TABS.length];
      st.selIdx = 0;
      render(st);
    } else if (key.name === 'up') {
      if (st.tab === 'products' && st.selIdx > 0) {
        st.selIdx--;
        render(st);
      }
    } else if (key.name === 'down') {
      if (st.tab === 'products' && st.selIdx < st.products.length - 1) {
        st.selIdx++;
        render(st);
      }
    } else if (key.name === 'return') {
      if (st.tab === 'products' && st.products[st.selIdx]) {
        process.stdin.setRawMode(false);
        await showProductDetail(st.products[st.selIdx]);
        await new Promise(res => process.stdin.once('data', res));
        process.stdin.setRawMode(true);
        render(st);
      }
    } else if (key.name === 'r') {
      await loadAll();
    } else if (key.name === 's' && st.tab === 'products') {
      await doSearch(st);
    } else if (key.name === 'c') {
      st.tab = 'config';
      render(st);
    } else if (key.name === '1') {
      st.tab = 'products'; st.selIdx = 0; render(st);
    } else if (key.name === '2') {
      st.tab = 'sales'; render(st);
    } else if (key.name === '3') {
      st.tab = 'store'; render(st);
    } else if (key.name === '4') {
      st.tab = 'config'; render(st);
    }
  };

  process.stdin.on('keypress', onKey);
  await loadAll();
}

function cleanup(st: DashState): void {
  if (st.wsTimer) clearInterval(st.wsTimer);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
  console.clear();
  console.log(C.success(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                    👋  Thank you for using Chariow CLI!                   ║
║                            Have a great day! 🚀                            ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
  process.exit(0);
}
