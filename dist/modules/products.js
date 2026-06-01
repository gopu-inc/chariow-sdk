"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsAPI = void 0;
class ProductsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async list(query = {}) {
        const params = new URLSearchParams();
        if (query.per_page) {
            params.append("per_page", String(query.per_page));
        }
        if (query.cursor) {
            params.append("cursor", query.cursor);
        }
        if (query.status) {
            params.append("status", query.status);
        }
        const qs = params.toString();
        const response = await this.client.request(`/products${qs ? `?${qs}` : ""}`);
        // Si la réponse est déjà un tableau (pour l'explore mode public)
        if (Array.isArray(response)) {
            return {
                data: response,
                pagination: {
                    count: response.length,
                    path: "",
                    per_page: response.length,
                    next_cursor: null,
                    next_page_url: null,
                    prev_cursor: null,
                    prev_page_url: null,
                    has_more_pages: false,
                    has_pages: false
                }
            };
        }
        return response;
    }
    async get(id) {
        return this.client.request(`/products/${id}`);
    }
    async create(body) {
        return this.client.request("/products", {
            method: "POST",
            body: JSON.stringify(body)
        });
    }
    async update(id, body) {
        return this.client.request(`/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
    }
    async search(name) {
        const products = await this.list();
        return products.data.filter(p => p.name.toLowerCase().includes(name.toLowerCase()));
    }
    async delete(id) {
        return this.client.request(`/products/${id}`, {
            method: "DELETE"
        });
    }
}
exports.ProductsAPI = ProductsAPI;
//# sourceMappingURL=products.js.map