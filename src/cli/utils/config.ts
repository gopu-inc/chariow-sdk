// utils/config.ts - Version améliorée
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

// Configuration validation
export function validateApiKey(key: string): boolean {
  // Vérification basique du format API key
  return key.length >= 32 && /^[a-f0-9]{32,}$/i.test(key);
}

export function getConfig(): CliConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      
      // Migration des anciennes configs
      if (!config.defaultPerPage) config.defaultPerPage = 20;
      if (!config.theme) config.theme = 'dark';
      
      return config;
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
    
    // Validation
    if (merged.apiKey && !validateApiKey(merged.apiKey)) {
      throw new Error('Invalid API key format');
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write config:', error);
    return false;
  }
}

// Configuration encryption pour stockage sécurisé
export function encryptApiKey(key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', 'chariow-secret-key');
  return cipher.update(key, 'utf8', 'hex') + cipher.final('hex');
}
