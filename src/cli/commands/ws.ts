import chalk from 'chalk';
import { getConfig } from '../utils/config.js';
import { ChariowWebSocket } from '../services/websocket.js';

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

function printBanner() {
  console.log(C.primary.bold(`
╔══════════════════════════════════════════════════════════════╗
║   🔌  CHARIOW  WEBSOCKET  MONITOR  —  Live Event Stream     ║
╚══════════════════════════════════════════════════════════════╝
`));
}

export async function wsCommand(options: any) {
  const config = getConfig();
  if (!config?.apiKey) {
    console.log(C.error('\n❌ No API key found. Run: chariow config --set <token>\n'));
    process.exit(1);
  }

  printBanner();

  const events = options.events
    ? (options.events as string).split(',').map((e: string) => e.trim())
    : ['all'];

  console.log(C.text(`  Subscribing to events: `) + C.accent(events.join(', ')));
  console.log(C.dim('  Press Ctrl+C to disconnect\n'));

  const ws = new ChariowWebSocket(config.apiKey);

  let eventCount = 0;
  const startTime = Date.now();

  const logEvent = (label: string, color: (s: string) => string, data: any) => {
    eventCount++;
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    console.log(`\n${ts()} ${color(`● ${label}`)}`);
    console.log(C.dim(`  Events received: ${eventCount}  │  Uptime: ${uptime}s`));
    try {
      const formatted = JSON.stringify(data, null, 2)
        .split('\n')
        .slice(0, 20)
        .map(l => '  ' + C.dim(l))
        .join('\n');
      console.log(formatted);
    } catch {
      console.log('  ' + C.dim(String(data)));
    }
  };

  // ─── Event listeners ────────────────────────────────────────────────────
  ws.on('connected', () => {
    console.log(C.success(`${ts()} ✓ Connected to Chariow WebSocket`));
    console.log(C.dim('  Waiting for events...\n'));

    // Subscribe channels based on options
    if (options.store || events.includes('all') || events.some((e: string) => e.startsWith('store'))) {
      ws.subscribeToStore();
      console.log(C.text(`  ${ts()} Subscribed to store events`));
    }

    if (options.product) {
      ws.subscribeToProduct(options.product);
      console.log(C.text(`  ${ts()} Subscribed to product ${options.product}`));
    }
  });

  ws.on('disconnected', () => {
    console.log(C.warning(`\n${ts()} ⚠ Disconnected from WebSocket`));
  });

  ws.on('error', (err: Error) => {
    console.log(C.error(`\n${ts()} ✗ WebSocket error: ${err.message}`));
  });

  ws.on('new_sale', (data: any) => {
    if (events.includes('all') || events.includes('sale') || events.includes('sale.created')) {
      logEvent('NEW SALE', C.success, data);
      if (data?.product_name) console.log(C.success(`  🛒 ${data.product_name}  →  ${data.amount} ${data.currency || ''}`));
    }
  });

  ws.on('product_updated', (data: any) => {
    if (events.includes('all') || events.includes('product') || events.includes('product.updated')) {
      logEvent('PRODUCT UPDATED', C.cyan, data);
    }
  });

  ws.on('stats_update', (data: any) => {
    if (events.includes('all') || events.includes('stats')) {
      logEvent('STATS UPDATE', C.accent, data);
    }
  });

  ws.on('notification', (data: any) => {
    if (events.includes('all') || events.includes('notification')) {
      logEvent('NOTIFICATION', C.warning, data);
      if (data?.message) console.log(C.warning(`  💬 ${data.message}`));
    }
  });

  ws.on('message', (msg: any) => {
    if (events.includes('all')) {
      logEvent(`RAW: ${msg.type || 'unknown'}`, C.text, msg.data ?? msg);
    }
  });

  // ─── Connect ────────────────────────────────────────────────────────────
  try {
    console.log(C.text(`${ts()} Connecting to wss://api.chariow.com/v1/ws...\n`));
    await ws.connect();
  } catch (err: any) {
    console.log(C.error(`\n❌ Connection failed: ${err.message}`));
    console.log(C.dim('  The WebSocket endpoint may not be available for your plan.\n'));
    process.exit(1);
  }

  // Keep alive
  process.on('SIGINT', () => {
    console.log(C.warning('\n\n👋 Disconnecting WebSocket...\n'));
    ws.disconnect();
    process.exit(0);
  });
}
