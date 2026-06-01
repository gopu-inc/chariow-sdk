import { ChariowClient } from "../client.js";
import { Product, ProductsResponse, ProductQuery } from "../types/product.js";
export declare class ProductsAPI {
    client: ChariowClient;
    constructor(client: ChariowClient);
    list(query?: ProductQuery): Promise<ProductsResponse>;
    get(id: string): Promise<Product>;
    create(body: unknown): Promise<Product>;
    update(id: string, body: unknown): Promise<Product>;
    search(name: string): Promise<Product[]>;
    delete(id: string): Promise<void>;
}
