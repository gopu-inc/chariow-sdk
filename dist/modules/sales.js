"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesAPI = void 0;
class SalesAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async list(cursor, per_page = 20) {
        const params = new URLSearchParams();
        params.append("per_page", String(per_page));
        if (cursor)
            params.append("cursor", cursor);
        return this.client.request(`/sales?${params.toString()}`);
    }
    async get(id) {
        return this.client.request(`/sales/${id}`);
    }
}
exports.SalesAPI = SalesAPI;
//# sourceMappingURL=sales.js.map