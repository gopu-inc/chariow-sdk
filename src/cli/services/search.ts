import { ChariowWebSocket, SearchQuery } from './websocket.js';
import chalk from 'chalk';
import Table from 'cli-table3';

export interface SearchResult {
  id: string;
  name: string;
  price: string;
  rating: number;
  sales: number;
  seller: string;
  thumbnail?: string;
}

export class SearchService {
  private ws: ChariowWebSocket;
  private searchHistory: string[] = [];
  private currentResults: SearchResult[] = [];

  constructor(apiKey: string) {
    this.ws = new ChariowWebSocket(apiKey);
    this.setupListeners();
  }

  private setupListeners() {
    this.ws.on('search_results', (results) => {
      this.currentResults = results;
    });

    this.ws.on('new_sale', (sale) => {
      console.log(chalk.green(`\n🎉 New sale! ${sale.product_name} - ${sale.amount}`));
    });

    this.ws.on('notification', (notification) => {
      console.log(chalk.blue(`\n📢 ${notification.title}: ${notification.message}`));
    });
  }

  async connect(): Promise<void> {
    await this.ws.connect();
    await this.ws.subscribeToStore();
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    // Ajouter à l'historique
    if (query.term && !this.searchHistory.includes(query.term)) {
      this.searchHistory.unshift(query.term);
      if (this.searchHistory.length > 10) {
        this.searchHistory.pop();
      }
    }

    console.log(chalk.cyan(`\n🔍 Searching for "${query.term}"...`));
    
    const startTime = Date.now();
    const results = await this.ws.searchProducts(query);
    const duration = Date.now() - startTime;

    console.log(chalk.dim(`Found ${results.length} results in ${duration}ms\n`));

    if (results.length > 0) {
      this.displayResults(results, query);
    } else {
      console.log(chalk.yellow('No results found. Try different keywords.\n'));
    }

    return results;
  }

  private displayResults(results: SearchResult[], query: SearchQuery) {
    const table = new Table({
      head: [
        chalk.cyan('#'),
        chalk.cyan('Product'),
        chalk.cyan('Price'),
        chalk.cyan('Rating'),
        chalk.cyan('Sales'),
        chalk.cyan('Seller')
      ],
      colWidths: [5, 35, 12, 10, 10, 20],
      style: { head: [], border: [] }
    });

    results.slice(0, 20).forEach((result, index) => {
      table.push([
        `${index + 1}`,
        result.name.slice(0, 33),
        chalk.green(result.price),
        result.rating > 0 ? chalk.yellow(`${result.rating}★`) : 'N/A',
        result.sales.toLocaleString(),
        result.seller.slice(0, 18)
      ]);
    });

    console.log(table.toString());
    console.log(chalk.dim(`\nShowing ${Math.min(results.length, 20)} of ${results.length} results\n`));
  }

  async searchStreaming(term: string, onProgress: (partial: SearchResult[]) => void): Promise<SearchResult[]> {
    console.log(chalk.cyan(`\n🔍 Streaming search for "${term}"...\n`));
    
    // Simuler des résultats progressifs (à remplacer par l'API réelle)
    const allResults: SearchResult[] = [];
    
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const partialResults = this.generateMockResults(term, i + 1);
      allResults.push(...partialResults);
      onProgress(allResults);
    }
    
    return allResults;
  }

  private generateMockResults(term: string, page: number): SearchResult[] {
    const products = [
      { name: `${term} Pro Suite`, price: 299, rating: 4.8, sales: 1234, seller: 'TechCorp' },
      { name: `${term} Basic`, price: 49, rating: 4.5, sales: 5678, seller: 'StartupInc' },
      { name: `${term} Enterprise`, price: 999, rating: 4.9, sales: 890, seller: 'BigTech' }
    ];
    
    return products.map(p => ({
      id: `${page}-${Date.now()}`,
      name: p.name,
      price: `$${p.price}`,
      rating: p.rating,
      sales: p.sales / page,
      seller: p.seller
    }));
  }

  getSearchHistory(): string[] {
    return this.searchHistory;
  }

  async suggest(partial: string): Promise<string[]> {
    const suggestions = this.searchHistory.filter(h => 
      h.toLowerCase().includes(partial.toLowerCase())
    );
    
    if (suggestions.length === 0 && partial.length > 2) {
      // Simuler des suggestions
      return [`${partial} pro`, `${partial} premium`, `${partial} basic`];
    }
    
    return suggestions;
  }

  disconnect() {
    this.ws.disconnect();
  }
}
