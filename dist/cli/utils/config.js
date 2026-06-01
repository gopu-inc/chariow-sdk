"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.setConfig = setConfig;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.chariow');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
function getConfig() {
    try {
        if (fs_1.default.existsSync(CONFIG_FILE)) {
            const content = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch (error) {
        console.error('Failed to read config');
    }
    return null;
}
function setConfig(config) {
    try {
        if (!fs_1.default.existsSync(CONFIG_DIR)) {
            fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        const existing = getConfig() || {};
        const merged = { ...existing, ...config };
        fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
    }
    catch (error) {
        console.error('Failed to write config');
    }
}
//# sourceMappingURL=config.js.map