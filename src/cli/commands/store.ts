import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

export async function storeCommand(options: any) {
  const config = getConfig();

  if (!config?.apiKey) {
    console.log(chalk.red('\n❌ No API key found. Run: chariow config --set <token>\n'));
    process.exit(1);
  }

  const client = new Chariow(config.apiKey);
  const spinner = ora('Fetching store information...').start();

  try {
    const store = await client.store.getInfo();
    spinner.succeed('Store information loaded\n');

    console.log(chalk.hex('#6366f1').bold('\n🏪 STORE INFORMATION\n'));

    const table = new Table({ colWidths: [22, 58] });

    table.push(
      [chalk.gray('ID:'), store.id],
      [chalk.gray('Name:'), chalk.bold(store.name)],
      [chalk.gray('Description:'), store.description ? store.description.slice(0, 100) : chalk.dim('N/A')],
      [chalk.gray('URL:'), chalk.hex('#6366f1')(store.url)],
      [chalk.gray('Status:'), store.status === 'active' ? chalk.green('✓ Active') : chalk.yellow(store.status)],
      [chalk.gray('Logo:'), store.logo_url ? chalk.dim(store.logo_url.slice(0, 55)) : chalk.dim('N/A')]
    );

    console.log(table.toString());

    if (store.social_links) {
      const socials = Object.entries(store.social_links).filter(([, v]) => v);
      if (socials.length > 0) {
        console.log(chalk.cyan('\n🌐 Social Links:\n'));
        socials.forEach(([platform, url]) => {
          console.log(`  ${chalk.bold(platform.padEnd(12))} ${chalk.dim(String(url))}`);
        });
        console.log('');
      }
    }

    if (store.appearance) {
      const a = store.appearance;
      console.log(chalk.cyan('\n🎨 Appearance:\n'));
      console.log(`  Theme:          ${chalk.white(a.theme?.label || a.theme?.value || 'N/A')}`);
      console.log(`  Primary Font:   ${chalk.white(a.font?.primary?.display_name || 'N/A')}`);
      console.log(`  Primary Color:  ${chalk.hex(a.color?.primary?.hex || '#ffffff')(a.color?.primary?.hex || 'N/A')}`);
      console.log(`  Products/Row:   ${chalk.white(a.products_per_row || 'N/A')}`);
      console.log('');
    }
  } catch (error: any) {
    spinner.fail('Failed to fetch store info');
    console.log(chalk.red(error.message));
  }
}
