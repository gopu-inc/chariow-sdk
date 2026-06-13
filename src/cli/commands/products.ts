import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import inquirer from 'inquirer';

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
};

function requireApiKey(): { apiKey: string } {
  const config = getConfig();
  if (!config?.apiKey) {
    console.log(C.error('\n❌ No API key found. Run: chariow config --set <token>\n'));
    process.exit(1);
  }
  return config as { apiKey: string };
}

export async function productsCommand(options: any) {
  const config = requireApiKey();
  const client = new Chariow(config.apiKey);

  if (options.list) {
    await listProducts(client, options);
  } else if (options.get) {
    await getProduct(client, options.get);
  } else if (options.search) {
    await searchProducts(client, options.search);
  } else if (options.create) {
    await createProduct(client);
  } else if (options.publish) {
    await publishProduct(client, options.publish, 'published');
  } else if (options.unpublish) {
    await publishProduct(client, options.unpublish, 'draft');
  } else if (options.delete) {
    await deleteProduct(client, options.delete);
  } else if (options.stats) {
    await showStats(client);
  } else {
    console.log(C.warning('\nUsage:\n'));
    const cmds = [
      ['--list',              'List all products'],
      ['--get <id>',          'View product details'],
      ['--search <term>',     'Search products'],
      ['--create',            'Create a new product (interactive)'],
      ['--publish <id>',      'Publish a product'],
      ['--unpublish <id>',    'Unpublish a product (back to draft)'],
      ['--delete <id>',       'Delete a product'],
      ['--stats',             'Show statistics'],
    ];
    cmds.forEach(([cmd, desc]) => {
      console.log(`  ${C.accent('chariow products ' + cmd.padEnd(22))} ${C.text(desc)}`);
    });
    console.log('');
  }
}

// ─── List ─────────────────────────────────────────────────────────────────
async function listProducts(client: Chariow, options: any) {
  const limit = options.limit ? parseInt(options.limit) : 50;
  const spinner = ora('Fetching products...').start();
  try {
    const response = await client.products.list({ per_page: limit, status: options.status });
    spinner.succeed(`Found ${response.data.length} product(s)\n`);

    if (response.data.length === 0) {
      console.log(C.dim('No products found.\n'));
      return;
    }

    const table = new Table({
      head: [
        C.cyan('ID'), C.cyan('Name'), C.cyan('Type'),
        C.cyan('Status'), C.cyan('Price'), C.cyan('Sales'),
      ],
      colWidths: [28, 36, 10, 14, 16, 8],
    });

    response.data.forEach(p => {
      table.push([
        C.dim(p.id.slice(0, 26)),
        p.name.slice(0, 34),
        C.text(p.type || '—'),
        p.status === 'published' ? C.success('✓ Published') : C.warning('○ Draft'),
        C.success(p.pricing?.current_price?.formatted || 'Free'),
        C.accent(String(p.sales_count ?? '—')),
      ]);
    });

    console.log(table.toString());

    const published = response.data.filter(p => p.status === 'published').length;
    console.log(C.text(`\n  Published: ${C.success(String(published))}  Draft: ${C.warning(String(response.data.length - published))}\n`));
  } catch (error: any) {
    spinner.fail('Failed to fetch products');
    console.log(C.error(error.message));
  }
}

// ─── Get ──────────────────────────────────────────────────────────────────
async function getProduct(client: Chariow, id: string) {
  const spinner = ora(`Fetching product ${id}...`).start();
  try {
    const p = await client.products.get(id);
    spinner.succeed();

    console.log('\n' + C.bold.cyan('📦 Product Details\n'));

    const table = new Table({ colWidths: [22, 58] });
    const row = (k: string, v: string) => table.push([C.text(k + ':'), v]);

    row('ID',          C.dim(p.id));
    row('Name',        C.bold(p.name));
    row('Type',        p.type || '—');
    row('Category',    p.category?.label || 'Uncategorized');
    row('Status',      p.status === 'published' ? C.success('✓ Published') : C.warning('○ Draft'));
    row('Price',       C.success(p.pricing?.current_price?.formatted || 'Free'));
    row('Sales',       C.accent(String(p.sales_count ?? '0')));
    row('Rating',      p.rating?.average ? C.warning(`${p.rating.average} ★`) + C.dim(` (${p.rating.count} reviews)`) : 'No ratings');
    row('On Sale Until', p.on_sale_until || '—');
    row('URL',         C.primary(`https://app.chariow.com/products/${p.id}`));

    console.log(table.toString());

    if (p.description) {
      const clean = p.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('\n' + C.cyan('Description:'));
      console.log(C.text(clean.slice(0, 400)) + (clean.length > 400 ? C.dim('…') : '') + '\n');
    }
  } catch (error: any) {
    spinner.fail('Product not found');
    console.log(C.error(error.message));
  }
}

