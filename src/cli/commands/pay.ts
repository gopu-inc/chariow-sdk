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

// ─── Buy (direct) ─────────────────────────────────────────────────────────
async function buyProduct(client: Chariow, productId: string, options: any) {
  console.log('\n' + C.primary.bold('╔══════════════════════════════════════════════╗'));
  console.log(C.primary.bold('║   💳  CHARIOW PAY  —  Product Checkout       ║'));
  console.log(C.primary.bold('╚══════════════════════════════════════════════╝\n'));

  // Fetch product info first
  const prodSpinner = ora(`Loading product ${productId}...`).start();
  let product: any;
  try {
    product = await client.products.get(productId);
    prodSpinner.succeed(`${product.name}  —  ${C.success(product.pricing?.current_price?.formatted || 'Free')}\n`);
  } catch (err: any) {
    prodSpinner.fail('Product not found');
    console.log(C.error(err.message));
    return;
  }

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
      type: 'list',
      name: 'method',
      message: '💳 Payment method:',
      choices: [
        { name: '💳 Card',           value: 'card' },
        { name: '📱 Mobile Money',   value: 'mobile_money' },
        { name: '🏦 Bank Transfer',  value: 'bank_transfer' },
        { name: '🅿️  PayPal',         value: 'paypal' },
        { name: '🔷 Crypto',         value: 'crypto' },
      ],
    },
    {
      type: 'list',
      name: 'currency',
      message: '💱 Currency:',
      choices: ['USD', 'EUR', 'GBP', 'XAF', 'NGN', 'GHS', 'KES'],
      default: product.pricing?.current_price?.currency || 'USD',
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (a: any) => `\nConfirm purchase of "${product.name}" for ${product.pricing?.current_price?.formatted || 'Free'}?`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(C.warning('\n⚠ Payment cancelled.\n'));
    return;
  }

  const spinner = ora('Processing payment via Chariow Pay...').start();
  try {
    const payment = await client.pay.checkout({
      items: [{ product_id: productId, quantity: 1 }],
      customer_email: answers.email,
      customer_name:  answers.name || undefined,
      payment_method: { type: answers.method },
      currency:       answers.currency,
    });

    spinner.succeed(C.success('Checkout created!\n'));
    printPaymentSummary(payment);
  } catch (err: any) {
    spinner.fail('Payment failed');
    console.log(C.error('\n' + err.message + '\n'));
  }
}

// ─── Interactive checkout ─────────────────────────────────────────────────
async function interactiveCheckout(client: Chariow) {
  console.log('\n' + C.primary.bold('💳  CHARIOW PAY  —  Interactive Checkout\n'));

  // Pick product from list
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
        { name: '💳 Card',          value: 'card' },
        { name: '📱 Mobile Money',  value: 'mobile_money' },
        { name: '🏦 Bank Transfer', value: 'bank_transfer' },
        { name: '🅿️  PayPal',        value: 'paypal' },
        { name: '🔷 Crypto',        value: 'crypto' },
      ],
    },
    {
      type: 'list',
      name: 'currency',
      message: '💱 Currency:',
      choices: ['USD', 'EUR', 'GBP', 'XAF', 'NGN', 'GHS', 'KES'],
      default: 'USD',
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
  } catch (err: any) {
    spinner.fail('Payment failed');
    console.log(C.error('\n' + err.message + '\n'));
  }
}

// ─── List payments ────────────────────────────────────────────────────────
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

    payments.forEach(p => {
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

// ─── Get payment ──────────────────────────────────────────────────────────
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

// ─── Refund ───────────────────────────────────────────────────────────────
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

// ─── Helper ───────────────────────────────────────────────────────────────
function printPaymentSummary(p: any) {
  const fn = STATUS_COLOR[p.status] ?? C.text;
  const table = new Table({ colWidths: [20, 60] });
  table.push(
    [C.text('Payment ID:'),   C.dim(p.id)],
    [C.text('Status:'),       fn('● ' + p.status)],
    [C.text('Amount:'),       C.success(`${p.amount?.toLocaleString?.() ?? p.amount} ${p.currency}`)],
    [C.text('Customer:'),     p.customer_email || '—'],
    [C.text('Checkout URL:'), p.checkout_url ? C.primary(p.checkout_url) : C.dim('—')],
    [C.text('Receipt URL:'),  p.receipt_url ? C.primary(p.receipt_url) : C.dim('—')],
    [C.text('Created:'),      p.created_at ? new Date(p.created_at).toLocaleString() : '—'],
  );
  console.log(table.toString());

  if (p.checkout_url) {
    console.log(C.success(`\n  ✓ Complete payment at: ${C.primary(p.checkout_url)}\n`));
  }
}

function showUsage() {
  console.log(C.warning('\nUsage:\n'));
  const cmds = [
    ['chariow pay --checkout',          'Interactive checkout wizard'],
    ['chariow pay --buy <product_id>',  'Buy a specific product'],
    ['chariow pay --list',              'List all payments'],
    ['chariow pay --get <id>',          'View payment details'],
    ['chariow pay --refund <id>',       'Refund a payment'],
  ];
  cmds.forEach(([cmd, desc]) => {
    console.log(`  ${C.accent(cmd.padEnd(42))} ${C.text(desc)}`);
  });
  console.log('');
}
