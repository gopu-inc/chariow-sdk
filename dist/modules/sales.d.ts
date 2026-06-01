import { ChariowClient } from "../client.js";
export interface Sale {
    id: string;
    product_id: string;
    customer_id?: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
}
export interface SalesResponse {
    data: Sale[];
    pagination: {
        next_cursor: string | null;
        has_more: boolean;
    };
}
export declare class SalesAPI {
    client: ChariowClient;
    constructor(client: ChariowClient);
    list(cursor?: string, per_page?: number): Promise<SalesResponse>;
    get(id: string): Promise<Sale>;
}
