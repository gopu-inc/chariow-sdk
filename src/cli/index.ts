#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { interactiveMode } from './commands/dashboard.js';
import { configCommand } from './commands/config.js';
import { productsCommand } from './commands/products.js';
import { exploreCommand } from './commands/explore.js';
import { salesCommand } from './commands/sales.js';
import { storeCommand } from './commands/store.js';

const VERSION = '2.1.3';

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
║              Enterprise Commerce CLI  `) + chalk.hex('#94a3b8')(`v${VERSION}`) + chalk.hex('#6366f1')(`                         ║
║              Manage • Sell • Grow • Analyse                               ║
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

// ─── dashboard ──────────────────────────────────────────────────────────────
program
  .command('dashboard')
  .alias('d')
  .description(chalk.hex('#10b981')('📊 Interactive TUI dashboard (Products · Sales · Store)'))
  .action(interactiveMode);

// ─── config ─────────────────────────────────────────────────────────────────
program
  .command('config')
  .description(chalk.hex('#f59e0b')('🔧 Manage CLI configuration'))
  .option('-s, --set <token>', 'Set API token')
  .option('-g, --get', 'Get current token')
  .option('-r, --remove', 'Remove token')
  .option('--reset', 'Reset all configuration')
  .action(configCommand);

// ─── products ───────────────────────────────────────────────────────────────
program
  .command('products')
  .description(chalk.hex('#3b82f6')('📦 Product management'))
  .option('-l, --list', 'List all products')
  .option('-g, --get <id>', 'Get product by ID')
  .option('-s, --search <term>', 'Search products')
  .option('--stats', 'Show product statistics')
  .option('-c, --create', 'Create a new product (interactive)')
  .option('-d, --delete <id>', 'Delete a product')
  .option('--limit <n>', 'Number of products to fetch (default: 20)')
  .action(productsCommand);

// ─── sales ──────────────────────────────────────────────────────────────────
program
  .command('sales')
  .description(chalk.hex('#10b981')('🛒 Sales & orders management'))
  .option('-l, --list', 'List recent sales')
  .option('-g, --get <id>', 'Get sale details by ID')
  .option('--stats', 'Show sales statistics')
  .option('--limit <n>', 'Number of sales to fetch (default: 20)')
  .action(salesCommand);

// ─── store ──────────────────────────────────────────────────────────────────
program
  .command('store')
  .description(chalk.hex('#8b5cf6')('🏪 Store information & appearance'))
  .action(storeCommand);

// ─── explore ────────────────────────────────────────────────────────────────
program
  .command('explore')
  .description(chalk.hex('#8b5cf6')('🔍 Explore marketplace'))
  .option('-s, --search <term>', 'Search products')
  .option('-t, --top', 'View top rated products')
  .option('-f, --featured', 'View featured products')
  .option('-c, --category <name>', 'Browse by category')
  .option('--trending', 'View trending products')
  .action(exploreCommand);

// ─── list ───────────────────────────────────────────────────────────────────
program
  .command('list')
  .description('List all available commands')
  .action(showCommands);

// ─── help ───────────────────────────────────────────────────────────────────
program
  .command('help')
  .description(chalk.hex('#94a3b8')('Show help information'))
  .action(() => program.outputHelp());

function showCommands() {
  console.log(chalk.hex('#6366f1').bold('\n📋 AVAILABLE COMMANDS\n'));
  const commands = [
    { cmd: 'dashboard, d', desc: 'Interactive TUI  (Products · Sales · Store)', color: '#10b981', icon: '📊' },
    { cmd: 'products',     desc: 'Product management  (list, get, search, create, delete)', color: '#3b82f6', icon: '📦' },
    { cmd: 'sales',        desc: 'Sales & orders  (list, get, stats)', color: '#10b981', icon: '🛒' },
    { cmd: 'store',        desc: 'Store information & appearance', color: '#8b5cf6', icon: '🏪' },
    { cmd: 'explore',      desc: 'Explore marketplace  (search, top, trending, category)', color: '#8b5cf6', icon: '🔍' },
    { cmd: 'config',       desc: 'Manage API key  (set, get, remove)', color: '#f59e0b', icon: '🔧' },
    { cmd: 'help',         desc: 'Show help information', color: '#94a3b8', icon: '❓' },
  ];
  commands.forEach(c => {
    console.log(`  ${chalk.hex(c.color)(`${c.icon} ${c.cmd.padEnd(20)}`)} ${chalk.hex('#94a3b8')(c.desc)}`);
  });
  console.log(chalk.hex('#94a3b8')('\n💡 Tip: chariow <command> --help   for per-command options\n'));
}

// ─── Error output ────────────────────────────────────────────────────────────
program.configureOutput({
  outputError: (str, write) => write(chalk.hex('#ef4444')(str)),
});

// ─── Entry ───────────────────────────────────────────────────────────────────
if (process.argv.length === 2) {
  console.log(chalk.hex('#94a3b8')('🚀 Starting interactive dashboard...\n'));
  interactiveMode();
} else {
  program.parse();
}

// ─── Global handlers ─────────────────────────────────────────────────────────
process.on('unhandledRejection', (error: any) => {
  console.error(chalk.hex('#ef4444')(`\n❌ ${error?.message || error}\n`));
  process.exit(1);
});
process.on('SIGINT', () => {
  console.log(chalk.hex('#94a3b8')('\n\n👋 Goodbye!\n'));
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log(chalk.hex('#94a3b8')('\n\n👋 Terminated. Goodbye!\n'));
  process.exit(0);
});
