import { Product } from "../types/product";
export declare class ProductModel {
    data: Product;
    constructor(data: Product);
    get id(): string;
    get name(): string;
    get description(): string;
    get thumbnail(): string | null;
    get isPublished(): boolean;
    get price(): string;
}
