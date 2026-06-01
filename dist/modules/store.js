"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreAPI = void 0;
class StoreAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getInfo() {
        return this.client.request("/store");
    }
}
exports.StoreAPI = StoreAPI;
//# sourceMappingURL=store.js.map