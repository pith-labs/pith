/**
 * SmartDiff uses a simple hash and diffing mechanism to only send
 * newly added/modified code instead of the entire file layout, saving tokens.
 */
export class SmartDiff {
  private static async getHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public static async process(filename: string, code: string): Promise<string> {
    if (typeof chrome === 'undefined' || !chrome.storage) return code;
    
    const hash = await this.getHash(code);
    const storageKey = `lens_cache_${filename}`;
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        const cached = result[storageKey];
        
        // If exact same file, no need to send again
        if (cached && cached.hash === hash) {
           return resolve(`[C:File ${filename} unchanged]`);
        }

        // Extremely simple line-by-line diffing for prototype
        if (cached && cached.code) {
          const oldLines = cached.code.split('\n');
          const newLines = code.split('\n');
          
          const diff: string[] = [];
          for (let i = 0; i < newLines.length; i++) {
             if (newLines[i] !== oldLines[i]) {
                diff.push(`L${i+1}: ${newLines[i]}`);
             }
          }
          
          // Save new cache
          chrome.storage.local.set({ [storageKey]: { hash, code } });
          
          // Return diff if it's actually smaller
          const diffStr = diff.join('\n');
          if (diffStr.length < code.length) {
             return resolve(`[C:File ${filename} cache hit. Changes:\n${diffStr}\n]`);
          }
        }
        
        // First time or completely new
        chrome.storage.local.set({ [storageKey]: { hash, code } });
        resolve(code);
      });
    });
  }
}
