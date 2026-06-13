import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';
import type { PaymentStatus } from '../../modules/pay.js';

const C = {
  primary: chalk.hex('#6366f1'),
  success: chalk.hex('#10b981'),
  warning: chalk.hex('#f59e0b'),
  error:   chalk.hex('#ef4444'),
  accent:  chalk.hex('#8b5cf6'),
  text:    chalk.hex('#94a3b8'),
  dim:     chalk.dim,
  bold:    chalk.bold,
  cyan:    chalk.cyan,
};

const STATUS_COLOR: Record<string, (s: string) => string> = {
  succeeded:  C.success,
  completed:  C.success,
  pending:    C.warning,
  processing: C.warning,
  failed:     C.error,
  cancelled:  C.error,
  refunded:   C.accent,
};

function requireClient(): Chariow {
  const config = getConfig();
  if (!config?.apiKey) {
    console.log(C.error('\n❌ No API key. Run: chariow config --set <token>\n'));
    process.exit(1);
  }
  return new Chariow(config.apiKey);
}

// ─── URL parser ───────────────────────────────────────────────────────────────
// Accepts:
//   https://chariow.com/store/my-store/products/my-product
//   https://my-store.chariow.com/products/my-product
//   https://chariow.com/products/my-product
//   my-product-slug
//   prod_abc123
function parseProductInput(input: string): { type: 'url' | 'slug' | 'id'; value: string; storeSlug?: string } {
  input = input.trim();

  // Full URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const u = new URL(input);

      // https://chariow.com/store/:storeSlug/products/:productSlug
      const storeProductMatch = u.pathname.match(/\/store\/([^/]+)\/products\/([^/]+)/);
      if (storeProductMatch) {
        return { type: 'url', value: storeProductMatch[2], storeSlug: storeProductMatch[1] };
      }

      // https://chariow.com/products/:productSlug
      const directProductMatch = u.pathname.match(/\/products\/([^/]+)/);
      if (directProductMatch) {
        return { type: 'url', value: directProductMatch[1] };
      }

      // https://:storeSlug.chariow.com/products/:productSlug
      const subdomainMatch = u.hostname.match(/^([^.]+)\.chariow\.com$/);
      const productPathMatch = u.pathname.match(/\/products\/([^/]+)/);
      if (subdomainMatch && productPathMatch) {
        return { type: 'url', value: productPathMatch[1], storeSlug: subdomainMatch[1] };
      }

      // Fallback — use last path segment
      const segments = u.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return { type: 'url', value: segments[segments.length - 1] };
      }
    } catch {
      /* not a valid URL, fall through */
    }
  }

  // Raw product ID (e.g. prod_abc123 or UUID)
  if (/^(prod_|pay_|[0-9a-f-]{36}$)/.test(input)) {
    return { type: 'id', value: input };
  }

  // Slug
  return { type: 'slug', value: input };
}

// ─── Resolve product from URL/slug/ID ─────────────────────────────────────
async function resolveProduct(client: Chariow, input: string): Promise<any> {
  const parsed = parseProductInput(input);

  // Try direct ID lookup first
  try {
    const product = await client.products.get(parsed.value);
    if (product) return product;
  } catch { /* not found by ID */ }

  // Search by slug/name
  try {
    const resp = await client.products.list({ per_page: 20 });
    const products: any[] = resp.data;

    // Exact slug match
    const bySlug = products.find(p =>
      p.slug === parsed.value ||
      p.handle === parsed.value ||
      p.url_key === parsed.value
    );
    if (bySlug) return bySlug;

    // Name match (case-insensitive)
    const byName = products.find(p =>
      p.name?.toLowerCase().includes(parsed.value.toLowerCase())
    );
    if (byName) return byName;
  } catch { /* search failed */ }

  return null;
}