// ─── Search ───────────────────────────────────────────────────────────────
async function searchProducts(client: Chariow, term: string) {
  const spinner = ora(`Searching for "${term}"...`).start();
  try {
    const results = await client.products.search(term);
    spinner.succeed(`Found ${results.length} product(s) matching "${term}"\n`);

    if (results.length === 0) {
      console.log(C.dim('No results.\n'));
      return;
    }

    const table = new Table({
      head: [C.cyan('Name'), C.cyan('Status'), C.cyan('Price'), C.cyan('Sales')],
      colWidths: [42, 14, 16, 8],
    });

    results.forEach(p => {
      table.push([
        p.name.slice(0, 40),
        p.status === 'published' ? C.success('✓ Published') : C.warning('○ Draft'),
        C.success(p.pricing?.current_price?.formatted || 'Free'),
        String(p.sales_count ?? '—'),
      ]);
    });

    console.log(table.toString());
    console.log('');
  } catch (error: any) {
    spinner.fail('Search failed');
    console.log(C.error(error.message));
  }
}

// ─── Create ───────────────────────────────────────────────────────────────
async function createProduct(client: Chariow) {
  console.log('\n' + C.primary.bold('╔══════════════════════════════════════════════╗'));
  console.log(C.primary.bold('║       📦  CREATE NEW PRODUCT                 ║'));
  console.log(C.primary.bold('╚══════════════════════════════════════════════╝\n'));
  console.log(C.text('Fill in the details below. Press Ctrl+C to cancel.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '📝 Product name:',
      validate: (v: string) => v.trim().length >= 2 ? true : 'Name must be at least 2 characters',
    },
    {
      type: 'list',
      name: 'type',
      message: '📂 Product type:',
      choices: [
        { name: '💾 Digital  — downloadable file, software, ebook', value: 'digital' },
        { name: '📦 Physical — shipped product', value: 'physical' },
        { name: '🛠  Service  — consulting, freelance work', value: 'service' },
        { name: '📚 Course   — online course or training', value: 'course' },
        { name: '🔑 License  — license key / subscription', value: 'license' },
      ],
    },
    {
      type: 'list',
      name: 'category',
      message: '🏷  Category:',
      choices: [
        { name: '🤖 AI & Machine Learning', value: 'ai_ml' },
        { name: '🌐 Web Development',        value: 'web_dev' },
        { name: '📱 Mobile Apps',             value: 'mobile' },
        { name: '☁️  DevOps & Cloud',         value: 'devops' },
        { name: '🔒 Cybersecurity',           value: 'security' },
        { name: '📊 Data Science',            value: 'data_science' },
        { name: '🎨 Design & UX',             value: 'design' },
        { name: '📣 Marketing & SEO',          value: 'marketing' },
        { name: '🛒 E-commerce',              value: 'ecommerce' },
        { name: '⚡ Productivity',            value: 'productivity' },
        { name: '🎓 Education',               value: 'education' },
        { name: '🎮 Gaming',                  value: 'gaming' },
        { name: '💼 Business',                value: 'business' },
        { name: '📦 Other',                   value: 'other' },
      ],
    },
    {
      type: 'editor',
      name: 'description',
      message: '📄 Description (opens editor — save & close to continue):',
    },
    {
      type: 'list',
      name: 'pricingType',
      message: '💰 Pricing type:',
      choices: [
        { name: '💵 Fixed price', value: 'fixed' },
        { name: '🆓 Free',        value: 'free' },
        { name: '🎯 Pay what you want', value: 'pwyw' },
      ],
    },
    {
      type: 'number',
      name: 'price',
      message: '💵 Price (number):',
      when: (ans: any) => ans.pricingType === 'fixed' || ans.pricingType === 'pwyw',
      validate: (v: number) => (v >= 0 ? true : 'Price must be >= 0'),
    },
    {
      type: 'list',
      name: 'currency',
      message: '💱 Currency:',
      when: (ans: any) => ans.pricingType !== 'free',
      choices: ['USD', 'EUR', 'GBP', 'XAF', 'NGN', 'GHS', 'KES', 'MAD'],
      default: 'USD',
    },
    {
      type: 'list',
      name: 'status',
      message: '🚀 Initial status:',
      choices: [
        { name: '○ Draft   — save and publish later', value: 'draft' },
        { name: '● Publish — make it live immediately', value: 'published' },
      ],
    },
    {
      type: 'input',
      name: 'seoTitle',
      message: '🔍 SEO title (optional, Enter to skip):',
    },
    {
      type: 'input',
      name: 'seoDescription',
      message: '🔍 SEO description (optional, Enter to skip):',
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (ans: any) => `\nCreate "${ans.name}" as ${ans.status}?`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(C.warning('\n⚠ Cancelled — product not created.\n'));
    return;
  }

  const spinner = ora('Creating product...').start();

  try {
    const body: Record<string, any> = {
      name: answers.name.trim(),
      description: answers.description?.trim() || '',
      type: answers.type,
      category: answers.category,
      status: answers.status,
      pricing: {
        type: answers.pricingType,
        ...(answers.pricingType !== 'free' && answers.price != null
          ? {
              price: {
                value: Number(answers.price),
                currency: answers.currency || 'USD',
              },
            }
          : {}),
      },
    };

    if (answers.seoTitle || answers.seoDescription) {
      body.seo = {
        title: answers.seoTitle || '',
        description: answers.seoDescription || '',
        keywords: [],
      };
    }

    const product = await client.products.create(body);
    spinner.succeed(C.success('Product created successfully!\n'));

    console.log(`  ${C.text('ID:')}     ${C.dim(product.id)}`);
    console.log(`  ${C.text('Name:')}   ${C.bold(product.name)}`);
    console.log(`  ${C.text('Status:')} ${product.status === 'published' ? C.success('● Published') : C.warning('○ Draft')}`);
    console.log(`  ${C.text('URL:')}    ${C.primary(`https://app.chariow.com/products/${product.id}`)}`);
    console.log('');
  } catch (error: any) {
    spinner.fail('Failed to create product');
    console.log(C.error('\n' + error.message + '\n'));
  }
}

// ─── Publish / Unpublish ──────────────────────────────────────────────────
async function publishProduct(client: Chariow, id: string, status: 'published' | 'draft') {
  const action = status === 'published' ? 'Publishing' : 'Unpublishing';
  const spinner = ora(`${action} product ${id}...`).start();
  try {
    const product = await client.products.update(id, { status });
    const label = status === 'published' ? C.success('✓ Published') : C.warning('○ Draft');
    spinner.succeed(`${product.name} — ${label}\n`);
    console.log(`  ${C.text('URL:')} ${C.primary(`https://app.chariow.com/products/${product.id}`)}\n`);
  } catch (error: any) {
    spinner.fail(`Failed to ${action.toLowerCase()} product`);
    console.log(C.error(error.message));
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────
async function deleteProduct(client: Chariow, id: string) {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: C.error(`⚠ Delete product ${id}? This cannot be undone.`),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(C.warning('\n⚠ Cancelled.\n'));
    return;
  }

  const spinner = ora('Deleting product...').start();
  try {
    await client.products.delete(id);
    spinner.succeed(C.success('Product deleted successfully.\n'));
  } catch (error: any) {
    spinner.fail('Failed to delete product');
    console.log(C.error(error.message));
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────
async function showStats(client: Chariow) {
  const spinner = ora('Computing statistics...').start();
  try {
    const response = await client.products.list({ per_page: 100 });
    const products = response.data;

    const published  = products.filter(p => p.status === 'published');
    const drafts     = products.filter(p => p.status !== 'published');
    const totalSales = products.reduce((s, p) => s + (p.sales_count ?? 0), 0);
    const totalRev   = products.reduce((s, p) => {
      const val = p.pricing?.current_price?.value ?? 0;
      return s + val * (p.sales_count ?? 0);
    }, 0);
    const avgRating  = products.length
      ? products.reduce((s, p) => s + (p.rating?.average ?? 0), 0) / products.length
      : 0;

    const byType: Record<string, number> = {};
    products.forEach(p => {
      byType[p.type || 'unknown'] = (byType[p.type || 'unknown'] || 0) + 1;
    });

    spinner.succeed('Product statistics\n');

    console.log(C.primary.bold('\n📊  PRODUCT STATISTICS\n'));
    console.log(`  ${C.cyan('Total products:')}   ${C.bold(String(products.length))}`);
    console.log(`  ${C.cyan('Published:')}        ${C.success(String(published.length))}`);
    console.log(`  ${C.cyan('Draft:')}            ${C.warning(String(drafts.length))}`);
    console.log(`  ${C.cyan('Total Sales:')}      ${C.accent(String(totalSales))}`);
    console.log(`  ${C.cyan('Est. Revenue:')}     ${C.success(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRev))}`);
    console.log(`  ${C.cyan('Avg Rating:')}       ${avgRating ? C.warning(avgRating.toFixed(2) + ' ★') : C.dim('N/A')}`);

    if (Object.keys(byType).length > 0) {
      console.log('\n  ' + C.cyan('By type:'));
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`    ${C.text((type + ':').padEnd(14))} ${C.bold(String(count))}`);
      });
    }

    console.log('');
  } catch (error: any) {
    spinner.fail('Failed to load statistics');
    console.log(C.error(error.message));
  }
}
