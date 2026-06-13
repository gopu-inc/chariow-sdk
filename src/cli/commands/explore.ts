import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { getConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';
import type { MarketplaceStore, MarketplaceProduct } from '../../modules/marketplace.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const C = {
  primary: chalk.hex('#6366f1'),
  success: chalk.hex('#10b981'),
  warning: chalk.hex('#f59e0b'),
  error:   chalk.hex('#ef4444'),
  info:    chalk.hex('#3b82f6'),
  accent:  chalk.hex('#8b5cf6'),
  text:    chalk.hex('#94a3b8'),
  dim:     chalk.dim,
  bold:    chalk.bold,
  cyan:    chalk.cyan,
  white:   chalk.white,
};

function getClient(): Chariow | null {
  const config = getConfig();
  if (config?.apiKey) return new Chariow(config.apiKey);
  return null;
}

// ─── Entry ────────────────────────────────────────────────────────────────
export async function exploreCommand(options: any) {
  console.log('\n' + C.accent.bold('╔══════════════════════════════════════════════════════════╗'));
  console.log(C.accent.bold('║   🔍  CHARIOW MARKETPLACE  —  Explore All Stores         ║'));
  console.log(C.accent.bold('╚══════════════════════════════════════════════════════════╝\n'));

  if (options.search) {
    await searchStores(options.search);
  } else if (options.store) {
    await viewStore(options.store);
  } else if (options.top) {
    await showTopStores();
  } else if (options.products) {
    await browseAllProducts(options.products === true ? undefined : options.products);
  } else {
    await interactiveExplore();
  }
}

// ─── Interactive main menu ────────────────────────────────────────────────
async function interactiveExplore() {
  let running = true;

  while (running) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: C.accent('What would you like to explore?'),
        pageSize: 12,
        choices: [
          { name: '🏪 Browse all stores',              value: 'stores' },
          { name: '🔍 Search stores by name',          value: 'search_stores' },
          { name: '📦 Browse all products',            value: 'products' },
          { name: '⭐ Top rated stores',               value: 'top' },
          { name: '🏷  Filter products by category',   value: 'category' },
          { name: '💰 Filter products by price',       value: 'price' },
          { name: '🌐 Open Chariow in browser',        value: 'browser' },
          new inquirer.Separator(),
          { name: '◀  Exit explore',                   value: 'back' },
        ],
      },
    ]);

    switch (action) {
      case 'stores':        await browseStores(); break;
      case 'search_stores': await searchStoresInteractive(); break;
      case 'products':      await browseAllProducts(); break;
      case 'top':           await showTopStores(); break;
      case 'category':      await browseByCategory(); break;
      case 'price':         await browseByPrice(); break;
      case 'browser':       await openBrowser('https://chariow.com'); break;
      case 'back':          running = false; break;
    }
  }
}

// ─── Browse stores ────────────────────────────────────────────────────────
async function browseStores(search?: string) {
  const spinner = ora('Loading Chariow stores...').start();
  const client = getClient();

  try {
    if (!client) {
      spinner.fail('API key required. Run: chariow config --set <token>');
      return;
    }

    const resp = await client.marketplace.listStores({ per_page: 50, search });
    const stores = resp.data;

    if (stores.length === 0) {
      spinner.warn('No stores found.');
      return;
    }

    spinner.succeed(`Found ${stores.length} store(s)\n`);

    const table = new Table({
      head: [C.cyan('#'), C.cyan('Store Name'), C.cyan('Status'), C.cyan('Products'), C.cyan('URL')],
      colWidths: [4, 32, 12, 10, 36],
    });

    stores.forEach((s, i) => {
      table.push([
        C.dim(String(i + 1)),
        C.bold(s.name.slice(0, 30)),
        s.status === 'active' ? C.success('● Active') : C.warning(s.status || '—'),
        C.accent(s.products_count != null ? String(s.products_count) : '—'),
        C.text((s.url || '—').slice(0, 34)),
      ]);
    });

    console.log(table.toString());

    const { pick } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'pick',
        message: 'View a store in detail?',
        default: true,
      },
    ]);

    if (pick) {
      const { storeId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'storeId',
          message: 'Select a store:',
          pageSize: 15,
          choices: stores.map((s, i) => ({
            name: `${i + 1}. ${s.name}  ${C.text(s.url || '')}`,
            value: s.slug || s.id,
          })),
        },
      ]);

      await viewStore(storeId);
    }
  } catch (err: any) {
    spinner.fail('Failed to load stores');
    console.log(C.error(err.message));
  }
}

