import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { getConfig, setConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let client: Chariow | null = null;

async function ensureAuth(): Promise<boolean> {
  const config = getConfig();
  
  if (!config?.apiKey) {
    console.log(chalk.yellow('\n⚠️  No API key found!'));
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Chariow API key:',
        validate: (input: string) => input.length > 0 || 'API key is required'
      }
    ]);
    
    setConfig({ apiKey });
    client = new Chariow(apiKey);
    return true;
  }
  
  if (!client) {
    client = new Chariow(config.apiKey);
  }
  return true;
}

async function loginMenu() {
  console.log(chalk.cyan('\n🔐 Login to Chariow\n'));
  
  const { loginMethod } = await inquirer.prompt([
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
    console.log(chalk.yellow('\n🌐 Opening Chariow login page...\n'));
    const url = 'https://chariow.com/login';
    const platform = process.platform;
    
    let command = '';
    if (platform === 'darwin') command = `open "${url}"`;
    else if (platform === 'win32') command = `start "${url}"`;
    else command = `xdg-open "${url}"`;
    
    exec(command, (error) => {
      if (error) {
        console.log(chalk.yellow(`\nOpen this URL: ${url}\n`));
      } else {
        console.log(chalk.green('✓ Browser opened!\n'));
      }
    });
    
    console.log(chalk.dim('After logging in, copy your API key from the dashboard.\n'));
    
    const { hasToken } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasToken',
        message: 'Do you have your API key now?',
        default: false
      }
    ]);
    
    if (hasToken) {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Paste your API key:',
          validate: (input: string) => input.length > 0
        }
      ]);
      setConfig({ apiKey });
      client = new Chariow(apiKey);
      console.log(chalk.green('✓ Successfully logged in!\n'));
    }
  } else if (loginMethod === 'token') {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key:',
        validate: (input: string) => input.length > 0
      }
    ]);
    setConfig({ apiKey });
    client = new Chariow(apiKey);
    console.log(chalk.green('✓ Successfully logged in!\n'));
  } else if (loginMethod === 'guest') {
    console.log(chalk.green('✓ Continuing as guest (limited features)\n'));
  }
}

async function exploreMarketplace() {
  console.log(chalk.cyan('\n🔍 EXPLORE MARKETPLACE - Discover millions of products\n'));
  
  const { exploreAction } = await inquirer.prompt([
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
  const { term } = await inquirer.prompt([
    {
      type: 'input',
      name: 'term',
      message: 'What are you looking for?',
      validate: (input: string) => input.length > 0
    }
  ]);
  
  const spinner = ora(`Searching for "${term}"...`).start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 50 });
      const filtered = response.data.filter(p => 
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(term.toLowerCase()))
      );
      
      spinner.succeed(`Found ${filtered.length} products for "${term}"\n`);
      
      if (filtered.length === 0) {
        console.log(chalk.dim('No products found\n'));
        return;
      }
      
      const table = new Table({
        head: [chalk.cyan('Name'), chalk.cyan('Price'), chalk.cyan('Rating'), chalk.cyan('Status')],
        colWidths: [40, 15, 12, 12]
      });
      
      filtered.slice(0, 20).forEach(product => {
        table.push([
          product.name.slice(0, 38),
          product.pricing?.current_price?.formatted || 'Free',
          product.rating?.average ? `${product.rating.average} ★` : 'N/A',
          product.status === 'published' ? chalk.green('Published') : chalk.yellow('Draft')
        ]);
      });
      
      console.log(table.toString());
      
      const { viewDetails } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'viewDetails',
          message: 'View product details?',
          default: false
        }
      ]);
      
      if (viewDetails && filtered.length > 0) {
        const { productId } = await inquirer.prompt([
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
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      spinner.succeed(`Demo mode - Found 5 products for "${term}"\n`);
      
      const table = new Table({
        head: [chalk.cyan('Product'), chalk.cyan('Price'), chalk.cyan('Rating'), chalk.cyan('Seller')],
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
          chalk.green(product.price),
          chalk.yellow(product.rating),
          product.seller
        ]);
      });
      
      console.log(table.toString());
      console.log(chalk.dim('\n💡 Tip: Configure API key for real data\n'));
    }
    
  } catch (error: any) {
    spinner.fail('Search failed');
    console.log(chalk.red(error.message));
  }
}

