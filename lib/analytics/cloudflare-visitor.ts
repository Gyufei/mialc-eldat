import CryptoJS from 'crypto-js';

import { getCloudflareData } from './cloudflare-cache';

interface CloudflareVisitorInfo {
  visitorId: string;
  headers: Record<string, string>;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  asn?: string;
  isp?: string;
}

/**
 * Cloudflare visitor identification and information gathering
 * Collects Cloudflare-specific data for enhanced user tracking
 */
export class CloudflareVisitorDetector {
  private static instance: CloudflareVisitorDetector;
  private cachedVisitorInfo: CloudflareVisitorInfo | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): CloudflareVisitorDetector {
    if (!CloudflareVisitorDetector.instance) {
      CloudflareVisitorDetector.instance = new CloudflareVisitorDetector();
    }
    return CloudflareVisitorDetector.instance;
  }

  /**
   * Get Cloudflare headers with unified caching
   */
  private async getCFHeaders(): Promise<Record<string, string>> {
    try {
      const data = await getCloudflareData();
      return data.headers || data.cfHeaders || {};
    } catch (error) {
      console.warn('Failed to fetch Cloudflare headers:', error);
      return {};
    }
  }

  /**
   * Extract visitor ID from Cloudflare cookie
   */
  private getCFVisitorCookie(): string | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === '__cflb' || name === '__cfuvid' || name === 'cf_clearance') {
          return value;
        }
      }
    } catch (error) {
      console.warn('Failed to get Cloudflare visitor cookie:', error);
    }
    return null;
  }

  /**
   * Generate fallback visitor ID if Cloudflare data is not available
   * Uses stable browser characteristics to ensure consistent ID for the same user
   */
  private generateFallbackCFVisitorId(): string {
    // Collect stable browser characteristics that don't change between sessions
    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || '',
    };

    const hash = CryptoJS.SHA256(JSON.stringify(data)).toString();
    return `cf_base_${hash.substring(0, 16)}`;
  }

  /**
   * Get comprehensive Cloudflare visitor information
   */
  public async getCloudflareVisitorInfo(): Promise<CloudflareVisitorInfo> {
    // Return cached result if still valid
    if (this.cachedVisitorInfo && Date.now() < this.cacheExpiry) {
      return this.cachedVisitorInfo;
    }

    try {
      let visitorId: string;
      let headers: Record<string, string> = {};
      // Get Cloudflare headers (works in all environments)
      headers = await this.getCFHeaders();

      // Try to get visitor ID from various sources in priority order
      const cookieId = this.getCFVisitorCookie();
      const rayId = headers['cf-ray'];
      const connectingIp = headers['cf-connecting-ip'];

      if (cookieId) {
        visitorId = cookieId;
      } else if (rayId) {
        visitorId = rayId;
      } else if (connectingIp) {
        // For IP addresses, hash for privacy reasons
        visitorId = `cf_ip_${CryptoJS.MD5(connectingIp).toString()}`;
      } else {
        visitorId = this.generateFallbackCFVisitorId();
      }

      // Get additional geolocation info if available
      let timezone: string | undefined;
      let asn: string | undefined;
      let isp: string | undefined;

      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (_error) {
        // Ignore
      }

      const result: CloudflareVisitorInfo = {
        visitorId,
        headers,
        country: headers['cf-ipcountry'],
        region: headers['cf-region'],
        city: headers['cf-city'],
        timezone,
        asn,
        isp,
      };

      // Cache the result
      this.cachedVisitorInfo = result;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return result;
    } catch (error) {
      console.warn('Failed to get Cloudflare visitor info:', error);

      // Return fallback info
      const fallbackResult: CloudflareVisitorInfo = {
        visitorId: this.generateFallbackCFVisitorId(),
        headers: {},
      };

      return fallbackResult;
    }
  }

  /**
   * Get just the Cloudflare visitor ID
   */
  public async getCloudflareVisitorId(): Promise<string> {
    const info = await this.getCloudflareVisitorInfo();
    return info.visitorId;
  }

  /**
   * Clear cached visitor information and headers cache
   */
  public clearCache(): void {
    this.cachedVisitorInfo = null;
    this.cacheExpiry = 0;
  }
}

// Export convenience functions
export const getCloudflareVisitorInfo = async (): Promise<CloudflareVisitorInfo> => {
  const detector = CloudflareVisitorDetector.getInstance();
  return detector.getCloudflareVisitorInfo();
};

export const getCloudflareVisitorId = async (): Promise<string> => {
  const detector = CloudflareVisitorDetector.getInstance();
  return detector.getCloudflareVisitorId();
};