// ─── View single store ────────────────────────────────────────────────────
async function viewStore(slugOrId: string) {
  const client = getClient();
  if (!client) {
    console.log(C.error('\nAPI key required. Run: chariow config --set <token>\n'));
    return;
  }

  const spinner = ora(`Loading store "${slugOrId}"...`).start();

  try {
    const store = await client.marketplace.getStore(slugOrId);
    spinner.succeed(`Store: ${store.name}\n`);

    printStoreBanner(store);

    // Load store products
    const prodSpinner = ora('Loading store products...').start();
    const products = await client.marketplace.getStoreProducts(slugOrId, { per_page: 50 });
    prodSpinner.succeed(`${products.length} product(s) in this store\n`);

    if (products.length > 0) {
      printProductsTable(products);
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What next?',
        choices: [
          ...(products.length > 0 ? [{ name: '📦 View a product', value: 'product' }] : []),
          { name: '🌐 Open store in browser', value: 'browser' },
          { name: '◀  Back',                  value: 'back' },
        ],
      },
    ]);

    if (action === 'browser') {
      await openBrowser(store.url || `https://chariow.com/store/${slugOrId}`);
    } else if (action === 'product' && products.length > 0) {
      const { pid } = await inquirer.prompt([
        {
          type: 'list',
          name: 'pid',
          message: 'Select a product:',
          pageSize: 15,
          choices: products.map(p => ({
            name: `${p.name}  ${C.success(p.pricing?.current_price?.formatted || 'Free')}`,
            value: p.id,
          })),
        },
      ]);
      await viewProduct(client, pid);
    }
  } catch (err: any) {
    spinner.fail('Failed to load store');
    console.log(C.error(err.message));
  }
}

// ─── View product ─────────────────────────────────────────────────────────
async function viewProduct(client: Chariow, id: string) {
  const spinner = ora('Loading product...').start();
  try {
    const p = await client.products.get(id);
    spinner.succeed();

    console.log('\n' + C.bold.cyan('📦 PRODUCT DETAILS\n'));

    const table = new Table({ colWidths: [22, 58] });
    const r = (k: string, v: string) => table.push([C.text(k + ':'), v]);

    r('Name',       C.bold(p.name));
    r('ID',         C.dim(p.id));
    r('Type',       p.type || '—');
    r('Category',   p.category?.label || 'Uncategorized');
    r('Status',     p.status === 'published' ? C.success('● Published') : C.warning('○ Draft'));
    r('Price',      C.success(p.pricing?.current_price?.formatted || 'Free'));
    r('Rating',     p.rating?.average ? C.warning(`${p.rating.average} ★`) + C.dim(` (${p.rating.count} reviews)`) : 'No ratings');
    r('Sales',      String(p.sales_count ?? '—'));
    r('URL',        C.primary(`https://app.chariow.com/products/${p.id}`));

    console.log(table.toString());

    if (p.description) {
      const clean = p.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('\n' + C.cyan('Description:'));
      console.log(C.text(clean.slice(0, 500)) + '\n');
    }

    const { open } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'open',
        message: 'Open in browser?',
        default: false,
      },
    ]);
    if (open) await openBrowser(`https://app.chariow.com/products/${p.id}`);
  } catch (err: any) {
    spinner.fail('Failed to load product');
    console.log(C.error(err.message));
  }
}

