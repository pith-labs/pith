export declare class PithEngine {
    private static readonly INTENT_TAGS;
    private static readonly ABBREV;
    private static readonly QUERY_THRESHOLD;
    private static readonly COMPRESS_THRESHOLD;
    private static readonly ADJECTIVE_SUFFIX;
    private static readonly VERB_ENDING;
    optimize(text: string): {
        output: string;
        noiseRemoved: number;
        isQuery: boolean;
    };
    compressCode(code: string): string;
    private isQuery;
    private buildFreqMap;
    private scoreWord;
    private compressPipeline;
    private queryPipeline;
    private preserveLayer;
    private patternLayer;
    private scoreFilterLines;
    private abbreviate;
    private restoreAndClean;
    private isHeader;
    private fuseProperNouns;
}