async function exploreTopRated() {
  const spinner = ora('Loading top rated products...').start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 20 });
      const sorted = [...response.data].sort((a, b) => 
        (b.rating?.average || 0) - (a.rating?.average || 0)
      );
      const topProducts = sorted.slice(0, 10);
      
      spinner.succeed('Top rated products\n');
      
      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Name'), chalk.cyan('Price'), chalk.cyan('Rating'), chalk.cyan('Sales')],
        colWidths: [4, 40, 15, 12, 10]
      });
      
      topProducts.forEach((product, index) => {
        table.push([
          chalk.bold(`${index + 1}`),
          product.name.slice(0, 38),
          product.pricing?.current_price?.formatted || 'Free',
          product.rating?.average ? `${product.rating.average} ★` : 'N/A',
          product.sales_count?.toString() || '0'
        ]);
      });
      
      console.log(table.toString());
    } else {
      await new Promise(resolve => setTimeout(resolve, 800));
      spinner.succeed('Top rated products this week (Demo)\n');
      
      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Product'), chalk.cyan('Price'), chalk.cyan('Rating'), chalk.cyan('Sales')],
        colWidths: [4, 35, 12, 10, 10]
      });
      
      const topProducts = [
        { name: 'AI Coding Assistant Pro', price: '$29.99', rating: '4.9 ★', sales: '12.4K' },
        { name: 'Cloud Deployment Toolkit', price: '$49.99', rating: '4.8 ★', sales: '8.2K' },
        { name: 'DevOps Mastery Course', price: '$199.99', rating: '4.9 ★', sales: '5.7K' },
      ];
      
      topProducts.forEach((product, index) => {
        table.push([
          chalk.bold(`${index + 1}`),
          product.name,
          chalk.green(product.price),
          chalk.yellow(product.rating),
          product.sales
        ]);
      });
      
      console.log(table.toString());
      console.log(chalk.dim('\n💡 Tip: Configure API key for real data\n'));
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load top products');
  }
}

async function exploreTrending() {
  const spinner = ora('Loading trending products...').start();
  
  try {
    await new Promise(resolve => setTimeout(resolve, 600));
    spinner.succeed('Trending products 🔥\n');
    
    const table = new Table({
      head: [chalk.cyan('Product'), chalk.cyan('Price'), chalk.cyan('Trend'), chalk.cyan('Category')],
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
        chalk.green(product.price),
        chalk.red(product.trend),
        product.category
      ]);
    });
    
    console.log(table.toString());
    
  } catch (error: any) {
    spinner.fail('Failed to load trending');
  }
}

async function exploreCategories() {
  const categories = [
    'AI & Machine Learning', 'Web Development', 'Mobile Apps', 'DevOps & Cloud',
    'Cybersecurity', 'Data Science', 'Design & UX', 'Marketing & SEO',
    'E-commerce', 'Productivity', 'Gaming', 'Education', 'Technology'
  ];
  
  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select category:',
      choices: categories,
      pageSize: 15
    }
  ]);
  
  const spinner = ora(`Loading ${category} products...`).start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 50 });
      const filtered = response.data.filter(p => 
        p.category?.label?.toLowerCase().includes(category.toLowerCase()) ||
        p.category?.value?.toLowerCase().includes(category.toLowerCase())
      );
      
      spinner.succeed(`Found ${filtered.length} products in ${category}\n`);
      
      if (filtered.length === 0) {
        console.log(chalk.dim('No products found in this category\n'));
        return;
      }
      
      const table = new Table({
        head: [chalk.cyan('Name'), chalk.cyan('Type'), chalk.cyan('Category'), chalk.cyan('Price'), chalk.cyan('Rating')],
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
    } else {
      await new Promise(resolve => setTimeout(resolve, 700));
      spinner.succeed(`Found 2 products in ${category} (Demo)\n`);
      
      const table = new Table({
        head: [chalk.cyan('Name'), chalk.cyan('Type'), chalk.cyan('Category'), chalk.cyan('Price')],
        colWidths: [35, 12, 20, 12]
      });
      
      table.push(['Sample Product 1', 'digital', category, chalk.green('$19.99')]);
      table.push(['Sample Product 2', 'digital', category, chalk.green('$29.99')]);
      
      console.log(table.toString());
      console.log(chalk.dim('\n💡 Tip: Configure API key for real products\n'));
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load category');
  }
}