// ─── Display product card ──────────────────────────────────────────────────
function printProductCard(product: any) {
  const price   = product.pricing?.current_price?.formatted
                  || (product.price ? `${product.price} ${product.currency || ''}` : 'Free');
  const compare = product.pricing?.compare_at_price?.formatted;
  const stock   = product.inventory?.quantity ?? product.stock ?? '∞';
  const status  = product.status === 'published' ? C.success('● Published') : C.warning('● ' + (product.status || 'draft'));

  console.log('\n' + C.primary('┌─────────────────────────────────────────────────────────────────┐'));
  console.log(C.primary('│') + C.bold('  📦  PRODUCT DETAILS'));
  console.log(C.primary('├─────────────────────────────────────────────────────────────────┤'));

  const rows: [string, string][] = [
    ['Name',        C.bold(product.name || '—')],
    ['ID',          C.dim(product.id || '—')],
    ['Status',      status],
    ['Price',       C.success.bold(price) + (compare ? C.dim('  was ' + compare) : '')],
    ['Stock',       typeof stock === 'number' && stock < 10 ? C.warning(String(stock)) : String(stock)],
    ['Category',    product.category?.name || product.type || '—'],
    ['Store',       product.store?.name || product.store_id || '—'],
    ['URL',         product.url || product.permalink || C.dim('—')],
  ];

  if (product.description || product.short_description) {
    const desc = (product.short_description || product.description || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 120);
    rows.push(['Description', C.dim(desc + (desc.length === 120 ? '…' : ''))]);
  }

  rows.forEach(([k, v]) => {
    console.log(C.primary('│') + `  ${C.text(k.padEnd(14))}  ${v}`);
  });

  console.log(C.primary('└─────────────────────────────────────────────────────────────────┘') + '\n');
}

export async function payCommand(options: any) {
  const client = requireClient();

  if (options.buy) {
    await buyProduct(client, options.buy, options);
  } else if (options.list) {
    await listPayments(client, options);
  } else if (options.get) {
    await getPayment(client, options.get);
  } else if (options.refund) {
    await refundPayment(client, options.refund);
  } else if (options.checkout) {
    await interactiveCheckout(client);
  } else {
    showUsage();
  }
}

