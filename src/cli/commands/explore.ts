import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { getConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let client: Chariow | null = null;

async function ensureAuth(): Promise<boolean> {
  const config = getConfig();
  
  if (config?.apiKey && !client) {
    client = new Chariow(config.apiKey);
  }
  
  return true;
}

export async function exploreCommand(options: any) {
  console.log(chalk.cyan('\n🔍 EXPLORE MODE - Discover millions of products\n'));
  
  await ensureAuth();
  
  if (options.search) {
    await searchProducts(options.search);
  } else if (options.top) {
    await showTopProducts();
  } else if (options.featured) {
    await showFeatured();
  } else if (options.trending) {
    await showTrending();
  } else if (options.category) {
    await browseCategory(options.category);
  } else {
    await interactiveExplore();
  }
}

async function interactiveExplore() {
  let running = true;
  
  while (running) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Explore Chariow Marketplace:',
        pageSize: 12,
        choices: [
          { name: '🔍 Search Products', value: 'search' },
          { name: '⭐ Top Rated Products', value: 'top' },
          { name: '🔥 Trending Now', value: 'trending' },
          { name: '📂 Browse by Category', value: 'category' },
          { name: '💎 Featured Products', value: 'featured' },
          { name: '🆕 Recently Added', value: 'recent' },
          { name: '💰 Price Range', value: 'price' },
          { name: '🌐 Open Chariow in Browser', value: 'browser' },
          { name: '◀️  Back to Main Menu', value: 'back' }
        ]
      }
    ]);
    
    switch (action) {
      case 'search':
        await searchInteractive();
        break;
      case 'top':
        await showTopProducts();
        break;
      case 'trending':
        await showTrending();
        break;
      case 'category':
        await browseCategories();
        break;
      case 'featured':
        await showFeatured();
        break;
      case 'recent':
        await showRecent();
        break;
      case 'price':
        await searchByPrice();
        break;
      case 'browser':
        await openBrowser('https://chariow.com');
        break;
      case 'back':
        running = false;
        break;
    }
  }
}

async function searchInteractive() {
  const { term } = await inquirer.prompt([
    {
      type: 'input',
      name: 'term',
      message: 'What are you looking for?',
      validate: (input: string) => input.length > 0
    }
  ]);
  
  await searchProducts(term);
}

async function searchProducts(term: string) {
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
      console.log(chalk.dim('\n💡 Tip: Configure API key with "chariow config --set <key>" for real data\n'));
    }
    
  } catch (error: any) {
    spinner.fail('Search failed');
    console.log(chalk.red(error.message));
  }
}

async function showProductDetails(productId: string) {
  if (!client) {
    console.log(chalk.yellow('\n⚠️  API key required to view product details'));
    console.log(chalk.dim('Run: chariow config --set <your_api_key>\n'));
    return;
  }
  
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
    
    if (product.bundle) {
      console.log(chalk.yellow('\n📦 BUNDLE INFORMATION\n'));
      const bundleTable = new Table({
        colWidths: [20, 30],
        style: { 'padding-left': 1, 'padding-right': 1 }
      });
      bundleTable.push([chalk.gray('Bundle Value:'), product.bundle.value?.formatted || 'N/A']);
      bundleTable.push([chalk.gray('Savings:'), `${product.bundle.savings?.percentage || '0%'} (${product.bundle.savings?.amount?.formatted || '$0'})`]);
      console.log(bundleTable.toString());
    }
    
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

async function showTopProducts() {
  const spinner = ora('Loading top products...').start();
  
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
      
      const { viewDetails } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'viewDetails',
          message: 'View product details?',
          default: false
        }
      ]);
      
      if (viewDetails && topProducts.length > 0) {
        const { productId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'productId',
            message: 'Select product:',
            choices: topProducts.map(p => ({
              name: `${p.name}`,
              value: p.id
            }))
          }
        ]);
        
        await showProductDetails(productId);
      }
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
      console.log(chalk.dim('\n💡 Tip: Configure API key for your real store data\n'));
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load top products');
    console.log(chalk.red(error.message));
  }
}

