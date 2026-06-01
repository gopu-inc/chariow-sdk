import { Chariow } from '../../index.js';
import { getConfig } from '../utils/config.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

export async function productsCommand(options: any) {
  const config = getConfig();
  
  if (!config?.apiKey) {
    console.log(chalk.red('Error: No API key found. Run: chariow config --set <token>'));
    process.exit(1);
  }
  
  const client = new Chariow(config.apiKey);
  
  if (options.list) {
    const spinner = ora('Fetching products...').start();
    try {
      const response = await client.products.list({ per_page: 20 });
      spinner.succeed(`Found ${response.data.length} products\n`);
      
      const table = new Table({
        head: [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Status'), chalk.cyan('Price')],
        colWidths: [25, 40, 12, 15]
      });
      
      response.data.forEach(p => {
        table.push([
          p.id.slice(0, 20),
          p.name.slice(0, 38),
          p.status === 'published' ? chalk.green('✓ Published') : chalk.yellow('Draft'),
          p.pricing.current_price?.formatted || 'Free'
        ]);
      });
      
      console.log(table.toString());
    } catch (error: any) {
      spinner.fail('Failed to fetch products');
      console.log(chalk.red(error.message));
    }
  } else if (options.get) {
    const spinner = ora(`Fetching product ${options.get}...`).start();
    try {
      const product = await client.products.get(options.get);
      spinner.succeed();
      
      console.log('\n' + chalk.bold.cyan('Product Details:\n'));
      console.log(chalk.gray(`ID: ${product.id}`));
      console.log(chalk.gray(`Name: ${chalk.bold(product.name)}`));
      console.log(chalk.gray(`Description: ${product.description.slice(0, 200)}...`));
      console.log(chalk.gray(`Status: ${product.status === 'published' ? chalk.green('Published') : chalk.red('Draft')}`));
      console.log(chalk.gray(`Price: ${product.pricing.current_price?.formatted || 'Free'}`));
      console.log(chalk.gray(`Sales: ${product.sales_count?.toString() || '0'}`));
      console.log('');
    } catch (error: any) {
      spinner.fail('Product not found');
      console.log(chalk.red(error.message));
    }
  } else if (options.search) {
    const spinner = ora(`Searching for "${options.search}"...`).start();
    try {
      const products = await client.products.search(options.search);
      spinner.succeed(`Found ${products.length} products\n`);
      
      products.forEach(p => {
        console.log(`${chalk.green('✓')} ${p.name} - ${p.pricing.current_price?.formatted || 'Free'}`);
      });
      console.log('');
    } catch (error: any) {
      spinner.fail('Search failed');
    }
  } else {
    console.log(chalk.yellow('Usage: chariow products --list | --get <id> | --search <term> | --create'));
  }
}
