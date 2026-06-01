"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.interactiveMode = interactiveMode;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const config_js_1 = require("../utils/config.js");
const index_js_1 = require("../../index.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let client = null;
async function ensureAuth() {
    const config = (0, config_js_1.getConfig)();
    if (!config?.apiKey) {
        console.log(chalk_1.default.yellow('\n⚠️  No API key found!'));
        const { apiKey } = await inquirer_1.default.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your Chariow API key:',
                validate: (input) => input.length > 0 || 'API key is required'
            }
        ]);
        (0, config_js_1.setConfig)({ apiKey });
        client = new index_js_1.Chariow(apiKey);
        return true;
    }
    if (!client) {
        client = new index_js_1.Chariow(config.apiKey);
    }
    return true;
}
async function loginMenu() {
    console.log(chalk_1.default.cyan('\n🔐 Login to Chariow\n'));
    const { loginMethod } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'loginMethod',
            message: 'Choose login method:',
            choices: [
                { name: '🌐 Login with Browser (Opens Chariow)', value: 'browser' },
                { name: '🔑 Login with API Token', value: 'token' },
                { name: '👤 Continue as Guest', value: 'guest' },
                { name: '◀️  Back', value: 'back' }
            ]
        }
    ]);
    if (loginMethod === 'browser') {
        console.log(chalk_1.default.yellow('\n🌐 Opening Chariow login page...\n'));
        const url = 'https://chariow.com/login';
        const platform = process.platform;
        let command = '';
        if (platform === 'darwin')
            command = `open "${url}"`;
        else if (platform === 'win32')
            command = `start "${url}"`;
        else
            command = `xdg-open "${url}"`;
        (0, child_process_1.exec)(command, (error) => {
            if (error) {
                console.log(chalk_1.default.yellow(`\nOpen this URL: ${url}\n`));
            }
            else {
                console.log(chalk_1.default.green('✓ Browser opened!\n'));
            }
        });
        console.log(chalk_1.default.dim('After logging in, copy your API key from the dashboard.\n'));
        const { hasToken } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'hasToken',
                message: 'Do you have your API key now?',
                default: false
            }
        ]);
        if (hasToken) {
            const { apiKey } = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: 'Paste your API key:',
                    validate: (input) => input.length > 0
                }
            ]);
            (0, config_js_1.setConfig)({ apiKey });
            client = new index_js_1.Chariow(apiKey);
            console.log(chalk_1.default.green('✓ Successfully logged in!\n'));
        }
    }
    else if (loginMethod === 'token') {
        const { apiKey } = await inquirer_1.default.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your API key:',
                validate: (input) => input.length > 0
            }
        ]);
        (0, config_js_1.setConfig)({ apiKey });
        client = new index_js_1.Chariow(apiKey);
        console.log(chalk_1.default.green('✓ Successfully logged in!\n'));
    }
    else if (loginMethod === 'guest') {
        console.log(chalk_1.default.green('✓ Continuing as guest (limited features)\n'));
    }
}
async function exploreMarketplace() {
    console.log(chalk_1.default.cyan('\n🔍 EXPLORE MARKETPLACE - Discover millions of products\n'));
    const { exploreAction } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'exploreAction',
            message: 'Explore options:',
            pageSize: 12,
            choices: [
                { name: '🔍 Search Products', value: 'search' },
                { name: '⭐ Top Rated Products', value: 'top' },
                { name: '🔥 Trending Now', value: 'trending' },
                { name: '📂 Browse by Category', value: 'category' },
                { name: '💎 Featured Products', value: 'featured' },
                { name: '🆕 Recently Added', value: 'recent' },
                { name: '💰 Search by Price Range', value: 'price' },
                { name: '🌐 Open Chariow in Browser', value: 'browser' },
                { name: '◀️  Back', value: 'back' }
            ]
        }
    ]);
    switch (exploreAction) {
        case 'search':
            await exploreSearch();
            break;
        case 'top':
            await exploreTopRated();
            break;
        case 'trending':
            await exploreTrending();
            break;
        case 'category':
            await exploreCategories();
            break;
        case 'featured':
            await exploreFeatured();
            break;
        case 'recent':
            await exploreRecent();
            break;
        case 'price':
            await exploreByPrice();
            break;
        case 'browser':
            await openBrowser('https://chariow.com');
            break;
        case 'back':
            return;
    }
}
async function exploreSearch() {
    const { term } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'term',
            message: 'What are you looking for?',
            validate: (input) => input.length > 0
        }
    ]);
    const spinner = (0, ora_1.default)(`Searching for "${term}"...`).start();
    try {
        if (client) {
            const response = await client.products.list({ per_page: 50 });
            const filtered = response.data.filter(p => p.name.toLowerCase().includes(term.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(term.toLowerCase())));
            spinner.succeed(`Found ${filtered.length} products for "${term}"\n`);
            if (filtered.length === 0) {
                console.log(chalk_1.default.dim('No products found\n'));
                return;
            }
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('Name'), chalk_1.default.cyan('Price'), chalk_1.default.cyan('Rating'), chalk_1.default.cyan('Status')],
                colWidths: [40, 15, 12, 12]
            });
            filtered.slice(0, 20).forEach(product => {
                table.push([
                    product.name.slice(0, 38),
                    product.pricing?.current_price?.formatted || 'Free',
                    product.rating?.average ? `${product.rating.average} ★` : 'N/A',
                    product.status === 'published' ? chalk_1.default.green('Published') : chalk_1.default.yellow('Draft')
                ]);
            });
            console.log(table.toString());
            const { viewDetails } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'viewDetails',
                    message: 'View product details?',
                    default: false
                }
            ]);
            if (viewDetails && filtered.length > 0) {
                const { productId } = await inquirer_1.default.prompt([
                    {
                        type: 'list',
                        name: 'productId',
                        message: 'Select product:',
                        choices: filtered.slice(0, 20).map(p => ({
                            name: `${p.name}`,
                            value: p.id
                        }))
                    }
                ]);
                await showProductDetails(productId);
            }
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            spinner.succeed(`Demo mode - Found 5 products for "${term}"\n`);
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('Product'), chalk_1.default.cyan('Price'), chalk_1.default.cyan('Rating'), chalk_1.default.cyan('Seller')],
                colWidths: [35, 12, 10, 20]
            });
            const mockResults = [
                { name: `${term} Pro Edition`, price: '$49.99', rating: '4.8 ★', seller: 'TechStore' },
                { name: `${term} Premium`, price: '$99.99', rating: '4.9 ★', seller: 'DigitalShop' },
                { name: `${term} Basic`, price: '$19.99', rating: '4.5 ★', seller: 'EasyMart' },
            ];
            mockResults.forEach(product => {
                table.push([
                    product.name,
                    chalk_1.default.green(product.price),
                    chalk_1.default.yellow(product.rating),
                    product.seller
                ]);
            });
            console.log(table.toString());
            console.log(chalk_1.default.dim('\n💡 Tip: Configure API key for real data\n'));
        }
    }
    catch (error) {
        spinner.fail('Search failed');
        console.log(chalk_1.default.red(error.message));
    }
}
async function exploreTopRated() {
    const spinner = (0, ora_1.default)('Loading top rated products...').start();
    try {
        if (client) {
            const response = await client.products.list({ per_page: 20 });
            const sorted = [...response.data].sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
            const topProducts = sorted.slice(0, 10);
            spinner.succeed('Top rated products\n');
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('#'), chalk_1.default.cyan('Name'), chalk_1.default.cyan('Price'), chalk_1.default.cyan('Rating'), chalk_1.default.cyan('Sales')],
                colWidths: [4, 40, 15, 12, 10]
            });
            topProducts.forEach((product, index) => {
                table.push([
                    chalk_1.default.bold(`${index + 1}`),
                    product.name.slice(0, 38),
                    product.pricing?.current_price?.formatted || 'Free',
                    product.rating?.average ? `${product.rating.average} ★` : 'N/A',
                    product.sales_count?.toString() || '0'
                ]);
            });
            console.log(table.toString());
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 800));
            spinner.succeed('Top rated products this week (Demo)\n');
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('#'), chalk_1.default.cyan('Product'), chalk_1.default.cyan('Price'), chalk_1.default.cyan('Rating'), chalk_1.default.cyan('Sales')],
                colWidths: [4, 35, 12, 10, 10]
            });
            const topProducts = [
                { name: 'AI Coding Assistant Pro', price: '$29.99', rating: '4.9 ★', sales: '12.4K' },
                { name: 'Cloud Deployment Toolkit', price: '$49.99', rating: '4.8 ★', sales: '8.2K' },
                { name: 'DevOps Mastery Course', price: '$199.99', rating: '4.9 ★', sales: '5.7K' },
            ];
            topProducts.forEach((product, index) => {
                table.push([
                    chalk_1.default.bold(`${index + 1}`),
                    product.name,
                    chalk_1.default.green(product.price),
                    chalk_1.default.yellow(product.rating),
                    product.sales
                ]);
            });
            console.log(table.toString());
            console.log(chalk_1.default.dim('\n💡 Tip: Configure API key for real data\n'));
        }
    }
    catch (error) {
        spinner.fail('Failed to load top products');
    }
}
async function exploreTrending() {
    const spinner = (0, ora_1.default)('Loading trending products...').start();
    try {
        await new Promise(resolve => setTimeout(resolve, 600));
        spinner.succeed('Trending products 🔥\n');
        const table = new cli_table3_1.default({
            head: [chalk_1.default.cyan('Product'), chalk_1.default.cyan('Price'), chalk_1.default.cyan('Trend'), chalk_1.default.cyan('Category')],
            colWidths: [30, 12, 12, 20]
        });
        const trending = [
            { name: 'AI Image Generator', price: '$14.99', trend: '🔥 +245%', category: 'AI Tools' },
            { name: 'No-Code App Builder', price: '$89.99', trend: '📈 +189%', category: 'Development' },
            { name: 'Cryptocurrency Tracker', price: '$24.99', trend: '🚀 +167%', category: 'Finance' },
        ];
        trending.forEach(product => {
            table.push([
                product.name,
                chalk_1.default.green(product.price),
                chalk_1.default.red(product.trend),
                product.category
            ]);
        });
        console.log(table.toString());
    }
    catch (error) {
        spinner.fail('Failed to load trending');
    }
}
async function exploreCategories() {
    const categories = [
        'AI & Machine Learning', 'Web Development', 'Mobile Apps', 'DevOps & Cloud',
        'Cybersecurity', 'Data Science', 'Design & UX', 'Marketing & SEO',
        'E-commerce', 'Productivity', 'Gaming', 'Education', 'Technology'
    ];
    const { category } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'category',
            message: 'Select category:',
            choices: categories,
            pageSize: 15
        }
    ]);
    const spinner = (0, ora_1.default)(`Loading ${category} products...`).start();
    try {
        if (client) {
            const response = await client.products.list({ per_page: 50 });
            const filtered = response.data.filter(p => p.category?.label?.toLowerCase().includes(category.toLowerCase()) ||
                p.category?.value?.toLowerCase().includes(category.toLowerCase()));
            spinner.succeed(`Found ${filtered.length} products in ${category}\n`);
            if (filtered.length === 0) {
                console.log(chalk_1.default.dim('No products found in this category\n'));
                return;
            }
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('Name'), chalk_1.default.cyan('Type'), chalk_1.default.cyan('Category'), chalk_1.default.cyan('Price'), chalk_1.default.cyan('Rating')],
                colWidths: [35, 12, 20, 12, 10]
            });
            filtered.slice(0, 20).forEach(product => {
                table.push([
                    product.name.slice(0, 33),
                    product.type || 'N/A',
                    product.category?.label || 'N/A',
                    product.pricing?.current_price?.formatted || 'Free',
                    product.rating?.average ? `${product.rating.average} ★` : 'N/A'
                ]);
            });
            console.log(table.toString());
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 700));
            spinner.succeed(`Found 2 products in ${category} (Demo)\n`);
            const table = new cli_table3_1.default({
                head: [chalk_1.default.cyan('Name'), chalk_1.default.cyan('Type'), chalk_1.default.cyan('Category'), chalk_1.default.cyan('Price')],
                colWidths: [35, 12, 20, 12]
            });
            table.push(['Sample Product 1', 'digital', category, chalk_1.default.green('$19.99')]);
            table.push(['Sample Product 2', 'digital', category, chalk_1.default.green('$29.99')]);
            console.log(table.toString());
            console.log(chalk_1.default.dim('\n💡 Tip: Configure API key for real products\n'));
        }
    }
    catch (error) {
        spinner.fail('Failed to load category');
    }
}
async function exploreFeatured() {
    const spinner = (0, ora_1.default)('Loading featured products...').start();
    try {
        if (client) {
            const response = await client.products.list({ per_page: 20 });
            const featured = response.data.slice(0, 5);
            spinner.succeed('Featured Products ✨\n');
            featured.forEach((product, index) => {
                console.log(`${chalk_1.default.yellow(`${index + 1}.`)} ${chalk_1.default.bold(product.name)} - ${chalk_1.default.green(product.pricing?.current_price?.formatted || 'Free')}`);
                if (product.description) {
                    console.log(chalk_1.default.dim(`   ${product.description.slice(0, 80)}...`));
                }
                console.log('');
            });
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 500));
            spinner.succeed('Editor\'s Picks ✨\n');
            console.log(chalk_1.default.white('1. AI-Powered Code Assistant - ') + chalk_1.default.green('$39.99') + chalk_1.default.dim(' (Save 30%)'));
            console.log(chalk_1.default.white('2. Complete Web3 Development Kit - ') + chalk_1.default.green('$129.99') + chalk_1.default.dim(' (Free updates)'));
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Failed to load featured');
    }
}
async function exploreRecent() {
    const spinner = (0, ora_1.default)('Loading recently added...').start();
    try {
        if (client) {
            const response = await client.products.list({ per_page: 10 });
            spinner.succeed('Recently added products\n');
            response.data.slice(0, 5).forEach(product => {
                console.log(`${chalk_1.default.green('🆕')} ${chalk_1.default.bold(product.name)} - ${chalk_1.default.green(product.pricing?.current_price?.formatted || 'Free')}`);
                console.log(chalk_1.default.dim(`   ID: ${product.id} | Type: ${product.type || 'N/A'}`));
            });
            console.log('');
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 400));
            spinner.succeed('Recently added products (Demo)\n');
            console.log(`${chalk_1.default.green('🆕')} New Product Launch Template - ${chalk_1.default.green('$19.99')} ${chalk_1.default.dim('(2 hours ago)')}`);
            console.log(`${chalk_1.default.green('🆕')} ChatGPT Integration Guide - ${chalk_1.default.green('$14.99')} ${chalk_1.default.dim('(5 hours ago)')}`);
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Failed to load recent');
    }
}
async function exploreByPrice() {
    const { min, max } = await inquirer_1.default.prompt([
        {
            type: 'number',
            name: 'min',
            message: 'Minimum price ($):',
            default: 0
        },
        {
            type: 'number',
            name: 'max',
            message: 'Maximum price ($):',
            default: 100
        }
    ]);
    const spinner = (0, ora_1.default)(`Searching products between $${min} - $${max}...`).start();
    try {
        if (client) {
            const response = await client.products.list({ per_page: 100 });
            const filtered = response.data.filter(p => {
                const price = p.pricing?.current_price?.value || 0;
                return price >= min && price <= max;
            });
            spinner.succeed(`Found ${filtered.length} products in your price range\n`);
            if (filtered.length === 0) {
                console.log(chalk_1.default.dim('No products found in this price range\n'));
            }
            else {
                filtered.slice(0, 15).forEach(product => {
                    console.log(`${chalk_1.default.green('•')} ${product.name} - ${chalk_1.default.green(product.pricing?.current_price?.formatted || 'Free')}`);
                });
                console.log('');
            }
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 600));
            spinner.succeed(`Found 8 products in your price range (Demo)\n`);
            console.log(`${chalk_1.default.green('•')} Basic Plan - $${min + 9.99}`);
            console.log(`${chalk_1.default.green('•')} Standard Package - $${min + 29.99}`);
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Search failed');
    }
}
async function showProductDetails(productId) {
    if (!client)
        return;
    const spinner = (0, ora_1.default)('Loading product details...').start();
    try {
        const product = await client.products.get(productId);
        spinner.succeed();
        console.log('\n' + chalk_1.default.bold.cyan('📦 PRODUCT DETAILS\n'));
        const productUrl = `https://app.chariow.com/products/${product.id}`;
        const details = [
            ['ID', product.id],
            ['Name', chalk_1.default.bold(product.name || 'N/A')],
            ['Description', product.description ? product.description.slice(0, 200) + '...' : 'No description'],
            ['Status', product.status === 'published' ? chalk_1.default.green('Published') : chalk_1.default.red('Draft')],
            ['Category', product.category?.label || 'Uncategorized'],
            ['Price', product.pricing?.current_price?.formatted || 'Free'],
            ['Sales', product.sales_count?.toString() || '0'],
            ['Rating', product.rating?.average ? `${product.rating.average} ★ (${product.rating.count} reviews)` : 'No ratings'],
            ['Type', product.type || 'N/A'],
            ['On Sale Until', product.on_sale_until || 'N/A'],
            ['URL', productUrl]
        ];
        const table = new cli_table3_1.default({
            colWidths: [20, 50],
            style: { 'padding-left': 1, 'padding-right': 1 }
        });
        details.forEach(([key, value]) => {
            table.push([chalk_1.default.gray(key + ':'), value]);
        });
        console.log(table.toString());
        const { action } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '🌐 Open in Browser', value: 'browser' },
                    { name: '🔗 Copy Link', value: 'copy' },
                    { name: '◀️  Back', value: 'back' }
                ]
            }
        ]);
        if (action === 'browser') {
            await openBrowser(productUrl);
        }
        else if (action === 'copy') {
            console.log(chalk_1.default.green(`✓ Link: ${productUrl}`));
        }
    }
    catch (error) {
        spinner.fail('Failed to load product details');
        console.log(chalk_1.default.red(error.message));
    }
}
async function openBrowser(url) {
    console.log(chalk_1.default.yellow(`\n🌐 Opening ${url} in your browser...\n`));
    try {
        const platform = process.platform;
        let command = '';
        if (platform === 'darwin') {
            command = `open "${url}"`;
        }
        else if (platform === 'win32') {
            command = `start "${url}"`;
        }
        else {
            command = `xdg-open "${url}"`;
        }
        await execAsync(command);
        console.log(chalk_1.default.green('✓ Browser opened successfully!\n'));
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`\nCopy this URL: ${url}\n`));
    }
}
async function interactiveMode() {
    console.clear();
    console.log(chalk_1.default.cyan('\n🚀 Chariow Interactive Mode\n'));
    await ensureAuth();
    let running = true;
    while (running) {
        const { action } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                pageSize: 15,
                choices: [
                    { name: '🔐 Login / Configure Account', value: 'login' },
                    { name: '📦  List My Products', value: 'listProducts' },
                    { name: '✨  Create Product', value: 'createProduct' },
                    { name: '🔍  Search My Products', value: 'searchProducts' },
                    { name: '🔎  Explore Marketplace', value: 'explore' },
                    { name: '📊  View Product Stats', value: 'stats' },
                    { name: '🛒  Manage Orders', value: 'orders' },
                    { name: '🏪  Store Analytics', value: 'storeAnalytics' },
                    { name: '⚙️  Configuration', value: 'config' },
                    { name: '❌  Exit', value: 'exit' }
                ]
            }
        ]);
        switch (action) {
            case 'login':
                await loginMenu();
                break;
            case 'listProducts':
                await listProducts();
                break;
            case 'createProduct':
                await createProduct();
                break;
            case 'searchProducts':
                await searchMyProducts();
                break;
            case 'explore':
                await exploreMarketplace();
                break;
            case 'stats':
                await showStats();
                break;
            case 'orders':
                await manageOrders();
                break;
            case 'storeAnalytics':
                await storeAnalytics();
                break;
            case 'config':
                await configure();
                break;
            case 'exit':
                running = false;
                console.log(chalk_1.default.green('\n👋 Goodbye!\n'));
                break;
        }
    }
}
async function listProducts() {
    if (!client)
        return;
    const spinner = (0, ora_1.default)('Fetching products...').start();
    try {
        const { per_page } = await inquirer_1.default.prompt([
            {
                type: 'number',
                name: 'per_page',
                message: 'How many products to show?',
                default: 10,
                validate: (input) => input > 0 && input <= 100
            }
        ]);
        const response = await client.products.list({ per_page });
        spinner.succeed(`Found ${response.data.length} products\n`);
        if (response.data.length === 0) {
            console.log(chalk_1.default.dim('No products found\n'));
            return;
        }
        const table = new cli_table3_1.default({
            head: [
                chalk_1.default.cyan('ID'),
                chalk_1.default.cyan('Name'),
                chalk_1.default.cyan('Status'),
                chalk_1.default.cyan('Price'),
                chalk_1.default.cyan('Sales')
            ],
            colWidths: [25, 30, 12, 15, 12]
        });
        response.data.forEach(product => {
            table.push([
                product.id.slice(0, 20),
                product.name.slice(0, 28),
                product.status === 'published' ? chalk_1.default.green('✓ Published') : chalk_1.default.yellow('Draft'),
                product.pricing?.current_price?.formatted || 'Free',
                product.sales_count?.toString() || '0'
            ]);
        });
        console.log(table.toString());
        const { viewDetails } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'viewDetails',
                message: 'View product details?',
                default: false
            }
        ]);
        if (viewDetails) {
            const { productId } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'productId',
                    message: 'Select product:',
                    choices: response.data.map(p => ({
                        name: `${p.name} (${p.id})`,
                        value: p.id
                    }))
                }
            ]);
            await showProductDetails(productId);
        }
    }
    catch (error) {
        spinner.fail('Failed to fetch products');
        console.log(chalk_1.default.red(error.message));
    }
}
async function createProduct() {
    if (!client)
        return;
    console.log(chalk_1.default.cyan('\n✨ Create New Product\n'));
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Product name:',
            validate: (input) => input.length > 0 || 'Name is required'
        },
        {
            type: 'editor',
            name: 'description',
            message: 'Description (opens editor):',
            default: 'Enter your product description here...'
        },
        {
            type: 'number',
            name: 'price',
            message: 'Price (in cents, e.g., 1999 for $19.99):',
            validate: (input) => input > 0 || 'Price must be greater than 0'
        },
        {
            type: 'list',
            name: 'status',
            message: 'Initial status:',
            choices: [
                { name: 'Draft (save as draft)', value: 'draft' },
                { name: 'Published (go live immediately)', value: 'published' }
            ]
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Create this product?',
            default: true
        }
    ]);
    if (!answers.confirm) {
        console.log(chalk_1.default.yellow('Product creation cancelled\n'));
        return;
    }
    const spinner = (0, ora_1.default)('Creating product...').start();
    try {
        const product = await client.products.create({
            name: answers.name,
            description: answers.description,
            pricing: {
                type: 'one_time',
                current_price: {
                    value: answers.price / 100,
                    currency: 'USD'
                }
            },
            status: answers.status
        });
        spinner.succeed('Product created successfully! 🎉');
        console.log(chalk_1.default.green(`\nProduct ID: ${product.id}`));
        console.log(chalk_1.default.dim(`View it at: https://app.chariow.com/products/${product.id}\n`));
    }
    catch (error) {
        spinner.fail('Failed to create product');
        console.log(chalk_1.default.red(error.message));
    }
}
async function searchMyProducts() {
    if (!client)
        return;
    const { term } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'term',
            message: 'Search term:',
            validate: (input) => input.length > 0
        }
    ]);
    const spinner = (0, ora_1.default)(`Searching for "${term}"...`).start();
    try {
        const response = await client.products.list({ per_page: 100 });
        const filtered = response.data.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
        spinner.succeed(`Found ${filtered.length} products\n`);
        if (filtered.length === 0) {
            console.log(chalk_1.default.dim('No products found\n'));
            return;
        }
        const table = new cli_table3_1.default({
            head: [chalk_1.default.cyan('Name'), chalk_1.default.cyan('Status'), chalk_1.default.cyan('Price')],
            colWidths: [40, 12, 15]
        });
        filtered.forEach(product => {
            table.push([
                product.name.slice(0, 38),
                product.status === 'published' ? chalk_1.default.green('Published') : chalk_1.default.yellow('Draft'),
                product.pricing?.current_price?.formatted || 'Free'
            ]);
        });
        console.log(table.toString());
    }
    catch (error) {
        spinner.fail('Search failed');
        console.log(chalk_1.default.red(error.message));
    }
}
async function showStats() {
    if (!client)
        return;
    const spinner = (0, ora_1.default)('Loading statistics...').start();
    try {
        const response = await client.products.list({ per_page: 100 });
        spinner.succeed();
        const published = response.data.filter(p => p.status === 'published');
        const draft = response.data.filter(p => p.status === 'draft');
        const totalRevenue = response.data.reduce((sum, p) => {
            return sum + (p.pricing?.current_price?.value || 0);
        }, 0);
        console.log('\n' + chalk_1.default.bold.cyan('📊 STORE STATISTICS\n'));
        const stats = [
            ['Total Products', response.data.length],
            ['Published', chalk_1.default.green(published.length)],
            ['Draft', chalk_1.default.yellow(draft.length)],
            ['Total Value', `$${totalRevenue.toLocaleString()}`],
            ['Avg Price', `$${(totalRevenue / response.data.length).toFixed(2)}`]
        ];
        const table = new cli_table3_1.default({
            colWidths: [20, 20],
            style: { 'padding-left': 2, 'padding-right': 2 }
        });
        stats.forEach(([key, value]) => {
            table.push([chalk_1.default.gray(key + ':'), value]);
        });
        console.log(table.toString());
        console.log('');
    }
    catch (error) {
        spinner.fail('Failed to load stats');
        console.log(chalk_1.default.red(error.message));
    }
}
async function manageOrders() {
    console.log(chalk_1.default.cyan('\n🛒 Orders Management\n'));
    console.log(chalk_1.default.dim('Orders API coming soon!\n'));
}
async function storeAnalytics() {
    console.log(chalk_1.default.cyan('\n🏪 Store Analytics\n'));
    console.log(chalk_1.default.dim('Advanced analytics coming soon!\n'));
}
async function configure() {
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Configuration:',
            choices: [
                { name: '🔑 Set API Key', value: 'set' },
                { name: '👀 View Current Config', value: 'view' },
                { name: '🗑️ Clear Config', value: 'clear' }
            ]
        }
    ]);
    switch (action) {
        case 'set':
            const { apiKey } = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: 'Enter your API key:',
                    validate: (input) => input.length > 0
                }
            ]);
            (0, config_js_1.setConfig)({ apiKey });
            client = new index_js_1.Chariow(apiKey);
            console.log(chalk_1.default.green('✓ API key saved successfully!'));
            break;
        case 'view':
            const config = (0, config_js_1.getConfig)();
            if (config?.apiKey) {
                console.log(chalk_1.default.green(`\nAPI Key: ${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}\n`));
            }
            else {
                console.log(chalk_1.default.yellow('\nNo API key configured\n'));
            }
            break;
        case 'clear':
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Clear all configuration?',
                    default: false
                }
            ]);
            if (confirm) {
                (0, config_js_1.setConfig)({});
                client = null;
                console.log(chalk_1.default.green('✓ Configuration cleared'));
            }
            break;
    }
}
//# sourceMappingURL=interactive.js.map