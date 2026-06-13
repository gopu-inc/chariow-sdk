import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';
import type { WebhookEvent } from '../../modules/hooks.js';

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

const ALL_EVENTS: WebhookEvent[] = [
  'product.created', 'product.updated', 'product.deleted', 'product.published',
  'sale.created', 'sale.completed', 'sale.refunded',
  'store.updated',
  'payment.succeeded', 'payment.failed',
];

function requireClient(): Chariow {
  const config = getConfig();
  if (!config?.apiKey) {
    console.log(C.error('\n❌ No API key. Run: chariow config --set <token>\n'));
    process.exit(1);
  }
  return new Chariow(config.apiKey);
}

export async function hooksCommand(options: any) {
  const client = requireClient();

  if (options.list || (!options.create && !options.delete && !options.test && !options.get && !options.deliveries)) {
    await listHooks(client);
  } else if (options.create) {
    await createHook(client);
  } else if (options.get) {
    await getHook(client, options.get);
  } else if (options.delete) {
    await deleteHook(client, options.delete);
  } else if (options.test) {
    await testHook(client, options.test);
  } else if (options.deliveries) {
    await showDeliveries(client, options.deliveries);
  }
}

// ─── List ─────────────────────────────────────────────────────────────────
async function listHooks(client: Chariow) {
  const spinner = ora('Fetching webhooks...').start();
  try {
    const hooks = await client.hooks.list();
    spinner.succeed(`Found ${hooks.length} webhook(s)\n`);

    if (hooks.length === 0) {
      console.log(C.dim('No webhooks configured. Create one with: chariow hooks --create\n'));
      return;
    }

    const table = new Table({
      head: [C.cyan('ID'), C.cyan('URL'), C.cyan('Events'), C.cyan('Status'), C.cyan('Last Triggered')],
      colWidths: [28, 34, 24, 10, 22],
    });

    hooks.forEach(h => {
      const evts = h.events.length <= 2
        ? h.events.join(', ')
        : `${h.events.slice(0, 2).join(', ')} +${h.events.length - 2}`;
      table.push([
        C.dim(h.id.slice(0, 26)),
        h.url.slice(0, 32),
        C.text(evts),
        h.status === 'active' ? C.success('● active') : C.warning('○ off'),
        h.last_triggered_at ? C.dim(new Date(h.last_triggered_at).toLocaleString()) : C.dim('—'),
      ]);
    });

    console.log(table.toString());
    console.log(C.dim('\n  Use: chariow hooks --test <id>  to test a webhook\n'));
  } catch (err: any) {
    spinner.fail('Failed to load webhooks');
    console.log(C.error(err.message));
  }
}

// ─── Get ──────────────────────────────────────────────────────────────────
async function getHook(client: Chariow, id: string) {
  const spinner = ora('Fetching webhook...').start();
  try {
    const h = await client.hooks.get(id);
    spinner.succeed();

    console.log('\n' + C.bold.cyan('🔗 Webhook Details\n'));
    const table = new Table({ colWidths: [20, 60] });
    table.push(
      [C.text('ID:'),              C.dim(h.id)],
      [C.text('URL:'),             C.primary(h.url)],
      [C.text('Status:'),          h.status === 'active' ? C.success('● active') : C.warning('○ inactive')],
      [C.text('Events:'),          h.events.join(', ')],
      [C.text('Failures:'),        String(h.failure_count ?? 0)],
      [C.text('Created:'),         new Date(h.created_at).toLocaleString()],
      [C.text('Last Triggered:'),  h.last_triggered_at ? new Date(h.last_triggered_at).toLocaleString() : '—'],
    );
    console.log(table.toString());
    console.log('');
  } catch (err: any) {
    spinner.fail('Webhook not found');
    console.log(C.error(err.message));
  }
}

