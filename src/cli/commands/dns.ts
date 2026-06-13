import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';

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
  active:   C.success,
  pending:  C.warning,
  failed:   C.error,
  inactive: C.text,
};

function requireClient(): Chariow {
  const config = getConfig();
  if (!config?.apiKey) {
    console.log(C.error('\n❌ No API key. Run: chariow config --set <token>\n'));
    process.exit(1);
  }
  return new Chariow(config.apiKey);
}

export async function dnsCommand(options: any) {
  const client = requireClient();

  if (options.list || (!options.add && !options.remove && !options.verify && !options.info)) {
    await listDomains(client);
  } else if (options.add) {
    await addDomain(client, options.add);
  } else if (options.remove) {
    await removeDomain(client, options.remove);
  } else if (options.verify) {
    await verifyDomain(client, options.verify);
  } else if (options.info) {
    await domainInfo(client, options.info);
  }
}

// ─── List ─────────────────────────────────────────────────────────────────
async function listDomains(client: Chariow) {
  const spinner = ora('Fetching custom domains...').start();
  try {
    const domains = await client.dns.list();
    spinner.succeed(`Found ${domains.length} domain(s)\n`);

    if (domains.length === 0) {
      console.log(C.dim('No domains configured. Add one with: chariow dns --add example.com\n'));
      return;
    }

    const table = new Table({
      head: [C.cyan('ID'), C.cyan('Domain'), C.cyan('Type'), C.cyan('Status'), C.cyan('SSL'), C.cyan('Verified')],
      colWidths: [28, 32, 12, 12, 12, 22],
    });

    domains.forEach(d => {
      const statusFn = STATUS_COLOR[d.status] ?? C.text;
      const sslFn    = STATUS_COLOR[d.ssl_status ?? 'pending'] ?? C.text;
      table.push([
        C.dim(d.id.slice(0, 26)),
        C.bold(d.domain),
        C.text(d.type),
        statusFn('● ' + d.status),
        sslFn(d.ssl_status ?? '—'),
        d.verified_at ? C.dim(new Date(d.verified_at).toLocaleDateString()) : C.dim('—'),
      ]);
    });

    console.log(table.toString());
    console.log(C.dim('\n  Tip: chariow dns --verify <id>  to trigger domain verification\n'));
  } catch (err: any) {
    spinner.fail('Failed to load domains');
    console.log(C.error(err.message));
  }
}

// ─── Info ─────────────────────────────────────────────────────────────────
async function domainInfo(client: Chariow, id: string) {
  const spinner = ora(`Loading domain ${id}...`).start();
  try {
    const d = await client.dns.get(id);
    spinner.succeed();

    console.log('\n' + C.bold.cyan('🌐 Domain Details\n'));

    const statusFn = STATUS_COLOR[d.status] ?? C.text;
    const sslFn    = STATUS_COLOR[d.ssl_status ?? 'pending'] ?? C.text;

    const table = new Table({ colWidths: [20, 60] });
    table.push(
      [C.text('ID:'),       C.dim(d.id)],
      [C.text('Domain:'),   C.bold(d.domain)],
      [C.text('Type:'),     d.type],
      [C.text('Status:'),   statusFn('● ' + d.status)],
      [C.text('SSL:'),      sslFn(d.ssl_status ?? '—')],
      [C.text('Created:'),  new Date(d.created_at).toLocaleString()],
      [C.text('Verified:'), d.verified_at ? new Date(d.verified_at).toLocaleString() : 'Not yet'],
    );
    console.log(table.toString());

    if (d.dns_records && d.dns_records.length > 0) {
      console.log('\n' + C.cyan('  DNS Records to configure:\n'));
      const recTable = new Table({
        head: [C.cyan('Type'), C.cyan('Name'), C.cyan('Value'), C.cyan('TTL')],
        colWidths: [8, 24, 38, 8],
      });
      d.dns_records.forEach(r => {
        recTable.push([C.accent(r.type), r.name, C.text(r.value), String(r.ttl ?? 3600)]);
      });
      console.log(recTable.toString());
      console.log(C.dim('\n  Add these records in your DNS provider, then run: chariow dns --verify ' + id + '\n'));
    }
  } catch (err: any) {
    spinner.fail('Domain not found');
    console.log(C.error(err.message));
  }
}

// ─── Add ──────────────────────────────────────────────────────────────────
async function addDomain(client: Chariow, domain?: string) {
  let targetDomain = domain;

  if (!targetDomain) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: '🌐 Domain name (e.g. myshop.com):',
        validate: (v: string) => {
          if (!v.includes('.')) return 'Enter a valid domain';
          return true;
        },
      },
    ]);
    targetDomain = input.trim().toLowerCase().replace(/^https?:\/\//, '');
  }

  const spinner = ora(`Adding ${targetDomain}...`).start();
  try {
    const d = await client.dns.add({ domain: targetDomain! });
    spinner.succeed(C.success(`Domain added: ${d.domain}\n`));

    console.log(`  ID:     ${C.dim(d.id)}`);
    console.log(`  Status: ${(STATUS_COLOR[d.status] ?? C.text)('● ' + d.status)}`);

    if (d.dns_records && d.dns_records.length > 0) {
      console.log('\n' + C.cyan('  Configure these DNS records with your provider:\n'));
      d.dns_records.forEach(r => {
        console.log(`  ${C.accent(r.type.padEnd(6))} ${C.text(r.name.padEnd(20))} → ${r.value}`);
      });
      console.log(C.dim(`\n  After setup: chariow dns --verify ${d.id}\n`));
    }
  } catch (err: any) {
    spinner.fail('Failed to add domain');
    console.log(C.error(err.message));
  }
}

// ─── Verify ───────────────────────────────────────────────────────────────
async function verifyDomain(client: Chariow, id: string) {
  const spinner = ora('Triggering domain verification...').start();
  try {
    const d = await client.dns.verify(id);
    const statusFn = STATUS_COLOR[d.status] ?? C.text;
    if (d.status === 'active') {
      spinner.succeed(C.success(`✓ Domain ${d.domain} is now active!\n`));
    } else {
      spinner.warn(`Verification in progress. Status: ${statusFn(d.status)}`);
      console.log(C.dim('  DNS propagation can take up to 48 hours.\n'));
    }
  } catch (err: any) {
    spinner.fail('Verification failed');
    console.log(C.error(err.message));
  }
}

// ─── Remove ───────────────────────────────────────────────────────────────
async function removeDomain(client: Chariow, id: string) {
  const { ok } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message: C.error(`⚠ Remove domain ${id}?`),
      default: false,
    },
  ]);
  if (!ok) { console.log(C.warning('\n⚠ Cancelled.\n')); return; }

  const spinner = ora('Removing domain...').start();
  try {
    await client.dns.remove(id);
    spinner.succeed(C.success('Domain removed.\n'));
  } catch (err: any) {
    spinner.fail('Failed to remove domain');
    console.log(C.error(err.message));
  }
}
