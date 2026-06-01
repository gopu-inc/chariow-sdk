"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chariow = void 0;
const client_1 = require("./client");
const products_1 = require("./modules/products");
class Chariow {
    products;
    constructor(apiKey) {
        const client = new client_1.ChariowClient({
            apiKey
        });
        this.products =
            new products_1.ProductsAPI(client);
    }
}
exports.Chariow = Chariow;
//# sourceMappingURL=sdk.js.map