// ─── Buy via URL/slug/ID ───────────────────────────────────────────────────
async function buyProduct(client: Chariow, input: string, options: any) {
  console.log('\n' + C.primary.bold('╔══════════════════════════════════════════════╗'));
  console.log(C.primary.bold('║   💳  CHARIOW PAY  —  Product Checkout       ║'));
  console.log(C.primary.bold('╚══════════════════════════════════════════════╝\n'));

  const parsed = parseProductInput(input);
  console.log(C.dim(`  Resolving: ${C.text(input)}`));
  console.log(C.dim(`  Detected as: ${parsed.type}${parsed.storeSlug ? `  (store: ${parsed.storeSlug})` : ''}\n`));

  const spinner = ora('Fetching product information...').start();
  const product = await resolveProduct(client, input);

  if (!product) {
    spinner.fail('Product not found');
    console.log(C.error(`\n❌ Could not find product from: ${input}`));
    console.log(C.text('   • Check the URL or slug is correct'));
    console.log(C.text('   • Make sure the product is published'));
    console.log(C.text(`   • Try: ${C.dim('chariow products --search <name>')}\n`));
    return;
  }

  spinner.succeed(`Found: ${C.bold(product.name)}\n`);
  printProductCard(product);

  // Stock check
  const stockQty = product.inventory?.quantity ?? product.stock ?? Infinity;
  if (typeof stockQty === 'number' && stockQty === 0) {
    console.log(C.error('❌ This product is out of stock.\n'));
    return;
  }

  // Checkout form
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: '📧 Customer email:',
      default: options.email,
      validate: (v: string) => v.includes('@') ? true : 'Enter a valid email',
    },
    {
      type: 'input',
      name: 'name',
      message: '👤 Customer name (optional):',
      default: options.name,
    },
    {
      type: 'input',
      name: 'quantity',
      message: '🔢 Quantity:',
      default: '1',
      validate: (v: string) => {
        const n = parseInt(v, 10);
        if (!Number.isInteger(n) || n < 1) return 'Enter a whole number ≥ 1';
        if (typeof stockQty === 'number' && n > stockQty) return `Only ${stockQty} in stock`;
        return true;
      },
      filter: (v: string) => parseInt(v, 10) || 1,
    },
    {
      type: 'list',
      name: 'method',
      message: '💳 Payment method:',
      choices: [
        { name: '💳 Card             — Visa, Mastercard, Amex', value: 'card' },
        { name: '📱 Mobile Money     — MTN, Orange, Airtel',    value: 'mobile_money' },
        { name: '🏦 Bank Transfer    — IBAN / SWIFT',           value: 'bank_transfer' },
        { name: '🅿️  PayPal           — PayPal account',         value: 'paypal' },
        { name: '🔷 Crypto           — BTC, ETH, USDT',         value: 'crypto' },
      ],
    },
    {
      type: 'list',
      name: 'currency',
      message: '💱 Currency:',
      choices: [
        'USD  — US Dollar',
        'EUR  — Euro',
        'GBP  — British Pound',
        'XAF  — CFA Franc BEAC',
        'NGN  — Nigerian Naira',
        'GHS  — Ghanaian Cedi',
        'KES  — Kenyan Shilling',
      ],
      default: product.pricing?.current_price?.currency
        ? `${product.pricing.current_price.currency}  — ...`
        : 'USD  — US Dollar',
      filter: (v: string) => v.split(/\s+/)[0],
    },
  ]);

  // Summary before confirm
  const price = product.pricing?.current_price?.amount ?? product.price ?? 0;
  const total = price * answers.quantity;
  const currencyCode = answers.currency;

  console.log('\n' + C.primary.bold('  ─── ORDER SUMMARY ────────────────────────────────'));
  console.log(`  Product   : ${C.bold(product.name)}`);
  console.log(`  Qty       : ${answers.quantity}`);
  console.log(`  Unit price: ${C.success(product.pricing?.current_price?.formatted || `${price} ${currencyCode}`)}`);
  console.log(`  Total     : ${C.success.bold(`${total.toLocaleString()} ${currencyCode}`)}`);
  console.log(`  Method    : ${answers.method}`);
  console.log(`  Customer  : ${answers.email}${answers.name ? ' (' + answers.name + ')' : ''}`);
  console.log(C.primary.bold('  ───────────────────────────────────────────────────\n'));

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: C.warning(`Confirm purchase of "${product.name}" — ${total.toLocaleString()} ${currencyCode}?`),
    default: true,
  }]);

  if (!confirm) {
    console.log(C.warning('\n⚠ Payment cancelled.\n'));
    return;
  }

  const paySpinner = ora('Processing payment via Chariow Pay...').start();
  try {
    const payment = await client.pay.checkout({
      items: [{ product_id: product.id, quantity: answers.quantity }],
      customer_email: answers.email,
      customer_name:  answers.name || undefined,
      payment_method: { type: answers.method },
      currency:       answers.currency,
    });
    paySpinner.succeed(C.success('Checkout created!\n'));
    printPaymentSummary(payment);
    printPaymentInstructions(answers.method, payment);
  } catch (err: any) {
    paySpinner.fail('Payment failed');
    console.log(C.error('\n' + err.message + '\n'));
  }
}

// ─── Payment method instructions ──────────────────────────────────────────
function printPaymentInstructions(method: string, payment: any) {
  const instructions: Record<string, string[]> = {
    card: [
      '1. Visit the checkout URL shown above',
      '2. Enter your card details (PCI-compliant Chariow form)',
      '3. Complete 3DS verification if prompted',
      '4. You will receive a confirmation email',
    ],
    mobile_money: [
      '1. You will receive a payment push notification on your phone',
      '2. Enter your Mobile Money PIN to confirm',
      '3. Transaction is confirmed instantly',
      '4. Receipt will be sent to your email',
    ],
    bank_transfer: [
      '1. Transfer the exact amount to the bank account below:',
      `   Bank: Chariow Pay — Reference: ${payment?.id?.slice(0, 12) || 'see checkout URL'}`,
      '2. Use your payment ID as the transfer reference',
      '3. Payment is confirmed after 1–3 business days',
    ],
    paypal: [
      '1. Visit the checkout URL and click "Pay with PayPal"',
      '2. Log into your PayPal account',
      '3. Approve the payment',
      '4. You are redirected back automatically',
    ],
    crypto: [
      '1. Visit the checkout URL for the wallet address',
      '2. Send the exact amount in your chosen crypto',
      '3. Payment confirms after blockchain confirmation (~10–30 min)',
      '4. Receipt will be emailed once confirmed',
    ],
  };

  const steps = instructions[method] || ['Visit the checkout URL to complete payment.'];
  console.log(C.accent.bold('\n  📋 HOW TO COMPLETE YOUR PAYMENT:\n'));
  steps.forEach(step => console.log(`  ${C.text(step)}`));
  console.log('');
}

