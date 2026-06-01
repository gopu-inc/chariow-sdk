export interface ChariowConfig {
    apiKey: string;
    baseUrl?: string;
}
export declare class ChariowClient {
    apiKey: string;
    baseUrl: string;
    constructor(config: ChariowConfig);
    request<T>(path: string, options?: RequestInit): Promise<T>;
}
