
# 🚀 Chariow SDK

<div align="center">

![Chariow SDK](https://img.shields.io/badge/Chariow-SDK-6366f1?style=for-the-badge&logo=typescript&logoColor=white)
![Version](https://img.shields.io/npm/v/chariow-sdk?color=6366f1&label=Version&style=flat-square)
![Coverage](https://img.shields.io/codecov/c/github/gopu-inc/chariow-sdk?style=flat-square)
![License](https://img.shields.io/npm/l/chariow-sdk?color=6366f1&style=flat-square)
![Downloads](https://img.shields.io/npm/dt/chariow-sdk?color=6366f1&style=flat-square)
![Node](https://img.shields.io/node/v/chariow-sdk?color=6366f1&style=flat-square)

**Enterprise Commerce Platform — SDK & CLI**

[Documentation](https://docs.chariow.com) · [API Reference](https://docs.chariow.com/api) · [Examples](https://github.com/gopu-inc/chariow-sdk/tree/main/examples)

</div>

---

## ✨ Features

- 🛒 **Products API** — Create, update, publish products
- 💳 **Chariow Pay** — Payments & checkout (Stripe-compatible)
- 🔌 **Webhooks** — Manage webhooks with events
- 🌐 **DNS** — Custom domains & SSL management
- 🏪 **Marketplace** — Browse stores and products
- 📊 **Sales** — Orders and revenue tracking
- 🔌 **WebSocket** — Real-time events & notifications
- 🖥️ **CLI** — Interactive terminal dashboard
- ⚡ **Func Gateway** — Stripe-compatible payment gateway
- 📦 **TypeScript** — Full type definitions included

## 📦 Installation

### NPM

```bash
npm install chariow-sdk
```

Yarn

```bash
yarn add chariow-sdk
```

Global CLI

```bash
npm install -g chariow-sdk
```

🚀 Quick Start

Node.js / TypeScript

```typescript
import { Chariow } from 'chariow-sdk';

// Initialize the SDK
const client = new Chariow('your-api-key');

// List products
const products = await client.products.list({ per_page: 10 });

// Create a product
const product = await client.products.create({
  name: 'Awesome Product',
  description: 'The best product ever',
  pricing: {
    type: 'one_time',
    current_price: {
      value: 29.99,
      currency: 'USD'
    }
  },
  status: 'published'
});

// Process a payment
const payment = await client.pay.checkout({
  items: [{ product_id: product.id, quantity: 1 }],
  customer_email: 'customer@example.com',
  currency: 'USD'
});

console.log(payment.checkout_url);
```

CLI

```bash
# Configure API key
chariow config --set your-api-key

# Interactive dashboard
chariow dashboard

# Manage products
chariow products --list
chariow products --create
chariow products --publish <id>

# Process payments
chariow pay --checkout
chariow pay --buy https://chariow.com/store/myshop/products/my-product

# Start payment gateway
chariow serve --port 4242

# Real-time WebSocket monitoring
chariow ws
```

🔧 CLI Commands

Command Description
chariow dashboard Interactive TUI dashboard
chariow config --set <key> Set API key
chariow products --list List products
chariow products --create Create product
chariow pay --checkout Interactive checkout
chariow pay --buy <id> Buy a product
chariow explore Browse marketplace
chariow hooks --list List webhooks
chariow dns --list List domains
chariow ws WebSocket monitor
chariow serve Start payment gateway
chariow func Start local gateway

📚 Modules

Products API

```typescript
import { ProductsAPI } from 'chariow-sdk/products';

const products = new ProductsAPI(client);

// List with pagination
await products.list({ per_page: 20, status: 'published' });

// Search
await products.search('awesome');

// Get by ID
await products.get('prod_abc123');

// Update
await products.update('prod_abc123', { name: 'New Name' });

// Delete
await products.delete('prod_abc123');
```

Payment API (Chariow Pay)

```typescript
import { PayAPI } from 'chariow-sdk/pay';

const pay = new PayAPI(client);

// Create checkout
const payment = await pay.checkout({
  items: [{ product_id: 'prod_abc123', quantity: 2 }],
  customer_email: 'buyer@example.com',
  customer_name: 'John Doe',
  currency: 'USD',
  payment_method: { type: 'card' },
  success_url: 'https://myshop.com/success',
  cancel_url: 'https://myshop.com/cancel'
});

// Get payment
await pay.get('pay_xyz789');

// List payments
await pay.list({ status: 'succeeded', per_page: 20 });

// Refund
await pay.refund('pay_xyz789', { reason: 'Customer request' });
```

Marketplace

```typescript
import { MarketplaceAPI } from 'chariow-sdk/marketplace';

const marketplace = new MarketplaceAPI(client);

// List stores
const stores = await marketplace.listStores({ search: 'tech' });

// Get store
const store = await marketplace.getStore('my-store');

// Get store products
const products = await marketplace.getStoreProducts('my-store');
```

Webhooks

```typescript
import { HooksAPI } from 'chariow-sdk/hooks';

const hooks = new HooksAPI(client);

// Create webhook
await hooks.create({
  url: 'https://myserver.com/webhook',
  events: ['sale.created', 'payment.succeeded'],
  secret: 'your-webhook-secret'
});

// List webhooks
await hooks.list();

// Test webhook
await hooks.test('wh_abc123', 'sale.created');

// Get deliveries
await hooks.deliveries('wh_abc123');
```

DNS / Domains

```typescript
import { DnsAPI } from 'chariow-sdk/dns';

const dns = new DnsAPI(client);

// Add domain
await dns.add({ domain: 'myshop.com' });

// List domains
await dns.list();

// Verify domain
await dns.verify('dom_abc123');

// Set default domain
await dns.setDefault('dom_abc123');
```

WebSocket

```typescript
import { ChariowWebSocket } from 'chariow-sdk/websocket';

const ws = new ChariowWebSocket('your-api-key');

// Connect
await ws.connect();

// Subscribe to events
await ws.subscribeToStore();
await ws.subscribeToProduct('prod_abc123');

// Listen for events
ws.on('new_sale', (sale) => {
  console.log(`New sale: ${sale.amount} ${sale.currency}`);
});

ws.on('product_updated', (product) => {
  console.log(`Product updated: ${product.name}`);
});

ws.on('notification', (notification) => {
  console.log(`Notification: ${notification.message}`);
});

// Search products in real-time
const results = await ws.searchProducts({
  term: 'awesome',
  minPrice: 10,
  maxPrice: 50,
  sortBy: 'rating'
});
```

🌐 Payment Gateway (Stripe-compatible)

```bash
# Start the gateway
chariow serve --port 4242

# Generate nginx config with SSL
chariow serve --ssl --domain pay.myshop.com
```

Endpoints

Method Endpoint Description
POST /v1/payment_intents Create payment intent
GET /v1/payment_intents/:id Get payment intent
POST /v1/payment_intents/:id/confirm Confirm payment
POST /v1/payment_intents/:id/cancel Cancel payment
POST /v1/charges Create charge
GET /v1/charges List charges
POST /v1/refunds Create refund
POST /v1/customers Create customer
GET /v1/balance Get balance
GET /v1/products List products

Example with curl

```bash
# Create payment intent
curl -X POST http://localhost:4242/v1/payment_intents \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "usd",
    "customer_email": "user@example.com",
    "items": [{"product_id": "prod_abc123", "quantity": 1}]
  }'

# Process charge
curl -X POST http://localhost:4242/v1/charges \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2999,
    "currency": "usd",
    "product_id": "prod_abc123",
    "customer_email": "buyer@example.com"
  }'
```

🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

📊 Test Results

```bash
✅ 141 tests passed
✅ 31 test suites
⏱️  3.63 seconds
```

🛠️ Development

```bash
# Clone repository
git clone git@github.com:gopu-inc/chariow-sdk.git
cd chariow-sdk

# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Type check
npm run type-check

# Link locally
npm run link:local
```

📖 Examples

Check out the examples directory for complete usage examples:

· Basic Product Management
· Payment Processing
· Webhook Setup
· Marketplace Integration
· WebSocket Monitoring
· Full E-commerce Flow

🤝 Contributing

We welcome contributions! Please see our Contributing Guide.

1. Fork the repository
2. Create your feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

📝 License

This project is licensed under the MIT License — see the LICENSE file for details.

🙏 Acknowledgments

· Built with TypeScript
· Powered by Chariow Platform
· CLI with Commander.js
· TUI with Chalk + Inquirer

📫 Contact & Support

· Documentation: docs.chariow.com
· API Reference: docs.chariow.com/api
· Issues: GitHub Issues
· Discord: Chariow Community
· Twitter: @Chariow

---

<div align="center">

Built with ❤️ by the Chariow Team

⭐ Star us on GitHub — it helps!

</div>
