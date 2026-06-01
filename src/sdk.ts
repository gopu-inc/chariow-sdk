import { ChariowClient }
from "./client"

import { ProductsAPI }
from "./modules/products"

export class Chariow {

  products: ProductsAPI

  constructor(apiKey: string) {

    const client =
      new ChariowClient({
        apiKey
      })

    this.products =
      new ProductsAPI(client)
  }
}
