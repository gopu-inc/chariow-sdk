#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { configCommand } from './commands/config.js';
import { productsCommand } from './commands/products.js';
import { interactiveMode } from './commands/interactive.js';
import { exploreCommand } from './commands/explore.js';

// ASCII Art Header
console.log(
  chalk.cyan(
    figlet.textSync('Chariow CLI', { horizontalLayout: 'full' })
  )
);
console.log(chalk.dim('⚡ The ultimate e-commerce CLI\n'));

const program = new Command();

program
  .name('chariow')
  .description('CLI for Chariow - Manage your e-commerce platform')
  .version('1.0.0');

// Commandes principales
program
  .command('config')
  .description('Configure your API token')
  .option('-s, --set <token>', 'Set API token')
  .option('-g, --get', 'Get current token')
  .option('-r, --remove', 'Remove token')
  .action(configCommand);

program
  .command('products')
  .description('Manage products')
  .option('-l, --list', 'List all products')
  .option('-g, --get <id>', 'Get product by ID')
  .option('-c, --create', 'Create a new product (interactive)')
  .option('-s, --search <term>', 'Search products')
  .option('-d, --delete <id>', 'Delete product')
  .action(productsCommand);

program
  .command('explore')
  .description('Explore millions of products on Chariow')
  .option('-s, --search <term>', 'Search products')
  .option('-t, --top', 'View top products')
  .option('-c, --category <name>', 'Browse by category')
  .action(exploreCommand);

program
  .command('interactive')
  .alias('i')
  .description('Launch interactive mode (like Copilot CLI)')
  .action(interactiveMode);

// Mode par défaut : interactif
if (process.argv.length === 2) {
  interactiveMode();
} else {
  program.parse();
}
