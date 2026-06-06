import { Product } from "../types/product.js";
import { cleanHtml } from "../utils/cleanHtml.js";

export class ProductModel {
  constructor(public data: Product) {}

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.name;
  }

  get description() {
    return cleanHtml(this.data.description);
  }

  get thumbnail() {
    return this.data.pictures.thumbnail;
  }

  get isPublished() {
    return this.data.status === "published";
  }

  get price() {
    return this.data.pricing?.current_price?.formatted;
  }
}
