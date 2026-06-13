#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { interactiveMode }  from './commands/dashboard.js';
import { configCommand }    from './commands/config.js';
import { productsCommand }  from './commands/products.js';
import { exploreCommand }   from './commands/explore.js';
import { salesCommand }     from './commands/sales.js';
import { storeCommand }     from './commands/store.js';
import { wsCommand }        from './commands/ws.js';
import { hooksCommand }     from './commands/hooks.js';
import { dnsCommand }       from './commands/dns.js';
import { payCommand }       from './commands/pay.js';
import { funcCommand }      from './commands/func.js';
import { serveCommand }     from './commands/serve.js';

const VERSION = '2.2.0';

const banner = chalk.hex('#6366f1')(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     ██████╗██╗  ██╗ █████╗ ██████╗ ██╗ ██████╗ ██╗    ██╗               ║
║    ██╔════╝██║  ██║██╔══██╗██╔══██╗██║██╔═══██╗██║    ██║               ║
║    ██║     ███████║███████║██████╔╝██║██║   ██║██║ █╗ ██║               ║
║    ██║     ██╔══██║██╔══██║██╔══██╗██║██║   ██║██║███╗██║               ║
║    ╚██████╗██║  ██║██║  ██║██║  ██║██║╚██████╔╝╚███╔███╔╝               ║
║     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝  ╚══╝╚══╝                ║
║                                                                            ║
║     Enterprise Commerce CLI  `) + chalk.hex('#94a3b8')(`v${VERSION}`) + chalk.hex('#6366f1')(`                                        ║
║     Manage · Pay · Hooks · DNS · WebSocket · Func                        ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

console.log(banner);

const program = new Command();

program
  .name('chariow')
  .description(chalk.hex('#94a3b8')('⚡ CLI for Chariow — Next generation e-commerce platform'))
  .version(VERSION)
  .helpOption('-h, --help', chalk.hex('#94a3b8')('Display help information'));

// ─── dashboard ───────────────────────────────────────────────────────────────
program
  .command('dashboard')
  .alias('d')
  .description(chalk.hex('#10b981')('📊 Interactive TUI dashboard  (Products · Sales · Store)'))
  .action(interactiveMode);

// ─── config ──────────────────────────────────────────────────────────────────
program
  .command('config')
  .description(chalk.hex('#f59e0b')('🔧 Manage CLI configuration'))
  .option('-s, --set <token>', 'Set API token')
  .option('-g, --get', 'Get current token')
  .option('-r, --remove', 'Remove token')
  .option('--reset', 'Reset all configuration')
  .action(configCommand);

// ─── products ────────────────────────────────────────────────────────────────
program
  .command('products')
  .description(chalk.hex('#3b82f6')('📦 Product management'))
  .option('-l, --list', 'List all products')
  .option('-g, --get <id>', 'Get product by ID')
  .option('-s, --search <term>', 'Search products')
  .option('-c, --create', 'Create a new product (interactive)')
  .option('--publish <id>', 'Publish a product')
  .option('--unpublish <id>', 'Unpublish a product (back to draft)')
  .option('-d, --delete <id>', 'Delete a product')
  .option('--stats', 'Show product statistics')
  .option('--status <status>', 'Filter by status when listing  (published|draft)')
  .option('--limit <n>', 'Number of products to fetch  (default: 50)')
  .action(productsCommand);

// ─── sales ───────────────────────────────────────────────────────────────────
program
  .command('sales')
  .description(chalk.hex('#10b981')('🛒 Sales & orders management'))
  .option('-l, --list', 'List recent sales')
  .option('-g, --get <id>', 'Get sale by ID')
  .option('--stats', 'Show sales statistics')
  .option('--limit <n>', 'Number of sales to fetch  (default: 20)')
  .action(salesCommand);

// ─── store ───────────────────────────────────────────────────────────────────
program
  .command('store')
  .description(chalk.hex('#8b5cf6')('🏪 Store information & appearance'))
  .action(storeCommand);

// ─── explore ─────────────────────────────────────────────────────────────────
program
  .command('explore')
  .description(chalk.hex('#8b5cf6')('🔍 Explore the Chariow marketplace  (stores & products)'))
  .option('-s, --search <term>', 'Search stores by name')
  .option('--store <slug>', 'View a specific store and its products')
  .option('-t, --top', 'Top stores by product count')
  .option('-p, --products [category]', 'Browse all published products  (optional category filter)')
  .action(exploreCommand);

// ─── pay ─────────────────────────────────────────────────────────────────────
program
  .command('pay')
  .description(chalk.hex('#10b981')('💳 Chariow Pay  —  payments & checkout'))
  .option('--checkout', 'Interactive checkout wizard')
  .option('--buy <product_id>', 'Buy a specific product')
  .option('-l, --list', 'List payment history')
  .option('-g, --get <id>', 'Get payment details')
  .option('--refund <id>', 'Refund a payment')
  .option('--status <status>', 'Filter payments by status  (pending|succeeded|failed|refunded)')
  .option('--limit <n>', 'Number of payments  (default: 20)')
  .option('--email <email>', 'Customer email  (used with --buy)')
  .option('--name <name>', 'Customer name  (used with --buy)')
  .action(payCommand);

// ─── hooks ───────────────────────────────────────────────────────────────────
program
  .command('hooks')
  .description(chalk.hex('#f59e0b')('🔗 Webhook management'))
  .option('-l, --list', 'List all webhooks')
  .option('--get <id>', 'Get webhook details')
  .option('--create', 'Create a new webhook  (interactive)')
  .option('--delete <id>', 'Delete a webhook')
  .option('--test <id>', 'Send a test payload to a webhook')
  .option('--deliveries <id>', 'View delivery history for a webhook')
  .action(hooksCommand);

// ─── dns ─────────────────────────────────────────────────────────────────────
program
  .command('dns')
  .description(chalk.hex('#3b82f6')('🌐 Custom domain & DNS management'))
  .option('-l, --list', 'List all custom domains')
  .option('--info <id>', 'Get domain details and DNS records')
  .option('--add [domain]', 'Add a custom domain  (interactive if omitted)')
  .option('--verify <id>', 'Trigger domain verification')
  .option('--remove <id>', 'Remove a custom domain')
  .action(dnsCommand);

// ─── ws ──────────────────────────────────────────────────────────────────────
program
  .command('ws')
  .description(chalk.hex('#6366f1')('🔌 WebSocket live event monitor'))
  .option('--events <types>', 'Comma-separated event types  (default: all)  e.g. sale,product')
  .option('--store', 'Subscribe to store events')
  .option('--product <id>', 'Subscribe to a specific product')
  .action(wsCommand);

// ─── func ────────────────────────────────────────────────────────────────────
program
  .command('func')
  .description(chalk.hex('#8b5cf6')('⚡ api.function.pay — Local HTTP gateway for cross-app payments'))
  .option('--port <n>', 'Port to listen on  (default: 4242)')
  .action(funcCommand);

// ─── serve ───────────────────────────────────────────────────────────────────
program
  .command('serve')
  .alias('s')
  .description(chalk.hex('#10b981')('🌐 Start payment gateway + generate nginx reverse-proxy config'))
  .option('--port <n>',     'Port to listen on  (default: 4242)')
  .option('--domain <host>','Domain name for nginx config  e.g. pay.mystore.com')
  .option('--ssl',          'Generate SSL/HTTPS nginx config  (requires Let\'s Encrypt)')
  .option('--output <file>','Output filename for nginx config  (default: nginx-chariow.conf)')
  .action(serveCommand);

// ─── list ─────────────────────────────────────────────────────────────────────
program
  .command('list')
  .description('List all available commands')
  .action(showCommands);

// ─── help ─────────────────────────────────────────────────────────────────────
program
  .command('help')
  .description(chalk.hex('#94a3b8')('Show help information'))
  .action(() => program.outputHelp());

// ─── Show commands ────────────────────────────────────────────────────────────
function showCommands() {
  console.log(chalk.hex('#6366f1').bold('\n📋 ALL COMMANDS\n'));

  const sections: Array<{ title: string; color: string; cmds: [string, string][] }> = [
    {
      title: 'CORE',
      color: '#94a3b8',
      cmds: [
        ['dashboard, d',  'Interactive TUI  (Products · Sales · Store)'],
        ['config',        'Manage API key  (set, get, remove)'],
      ],
    },
    {
      title: 'PRODUCTS',
      color: '#3b82f6',
      cmds: [
        ['products --list',             'List all products'],
        ['products --create',           'Create product  (interactive form)'],
        ['products --publish <id>',     'Publish a product'],
        ['products --unpublish <id>',   'Move product to draft'],
        ['products --delete <id>',      'Delete a product'],
        ['products --search <term>',    'Search products'],
        ['products --stats',            'Product statistics'],
      ],
    },
    {
      title: 'PAY  —  Chariow Pay',
      color: '#10b981',
      cmds: [
        ['pay --checkout',         'Interactive checkout wizard'],
        ['pay --buy <product_id>', 'Buy a product directly'],
        ['pay --list',             'Payment history'],
        ['pay --get <id>',         'Payment details'],
        ['pay --refund <id>',      'Refund a payment'],
      ],
    },
    {
      title: 'FUNC  —  api.function.pay',
      color: '#8b5cf6',
      cmds: [
        ['func',              'Start local HTTP gateway on port 4242'],
        ['func --port <n>',   'Start on custom port'],
      ],
    },
    {
      title: 'SERVE  —  Gateway + nginx',
      color: '#10b981',
      cmds: [
        ['serve',                        'Start gateway + generate nginx.conf  (port 4242)'],
        ['serve --port <n>',             'Custom port'],
        ['serve --domain pay.mysite.com','nginx config pour un domaine'],
        ['serve --ssl --domain <host>',  'Config SSL / HTTPS (Let\'s Encrypt)'],
        ['serve &',                      'Run in background (bash)'],
      ],
    },
    {
      title: 'WEBSOCKET',
      color: '#6366f1',
      cmds: [
        ['ws',                       'Live event monitor  (all events)'],
        ['ws --events sale,product', 'Filter specific event types'],
        ['ws --store',               'Subscribe to store events'],
        ['ws --product <id>',        'Subscribe to a product'],
      ],
    },
    {
      title: 'HOOKS',
      color: '#f59e0b',
      cmds: [
        ['hooks --list',           'List all webhooks'],
        ['hooks --create',         'Create webhook  (interactive)'],
        ['hooks --test <id>',      'Send test payload'],
        ['hooks --deliveries <id>','Delivery history'],
        ['hooks --delete <id>',    'Delete webhook'],
      ],
    },
    {
      title: 'DNS',
      color: '#3b82f6',
      cmds: [
        ['dns --list',        'List custom domains'],
        ['dns --add <domain>','Add a domain'],
        ['dns --verify <id>', 'Verify domain'],
        ['dns --info <id>',   'DNS records & status'],
        ['dns --remove <id>', 'Remove domain'],
      ],
    },
    {
      title: 'OTHER',
      color: '#94a3b8',
      cmds: [
        ['sales --list',   'Sales & orders'],
        ['sales --stats',  'Sales statistics'],
        ['store',          'Store info & appearance'],
        ['explore',        'Marketplace browser  (all stores & products)'],
      ],
    },
  ];

  sections.forEach(({ title, color, cmds }) => {
    console.log(chalk.hex(color).bold(`  ${title}\n`));
    cmds.forEach(([cmd, desc]) => {
      console.log(`    ${chalk.hex(color)(`chariow ${cmd.padEnd(36)}`)} ${chalk.hex('#94a3b8')(desc)}`);
    });
    console.log('');
  });

  console.log(chalk.hex('#94a3b8')('  💡 chariow <command> --help  for per-command options\n'));
}

// ─── Error output ─────────────────────────────────────────────────────────────
program.configureOutput({
  outputError: (str, write) => write(chalk.hex('#ef4444')(str)),
});

// ─── Entry ────────────────────────────────────────────────────────────────────
if (process.argv.length === 2) {
  console.log(chalk.hex('#94a3b8')('🚀 Starting interactive dashboard...\n'));
  interactiveMode();
} else {
  program.parse();
}

// ─── Global handlers ──────────────────────────────────────────────────────────
process.on('unhandledRejection', (error: any) => {
  console.error(chalk.hex('#ef4444')(`\n❌ ${error?.message || error}\n`));
  process.exit(1);
});
process.on('SIGINT', () => {
  console.log(chalk.hex('#94a3b8')('\n\n👋 Goodbye!\n'));
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log(chalk.hex('#94a3b8')('\n\n👋 Terminated.\n'));
  process.exit(0);
});
