import { ChariowClient } from "./client.js"
import { ProductsAPI } from "./modules/products.js"
import { StoreAPI } from "./modules/store.js"
import { SalesAPI } from "./modules/sales.js"
import { MarketplaceAPI } from "./modules/marketplace.js"
import { HooksAPI } from "./modules/hooks.js"
import { DnsAPI } from "./modules/dns.js"
import { PayAPI } from "./modules/pay.js"

export * from "./client.js"
export * from "./errors.js"
export * from "./modules/products.js"
export * from "./modules/store.js"
export * from "./modules/sales.js"
export * from "./modules/marketplace.js"
export * from "./modules/hooks.js"
export * from "./modules/dns.js"
export * from "./modules/pay.js"
export * from "./modules/chariow-pay-server.js"
export * from "./models/product.js"
export * from "./types/product.js"
export * from "./utils/cleanHtml.js"

export class Chariow {
  products: ProductsAPI
  store: StoreAPI
  sales: SalesAPI
  marketplace: MarketplaceAPI
  hooks: HooksAPI
  dns: DnsAPI
  pay: PayAPI

  constructor(apiKey: string) {
    const client = new ChariowClient({ apiKey })
    this.products    = new ProductsAPI(client)
    this.store       = new StoreAPI(client)
    this.sales       = new SalesAPI(client)
    this.marketplace = new MarketplaceAPI(client)
    this.hooks       = new HooksAPI(client)
    this.dns         = new DnsAPI(client)
    this.pay         = new PayAPI(client)
  }
}
