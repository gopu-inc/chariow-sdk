import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const CONFIG_DIR = path.join(os.homedir(), '.chariow');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  apiKey?: string;
  defaultPerPage?: number;
  theme?: 'dark' | 'light';
  notifications?: boolean;
  autoRefresh?: number;
  lastCheck?: string;
}

export function validateApiKey(key: string): boolean {
  return typeof key === 'string' && key.trim().length >= 8;
}

export function getConfig(): CliConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      if (!config.defaultPerPage) config.defaultPerPage = 20;
      if (!config.theme) config.theme = 'dark';
      return config;
    }
  } catch {
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
    if (merged.apiKey !== undefined && merged.apiKey !== null && !validateApiKey(merged.apiKey)) {
      throw new Error('Invalid API key format (minimum 8 characters)');
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write config:', error);
    return false;
  }
}

export function encryptApiKey(key: string): string {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = crypto.scryptSync('chariow-secret-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  const encrypted = cipher.update(key, 'utf8', 'hex') + cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const keyBuffer = crypto.scryptSync('chariow-secret-key', 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
