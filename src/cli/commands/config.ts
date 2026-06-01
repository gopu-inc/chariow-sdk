import { setConfig, getConfig } from '../utils/config';
import chalk from 'chalk';

export async function configCommand(options: any) {
  if (options.set) {
    setConfig({ apiKey: options.set });
    console.log(chalk.green('✓ API key saved successfully'));
  } else if (options.get) {
    const config = getConfig();
    if (config?.apiKey) {
      console.log(chalk.green(`API Key: ${config.apiKey}`));
    } else {
      console.log(chalk.yellow('No API key configured. Run: chariow config --set <token>'));
    }
  } else if (options.remove) {
    setConfig({ apiKey: undefined });
    console.log(chalk.green('✓ API key removed'));
  } else {
    console.log(chalk.yellow('Usage: chariow config --set <token> | --get | --remove'));
  }
}
