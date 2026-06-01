import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.chariow');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  apiKey?: string;
  defaultPerPage?: number;
  theme?: 'dark' | 'light';
}

export function getConfig(): CliConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to read config');
  }
  return null;
}

export function setConfig(config: Partial<CliConfig>) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    const existing = getConfig() || {};
    const merged = { ...existing, ...config };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  } catch (error) {
    console.error('Failed to write config');
  }
}
