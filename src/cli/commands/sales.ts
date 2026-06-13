import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

export async function salesCommand(options: any) {
  const config = getConfig();

  if (!config?.apiKey) {
    console.log(chalk.red('\n❌ No API key found. Run: chariow config --set <token>\n'));
    process.exit(1);
  }

  const client = new Chariow(config.apiKey);

  if (options.list || (!options.get && !options.stats)) {
    const spinner = ora('Fetching sales...').start();
    try {
      const perPage = options.limit ? parseInt(options.limit) : 20;
      const response = await client.sales.list(undefined, perPage);
      spinner.succeed(`Found ${response.data.length} sales\n`);

      if (response.data.length === 0) {
        console.log(chalk.dim('No sales found.\n'));
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('Product ID'),
          chalk.cyan('Amount'),
          chalk.cyan('Currency'),
          chalk.cyan('Status'),
          chalk.cyan('Date')
        ],
        colWidths: [26, 26, 12, 10, 12, 22]
      });

      response.data.forEach(s => {
        const date = new Date(s.created_at).toLocaleString();
        table.push([
          s.id.slice(0, 22),
          s.product_id.slice(0, 22),
          chalk.green(s.amount.toLocaleString()),
          s.currency,
          s.status === 'completed'
            ? chalk.green('✓ completed')
            : chalk.yellow(s.status),
          date
        ]);
      });

      console.log(table.toString());

      if (response.pagination.has_more) {
        console.log(chalk.dim(`\n  ℹ  More sales available. Use --limit <n> to load more.\n`));
      }
    } catch (error: any) {
      spinner.fail('Failed to fetch sales');
      console.log(chalk.red(error.message));
    }
  } else if (options.get) {
    const spinner = ora(`Fetching sale ${options.get}...`).start();
    try {
      const sale = await client.sales.get(options.get);
      spinner.succeed();

      console.log('\n' + chalk.bold.cyan('🛒 Sale Details:\n'));

      const table = new Table({ colWidths: [20, 50] });
      table.push(
        [chalk.gray('ID:'), sale.id],
        [chalk.gray('Product ID:'), sale.product_id],
        [chalk.gray('Customer ID:'), sale.customer_id || chalk.dim('N/A')],
        [chalk.gray('Amount:'), chalk.green(`${sale.amount.toLocaleString()} ${sale.currency}`)],
        [chalk.gray('Status:'), sale.status === 'completed' ? chalk.green('✓ completed') : chalk.yellow(sale.status)],
        [chalk.gray('Date:'), new Date(sale.created_at).toLocaleString()]
      );

      console.log(table.toString());
      console.log('');
    } catch (error: any) {
      spinner.fail('Sale not found');
      console.log(chalk.red(error.message));
    }
  } else if (options.stats) {
    const spinner = ora('Computing sales statistics...').start();
    try {
      const response = await client.sales.list(undefined, 100);
      const sales = response.data;

      const total = sales.reduce((sum, s) => sum + s.amount, 0);
      const completed = sales.filter(s => s.status === 'completed');
      const currencies = [...new Set(sales.map(s => s.currency))];
      const avgAmount = sales.length > 0 ? total / sales.length : 0;

      spinner.succeed('Sales statistics\n');

      console.log(chalk.hex('#6366f1').bold('\n📊 SALES STATISTICS\n'));
      console.log(`  ${chalk.cyan('Total Sales:')}       ${chalk.white(sales.length)}`);
      console.log(`  ${chalk.cyan('Completed:')}         ${chalk.green(completed.length)}`);
      console.log(`  ${chalk.cyan('Pending/Other:')}     ${chalk.yellow(sales.length - completed.length)}`);
      console.log(`  ${chalk.cyan('Total Revenue:')}     ${chalk.green(total.toLocaleString())} ${currencies.join('/')}`);
      console.log(`  ${chalk.cyan('Avg Sale Value:')}    ${chalk.green(avgAmount.toFixed(2))} ${currencies[0] || ''}`);
      console.log('');
    } catch (error: any) {
      spinner.fail('Failed to load statistics');
      console.log(chalk.red(error.message));
    }
  }
}