// ─── Interactive checkout ──────────────────────────────────────────────────
async function interactiveCheckout(client: Chariow) {
  console.log('\n' + C.primary.bold('💳  CHARIOW PAY  —  Interactive Checkout\n'));

  const listSpinner = ora('Loading your products...').start();
  let products: any[] = [];
  try {
    const resp = await client.products.list({ per_page: 50, status: 'published' });
    products = resp.data;
    listSpinner.succeed(`${products.length} product(s) available\n`);
  } catch (err: any) {
    listSpinner.fail('Could not load products');
    console.log(C.error(err.message));
    return;
  }

  if (products.length === 0) {
    console.log(C.warning('No published products found.\n'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'productId',
      message: '📦 Select product to buy:',
      pageSize: 15,
      choices: products.map(p => ({
        name: `${p.name}  ${C.success(p.pricing?.current_price?.formatted || 'Free')}`,
        value: p.id,
      })),
    },
    {
      type: 'input',
      name: 'quantity',
      message: '🔢 Quantity:',
      default: '1',
      validate: (v: string) => (Number.isInteger(Number(v)) && Number(v) >= 1) ? true : 'Enter a whole number ≥ 1',
      filter: (v: string) => parseInt(v, 10) || 1,
    },
    {
      type: 'input',
      name: 'email',
      message: '📧 Customer email:',
      validate: (v: string) => v.includes('@') ? true : 'Enter a valid email',
    },
    {
      type: 'input',
      name: 'name',
      message: '👤 Customer name (optional):',
    },
    {
      type: 'list',
      name: 'method',
      message: '💳 Payment method:',
      choices: [
        { name: '💳 Card             — Visa, Mastercard, Amex', value: 'card' },
        { name: '📱 Mobile Money     — MTN, Orange, Airtel',    value: 'mobile_money' },
        { name: '🏦 Bank Transfer    — IBAN / SWIFT',           value: 'bank_transfer' },
        { name: '🅿️  PayPal           — PayPal account',         value: 'paypal' },
        { name: '🔷 Crypto           — BTC, ETH, USDT',         value: 'crypto' },
      ],
    },
    {
      type: 'list',
      name: 'currency',
      message: '💱 Currency:',
      choices: [
        'USD  — US Dollar',
        'EUR  — Euro',
        'GBP  — British Pound',
        'XAF  — CFA Franc BEAC',
        'NGN  — Nigerian Naira',
        'GHS  — Ghanaian Cedi',
        'KES  — Kenyan Shilling',
      ],
      default: 'USD  — US Dollar',
      filter: (v: string) => v.split(/\s+/)[0],
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: '\nProcess payment?',
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(C.warning('\n⚠ Cancelled.\n'));
    return;
  }

  const spinner = ora('Processing via Chariow Pay...').start();
  try {
    const payment = await client.pay.checkout({
      items: [{ product_id: answers.productId, quantity: answers.quantity }],
      customer_email: answers.email,
      customer_name:  answers.name || undefined,
      payment_method: { type: answers.method },
      currency:       answers.currency,
    });
    spinner.succeed(C.success('Checkout created!\n'));
    printPaymentSummary(payment);
    printPaymentInstructions(answers.method, payment);
  } catch (err: any) {
    spinner.fail('Payment failed');
    console.log(C.error('\n' + err.message + '\n'));
  }
}

// ─── List payments ─────────────────────────────────────────────────────────
async function listPayments(client: Chariow, options: any) {
  const limit = options.limit ? parseInt(options.limit) : 20;
  const spinner = ora('Fetching payments...').start();
  try {
    const resp = await client.pay.list({ per_page: limit, status: options.status as PaymentStatus });
    const payments = resp.data;
    spinner.succeed(`Found ${payments.length} payment(s)\n`);

    if (payments.length === 0) {
      console.log(C.dim('No payments found.\n'));
      return;
    }

    const table = new Table({
      head: [C.cyan('ID'), C.cyan('Amount'), C.cyan('Currency'), C.cyan('Status'), C.cyan('Customer'), C.cyan('Date')],
      colWidths: [28, 12, 10, 14, 26, 22],
    });

    payments.forEach((p: any) => {
      const fn = STATUS_COLOR[p.status] ?? C.text;
      table.push([
        C.dim(p.id.slice(0, 26)),
        C.success(p.amount.toLocaleString()),
        p.currency,
        fn('● ' + p.status),
        C.text((p.customer_email || '—').slice(0, 24)),
        C.dim(new Date(p.created_at).toLocaleString()),
      ]);
    });

    console.log(table.toString());
    console.log('');
  } catch (err: any) {
    spinner.fail('Failed to load payments');
    console.log(C.error(err.message));
  }
}

// ─── Get payment ───────────────────────────────────────────────────────────
async function getPayment(client: Chariow, id: string) {
  const spinner = ora(`Fetching payment ${id}...`).start();
  try {
    const p = await client.pay.get(id);
    spinner.succeed();
    printPaymentSummary(p);
  } catch (err: any) {
    spinner.fail('Payment not found');
    console.log(C.error(err.message));
  }
}

// ─── Refund ────────────────────────────────────────────────────────────────
async function refundPayment(client: Chariow, id: string) {
  const { reason, partial, amount, ok } = await inquirer.prompt([
    {
      type: 'input',
      name: 'reason',
      message: '📝 Refund reason:',
      default: 'Customer request',
    },
    {
      type: 'confirm',
      name: 'partial',
      message: 'Partial refund?',
      default: false,
    },
    {
      type: 'input',
      name: 'amount',
      message: 'Refund amount:',
      when: (a: any) => a.partial,
      validate: (v: string) => !isNaN(Number(v)) && Number(v) > 0 ? true : 'Enter a positive number',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'confirm',
      name: 'ok',
      message: C.warning(`⚠ Refund payment ${id}?`),
      default: false,
    },
  ]);

  if (!ok) { console.log(C.warning('\n⚠ Cancelled.\n')); return; }

  const spinner = ora('Processing refund...').start();
  try {
    const p = await client.pay.refund(id, {
      reason,
      amount: partial && amount ? amount : undefined,
    });
    spinner.succeed(C.success('Refund issued!\n'));
    printPaymentSummary(p);
  } catch (err: any) {
    spinner.fail('Refund failed');
    console.log(C.error(err.message));
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function printPaymentSummary(p: any) {
  const fn = STATUS_COLOR[p.status] ?? C.text;
  const table = new Table({ colWidths: [20, 62] });
  table.push(
    [C.text('Payment ID:'),   C.dim(p.id)],
    [C.text('Status:'),       fn('● ' + p.status)],
    [C.text('Amount:'),       C.success(`${p.amount?.toLocaleString?.() ?? p.amount} ${p.currency}`)],
    [C.text('Customer:'),     p.customer_email || '—'],
    [C.text('Method:'),       p.payment_method?.type || '—'],
    [C.text('Checkout URL:'), p.checkout_url ? C.primary(p.checkout_url) : C.dim('—')],
    [C.text('Receipt URL:'),  p.receipt_url   ? C.primary(p.receipt_url)   : C.dim('—')],
    [C.text('Created:'),      p.created_at ? new Date(p.created_at).toLocaleString() : '—'],
  );
  console.log(table.toString());

  if (p.checkout_url) {
    console.log(C.success(`\n  ✓ Complete payment at:\n    ${C.primary.bold(p.checkout_url)}\n`));
  }
}

function showUsage() {
  console.log(C.warning('\nUsage:\n'));
  const cmds: [string, string][] = [
    ['chariow pay --checkout',                   'Interactive checkout wizard'],
    ['chariow pay --buy <url|slug|id>',          'Buy from product URL, slug or ID'],
    ['chariow pay --list',                       'List all payments'],
    ['chariow pay --get <id>',                   'View payment details'],
    ['chariow pay --refund <id>',                'Refund a payment'],
  ];
  cmds.forEach(([cmd, desc]) => {
    console.log(`  ${C.accent(cmd.padEnd(48))} ${C.text(desc)}`);
  });
  console.log('\n  ' + C.dim('Examples:'));
  console.log('  ' + C.dim('chariow pay --buy https://chariow.com/store/myshop/products/my-product'));
  console.log('  ' + C.dim('chariow pay --buy my-product-slug'));
  console.log('  ' + C.dim('chariow pay --buy prod_abc123\n'));
}