// ─── Browse all products ──────────────────────────────────────────────────
async function browseAllProducts(category?: string) {
  const client = getClient();
  if (!client) {
    console.log(C.error('\nAPI key required. Run: chariow config --set <token>\n'));
    return;
  }

  const spinner = ora('Loading products from Chariow marketplace...').start();

  try {
    const resp = await client.products.list({ per_page: 100, status: 'published' });
    let products = resp.data;

    if (category) {
      products = products.filter(p =>
        p.category?.label?.toLowerCase().includes(category.toLowerCase()) ||
        p.category?.value?.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (products.length === 0) {
      spinner.warn('No products found.');
      return;
    }

    spinner.succeed(`Found ${products.length} product(s)${category ? ` in "${category}"` : ''}\n`);

    printProductsTable(products.slice(0, 30));

    const { viewOne } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'viewOne',
        message: 'View product details?',
        default: false,
      },
    ]);

    if (viewOne) {
      const { pid } = await inquirer.prompt([
        {
          type: 'list',
          name: 'pid',
          message: 'Select product:',
          pageSize: 15,
          choices: products.slice(0, 30).map(p => ({
            name: `${p.name}  ${C.success(p.pricing?.current_price?.formatted || 'Free')}`,
            value: p.id,
          })),
        },
      ]);
      await viewProduct(client, pid);
    }
  } catch (err: any) {
    spinner.fail('Failed to load products');
    console.log(C.error(err.message));
  }
}

// ─── Search stores ────────────────────────────────────────────────────────
async function searchStores(term: string) {
  const client = getClient();
  if (!client) {
    console.log(C.error('\nAPI key required. Run: chariow config --set <token>\n'));
    return;
  }
  const spinner = ora(`Searching stores for "${term}"...`).start();
  try {
    const resp = await client.marketplace.listStores({ per_page: 50, search: term });
    const stores = resp.data;

    if (stores.length === 0) {
      spinner.warn(`No stores found for "${term}".`);
      return;
    }

    spinner.succeed(`Found ${stores.length} store(s) matching "${term}"\n`);

    const table = new Table({
      head: [C.cyan('Name'), C.cyan('Status'), C.cyan('Products'), C.cyan('URL')],
      colWidths: [34, 12, 10, 36],
    });

    stores.forEach(s => {
      table.push([
        C.bold(s.name.slice(0, 32)),
        s.status === 'active' ? C.success('● Active') : C.warning(s.status || '—'),
        C.accent(s.products_count != null ? String(s.products_count) : '—'),
        C.text((s.url || '—').slice(0, 34)),
      ]);
    });

    console.log(table.toString());

    const { pick } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'pick',
        message: 'View a store?',
        default: false,
      },
    ]);

    if (pick) {
      const { storeId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'storeId',
          message: 'Select store:',
          pageSize: 12,
          choices: stores.map(s => ({
            name: s.name,
            value: s.slug || s.id,
          })),
        },
      ]);
      await viewStore(storeId);
    }
  } catch (err: any) {
    spinner.fail('Search failed');
    console.log(C.error(err.message));
  }
}

async function searchStoresInteractive() {
  const { term } = await inquirer.prompt([
    {
      type: 'input',
      name: 'term',
      message: '🔍 Search stores by name:',
      validate: (v: string) => v.trim().length > 0 ? true : 'Enter a search term',
    },
  ]);
  await searchStores(term);
}

// ─── Top stores ───────────────────────────────────────────────────────────
async function showTopStores() {
  const client = getClient();
  if (!client) {
    console.log(C.error('\nAPI key required. Run: chariow config --set <token>\n'));
    return;
  }

  const spinner = ora('Loading top stores...').start();

  try {
    const resp = await client.marketplace.listStores({ per_page: 50 });
    const sorted = resp.data
      .filter(s => s.status === 'active')
      .sort((a, b) => (b.products_count ?? 0) - (a.products_count ?? 0))
      .slice(0, 15);

    spinner.succeed('Top stores on Chariow\n');

    const table = new Table({
      head: [C.cyan('#'), C.cyan('Store'), C.cyan('Products'), C.cyan('URL')],
      colWidths: [4, 36, 12, 36],
    });

    sorted.forEach((s, i) => {
      table.push([
        C.warning.bold(String(i + 1)),
        C.bold(s.name.slice(0, 34)),
        C.success(s.products_count != null ? String(s.products_count) : '—'),
        C.text((s.url || '—').slice(0, 34)),
      ]);
    });

    console.log(table.toString());

    const { pick } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'pick',
        message: 'View a store?',
        default: false,
      },
    ]);

    if (pick && sorted.length > 0) {
      const { storeId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'storeId',
          message: 'Select store:',
          pageSize: 15,
          choices: sorted.map(s => ({
            name: s.name,
            value: s.slug || s.id,
          })),
        },
      ]);
      await viewStore(storeId);
    }
  } catch (err: any) {
    spinner.fail('Failed to load top stores');
    console.log(C.error(err.message));
  }
}

