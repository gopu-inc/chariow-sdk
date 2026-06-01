"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanHtml = cleanHtml;
function cleanHtml(html) {
    return html
        // Supprime scripts/styles
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        // Remplace certains tags par sauts
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<\/h\d>/gi, "\n")
        // Supprime le reste HTML
        .replace(/<[^>]+>/g, "")
        // Decode HTML entities
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        // Supprime markdown code blocks
        .replace(/```[\s\S]*?```/g, "")
        // Nettoyage espaces
        .replace(/\n\s*\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .trim();
}
//# sourceMappingURL=cleanHtml.js.map