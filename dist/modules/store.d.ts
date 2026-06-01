import { ChariowClient } from "../client.js";
import { Store } from "../types/product.js";
export declare class StoreAPI {
    client: ChariowClient;
    constructor(client: ChariowClient);
    getInfo(): Promise<Store>;
}
