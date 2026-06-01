"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripHtml = stripHtml;
function stripHtml(html) {
    return html
        .replace(/<[^>]*>/g, "")
        .trim();
}
//# sourceMappingURL=html.js.map