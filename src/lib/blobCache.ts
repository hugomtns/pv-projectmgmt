/**
 * Blob URL Cache
 *
 * Caches blob URLs to avoid recreating them for the same blob IDs.
 * Automatically manages URL lifecycle and cleanup.
 */

interface CacheEntry {
  url: string;
  blobId: string;
  timestamp: number;
  refCount: number;
}

class BlobCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a blob URL from cache or create a new one
   */
  async get(blobId: string, getBlob: (id: string) => Promise<Blob | null>): Promise<string | null> {
    // Check if cached and still valid
    const cached = this.cache.get(blobId);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.maxAge) {
        // Increment reference count
        cached.refCount++;
        return cached.url;
      } else {
        // Expired, revoke and remove
        URL.revokeObjectURL(cached.url);
        this.cache.delete(blobId);
      }
    }

    // Create new blob URL
    const blob = await getBlob(blobId);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.cache.set(blobId, {
      url,
      blobId,
      timestamp: Date.now(),
      refCount: 1,
    });

    return url;
  }

  /**
   * Release a blob URL (decrement reference count)
   */
  release(blobId: string) {
    const cached = this.cache.get(blobId);
    if (!cached) return;

    cached.refCount--;

    // If no more references, schedule cleanup
    if (cached.refCount <= 0) {
      setTimeout(() => {
        const entry = this.cache.get(blobId);
        if (entry && entry.refCount <= 0) {
          URL.revokeObjectURL(entry.url);
          this.cache.delete(blobId);
        }
      }, 1000); // Wait 1 second before cleanup
    }
  }

  /**
   * Clear all cached blob URLs
   */
  clear() {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.url);
    }
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [blobId, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.maxAge && entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        this.cache.delete(blobId);
      }
    }
  }
}

// Global blob cache instance
export const blobCache = new BlobCache();

// Run cleanup every minute
setInterval(() => blobCache.cleanup(), 60 * 1000);