async function showTrending() {
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

async function browseCategories() {
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
  
  await browseCategory(category);
}

async function browseCategory(category: string) {
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
    console.log(chalk.red(error.message));
  }
}

async function showFeatured() {
  const spinner = ora('Loading featured products...').start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 20 });
      const featured = response.data.slice(0, 5);
      
      spinner.succeed('Featured Products ✨\n');
      
      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Name'), chalk.cyan('Price'), chalk.cyan('Rating')],
        colWidths: [4, 50, 15, 12]
      });
      
      featured.forEach((product, index) => {
        table.push([
          chalk.yellow(`${index + 1}`),
          product.name.slice(0, 48),
          chalk.green(product.pricing?.current_price?.formatted || 'Free'),
          product.rating?.average ? `${product.rating.average} ★` : 'N/A'
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
      
      if (viewDetails && featured.length > 0) {
        const { productId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'productId',
            message: 'Select product:',
            choices: featured.map(p => ({
              name: `${p.name}`,
              value: p.id
            }))
          }
        ]);
        
        await showProductDetails(productId);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      spinner.succeed('Editor\'s Picks ✨\n');
      
      console.log(chalk.white('1. AI-Powered Code Assistant - ') + chalk.green('$39.99') + chalk.dim(' (Save 30%)'));
      console.log(chalk.white('2. Complete Web3 Development Kit - ') + chalk.green('$129.99') + chalk.dim(' (Free updates)'));
      console.log(chalk.white('3. DevOps Automation Suite - ') + chalk.green('$89.99') + chalk.dim(' (Popular)'));
      console.log('');
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load featured');
  }
}

async function showRecent() {
  const spinner = ora('Loading recently added...').start();
  
  try {
    if (client) {
      const response = await client.products.list({ per_page: 10 });
      spinner.succeed('Recently added products\n');
      
      const table = new Table({
        head: [chalk.cyan('Name'), chalk.cyan('Price'), chalk.cyan('Status'), chalk.cyan('Type')],
        colWidths: [40, 15, 12, 15]
      });
      
      response.data.slice(0, 10).forEach(product => {
        table.push([
          product.name.slice(0, 38),
          chalk.green(product.pricing?.current_price?.formatted || 'Free'),
          product.status === 'published' ? chalk.green('Published') : chalk.yellow('Draft'),
          product.type || 'N/A'
        ]);
      });
      
      console.log(table.toString());
    } else {
      await new Promise(resolve => setTimeout(resolve, 400));
      spinner.succeed('Recently added products (Demo)\n');
      
      console.log(`${chalk.green('🆕')} New Product Launch Template - ${chalk.green('$19.99')} ${chalk.dim('(2 hours ago)')}`);
      console.log(`${chalk.green('🆕')} ChatGPT Integration Guide - ${chalk.green('$14.99')} ${chalk.dim('(5 hours ago)')}`);
      console.log(`${chalk.green('🆕')} API Automation Toolkit - ${chalk.green('$49.99')} ${chalk.dim('(1 day ago)')}`);
      console.log('');
    }
    
  } catch (error: any) {
    spinner.fail('Failed to load recent');
  }
}

async function searchByPrice() {
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
        const table = new Table({
          head: [chalk.cyan('Name'), chalk.cyan('Price'), chalk.cyan('Rating')],
          colWidths: [45, 15, 12]
        });
        
        filtered.slice(0, 20).forEach(product => {
          table.push([
            product.name.slice(0, 43),
            chalk.green(product.pricing?.current_price?.formatted || 'Free'),
            product.rating?.average ? `${product.rating.average} ★` : 'N/A'
          ]);
        });
        
        console.log(table.toString());
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 600));
      spinner.succeed(`Found 8 products in your price range (Demo)\n`);
      
      console.log(`${chalk.green('•')} Basic Plan - $${min + 9.99}`);
      console.log(`${chalk.green('•')} Standard Package - $${min + 29.99}`);
      console.log(`${chalk.green('•')} Premium Bundle - $${min + 59.99}`);
      console.log('');
    }
    
  } catch (error: any) {
    spinner.fail('Search failed');
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
