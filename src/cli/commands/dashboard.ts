#!/usr/bin/env node

import chalk from 'chalk';
import readline from 'readline';
import { getConfig } from '../utils/config.js';
import { Chariow } from '../../index.js';

// Types pour WebSocket
interface WebSocketMessage {
  type: string;
  data: any;
}

// Fonctions utilitaires
function safePad(str: string, length: number): string {
  const currentLength = str.length;
  if (currentLength >= length) return str;
  return str + ' '.repeat(length - currentLength);
}

function safePadStart(str: string, length: number): string {
  const currentLength = str.length;
  if (currentLength >= length) return str;
  return ' '.repeat(length - currentLength) + str;
}

const colors = {
  primary: chalk.hex('#6366f1'),
  success: chalk.hex('#10b981'),
  warning: chalk.hex('#f59e0b'),
  error: chalk.hex('#ef4444'),
  info: chalk.hex('#3b82f6'),
  border: chalk.hex('#334155'),
  text: chalk.hex('#94a3b8'),
  accent: chalk.hex('#8b5cf6'),
  bold: chalk.bold,
  white: chalk.white,
  yellow: chalk.yellow,
  green: chalk.green,
  cyan: chalk.cyan,
  red: chalk.red,
  dim: chalk.dim,
  gray: chalk.gray
};

const icons = {
  product: '📦',
  revenue: '💰',
  sales: '🛒',
  rating: '⭐',
  config: '⚙️',
  explore: '🔍',
  refresh: '🔄',
  quit: '❌',
  enter: '↩️',
  up: '↑',
  down: '↓',
  check: '✓',
  warning: '⚠',
  error: '✗',
  loading: '⏳',
  info: 'ℹ',
  link: '🔗',
  search: '🔎',
  websocket: '🔌'
};

// Variables globales
let wsClient: any = null;
let realTimeEnabled = false;

