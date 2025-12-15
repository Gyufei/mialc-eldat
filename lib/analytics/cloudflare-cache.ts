/**
 * Unified Cloudflare API cache utility
 * Provides centralized caching for /api/cf-headers requests across the application
 */

export interface CloudflareAPIResponse {
  clientIP?: string;
  realIP?: string;
  country?: string;
  cfHeaders?: Record<string, string>;
  headers?: Record<string, string>;
}

interface CacheEntry {
  data: CloudflareAPIResponse;
  timestamp: number;
}

export class CloudflareCache {
  private static cache: CacheEntry | null = null;
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private static readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private static pendingRequest: Promise<CloudflareAPIResponse> | null = null;

  /**
   * Get Cloudflare data with caching
   * @param forceRefresh - Force refresh the cache
   * @returns Promise<CloudflareAPIResponse>
   */
  public static async getCloudflareData(forceRefresh = false): Promise<CloudflareAPIResponse> {
    // Check if we have valid cached data and not forcing refresh
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      return this.cache.data;
    }

    // If there's already a pending request, wait for it
    if (this.pendingRequest) {
      try {
        return await this.pendingRequest;
      } catch (_error) {
        // If pending request fails, continue to make a new one
        this.pendingRequest = null;
      }
    }

    // Make a new request
    this.pendingRequest = this.fetchCloudflareData();

    try {
      const data = await this.pendingRequest;

      // Cache the successful result
      this.cache = {
        data,
        timestamp: Date.now(),
      };

      return data;
    } catch (error) {
      console.warn('Failed to fetch Cloudflare data:', error);

      // If we have expired cache data, return it as fallback
      if (this.cache) {
        console.info('Using expired cache data as fallback');
        return this.cache.data;
      }

      // Return empty data if no cache available
      return {};
    } finally {
      this.pendingRequest = null;
    }
  }

  /**
   * Check if current cache is valid (not expired)
   */
  private static isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp < this.CACHE_DURATION;
  }

  /**
   * Fetch data from /api/cf-headers
   */
  private static async fetchCloudflareData(): Promise<CloudflareAPIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch('/api/cf-headers', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as CloudflareAPIResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  public static clearCache(): void {
    this.cache = null;
    this.pendingRequest = null;
  }

  /**
   * Get cache status information
   */
  public static getCacheStatus(): {
    hasCache: boolean;
    isValid: boolean;
    age: number;
    expiresIn: number;
  } {
    const hasCache = !!this.cache;
    const isValid = this.isCacheValid();
    const age = hasCache ? Date.now() - this.cache!.timestamp : 0;
    const expiresIn = hasCache ? Math.max(0, this.CACHE_DURATION - age) : 0;

    return {
      hasCache,
      isValid,
      age,
      expiresIn,
    };
  }

  /**
   * Get cached data without making a request (returns null if no valid cache)
   */
  public static getCachedData(): CloudflareAPIResponse | null {
    if (this.cache && this.isCacheValid()) {
      return this.cache.data;
    }
    return null;
  }
}

// Convenience functions for easy import
export const getCloudflareData = (forceRefresh = false) =>
  CloudflareCache.getCloudflareData(forceRefresh);

export const clearCloudflareCache = () => CloudflareCache.clearCache();

export const getCloudflareDataCached = () => CloudflareCache.getCachedData();

export const getCloudflareCacheStatus = () => CloudflareCache.getCacheStatus();
