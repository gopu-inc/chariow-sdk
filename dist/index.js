"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chariow = void 0;
const client_js_1 = require("./client.js");
const products_js_1 = require("./modules/products.js");
const store_js_1 = require("./modules/store.js");
__exportStar(require("./client.js"), exports);
__exportStar(require("./errors.js"), exports);
__exportStar(require("./modules/products.js"), exports);
__exportStar(require("./modules/store.js"), exports);
__exportStar(require("./models/product.js"), exports);
__exportStar(require("./types/product.js"), exports);
__exportStar(require("./utils/cleanHtml.js"), exports);
class Chariow {
    products;
    store;
    constructor(apiKey) {
        const client = new client_js_1.ChariowClient({ apiKey });
        this.products = new products_js_1.ProductsAPI(client);
        this.store = new store_js_1.StoreAPI(client);
    }
}
exports.Chariow = Chariow;
//# sourceMappingURL=index.js.map