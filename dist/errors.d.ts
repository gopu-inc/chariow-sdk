export declare class ChariowError extends Error {
    status?: number;
    data?: unknown;
    constructor(message: string, status?: number, data?: unknown);
}
