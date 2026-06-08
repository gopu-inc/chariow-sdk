
# Chariow SDK & CLI

<div align="center">

![Chariow Banner](https://chariow.com)

**Official Node.js & TypeScript SDK for the Chariow API**

Build powerful e-commerce applications with Chariow using a modern, fully typed SDK and a powerful CLI tool.


[![npm version](https://badge.fury.io/js/chariow-sdk.svg?icon=si%3Anpm)](https://badge.fury.io/js/chariow-sdk)
[![npm version](https://badge.fury.io/js/typescript.svg)](https://badge.fury.io/js/typescript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ✨ Features

### SDK Features
- 🚀 **Full TypeScript support** with complete type definitions
- 📦 **Modern ESM compatible** module
- 🔌 **Simple API client** with intuitive methods
- 🛍️ **Complete Products API** (list, get, create, update, delete, search)
- 🧹 **HTML cleaning utilities** for product descriptions
- 🎨 **Product models** with convenient getters
- ⚡ **Lightweight and fast** with zero unnecessary dependencies
- 🌐 **Works with Node.js 18+**, Bun, and Deno

### CLI Features
- 🎯 **Interactive TUI mode** like GitHub Copilot CLI
- 🔐 **Multiple authentication methods** (browser, token, guest)
- 🔍 **Explore millions of products** on Chariow marketplace
- 📊 **Store analytics and statistics**
- 🛒 **Product management** (create, edit, delete, list)
- 🎨 **Beautiful terminal UI** with colors and tables
- 🌐 **Open products directly in browser**
- ⚙️ **Persistent configuration** stored locally

---

## 📦 Installation

### Install as SDK (for developers)

```bash
npm install chariow-sdk
```

Install CLI globally

```bash
npm install -g chariow-sdk
```

Use with npx (no installation required)

```bash
npx chariow --help
```

---

🚀 Quick Start

SDK Usage

```typescript
import { Chariow } from 'chariow-sdk';

// Initialize the client
const api = new Chariow(process.env.CHARIOW_API_KEY!);

// List products
const products = await api.products.list();
console.log(products.data);

// Get single product
const product = await api.products.get('prd_xxx');
console.log(product.name, product.price);

// Create a product
const newProduct = await api.products.create({
  name: 'My Awesome Product',
  description: 'This is a great product...',
  pricing: {
    type: 'one_time',
    current_price: {
      amount: 2999, // $29.99
      currency: 'USD'
    }
  },
  status: 'published'
});

// Search products
const results = await api.products.search('awesome');
console.log(results);

// Update product
await api.products.update('prd_xxx', {
  name: 'Updated Name'
});

// Delete product
await api.products.delete('prd_xxx');
```

CLI Usage

```bash
# Interactive mode (like Copilot CLI)
chariow
# or
chariow interactive

# Configure your API key
chariow config --set "sk_your_api_key_here"
chariow config --get

# Manage products
chariow products --list
chariow products --get prd_xxx
chariow products --search "phone"
chariow products --create

# Explore marketplace
chariow explore --search "AI"
chariow explore --top
chariow explore --category "Development"
```

---

🔐 Authentication

Get your API key

1. Sign up at Chariow
2. Go to Dashboard → Settings → API Keys
3. Generate a new API key
4. Copy your key (starts with sk_)

Configure CLI

```bash
# Set your API key
chariow config --set "sk_xxxxx"

# View current config
chariow config --get

# Remove config
chariow config --remove
```

Use in code

```typescript
// Environment variable
const api = new Chariow(process.env.CHARIOW_API_KEY!);

// Direct string
const api = new Chariow('sk_xxxxx');
```

---

📚 API Reference

Products API

list(query?: ProductQuery): Promise<ProductsResponse>

List all products with pagination.

```typescript
const response = await api.products.list({
  per_page: 20,
  cursor: 'next_cursor',
  status: 'published'
});

console.log(response.data); // Array of products
console.log(response.pagination); // Pagination info
```

get(id: string): Promise<Product>

Get a single product by ID.

```typescript
const product = await api.products.get('prd_xxx');
console.log(product.name, product.price);
```

create(body: unknown): Promise<Product>

Create a new product.

```typescript
const product = await api.products.create({
  name: 'Product Name',
  description: 'Description...',
  pricing: {
    type: 'one_time',
    current_price: { amount: 1999, currency: 'USD' }
  },
  status: 'published'
});
```

update(id: string, body: unknown): Promise<Product>

Update an existing product.

```typescript
const updated = await api.products.update('prd_xxx', {
  name: 'New Name',
  status: 'draft'
});
```

delete(id: string): Promise<void>

Delete a product.

```typescript
await api.products.delete('prd_xxx');
```

search(name: string): Promise<Product[]>

Search products by name (client-side filtering).

```typescript
const results = await api.products.search('phone');
results.forEach(p => console.log(p.name));
```

Product Model

The SDK provides a convenient ProductModel class with getters:

```typescript
import { ProductModel } from 'chariow-sdk';

const product = await api.products.get('prd_xxx');
const model = new ProductModel(product);

console.log(model.id);
console.log(model.name);
console.log(model.description); // Cleaned HTML
console.log(model.thumbnail);
console.log(model.price); // Formatted price
console.log(model.isPublished); // boolean
```

Utilities

cleanHtml(html: string): string

Clean HTML content by removing scripts, styles, and formatting.

```typescript
import { cleanHtml } from 'chariow-sdk';

const cleaned = cleanHtml('<p>Hello <strong>World</strong></p>');
console.log(cleaned); // "Hello World"
```

---

🎮 CLI Commands

Interactive Mode

```bash
chariow
```

Opens an interactive TUI with the following options:

· 🔐 Login / Configure Account
· 📦 List My Products
· ✨ Create Product
· 🔍 Search My Products
· 🔎 Explore Marketplace
· 📊 View Product Stats
· 🛒 Manage Orders
· 🏪 Store Analytics
· ⚙️ Configuration

Explore Marketplace

```bash
# Interactive exploration
chariow explore

# Search products
chariow explore --search "AI coding"

# View top rated products
chariow explore --top

# Browse by category
chariow explore --category "Development"
```

Product Management

```bash
# List products
chariow products --list

# Get product details
chariow products --get prd_xxx

# Search products
chariow products --search "phone"

# Create product (interactive)
chariow products --create

# Delete product
chariow products --delete prd_xxx
```

Configuration

```bash
# Set API key
chariow config --set "sk_xxxxx"

# Get current API key
chariow config --get

# Remove configuration
chariow config --remove
```

---

🛠️ Development

Prerequisites

· Node.js 18+
· TypeScript 5+
· npm or yarn

Setup

```bash
# Clone the repository
git clone https://github.com/gopu-inc/chariow-sdk.git
cd chariow-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Link globally for testing
npm link
```

Project Structure

```
chariow-sdk/
├── src/
│   ├── cli/           # CLI commands and UI
│   │   ├── commands/  # Individual commands
│   │   ├── utils/     # CLI utilities
│   │   └── index.ts   # CLI entry point
│   ├── models/        # Data models
│   ├── modules/       # API modules
│   ├── types/         # TypeScript interfaces
│   ├── utils/         # Helper functions
│   ├── client.ts      # HTTP client
│   ├── errors.ts      # Error classes
│   ├── index.ts       # SDK entry point
│   └── sdk.ts         # Main SDK class
├── dist/              # Compiled output
├── test/              # Test files
├── package.json
├── tsconfig.json
└── README.md
```

Testing

```bash
# Run test file
npm run test

# Or with tsx directly
tsx test2.ts
```

---

📊 TypeScript Support

All APIs are fully typed. Here are the main types:

```typescript
interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  type: string;
  status: string;
  is_free: boolean;
  quantity: number | null;
  category: ProductCategory;
  pictures: ProductPicture;
  pricing: ProductPricing;
  settings: ProductSettings;
  rating: ProductRating;
  sales_count: ProductSalesCount;
  custom_cta_text: ProductCTA;
}

interface ProductPricing {
  type: string;
  current_price?: ProductPrice;
  price?: ProductPrice;
  effective?: ProductPrice;
  sale_price?: ProductPrice;
}

interface ProductPrice {
  amount: number;
  currency: string;
  formatted: string;
}

interface Pagination {
  count: number;
  per_page: number;
  next_cursor: string | null;
  has_more_pages: boolean;
}
```

---

🔧 Error Handling

```typescript
import { ChariowError } from 'chariow-sdk';

try {
  const products = await api.products.list();
} catch (error) {
  if (error instanceof ChariowError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Data:', error.data);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

🌟 Examples

Express.js Integration

```typescript
import express from 'express';
import { Chariow } from 'chariow-sdk';

const app = express();
const api = new Chariow(process.env.CHARIOW_API_KEY!);

app.get('/api/products', async (req, res) => {
  try {
    const products = await api.products.list();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

Next.js API Route

```typescript
// pages/api/products.ts
import { Chariow } from 'chariow-sdk';

export default async function handler(req, res) {
  const api = new Chariow(process.env.CHARIOW_API_KEY!);
  
  if (req.method === 'GET') {
    const products = await api.products.list();
    res.status(200).json(products);
  }
}
```

CLI Script

```bash
#!/bin/bash
# Get product stats
chariow products --list | grep "Published" | wc -l
```

---

🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing)
5. Open a Pull Request

Development Guidelines

· Write TypeScript with strict mode enabled
· Add tests for new features
· Update documentation
· Follow existing code style

---

📝 Changelog

v2.1.3 (Latest)

· ✅ Initial SDK release
· ✅ Products API (list, get, create, update, delete, search)
· ✅ CLI with interactive mode
· ✅ Explore marketplace feature
· ✅ HTML cleaning utilities
· ✅ Product models with getters
· ✅ Authentication via API key
· ✅ Browser-based login

Coming Soon

· ⏳ Orders API
· ⏳ Customers API
· ⏳ Checkout API
· ⏳ Webhooks support
· ⏳ Store analytics
· ⏳ Real-time updates
· ⏳ WebSocket support

---

📄 License

MIT © 2026 Chariow - gopu inc

---

🔗 Links

· Website
· API Reference
· Documentation
· GitHub Repository
· npm Package
· Issue Tracker

---

💬 Support

· Documentation: soon comming
· Discord: soon comming
· Twitter: soon comming
· Email: ceoseshell@gmail.com

---

<div align="center">

Built with ❤️ by the CMO Team - gopu inc

⭐ Star us on GitHub if you find this useful!

</div>

