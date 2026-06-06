import { ChariowClient } from "./client.js";
import { ProductsAPI } from "./modules/products.js";

export class Chariow {
  products: ProductsAPI;

  constructor(apiKey: string) {
    const client = new ChariowClient({ apiKey });
    this.products = new ProductsAPI(client);
  }
}
