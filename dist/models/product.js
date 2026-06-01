"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const cleanHtml_1 = require("../utils/cleanHtml");
class ProductModel {
    data;
    constructor(data) {
        this.data = data;
    }
    get id() {
        return this.data.id;
    }
    get name() {
        return this.data.name;
    }
    get description() {
        return (0, cleanHtml_1.cleanHtml)(this.data.description);
    }
    get thumbnail() {
        return this.data
            .pictures
            .thumbnail;
    }
    get isPublished() {
        return this.data.status ===
            "published";
    }
    get price() {
        return this.data
            .pricing
            ?.current_price
            ?.formatted;
    }
}
exports.ProductModel = ProductModel;
//# sourceMappingURL=product.js.map