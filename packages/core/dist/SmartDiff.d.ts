/**
 * SmartDiff uses a simple hash and diffing mechanism to only send
 * newly added/modified code instead of the entire file layout, saving tokens.
 */
export declare class SmartDiff {
    private static getHash;
    static process(filename: string, code: string): Promise<string>;
}
