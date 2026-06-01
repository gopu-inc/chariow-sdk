"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = configCommand;
const config_1 = require("../utils/config");
const chalk_1 = __importDefault(require("chalk"));
async function configCommand(options) {
    if (options.set) {
        (0, config_1.setConfig)({ apiKey: options.set });
        console.log(chalk_1.default.green('✓ API key saved successfully'));
    }
    else if (options.get) {
        const config = (0, config_1.getConfig)();
        if (config?.apiKey) {
            console.log(chalk_1.default.green(`API Key: ${config.apiKey}`));
        }
        else {
            console.log(chalk_1.default.yellow('No API key configured. Run: chariow config --set <token>'));
        }
    }
    else if (options.remove) {
        (0, config_1.setConfig)({ apiKey: undefined });
        console.log(chalk_1.default.green('✓ API key removed'));
    }
    else {
        console.log(chalk_1.default.yellow('Usage: chariow config --set <token> | --get | --remove'));
    }
}
//# sourceMappingURL=config.js.map