// ─── Create ───────────────────────────────────────────────────────────────
async function createHook(client: Chariow) {
  console.log('\n' + C.primary.bold('🔗  CREATE WEBHOOK\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: '🌐 Endpoint URL (must be https://):',
      validate: (v: string) => {
        if (!v.startsWith('http')) return 'Must start with http:// or https://';
        return true;
      },
    },
    {
      type: 'checkbox',
      name: 'events',
      message: '📡 Select events to subscribe:',
      choices: ALL_EVENTS.map(e => ({ name: e, value: e, checked: e === 'sale.created' || e === 'payment.succeeded' })),
      validate: (v: string[]) => v.length > 0 ? true : 'Select at least one event',
    },
    {
      type: 'input',
      name: 'secret',
      message: '🔑 Webhook secret (optional — used to verify payload signature):',
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (a: any) => `\nCreate webhook for ${a.url}?`,
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(C.warning('\n⚠ Cancelled.\n'));
    return;
  }

  const spinner = ora('Creating webhook...').start();
  try {
    const hook = await client.hooks.create({
      url: answers.url,
      events: answers.events,
      secret: answers.secret?.trim() || undefined,
    });
    spinner.succeed(C.success('Webhook created!\n'));
    console.log(`  ID:     ${C.dim(hook.id)}`);
    console.log(`  URL:    ${C.primary(hook.url)}`);
    console.log(`  Events: ${C.text(hook.events.join(', '))}\n`);
  } catch (err: any) {
    spinner.fail('Failed to create webhook');
    console.log(C.error(err.message));
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────
async function deleteHook(client: Chariow, id: string) {
  const { ok } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message: C.error(`⚠ Delete webhook ${id}?`),
      default: false,
    },
  ]);
  if (!ok) { console.log(C.warning('\n⚠ Cancelled.\n')); return; }

  const spinner = ora('Deleting webhook...').start();
  try {
    await client.hooks.delete(id);
    spinner.succeed(C.success('Webhook deleted.\n'));
  } catch (err: any) {
    spinner.fail('Failed to delete');
    console.log(C.error(err.message));
  }
}

// ─── Test ─────────────────────────────────────────────────────────────────
async function testHook(client: Chariow, id: string) {
  const { event } = await inquirer.prompt([
    {
      type: 'list',
      name: 'event',
      message: 'Select event to test:',
      choices: ALL_EVENTS,
      default: 'sale.created',
    },
  ]);

  const spinner = ora(`Sending test payload for ${event}...`).start();
  try {
    const result = await client.hooks.test(id, event as WebhookEvent);
    if (result?.success) {
      spinner.succeed(C.success(`Test delivered! Response: ${result.response_code ?? 200}\n`));
    } else {
      spinner.fail(C.warning(`Test failed: ${result?.message || 'Unknown error'}\n`));
    }
  } catch (err: any) {
    spinner.fail('Test failed');
    console.log(C.error(err.message));
  }
}

// ─── Deliveries ───────────────────────────────────────────────────────────
async function showDeliveries(client: Chariow, id: string) {
  const spinner = ora('Loading delivery history...').start();
  try {
    const deliveries = await client.hooks.deliveries(id);
    spinner.succeed(`${deliveries.length} delivery record(s)\n`);

    if (deliveries.length === 0) {
      console.log(C.dim('No deliveries yet.\n'));
      return;
    }

    const table = new Table({
      head: [C.cyan('Event'), C.cyan('Status'), C.cyan('Code'), C.cyan('Date')],
      colWidths: [22, 12, 8, 26],
    });

    deliveries.slice(0, 20).forEach(d => {
      table.push([
        C.text(d.event),
        d.status === 'success' ? C.success('✓ success') : C.error('✗ failed'),
        String(d.response_code ?? '—'),
        new Date(d.created_at).toLocaleString(),
      ]);
    });

    console.log(table.toString());
    console.log('');
  } catch (err: any) {
    spinner.fail('Failed to load deliveries');
    console.log(C.error(err.message));
  }
}
