import { ChariowClient } from "./client.js"
import { ProductsAPI } from "./modules/products.js"
import { StoreAPI } from "./modules/store.js"
import { SalesAPI } from "./modules/sales.js"
import { MarketplaceAPI } from "./modules/marketplace.js"

export * from "./client.js"
export * from "./errors.js"
export * from "./modules/products.js"
export * from "./modules/store.js"
export * from "./modules/sales.js"
export * from "./modules/marketplace.js"
export * from "./models/product.js"
export * from "./types/product.js"
export * from "./utils/cleanHtml.js"

export class Chariow {
  products: ProductsAPI
  store: StoreAPI
  sales: SalesAPI
  marketplace: MarketplaceAPI

  constructor(apiKey: string) {
    const client = new ChariowClient({ apiKey })
    this.products = new ProductsAPI(client)
    this.store = new StoreAPI(client)
    this.sales = new SalesAPI(client)
    this.marketplace = new MarketplaceAPI(client)
  }
}