async function exploreFeatured() {
  const spinner = ora('Loading featured products...').start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 20 });
      const featured = response.data.slice(0, 5);
      
      spinner.succeed('Featured Products ✨\n');
      
      featured.forEach((product, index) => {
        console.log(`${chalk.yellow(`${index + 1}.`)} ${chalk.bold(product.name)} - ${chalk.green(product.pricing?.current_price?.formatted || 'Free')}`);
        if (product.description) {
          console.log(chalk.dim(`   ${product.description.slice(0, 80)}...`));
        }
        console.log('');
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      spinner.succeed('Editor\'s Picks ✨\n');
      
      console.log(chalk.white('1. AI-Powered Code Assistant - ') + chalk.green('$39.99') + chalk.dim(' (Save 30%)'));
      console.log(chalk.white('2. Complete Web3 Development Kit - ') + chalk.green('$129.99') + chalk.dim(' (Free updates)'));
      console.log('');
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load featured');
  }
}

async function exploreRecent() {
  const spinner = ora('Loading recently added...').start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 10 });
      spinner.succeed('Recently added products\n');
      
      response.data.slice(0, 5).forEach(product => {
        console.log(`${chalk.green('🆕')} ${chalk.bold(product.name)} - ${chalk.green(product.pricing?.current_price?.formatted || 'Free')}`);
        console.log(chalk.dim(`   ID: ${product.id} | Type: ${product.type || 'N/A'}`));
      });
      console.log('');
    } else {
      await new Promise(resolve => setTimeout(resolve, 400));
      spinner.succeed('Recently added products (Demo)\n');
      
      console.log(`${chalk.green('🆕')} New Product Launch Template - ${chalk.green('$19.99')} ${chalk.dim('(2 hours ago)')}`);
      console.log(`${chalk.green('🆕')} ChatGPT Integration Guide - ${chalk.green('$14.99')} ${chalk.dim('(5 hours ago)')}`);
      console.log('');
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load recent');
  }
}

async function exploreByPrice() {
  const { min, max } = await inquirer.prompt([
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
  
  const spinner = ora(`Searching products between $${min} - $${max}...`).start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 100 });
      const filtered = response.data.filter(p => {
        const price = p.pricing?.current_price?.value || 0;
        return price >= min && price <= max;
      });
      
      spinner.succeed(`Found ${filtered.length} products in your price range\n`);
      
      if (filtered.length === 0) {
        console.log(chalk.dim('No products found in this price range\n'));
      } else {
        filtered.slice(0, 15).forEach(product => {
          console.log(`${chalk.green('•')} ${product.name} - ${chalk.green(product.pricing?.current_price?.formatted || 'Free')}`);
        });
        console.log('');
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 600));
      spinner.succeed(`Found 8 products in your price range (Demo)\n`);
      
      console.log(`${chalk.green('•')} Basic Plan - $${min + 9.99}`);
      console.log(`${chalk.green('•')} Standard Package - $${min + 29.99}`);
      console.log('');
    }
    
  } catch (error: any) {
    spinner.fail('Search failed');
  }
}