export async function interactiveMode() {
  console.clear();
  
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  
  let products: any[] = [];
  let selectedIndex = 0;
  let loading = true;
  let error: string | null = null;
  let lastRefresh = new Date();
  
  // Initialiser WebSocket
  const initWebSocket = async (apiKey: string) => {
    if (wsClient) return;
    
    try {
      // Simulation WebSocket (remplacer par vraie connexion)
      console.log(colors.text(`\n  ${icons.websocket} Initializing real-time connection...`));
      
      // Simuler une connexion WebSocket
      realTimeEnabled = true;
      
      // Simuler des notifications périodiques
      const interval = setInterval(() => {
        if (realTimeEnabled) {
          // Simuler une nouvelle vente toutes les 30 secondes
          if (Math.random() < 0.1 && products.length > 0) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            console.log(colors.success(`\n🎉 NEW SALE! ${randomProduct.name} - ${formatPrice(randomProduct)}`));
            loadData(); // Rafraîchir les données
          }
        }
      }, 30000);
      
      wsClient = { close: () => clearInterval(interval) };
      
    } catch (err: any) {
      console.log(colors.error(`WebSocket error: ${err.message}`));
    }
  };
  
  const getPriceValue = (product: any): number => {
    if (!product.pricing) return 0;
    const price = product.pricing.current_price;
    if (!price) return 0;
    if (typeof price.value === 'number') return price.value;
    if (typeof price.amount === 'number') return price.amount;
    return 0;
  };
  
  const formatPrice = (product: any): string => {
    const price = product.pricing?.current_price;
    if (!price) return 'Free';
    if (price.formatted) return price.formatted;
    if (price.value) {
      const currency = price.currency || 'XAF';
      const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'XAF' ? 'FCFA' : currency;
      return `${symbol} ${price.value.toLocaleString()}`;
    }
    return 'Free';
  };
  
  const getSalesCount = (product: any): number => {
    if (typeof product.sales_count === 'number') return product.sales_count;
    if (typeof product.sales === 'number') return product.sales;
    return 0;
  };
  
  const getTotalRevenue = (): number => {
    return products.reduce((sum, p) => {
      const price = getPriceValue(p);
      const sales = getSalesCount(p);
      return sum + (price * sales);
    }, 0);
  };
  
  const getTotalSales = (): number => {
    return products.reduce((sum, p) => sum + getSalesCount(p), 0);
  };
  
  const getStatusIcon = (product: any): string => {
    if (product.status === 'published') return colors.success('●');
    if (product.status === 'draft') return colors.warning('○');
    return colors.text('○');
  };
  
  const truncate = (str: string, max: number): string => {
    if (!str) return '';
    if (str.length <= max) return str;
    return str.slice(0, max - 3) + '...';
  };
  
  const renderProgressBar = (value: number, max: number = 100, width: number = 20): string => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const filled = Math.round((width * percentage) / 100);
    const empty = width - filled;
    return colors.success('█'.repeat(filled)) + colors.text('░'.repeat(empty));
  };
  
  const loadData = async () => {
    loading = true;
    await renderDashboard();
    
    try {
      const config = getConfig();
      if (config?.apiKey) {
        if (!wsClient) {
          await initWebSocket(config.apiKey);
        }
        const client = new Chariow(config.apiKey);
        const response = await client.products.list({ per_page: 50 });
        products = response.data || [];
        lastRefresh = new Date();
      } else {
        error = 'No API key configured';
      }
    } catch (err: any) {
      error = err.message || 'Failed to load products';
    } finally {
      loading = false;
      await renderDashboard();
    }
  };
  
  const renderDashboard = async () => {
    console.clear();
    
    console.log(colors.primary(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                     ⚡  CHARIOW CLI  -  v2.0.0                           ║
║                     Enterprise Commerce Platform                          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
    
    // Indicateur WebSocket
    if (realTimeEnabled) {
      console.log(colors.text(`  ${icons.websocket} Real-time mode active`));
    }
    
    if (!loading && !error && products.length > 0) {
      const totalRevenue = getTotalRevenue();
      const avgRating = products.reduce((sum: number, p: any) => sum + (p.rating?.average || 0), 0) / products.length;
      const totalSales = getTotalSales();
      const publishedCount = products.filter((p: any) => p.status === 'published').length;
      
      const revenueStr = colors.success(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue));
      const productsStr = colors.info(`${products.length}`);
      const salesStr = colors.accent(`${totalSales.toLocaleString()}`);
      const publishedStr = colors.success(`${publishedCount}`);
      const draftStr = colors.warning(`${products.length - publishedCount}`);
      const ratingStr = colors.warning(`${avgRating.toFixed(1)}★`);
      
      console.log(colors.border('\n┌────────────────────────────┬────────────────────────────┐'));
      console.log(colors.border('│') + colors.bold('        STORE METRICS         ') + colors.border('│') + colors.bold('         PRODUCT STATUS        ') + colors.border('│'));
      console.log(colors.border('├────────────────────────────┼────────────────────────────┤'));
      console.log(colors.border('│') + ` ${icons.revenue} Revenue:    ` + safePadStart(revenueStr, 16) + colors.border('│') + ` ${icons.product} Published:  ` + safePadStart(publishedStr, 13) + colors.border('│'));
      console.log(colors.border('│') + ` ${icons.product} Products:   ` + safePadStart(productsStr, 16) + colors.border('│') + ` ${icons.sales} Draft:       ` + safePadStart(draftStr, 13) + colors.border('│'));
      console.log(colors.border('│') + ` ${icons.sales} Sales:      ` + safePadStart(salesStr, 16) + colors.border('│') + ` ${icons.rating} Avg Rating:  ` + safePadStart(ratingStr, 13) + colors.border('│'));
      console.log(colors.border('└────────────────────────────┴────────────────────────────┘'));
      
      const healthScore = Math.min(100, Math.max(0, (publishedCount / (products.length || 1)) * 100));
      console.log(colors.border('\n┌──────────────────────────────────────────────────────────────────┐'));
      console.log(colors.border('│') + colors.bold('  STORE HEALTH ') + renderProgressBar(healthScore, 100, 40) + colors.border(' │'));
      console.log(colors.border('│') + safePad(colors.text(`${Math.round(healthScore)}% Complete`), 66) + colors.border('│'));
      console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    } else if (loading) {
      console.log(colors.border('\n┌──────────────────────────────────────────────────────────────────┐'));
      console.log(colors.border('│') + safePad(colors.text(`${icons.loading} LOADING METRICS...`), 66) + colors.border('│'));
      console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    } else if (error) {
      console.log(colors.border('\n┌──────────────────────────────────────────────────────────────────┐'));
      console.log(colors.border('│') + safePad(colors.error(`${icons.error} ${error}`), 66) + colors.border('│'));
      console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    }
    
    console.log(colors.border('\n┌──────────────────────────────────────────────────────────────────┐'));
    const productTitle = `  ${icons.product} PRODUCTS ${!loading && !error && products.length > 0 ? `(${products.length})` : ''}`;
    console.log(colors.border('│') + colors.bold(productTitle) + safePad('', 68 - productTitle.length) + colors.border('│'));
    console.log(colors.border('├──────────────────────────────────────────────────────────────────┤'));
    
    if (!loading && !error && products.length > 0) {
      const startIdx = Math.max(0, Math.min(selectedIndex - 5, products.length - 10));
      const endIdx = Math.min(products.length, startIdx + 10);
      
      for (let i = startIdx; i < endIdx; i++) {
        const p = products[i];
        const isSelected = i === selectedIndex;
        const prefix = isSelected ? colors.accent('▶') + ' ' : '  ';
        const nameColor = isSelected ? colors.primary.bold : colors.text;
        const priceColor = isSelected ? colors.success.bold : colors.success;
        const price = formatPrice(p);
        const statusIcon = getStatusIcon(p);
        
        let nameStr = p.name || 'Unnamed Product';
        nameStr = truncate(nameStr, 32);
        const priceStr = truncate(price, 12);
        
        const line = `${prefix} ${statusIcon} ${nameColor(safePad(nameStr, 32))} ${priceColor(safePadStart(priceStr, 12))}`;
        console.log(colors.border('│') + line + safePad('', 68 - line.length) + colors.border('│'));
      }
      
      if (products.length > 10) {
        const currentPage = Math.floor(selectedIndex / 10) + 1;
        const totalPages = Math.ceil(products.length / 10);
        const pagesStr = `Page ${currentPage}/${totalPages}`;
        console.log(colors.border('├──────────────────────────────────────────────────────────────────┤'));
        console.log(colors.border('│') + colors.text(`  ${icons.up}${icons.down} ${pagesStr}`) + safePad('', 60 - pagesStr.length) + colors.border('│'));
      }
    } else if (loading) {
      console.log(colors.border('│') + safePad(colors.text(`${icons.loading} FETCHING PRODUCTS...`), 66) + colors.border('│'));
    } else if (!error) {
      console.log(colors.border('│') + safePad(colors.text(`${icons.info} NO PRODUCTS FOUND`), 66) + colors.border('│'));
      console.log(colors.border('│') + safePad(colors.text('Create your first product via API'), 66) + colors.border('│'));
    }
    
    console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    
    console.log(colors.border('\n┌──────────────────────────────────────────────────────────────────┐'));
    console.log(colors.border('│') + colors.bold('  QUICK ACTIONS') + safePad('', 64) + colors.border('│'));
    console.log(colors.border('├──────────────────────────────────────────────────────────────────┤'));
    const actionsLine = `  ${icons.up}${icons.down} Navigate    ${icons.enter} View Details    ${icons.refresh} Refresh    ${icons.config} Config    ${icons.search} Search    ${icons.quit} Quit`;
    console.log(colors.border('│') + actionsLine + safePad('', 68 - actionsLine.length) + colors.border('│'));
    console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    
    const config = getConfig();
    const statusIcon = config?.apiKey ? colors.success('●') : colors.error('○');
    const statusText = config?.apiKey ? 'CONNECTED' : 'OFFLINE';
    const wsIcon = realTimeEnabled ? colors.success('🔌') : colors.text('○');
    const timeStr = lastRefresh.toLocaleTimeString();
    
    console.log(colors.text(`\n  ${statusIcon} ${statusText}  │  ${wsIcon} Realtime: ${realTimeEnabled ? 'ON' : 'OFF'}  │  Last sync: ${timeStr}  │  Chariow CLI v2.0\n`));
  };
  
  const showProductDetails = async (product: any) => {
    process.stdin.setRawMode(false);
    console.clear();
    
    console.log(colors.primary(`
╔════════════════════════════════════════════════════════════════════════════╗
║                           ${icons.product} PRODUCT DETAILS                                 ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
    
    console.log(colors.border('┌──────────────────────────────────────────────────────────────────┐'));
    const productName = `  ${product.name || 'Unnamed Product'}`;
    console.log(colors.border('│') + colors.bold(productName) + safePad('', 68 - productName.length) + colors.border('│'));
    console.log(colors.border('├──────────────────────────────────────────────────────────────────┤'));
    console.log(colors.border('│') + `  ID:          ${colors.text(product.id || 'N/A')}` + safePad('', 50) + colors.border('│'));
    console.log(colors.border('│') + `  Status:      ${product.status === 'published' ? colors.success('● PUBLISHED') : colors.warning('○ DRAFT')}` + safePad('', 50) + colors.border('│'));
    console.log(colors.border('│') + `  Price:       ${colors.success(formatPrice(product))}` + safePad('', 50) + colors.border('│'));
    console.log(colors.border('│') + `  Sales:       ${colors.accent(getSalesCount(product).toLocaleString())}` + safePad('', 50) + colors.border('│'));
    console.log(colors.border('│') + `  Rating:      ${product.rating?.average ? colors.warning(`${product.rating.average} ★`) + colors.text(` (${product.rating.count} reviews)`) : colors.text('No ratings')}` + safePad('', 40) + colors.border('│'));
    console.log(colors.border('│') + `  Category:    ${colors.text(product.category?.label || 'Uncategorized')}` + safePad('', 50) + colors.border('│'));
    console.log(colors.border('│') + `  Type:        ${colors.text(product.type || 'N/A')}` + safePad('', 50) + colors.border('│'));
    console.log(colors.border('│') + `  Revenue:     ${colors.success(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(getPriceValue(product) * getSalesCount(product)))}` + safePad('', 50) + colors.border('│'));
    
    if (product.description) {
      const desc = truncate(product.description, 200);
      console.log(colors.border('├──────────────────────────────────────────────────────────────────┤'));
      console.log(colors.border('│') + colors.text('  DESCRIPTION:') + safePad('', 66) + colors.border('│'));
      const wrappedDesc = desc.match(/.{1,60}/g) || [];
      wrappedDesc.forEach(line => {
        console.log(colors.border('│') + `  ${colors.text(line)}` + safePad('', 68 - line.length) + colors.border('│'));
      });
    }
    
    console.log(colors.border('├──────────────────────────────────────────────────────────────────┤'));
    const productUrl = `https://app.chariow.com/products/${product.id}`;
    const urlLine = `  ${icons.link} URL: ${colors.primary(productUrl)}`;
    console.log(colors.border('│') + urlLine + safePad('', 68 - urlLine.length) + colors.border('│'));
    console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    
    console.log(colors.text('\n  Press any key to return to dashboard...\n'));
    
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.setRawMode(true);
    await renderDashboard();
  };
  
  const showConfigPanel = async () => {
    process.stdin.setRawMode(false);
    console.clear();
    
    console.log(colors.primary(`
╔════════════════════════════════════════════════════════════════════════════╗
║                           ${icons.config} CONFIGURATION                                 ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
    
    const currentConfig = getConfig();
    
    console.log(colors.border('┌──────────────────────────────────────────────────────────────────┐'));
    if (currentConfig?.apiKey) {
      const maskedKey = currentConfig.apiKey.slice(0, 8) + '••••••••' + currentConfig.apiKey.slice(-4);
      console.log(colors.border('│') + colors.success(`  ${icons.check} API Key configured`) + safePad('', 52) + colors.border('│'));
      console.log(colors.border('│') + `  ${maskedKey}` + safePad('', 68 - maskedKey.length) + colors.border('│'));
    } else {
      console.log(colors.border('│') + colors.warning(`  ${icons.warning} No API Key configured`) + safePad('', 51) + colors.border('│'));
    }
    console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    
    console.log(colors.text('\n  Commands:\n'));
    console.log(`    ${colors.accent('chariow config --set <your_api_key>')}`);
    console.log(`    ${colors.accent('chariow config --get')}`);
    console.log(`    ${colors.accent('chariow config --remove')}`);
    console.log(colors.text('\n  Get your API key from:'));
    console.log(`    ${colors.primary('https://app.chariow.com/settings/api')}\n`);
    
    console.log(colors.text('  Press any key to return to dashboard...\n'));
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.setRawMode(true);
    await renderDashboard();
  };
  
  const showExplore = async () => {
    process.stdin.setRawMode(false);
    console.clear();
    
    console.log(colors.primary(`
╔════════════════════════════════════════════════════════════════════════════╗
║                           ${icons.explore} EXPLORE MODE                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
    
    console.log(colors.border('┌──────────────────────────────────────────────────────────────────┐'));
    console.log(colors.border('│') + colors.yellow('  Coming Soon! The marketplace explorer is under development') + colors.border(' │'));
    console.log(colors.border('│') + colors.text('  Use the command line: chariow explore --search <term>') + colors.border(' │'));
    console.log(colors.border('└──────────────────────────────────────────────────────────────────┘'));
    
    console.log(colors.text('\n  Press any key to return to dashboard...\n'));
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.setRawMode(true);
    await renderDashboard();
  };
  
  const realTimeSearch = async () => {
    process.stdin.setRawMode(false);
    console.clear();
    
    console.log(colors.primary(`
╔════════════════════════════════════════════════════════════════════════════╗
║                         ${icons.search} REAL-TIME SEARCH                              ║
║                     Search products in real-time                          ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
    
    console.log(colors.dim('Features:'));
    console.log(colors.dim('  • Real-time product search'));
    console.log(colors.dim('  • Live price updates'));
    console.log(colors.dim('  • Instant results\n'));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const searchProducts = async (query: string) => {
      if (!query.trim() || query.length < 2) return;
      
      console.log(colors.cyan(`\n🔍 Searching for "${query}"...`));
      
      try {
        const config = getConfig();
        if (config?.apiKey) {
          const client = new Chariow(config.apiKey);
          const results = await client.products.search(query);
          
          if (results && results.length > 0) {
            console.log(colors.green(`\n✓ Found ${results.length} results in real-time\n`));
            results.slice(0, 10).forEach((p: any, idx: number) => {
              console.log(`  ${idx + 1}. ${colors.white(p.name)} - ${colors.green(formatPrice(p))}`);
            });
          } else {
            console.log(colors.yellow('\nNo results found. Try different keywords.\n'));
          }
        } else {
          console.log(colors.red('\n❌ API key required for search'));
        }
      } catch (err: any) {
        console.log(colors.red(`\nSearch error: ${err.message}`));
      }
    };
    
    const askQuestion = () => {
      rl.question(colors.green('\n🔎 Search: '), async (query) => {
        if (query === 'exit' || query === 'q' || query === 'quit') {
          console.log(colors.dim('\nExiting search mode...\n'));
          rl.close();
          process.stdin.setRawMode(true);
          await renderDashboard();
          return;
        }
        
        if (query.trim()) {
          await searchProducts(query);
        }
        
        askQuestion();
      });
    };
    
    askQuestion();
  };
  
  const onKeyPress = async (str: string, key: any) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      if (wsClient) wsClient.close();
      process.stdin.setRawMode(false);
      process.stdin.pause();
      console.clear();
      console.log(colors.success(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                     👋 Thank you for using Chariow CLI!                   ║
║                                                                            ║
║                         Have a great day! 🚀                               ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`));
      process.exit();
    } else if (key.name === 'up' && selectedIndex > 0) {
      selectedIndex--;
      await renderDashboard();
    } else if (key.name === 'down' && selectedIndex < products.length - 1) {
      selectedIndex++;
      await renderDashboard();
    } else if (key.name === 'r') {
      await loadData();
    } else if (key.name === 'c') {
      await showConfigPanel();
    } else if (key.name === 'e') {
      await showExplore();
    } else if (key.name === 's') {
      await realTimeSearch();
    } else if (key.name === 'return' && products[selectedIndex]) {
      await showProductDetails(products[selectedIndex]);
    }
  };
  
  process.stdin.on('keypress', onKeyPress);
  await loadData();
}
