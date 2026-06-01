export interface ProductPicture {
    thumbnail: string | null;
    cover: string | null;
}
export interface ProductCategory {
    value: string;
    label: string;
}
export interface ProductPrice {
    value: number;
    formatted: string;
    short: string;
    currency: string;
}
export interface ProductPricing {
    type: string;
    current_price: ProductPrice;
    price: ProductPrice;
    sale_price: ProductPrice | null;
    min_price: ProductPrice;
    suggested_price: ProductPrice;
    price_off: string | null;
}
export interface ProductRating {
    average: number;
    count: number;
}
export interface ProductSettings {
    is_requires_shipping_address: boolean;
}
export interface ProductQuantityRemaining {
    value: number;
    percent: string;
}
export interface ProductQuantity {
    value: number;
    remaining: ProductQuantityRemaining;
    sold: ProductQuantityRemaining;
    total: number;
}
export interface ProductSEO {
    title: string;
    description: string;
    keywords: string[];
}
export interface ProductCTA {
    value: string | null;
    label: string | null;
}
export interface BundleValue {
    value: number;
    formatted: string;
    short: string;
    currency: string;
}
export interface BundleSavings {
    amount: BundleValue;
    percentage: string;
}
export interface ProductBundle {
    value: BundleValue;
    savings: BundleSavings;
}
export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    type: string;
    category: ProductCategory;
    status: string;
    is_free: boolean;
    pictures: ProductPicture;
    pricing: ProductPricing;
    quantity: ProductQuantity | null;
    settings: ProductSettings;
    rating: ProductRating;
    on_sale_until: string | null;
    sales_count: number | null;
    seo: ProductSEO | null;
    custom_cta_text: ProductCTA;
    fields: unknown[] | null;
    bundle: ProductBundle | null;
}
export interface StoreSocialLinks {
    telegram: string | null;
    instagram: string | null;
    facebook: string | null;
    x: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    discord: string | null;
}
export interface StoreAppearance {
    theme: {
        value: string;
        label: string;
    };
    font: {
        primary: {
            value: string;
            display_name: string;
            category: string;
            url: string;
        };
        secondary: {
            value: string;
            display_name: string;
            category: string;
            url: string;
        };
    };
    border_style: {
        value: string;
        label: string;
    };
    product_order: {
        value: string;
        label: string;
    };
    color: {
        primary: {
            hex: string;
            rgb: string;
        };
        contrast: {
            hex: string;
            rgb: string;
        };
    };
    show_featured_products: boolean;
    show_purchase_button_on_product_card: boolean;
    show_recommended_products: boolean;
    products_per_row: number;
    cta_animation_type: {
        value: string;
        label: string;
    };
}
export interface Store {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    url: string;
    social_links: StoreSocialLinks;
    status: string;
    appearance: StoreAppearance | null;
}
export interface ApiResponse<T> {
    message: string;
    data: T;
    errors: string[];
}
export interface ProductsResponse {
    data: Product[];
    pagination: Pagination;
}
export interface Pagination {
    count: number;
    path: string;
    per_page: number;
    next_cursor: string | null;
    next_page_url: string | null;
    prev_cursor: string | null;
    prev_page_url: string | null;
    has_more_pages: boolean;
    has_pages: boolean;
}
export interface ProductQuery {
    per_page?: number;
    cursor?: string;
    status?: string;
}
