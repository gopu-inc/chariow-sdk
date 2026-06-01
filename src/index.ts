import { ChariowClient } from "./client.js"
import { ProductsAPI } from "./modules/products.js"
import { StoreAPI } from "./modules/store.js"

export * from "./client.js"
export * from "./errors.js"
export * from "./modules/products.js"
export * from "./modules/store.js"
export * from "./models/product.js"
export * from "./types/product.js"
export * from "./utils/cleanHtml.js"

export class Chariow {
  products: ProductsAPI
  store: StoreAPI

  constructor(apiKey: string) {
    const client = new ChariowClient({ apiKey })
    this.products = new ProductsAPI(client)
    this.store = new StoreAPI(client)
  }
}