// ─── Browse by category ───────────────────────────────────────────────────
async function browseByCategory() {
  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select category:',
      pageSize: 16,
      choices: [
        { name: '🤖 AI & Machine Learning', value: 'AI' },
        { name: '🌐 Web Development',        value: 'Web' },
        { name: '📱 Mobile Apps',             value: 'Mobile' },
        { name: '☁️  DevOps & Cloud',         value: 'DevOps' },
        { name: '🔒 Cybersecurity',           value: 'Security' },
        { name: '📊 Data Science',            value: 'Data' },
        { name: '🎨 Design & UX',             value: 'Design' },
        { name: '📣 Marketing & SEO',          value: 'Marketing' },
        { name: '🛒 E-commerce',              value: 'Commerce' },
        { name: '⚡ Productivity',            value: 'Productivity' },
        { name: '🎓 Education',               value: 'Education' },
        { name: '🎮 Gaming',                  value: 'Gaming' },
        { name: '💼 Business',                value: 'Business' },
      ],
    },
  ]);
  await browseAllProducts(category);
}

// ─── Browse by price ──────────────────────────────────────────────────────
async function browseByPrice() {
  const { min, max } = await inquirer.prompt([
    {
      type: 'number',
      name: 'min',
      message: 'Minimum price ($):',
      default: 0,
    },
    {
      type: 'number',
      name: 'max',
      message: 'Maximum price ($):',
      default: 100,
    },
  ]);

  const client = getClient();
  if (!client) {
    console.log(C.error('\nAPI key required.\n'));
    return;
  }

  const spinner = ora(`Searching products $${min}–$${max}...`).start();

  try {
    const resp = await client.products.list({ per_page: 100 });
    const filtered = resp.data.filter(p => {
      const v = p.pricing?.current_price?.value ?? 0;
      return v >= min && v <= max;
    });

    if (filtered.length === 0) {
      spinner.warn('No products found in this price range.');
      return;
    }

    spinner.succeed(`Found ${filtered.length} product(s) between $${min} and $${max}\n`);
    printProductsTable(filtered.slice(0, 25));
  } catch (err: any) {
    spinner.fail('Failed to load products');
    console.log(C.error(err.message));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function printStoreBanner(store: MarketplaceStore) {
  const line = (k: string, v: string) =>
    `  ${C.cyan(k.padEnd(14))} ${v}`;

  console.log(C.primary.bold('\n╔══════════════════════════════════════════════╗'));
  console.log(C.primary.bold(`║  🏪  ${store.name.slice(0, 40).padEnd(40)}║`));
  console.log(C.primary.bold('╚══════════════════════════════════════════════╝\n'));
  console.log(line('Status:',  store.status === 'active' ? C.success('● Active') : C.warning(store.status || '—')));
  console.log(line('URL:',     C.primary(store.url || '—')));
  if (store.description) {
    console.log(line('About:',  C.text(store.description.slice(0, 60) + (store.description.length > 60 ? '…' : ''))));
  }
  if (store.products_count != null) {
    console.log(line('Products:', C.accent(String(store.products_count))));
  }
  console.log('');
}

function printProductsTable(products: (MarketplaceProduct | any)[]) {
  const table = new Table({
    head: [C.cyan('Name'), C.cyan('Type'), C.cyan('Category'), C.cyan('Price'), C.cyan('Rating')],
    colWidths: [36, 10, 16, 16, 12],
  });

  products.forEach(p => {
    table.push([
      p.name.slice(0, 34),
      C.text((p.type || '—').slice(0, 8)),
      C.text((p.category?.label || '—').slice(0, 14)),
      C.success(p.pricing?.current_price?.formatted || 'Free'),
      p.rating?.average ? C.warning(`${p.rating.average} ★`) : C.dim('—'),
    ]);
  });

  console.log(table.toString());
  console.log('');
}

async function openBrowser(url: string) {
  console.log(C.warning(`\n🌐 Opening ${url}...\n`));
  try {
    const cmd = process.platform === 'darwin' ? `open "${url}"` :
                process.platform === 'win32'  ? `start "${url}"` :
                `xdg-open "${url}"`;
    await execAsync(cmd);
    console.log(C.success('✓ Opened in browser\n'));
  } catch {
    console.log(C.text(`Copy this URL: ${url}\n`));
  }
}
