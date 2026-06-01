import { ChariowClient } from "../client.js"
import { Store } from "../types/product.js"

export class StoreAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async getInfo(): Promise<Store> {
    return this.client.request<Store>("/store")
  }
}
