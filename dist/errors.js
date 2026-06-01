"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChariowError = void 0;
class ChariowError extends Error {
    status;
    data;
    constructor(message, status, data) {
        super(message);
        this.name = "ChariowError";
        this.status = status;
        this.data = data;
    }
}
exports.ChariowError = ChariowError;
//# sourceMappingURL=errors.js.map