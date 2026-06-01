"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsCommand = productsCommand;
const index_js_1 = require("../../index.js");
const config_js_1 = require("../utils/config.js");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const ora_1 = __importDefault(require("ora"));
async function productsCommand(options) {
    const config = (0, config_js_1.getConfig)();
    if (!config?.apiKey) {
        console.log(chalk_1.default.red('Error: No API key found. Run: chariow config --set <token>'));
        process.exit(1);
    }
    const client = new index_js_1.Chariow(config.apiKey);
    if (options.list) {
        const spinner = (0, ora_1.default)('Fetching products...').start();
        try {
            const response = await client.products.list({ per_page: 20 });
            spinner.succeed(`Found ${response.data.length} products\n`);
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('ID'), chalk_1.default.cyan('Name'), chalk_1.default.cyan('Status'), chalk_1.default.cyan('Price')],
                colWidths: [25, 40, 12, 15]
            });
            response.data.forEach(p => {
                table.push([
                    p.id.slice(0, 20),
                    p.name.slice(0, 38),
                    p.status === 'published' ? chalk_1.default.green('✓ Published') : chalk_1.default.yellow('Draft'),
                    p.pricing.current_price?.formatted || 'Free'
                ]);
            });
            console.log(table.toString());
        }
        catch (error) {
            spinner.fail('Failed to fetch products');
            console.log(chalk_1.default.red(error.message));
        }
    }
    else if (options.get) {
        const spinner = (0, ora_1.default)(`Fetching product ${options.get}...`).start();
        try {
            const product = await client.products.get(options.get);
            spinner.succeed();
            console.log('\n' + chalk_1.default.bold.cyan('Product Details:\n'));
            console.log(chalk_1.default.gray(`ID: ${product.id}`));
            console.log(chalk_1.default.gray(`Name: ${chalk_1.default.bold(product.name)}`));
            console.log(chalk_1.default.gray(`Description: ${product.description.slice(0, 200)}...`));
            console.log(chalk_1.default.gray(`Status: ${product.status === 'published' ? chalk_1.default.green('Published') : chalk_1.default.red('Draft')}`));
            console.log(chalk_1.default.gray(`Price: ${product.pricing.current_price?.formatted || 'Free'}`));
            console.log(chalk_1.default.gray(`Sales: ${product.sales_count?.toString() || '0'}`));
            console.log('');
        }
        catch (error) {
            spinner.fail('Product not found');
            console.log(chalk_1.default.red(error.message));
        }
    }
    else if (options.search) {
        const spinner = (0, ora_1.default)(`Searching for "${options.search}"...`).start();
        try {
            const products = await client.products.search(options.search);
            spinner.succeed(`Found ${products.length} products\n`);
            products.forEach(p => {
                console.log(`${chalk_1.default.green('✓')} ${p.name} - ${p.pricing.current_price?.formatted || 'Free'}`);
            });
            console.log('');
        }
        catch (error) {
            spinner.fail('Search failed');
        }
    }
    else {
        console.log(chalk_1.default.yellow('Usage: chariow products --list | --get <id> | --search <term> | --create'));
    }
}
//# sourceMappingURL=products.js.map