async function showProductDetails(productId: string) {
  if (!client) return;
  
  const spinner = ora('Loading product details...').start();
  
  try {
    const product = await client.products.get(productId);
    spinner.succeed();
    
    console.log('\n' + chalk.bold.cyan('📦 PRODUCT DETAILS\n'));
    
    const productUrl = `https://app.chariow.com/products/${product.id}`;
    
    const details = [
      ['ID', product.id],
      ['Name', chalk.bold(product.name || 'N/A')],
      ['Description', product.description ? product.description.slice(0, 200) + '...' : 'No description'],
      ['Status', product.status === 'published' ? chalk.green('Published') : chalk.red('Draft')],
      ['Category', product.category?.label || 'Uncategorized'],
      ['Price', product.pricing?.current_price?.formatted || 'Free'],
      ['Sales', product.sales_count?.toString() || '0'],
      ['Rating', product.rating?.average ? `${product.rating.average} ★ (${product.rating.count} reviews)` : 'No ratings'],
      ['Type', product.type || 'N/A'],
      ['On Sale Until', product.on_sale_until || 'N/A'],
      ['URL', productUrl]
    ];
    
    const table = new Table({
      colWidths: [20, 50],
      style: { 'padding-left': 1, 'padding-right': 1 }
    });
    
    details.forEach(([key, value]) => {
      table.push([chalk.gray(key + ':'), value]);
    });
    
    console.log(table.toString());
    
    const { action } = await inquirer.prompt([
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
    } else if (action === 'copy') {
      console.log(chalk.green(`✓ Link: ${productUrl}`));
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load product details');
    console.log(chalk.red(error.message));
  }
}

async function openBrowser(url: string) {
  console.log(chalk.yellow(`\n🌐 Opening ${url} in your browser...\n`));
  
  try {
    const platform = process.platform;
    let command = '';
    
    if (platform === 'darwin') {
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      command = `start "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }
    
    await execAsync(command);
    console.log(chalk.green('✓ Browser opened successfully!\n'));
  } catch (error) {
    console.log(chalk.yellow(`\nCopy this URL: ${url}\n`));
  }
}

export async function interactiveMode() {
  console.clear();
  console.log(chalk.cyan('\n🚀 Chariow Interactive Mode\n'));
  
  await ensureAuth();
  
  let running = true;
  
  while (running) {
    const { action } = await inquirer.prompt([
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
        console.log(chalk.green('\n👋 Goodbye!\n'));
        break;
    }
  }
}

async function listProducts() {
  if (!client) return;
  
  const spinner = ora('Fetching products...').start();
  
  try {
    const { per_page } = await inquirer.prompt([
      {
        type: 'number',
        name: 'per_page',
        message: 'How many products to show?',
        default: 10,
        validate: (input: number) => input > 0 && input <= 100
      }
    ]);
    
    const response = await client.products.list({ per_page });
    spinner.succeed(`Found ${response.data.length} products\n`);
    
    if (response.data.length === 0) {
      console.log(chalk.dim('No products found\n'));
      return;
    }
    
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Status'),
        chalk.cyan('Price'),
        chalk.cyan('Sales')
      ],
      colWidths: [25, 30, 12, 15, 12]
    });
    
    response.data.forEach(product => {
      table.push([
        product.id.slice(0, 20),
        product.name.slice(0, 28),
        product.status === 'published' ? chalk.green('✓ Published') : chalk.yellow('Draft'),
        product.pricing?.current_price?.formatted || 'Free',
        product.sales_count?.toString() || '0'
      ]);
    });
    
    console.log(table.toString());
    
    const { viewDetails } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'viewDetails',
        message: 'View product details?',
        default: false
      }
    ]);
    
    if (viewDetails) {
      const { productId } = await inquirer.prompt([
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
    
  } catch (error: any) {
    spinner.fail('Failed to fetch products');
    console.log(chalk.red(error.message));
  }
}

async function createProduct() {
  if (!client) return;
  
  console.log(chalk.cyan('\n✨ Create New Product\n'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Product name:',
      validate: (input: string) => input.length > 0 || 'Name is required'
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
      validate: (input: number) => input > 0 || 'Price must be greater than 0'
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
    console.log(chalk.yellow('Product creation cancelled\n'));
    return;
  }
  
  const spinner = ora('Creating product...').start();
  
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
    console.log(chalk.green(`\nProduct ID: ${product.id}`));
    console.log(chalk.dim(`View it at: https://app.chariow.com/products/${product.id}\n`));
    
  } catch (error: any) {
    spinner.fail('Failed to create product');
    console.log(chalk.red(error.message));
  }
}

async function searchMyProducts() {
  if (!client) return;
  
  const { term } = await inquirer.prompt([
    {
      type: 'input',
      name: 'term',
      message: 'Search term:',
      validate: (input: string) => input.length > 0
    }
  ]);
  
  const spinner = ora(`Searching for "${term}"...`).start();
  
  try {
    const response = await client.products.list({ per_page: 100 });
    const filtered = response.data.filter(p => 
      p.name.toLowerCase().includes(term.toLowerCase())
    );
    
    spinner.succeed(`Found ${filtered.length} products\n`);
    
    if (filtered.length === 0) {
      console.log(chalk.dim('No products found\n'));
      return;
    }
    
    const table = new Table({
      head: [chalk.cyan('Name'), chalk.cyan('Status'), chalk.cyan('Price')],
      colWidths: [40, 12, 15]
    });
    
    filtered.forEach(product => {
      table.push([
        product.name.slice(0, 38),
        product.status === 'published' ? chalk.green('Published') : chalk.yellow('Draft'),
        product.pricing?.current_price?.formatted || 'Free'
      ]);
    });
    
    console.log(table.toString());
    
  } catch (error: any) {
    spinner.fail('Search failed');
    console.log(chalk.red(error.message));
  }
}

async function showStats() {
  if (!client) return;
  
  const spinner = ora('Loading statistics...').start();
  
  try {
    const response = await client.products.list({ per_page: 100 });
    spinner.succeed();
    
    const published = response.data.filter(p => p.status === 'published');
    const draft = response.data.filter(p => p.status === 'draft');
    const totalRevenue = response.data.reduce((sum, p) => {
      return sum + (p.pricing?.current_price?.value || 0);
    }, 0);
    
    console.log('\n' + chalk.bold.cyan('📊 STORE STATISTICS\n'));
    
    const stats = [
      ['Total Products', response.data.length],
      ['Published', chalk.green(published.length)],
      ['Draft', chalk.yellow(draft.length)],
      ['Total Value', `$${totalRevenue.toLocaleString()}`],
      ['Avg Price', `$${(totalRevenue / response.data.length).toFixed(2)}`]
    ];
    
    const table = new Table({
      colWidths: [20, 20],
      style: { 'padding-left': 2, 'padding-right': 2 }
    });
    
    stats.forEach(([key, value]) => {
      table.push([chalk.gray(key + ':'), value]);
    });
    
    console.log(table.toString());
    console.log('');
    
  } catch (error: any) {
    spinner.fail('Failed to load stats');
    console.log(chalk.red(error.message));
  }
}

async function manageOrders() {
  console.log(chalk.cyan('\n🛒 Orders Management\n'));
  console.log(chalk.dim('Orders API coming soon!\n'));
}

async function storeAnalytics() {
  console.log(chalk.cyan('\n🏪 Store Analytics\n'));
  console.log(chalk.dim('Advanced analytics coming soon!\n'));
}

async function configure() {
  const { action } = await inquirer.prompt([
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
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your API key:',
          validate: (input: string) => input.length > 0
        }
      ]);
      setConfig({ apiKey });
      client = new Chariow(apiKey);
      console.log(chalk.green('✓ API key saved successfully!'));
      break;
      
    case 'view':
      const config = getConfig();
      if (config?.apiKey) {
        console.log(chalk.green(`\nAPI Key: ${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}\n`));
      } else {
        console.log(chalk.yellow('\nNo API key configured\n'));
      }
      break;
      
    case 'clear':
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Clear all configuration?',
          default: false
        }
      ]);
      if (confirm) {
        setConfig({});
        client = null;
        console.log(chalk.green('✓ Configuration cleared'));
      }
      break;
  }
}
