export interface CliConfig {
    apiKey?: string;
    defaultPerPage?: number;
    theme?: 'dark' | 'light';
}
export declare function getConfig(): CliConfig | null;
export declare function setConfig(config: Partial<CliConfig>): void;
