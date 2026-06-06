import WebSocket from 'ws';
import EventEmitter from 'events';

export interface WebSocketMessage {
  type: 'search' | 'product_update' | 'stats' | 'realtime_sales' | 'notification';
  data: any;
  timestamp: string;
}

export interface SearchQuery {
  term: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'sales';
  limit?: number;
}

export class ChariowWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private apiKey: string;
  private isConnecting = false;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        this.once('connected', resolve);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const wsUrl = `wss://api.chariow.com/v1/ws?apiKey=${this.apiKey}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('🔌 WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('disconnected');
        this.reconnect();
      });
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'search':
        this.emit('search_results', message.data);
        break;
      case 'product_update':
        this.emit('product_updated', message.data);
        break;
      case 'stats':
        this.emit('stats_update', message.data);
        break;
      case 'realtime_sales':
        this.emit('new_sale', message.data);
        break;
      case 'notification':
        this.emit('notification', message.data);
        break;
      default:
        this.emit('message', message);
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  async searchProducts(query: SearchQuery): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const searchId = Date.now().toString();
      
      const timeout = setTimeout(() => {
        this.off(`search_${searchId}`, handler);
        reject(new Error('Search timeout'));
      }, 30000);

      const handler = (results: any) => {
        clearTimeout(timeout);
        resolve(results);
      };

      this.once(`search_${searchId}`, handler);
      
      this.ws?.send(JSON.stringify({
        type: 'search',
        id: searchId,
        query
      }));
    });
  }

  async subscribeToProduct(productId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    this.ws?.send(JSON.stringify({
      type: 'subscribe',
      resource: 'product',
      id: productId
    }));
  }

  async subscribeToStore(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    this.ws?.send(JSON.stringify({
      type: 'subscribe',
      resource: 'store'
    }));
  }

  async unsubscribe(productId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        resource: 'product',
        id: productId
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
