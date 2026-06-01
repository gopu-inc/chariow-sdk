#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const config_js_1 = require("./commands/config.js");
const products_js_1 = require("./commands/products.js");
const interactive_js_1 = require("./commands/interactive.js");
const explore_js_1 = require("./commands/explore.js");
// ASCII Art Header
console.log(chalk_1.default.cyan(figlet_1.default.textSync('Chariow CLI', { horizontalLayout: 'full' })));
console.log(chalk_1.default.dim('⚡ The ultimate e-commerce CLI\n'));
const program = new commander_1.Command();
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
    .action(config_js_1.configCommand);
program
    .command('products')
    .description('Manage products')
    .option('-l, --list', 'List all products')
    .option('-g, --get <id>', 'Get product by ID')
    .option('-c, --create', 'Create a new product (interactive)')
    .option('-s, --search <term>', 'Search products')
    .option('-d, --delete <id>', 'Delete product')
    .action(products_js_1.productsCommand);
program
    .command('explore')
    .description('Explore millions of products on Chariow')
    .option('-s, --search <term>', 'Search products')
    .option('-t, --top', 'View top products')
    .option('-c, --category <name>', 'Browse by category')
    .action(explore_js_1.exploreCommand);
program
    .command('interactive')
    .alias('i')
    .description('Launch interactive mode (like Copilot CLI)')
    .action(interactive_js_1.interactiveMode);
// Mode par défaut : interactif
if (process.argv.length === 2) {
    (0, interactive_js_1.interactiveMode)();
}
else {
    program.parse();
}
//# sourceMappingURL=index.js.map