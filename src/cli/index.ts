#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { interactiveMode } from './commands/dashboard.js';
import { configCommand } from './commands/config.js';
import { productsCommand } from './commands/products.js';
import { exploreCommand } from './commands/explore.js';

// Version
const VERSION = '2.0.0';

// Banner avec effet de bordure moderne
const banner = chalk.hex('#6366f1')(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     ██████╗██╗  ██╗ █████╗ ██████╗ ██╗ ██████╗ ██╗    ██╗                  ║
║    ██╔════╝██║  ██║██╔══██╗██╔══██╗██║██╔═══██╗██║    ██║                  ║
║    ██║     ███████║███████║██████╔╝██║██║   ██║██║ █╗ ██║                  ║
║    ██║     ██╔══██║██╔══██║██╔══██╗██║██║   ██║██║███╗██║                  ║
║    ╚██████╗██║  ██║██║  ██║██║  ██║██║╚██████╔╝╚███╔███╔╝                  ║
║     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝  ╚══╝╚══╝                   ║
║                                                                            ║
║                     Enterprise Commerce CLI v${VERSION}                    ║
║                     Manage • Sell • Grow                                   ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

// Afficher le banner
console.log(banner);

// Créer le programme
const program = new Command();

program
  .name('chariow')
  .description(chalk.hex('#94a3b8')('⚡ CLI for Chariow - Next generation e-commerce platform'))
  .version(VERSION)
  .helpOption('-h, --help', chalk.hex('#94a3b8')('Display help information'));

// Commande: dashboard (interactive TUI)
program
  .command('dashboard')
  .alias('d')
  .description(chalk.hex('#10b981')('📊 Launch interactive dashboard (TUI)'))
  .action(interactiveMode);

// Commande: config
program
  .command('config')
  .description(chalk.hex('#f59e0b')('🔧 Manage CLI configuration'))
  .option('-s, --set <token>', 'Set API token')
  .option('-g, --get', 'Get current token')
  .option('-r, --remove', 'Remove token')
  .option('--reset', 'Reset all configuration')
  .action(configCommand);

// Commande: products
program
  .command('products')
  .description(chalk.hex('#3b82f6')('📦 Product management'))
  .option('-l, --list', 'List all products')
  .option('-g, --get <id>', 'Get product by ID')
  .option('-s, --search <term>', 'Search products')
  .option('--stats', 'Show product statistics')
  .option('-c, --create', 'Create a new product (interactive)')
  .option('-d, --delete <id>', 'Delete a product')
  .action(productsCommand);

// Commande: explore
program
  .command('explore')
  .description(chalk.hex('#8b5cf6')('🔍 Explore marketplace'))
  .option('-s, --search <term>', 'Search products')
  .option('-t, --top', 'View top rated products')
  .option('-f, --featured', 'View featured products')
  .option('-c, --category <name>', 'Browse by category')
  .option('--trending', 'View trending products')
  .action(exploreCommand);

// Commande: help personnalisée
program
  .command('help')
  .description(chalk.hex('#94a3b8')('Show help information'))
  .action(() => {
    program.outputHelp();
  });

// Fonction pour afficher les commandes disponibles
function showCommands() {
  console.log(chalk.hex('#6366f1').bold('\n📋 AVAILABLE COMMANDS\n'));
  
  const commands = [
    { cmd: 'dashboard, d', desc: 'Launch interactive dashboard', color: '#10b981', icon: '📊' },
    { cmd: 'config', desc: 'Manage API configuration', color: '#f59e0b', icon: '🔧' },
    { cmd: 'products', desc: 'Manage products', color: '#3b82f6', icon: '📦' },
    { cmd: 'explore', desc: 'Explore marketplace', color: '#8b5cf6', icon: '🔍' },
    { cmd: 'help', desc: 'Show help information', color: '#94a3b8', icon: '❓' }
  ];
  
  commands.forEach(cmd => {
    console.log(`  ${chalk.hex(cmd.color)(`${cmd.icon} ${cmd.cmd.padEnd(18)}`)} ${chalk.hex('#94a3b8')(cmd.desc)}`);
  });
  
  console.log(chalk.hex('#94a3b8')('\n💡 TIP: Use "chariow <command> --help" for more details\n'));
}

// Commande: list (alias pour aider)
program
  .command('list')
  .description('List all available commands')
  .action(showCommands);

// Gestion des erreurs
program.configureOutput({
  outputError: (str, write) => {
    write(chalk.hex('#ef4444')(str));
  }
});

// Vérifier si aucune commande n'est fournie
if (process.argv.length === 2) {
  console.log(chalk.hex('#94a3b8')('\n🚀 Starting interactive mode...\n'));
  interactiveMode();
} else {
  program.parse();
}

// Gestion des promesses non gérées
process.on('unhandledRejection', (error: Error) => {
  console.error(chalk.hex('#ef4444')(`\n❌ Unhandled error: ${error.message}\n`));
  process.exit(1);
});

// Gestion des signaux
process.on('SIGINT', () => {
  console.log(chalk.hex('#94a3b8')('\n\n👋 Goodbye! See you next time.\n'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.hex('#94a3b8')('\n\n👋 Terminated. Goodbye!\n'));
  process.exit(0);
});
