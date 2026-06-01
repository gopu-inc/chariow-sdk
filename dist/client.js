"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChariowClient = void 0;
const errors_js_1 = require("./errors.js");
class ChariowClient {
    apiKey;
    baseUrl;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || "https://api.chariow.com/v1";
    }
    async request(path, options = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
        let data;
        try {
            data = await response.json();
        }
        catch {
            data = null;
        }
        if (!response.ok) {
            throw new errors_js_1.ChariowError(data?.message || "Chariow API Error", response.status, data);
        }
        // Si la réponse a une structure { message, data, errors }, extraire data
        if (data && typeof data === 'object' && 'data' in data) {
            return data.data;
        }
        return data;
    }
}
exports.ChariowClient = ChariowClient;
//# sourceMappingURL=client.js.map