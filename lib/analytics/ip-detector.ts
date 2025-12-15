import { clearCloudflareCache, getCloudflareData } from './cloudflare-cache';

interface IPInfo {
  ip: string;
  type: 'public' | 'private' | 'unknown';
  source: 'webrtc' | 'api' | 'header' | 'stun';
}

interface VPNDetectionResult {
  isVPN: boolean;
  confidence: number;
  indicators: string[];
  realIP?: string;
  vpnIP?: string;
}

interface ComprehensiveIPInfo {
  publicIP: string;
  privateIPs: string[];
  realIP?: string;
  vpnDetection: VPNDetectionResult;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  isp?: string;
  timestamp: number;
  cloudflareInfo?: {
    clientIP?: string;
    realIP?: string;
    country?: string;
  };
}

/**
 * Advanced IP detection and VPN identification utility
 * Uses multiple techniques including WebRTC, STUN servers, and API calls
 */
interface IPApiResponse {
  ip?: string;
  country_name?: string;
  region?: string;
  city?: string;
  timezone?: string;
  org?: string;
  asn?: string;
}

interface CachedIPApiResponse {
  data: IPApiResponse;
  timestamp: number;
}

export class IPDetector {
  private static instance: IPDetector;
  private cachedIPInfo: ComprehensiveIPInfo | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache for IP API responses
  private ipApiCache: Map<string, CachedIPApiResponse> = new Map();
  private readonly IP_API_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Rate limiting for API calls
  private lastApiCall: number = 0;
  private readonly MIN_API_INTERVAL = 1000; // 1 second between API calls
  private pendingApiCalls: Map<string, Promise<IPApiResponse>> = new Map();

  // STUN servers for WebRTC IP detection
  private readonly stunServers = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
    'stun:stun.cloudflare.com:3478',
    'stun:stun.nextcloud.com:443',
  ];

  // Backup APIs for geolocation and ISP info
  private readonly backupApis = [
    {
      url: (ip: string) => `https://ipapi.co/${ip}/json/`,
      parser: (data: Record<string, unknown>): IPApiResponse => ({
        ip: data.ip as string,
        country_name: data.country_name as string,
        region: data.region as string,
        city: data.city as string,
        timezone: data.timezone as string,
        org: data.org as string,
        asn: data.asn as string,
      }),
    },
    {
      url: (ip: string) => `http://ip-api.com/json/${ip}`,
      parser: (data: Record<string, unknown>): IPApiResponse => ({
        ip: data.query as string,
        country_name: data.country as string,
        region: data.regionName as string,
        city: data.city as string,
        timezone: data.timezone as string,
        org: data.isp as string,
        asn: data.as as string,
      }),
    },
    {
      url: (ip: string) => `https://ipinfo.io/${ip}/json`,
      parser: (data: Record<string, unknown>): IPApiResponse => ({
        ip: data.ip as string,
        country_name: data.country as string,
        region: data.region as string,
        city: data.city as string,
        timezone: data.timezone as string,
        org: data.org as string,
        asn: data.asn as string,
      }),
    },
  ];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): IPDetector {
    if (!IPDetector.instance) {
      IPDetector.instance = new IPDetector();
    }
    return IPDetector.instance;
  }

  /**
   * Get all available IP addresses using WebRTC
   */
  private async getWebRTCIPs(): Promise<IPInfo[]> {
    return new Promise((resolve) => {
      const ips: IPInfo[] = [];
      const seenIPs = new Set<string>();

      try {
        const rtcConfig = {
          iceServers: this.stunServers.map((url) => ({ urls: url })),
          iceCandidatePoolSize: 10,
        };

        const pc = new RTCPeerConnection(rtcConfig);

        const handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);

            if (ipMatch) {
              const ip = ipMatch[1];
              if (!seenIPs.has(ip)) {
                seenIPs.add(ip);
                ips.push({
                  ip,
                  type: this.getIPType(ip),
                  source: 'webrtc',
                });
              }
            }
          }
        };

        pc.onicecandidate = handleIceCandidate;

        // Create data channel to trigger ICE gathering
        pc.createDataChannel('ip-detection');

        // Create offer to start ICE gathering
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .catch(() => {
            // Ignore errors, just resolve with what we have
          });

        // Set timeout to resolve after reasonable time
        const timeout = setTimeout(() => {
          pc.close();
          resolve(ips);
        }, 3000);

        // Also resolve when ICE gathering is complete
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            pc.close();
            resolve(ips);
          }
        };
      } catch (error) {
        console.warn('WebRTC IP detection failed:', error);
        resolve(ips);
      }
    });
  }

  /**
   * Determine IP address type
   */
  private getIPType(ip: string): 'public' | 'private' | 'unknown' {
    // Check if it's IPv6
    if (ip.includes(':')) {
      return this.getIPv6Type(ip);
    }

    // IPv4 logic
    const parts = ip.split('.').map(Number);

    if (parts.length !== 4 || parts.some((part) => isNaN(part) || part < 0 || part > 255)) {
      return 'unknown';
    }

    // Private IP ranges
    if (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) || // Link-local
      parts[0] === 127 // Loopback
    ) {
      return 'private';
    }

    return 'public';
  }

  /**
   * Determine IPv6 address type
   */
  private getIPv6Type(ip: string): 'public' | 'private' | 'unknown' {
    try {
      // Remove zone identifier if present (e.g., %eth0)
      const cleanIP = ip.split('%')[0];

      // Normalize IPv6 address
      const normalizedIP = cleanIP.toLowerCase();

      // Private/Special IPv6 ranges
      if (
        normalizedIP.startsWith('::1') || // Loopback
        normalizedIP.startsWith('::') || // Unspecified
        normalizedIP.startsWith('fe80:') || // Link-local
        normalizedIP.startsWith('fc00:') || // Unique local
        normalizedIP.startsWith('fd00:') || // Unique local
        normalizedIP.startsWith('ff00:') // Multicast
      ) {
        return 'private';
      }

      // Check for IPv4-mapped IPv6 addresses
      if (normalizedIP.includes('::ffff:')) {
        const ipv4Part = normalizedIP.split('::ffff:')[1];
        if (ipv4Part) {
          // Convert hex to decimal if needed
          const ipv4 = ipv4Part.includes('.') ? ipv4Part : this.hexToIPv4(ipv4Part);
          return this.getIPType(ipv4);
        }
      }

      return 'public';
    } catch (error) {
      console.warn('Failed to parse IPv6 address:', ip, error);
      return 'unknown';
    }
  }

  /**
   * Convert hex representation to IPv4 format
   */
  private hexToIPv4(hex: string): string {
    try {
      const num = parseInt(hex, 16);
      return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
    } catch (_error) {
      return '';
    }
  }

  /**
   * Get Cloudflare IP information from /api/cf-headers with caching
   */
  private async getCloudflareIPInfo(): Promise<{
    clientIP?: string;
    realIP?: string;
    country?: string;
  }> {
    try {
      const data = await getCloudflareData();
      return {
        clientIP: data.clientIP,
        realIP: data.realIP,
        country: data.country,
      };
    } catch (error) {
      console.warn('Failed to get Cloudflare IP info:', error);
      return {};
    }
  }

  /**
   * Get public IP from external API
   */
  private async getPublicIPFromAPI(): Promise<string | null> {
    const apis = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip',
      'https://api.my-ip.io/ip.json',
    ];

    for (const api of apis) {
      try {
        const response = await fetch(api, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();

          // Different APIs return IP in different formats
          const ip = data.ip || data.origin || data.query || null;
          if (ip && typeof ip === 'string') {
            return ip.trim();
          }
        }
      } catch (error) {
        console.warn(`Failed to get IP from ${api}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Get IP API data with caching, rate limiting, and backup APIs
   */
  private async getIPApiData(ip: string): Promise<IPApiResponse> {
    // Check cache first
    const cached = this.ipApiCache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.IP_API_CACHE_DURATION) {
      return cached.data;
    }

    // Check if there's already a pending request for this IP
    const pendingRequest = this.pendingApiCalls.get(ip);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request with rate limiting
    const requestPromise = this.makeIPApiRequest(ip);
    this.pendingApiCalls.set(ip, requestPromise);

    try {
      const result = await requestPromise;

      // Cache the result
      this.ipApiCache.set(ip, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } finally {
      // Clean up pending request
      this.pendingApiCalls.delete(ip);
    }
  }

  /**
   * Make IP API request with rate limiting and backup APIs
   */
  private async makeIPApiRequest(ip: string): Promise<IPApiResponse> {
    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.MIN_API_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_API_INTERVAL - timeSinceLastCall),
      );
    }
    this.lastApiCall = Date.now();

    // Try each backup API in order
    for (const api of this.backupApis) {
      try {
        const response = await fetch(api.url(ip), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          return api.parser(data);
        } else if (response.status === 429) {
          console.warn(`Rate limited by ${api.url(ip)}, trying next API...`);
          continue;
        }
      } catch (error) {
        console.warn(`Failed to get IP info from ${api.url(ip)}:`, error);
        continue;
      }
    }

    // Return empty response if all APIs fail
    console.warn(`All IP APIs failed for ${ip}`);
    return {};
  }

  /**
   * Get detailed IP information including geolocation
   */
  private async getDetailedIPInfo(ip: string): Promise<Partial<ComprehensiveIPInfo>> {
    try {
      const data = await this.getIPApiData(ip);
      return {
        geolocation: {
          country: data.country_name,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
        },
        isp: data.org,
      };
    } catch (error) {
      console.warn('Failed to get detailed IP info:', error);
      return {};
    }
  }

  /**
   * Detect VPN usage using multiple indicators
   */
  private async detectVPN(publicIP: string, privateIPs: string[]): Promise<VPNDetectionResult> {
    const indicators: string[] = [];
    let confidence = 0;

    try {
      // Get all public IPs (from WebRTC and API)
      const publicIPs = privateIPs.filter((ip) => this.getIPType(ip) === 'public');

      // Initialize realIP and vpnIP
      let realIP: string | undefined;
      let vpnIP: string | undefined;

      // Check for multiple public IPs (common with VPN leak)
      if (publicIPs.length > 1) {
        indicators.push('multiple_public_ips');
        confidence += 30;

        // When multiple public IPs exist, the API IP is likely the VPN IP
        // and WebRTC leaked IPs are likely the real IP
        vpnIP = publicIP;
        realIP = publicIPs.find((ip) => ip !== publicIP);
        indicators.push('webrtc_leak_detected');
        confidence += 20;
      } else if (publicIPs.length === 1 && publicIPs[0] !== publicIP) {
        // WebRTC found a different public IP than API
        // This suggests VPN with IP leak
        indicators.push('ip_mismatch');
        confidence += 25;
        vpnIP = publicIP;
        realIP = publicIPs[0];
      }

      // Check for suspicious IP ranges or known VPN providers
      const vpnIndicators = await this.checkVPNIndicators(publicIP);
      indicators.push(...vpnIndicators.indicators);
      confidence += vpnIndicators.confidence;

      // Check for WebRTC leak protection (common VPN feature)
      if (privateIPs.length === 0) {
        indicators.push('webrtc_blocked');
        confidence += 20;
      }

      // Check for inconsistent geolocation
      const geoCheck = await this.checkGeolocationConsistency(publicIP);
      if (geoCheck.suspicious) {
        indicators.push('geo_inconsistency');
        confidence += geoCheck.confidence;
      }

      // If VPN detected but no IPs determined yet, use publicIP as vpnIP
      const isVPN = confidence >= 50;
      if (isVPN && !vpnIP) {
        vpnIP = publicIP;
      }

      // If not VPN or VPN without leak, realIP should be the publicIP
      if (!isVPN) {
        realIP = publicIP;
        vpnIP = undefined;
      }

      return {
        isVPN,
        confidence: Math.min(confidence, 100),
        indicators,
        realIP,
        vpnIP,
      };
    } catch (error) {
      console.warn('VPN detection failed:', error);
      return {
        isVPN: false,
        confidence: 0,
        indicators: ['detection_failed'],
        realIP: publicIP, // Fallback to publicIP
      };
    }
  }

  /**
   * Check for known VPN indicators
   */
  private async checkVPNIndicators(
    ip: string,
  ): Promise<{ indicators: string[]; confidence: number }> {
    const indicators: string[] = [];
    let confidence = 0;

    try {
      const data = await this.getIPApiData(ip);

      // Check ISP/Organization for VPN keywords
      const org = (data.org || '').toLowerCase();
      const vpnKeywords = [
        'vpn',
        'proxy',
        'hosting',
        'datacenter',
        'cloud',
        'server',
        'digital ocean',
        'amazon',
        'google cloud',
        'microsoft',
        'linode',
        'vultr',
        'ovh',
        'hetzner',
      ];

      for (const keyword of vpnKeywords) {
        if (org.includes(keyword)) {
          indicators.push(`suspicious_org_${keyword.replace(' ', '_')}`);
          confidence += 15;
          break;
        }
      }

      // Check for suspicious ASN
      if (data.asn && typeof data.asn === 'string') {
        const asn = data.asn.toLowerCase();
        if (asn.includes('hosting') || asn.includes('datacenter')) {
          indicators.push('suspicious_asn');
          confidence += 10;
        }
      }
    } catch (_error) {
      // Ignore API errors
    }

    return { indicators, confidence };
  }

  /**
   * Check for geolocation inconsistencies
   */
  private async checkGeolocationConsistency(
    ip: string,
  ): Promise<{ suspicious: boolean; confidence: number }> {
    try {
      // Get timezone from browser
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Get timezone from IP geolocation
      const data = await this.getIPApiData(ip);
      const ipTimezone = data.timezone;

      if (browserTimezone && ipTimezone && browserTimezone !== ipTimezone) {
        // Check if timezones are in different regions
        const browserRegion = browserTimezone.split('/')[0];
        const ipRegion = ipTimezone.split('/')[0];

        if (browserRegion !== ipRegion) {
          return { suspicious: true, confidence: 25 };
        }
      }
    } catch (_error) {
      // Ignore errors
    }

    return { suspicious: false, confidence: 0 };
  }

  /**
   * Get comprehensive IP information
   */
  public async getComprehensiveIPInfo(): Promise<ComprehensiveIPInfo> {
    // Return cached result if still valid
    if (this.cachedIPInfo && Date.now() < this.cacheExpiry) {
      return this.cachedIPInfo;
    }

    try {
      // First, try to get Cloudflare IP info (most reliable)
      const cfInfo = await this.getCloudflareIPInfo();

      // Get IPs from WebRTC
      const webrtcIPs = await this.getWebRTCIPs();

      // Get public IP from API only if Cloudflare IP is not available or is localhost
      let apiPublicIP: string | null = null;
      if (!cfInfo.clientIP || cfInfo.clientIP === '::1' || cfInfo.clientIP === '127.0.0.1') {
        apiPublicIP = await this.getPublicIPFromAPI();
      }

      // Combine and deduplicate IPs
      const allIPs = [...webrtcIPs];

      // Add Cloudflare client IP if available and not localhost
      if (cfInfo.clientIP && cfInfo.clientIP !== '::1' && cfInfo.clientIP !== '127.0.0.1') {
        const exists = allIPs.some((ipInfo) => ipInfo.ip === cfInfo.clientIP);
        if (!exists) {
          allIPs.push({
            ip: cfInfo.clientIP,
            type: this.getIPType(cfInfo.clientIP),
            source: 'header',
          });
        }
      }

      // Add API IP as fallback
      if (apiPublicIP) {
        const exists = allIPs.some((ipInfo) => ipInfo.ip === apiPublicIP);
        if (!exists) {
          allIPs.push({
            ip: apiPublicIP,
            type: this.getIPType(apiPublicIP),
            source: 'api',
          });
        }
      }

      // Separate public and private IPs
      const publicIPs = allIPs.filter((ipInfo) => ipInfo.type === 'public');
      const privateIPs = allIPs
        .filter((ipInfo) => ipInfo.type === 'private')
        .map((ipInfo) => ipInfo.ip);

      // Use the most reliable public IP (prioritize Cloudflare, exclude localhost)
      const validCloudflareIP =
        cfInfo.clientIP && cfInfo.clientIP !== '::1' && cfInfo.clientIP !== '127.0.0.1'
          ? cfInfo.clientIP
          : null;
      const primaryPublicIP =
        validCloudflareIP || apiPublicIP || (publicIPs.length > 0 ? publicIPs[0].ip : '');

      // Detect VPN
      const vpnDetection = await this.detectVPN(primaryPublicIP, [
        ...privateIPs,
        ...publicIPs.map((ip) => ip.ip),
      ]);

      // Get detailed info
      const detailedInfo = primaryPublicIP ? await this.getDetailedIPInfo(primaryPublicIP) : {};

      const result: ComprehensiveIPInfo = {
        publicIP: primaryPublicIP,
        privateIPs,
        realIP: vpnDetection.realIP || cfInfo.realIP,
        vpnDetection,
        geolocation: {
          ...detailedInfo.geolocation,
          // Prioritize Cloudflare country info
          country: cfInfo.country || detailedInfo.geolocation?.country,
        },
        isp: detailedInfo.isp,
        timestamp: Date.now(),
        cloudflareInfo: validCloudflareIP
          ? {
              clientIP: cfInfo.clientIP,
              realIP: cfInfo.realIP,
              country: cfInfo.country,
            }
          : undefined,
      };

      // Cache the result
      this.cachedIPInfo = result;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return result;
    } catch (error) {
      console.warn('Failed to get comprehensive IP info:', error);

      // Return minimal fallback info
      return {
        publicIP: '',
        privateIPs: [],
        vpnDetection: {
          isVPN: false,
          confidence: 0,
          indicators: ['detection_failed'],
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Clear cached IP information
   */
  public clearCache(): void {
    this.cachedIPInfo = null;
    this.cacheExpiry = 0;
    this.ipApiCache.clear();
    this.pendingApiCalls.clear();
    // Clear Cloudflare cache using unified cache
    clearCloudflareCache();
  }

  /**
   * Clear only Cloudflare cache
   */
  public static clearCloudflareCache(): void {
    clearCloudflareCache();
  }

  /**
   * Get simple public IP (for quick access)
   */
  public async getPublicIP(): Promise<string> {
    const info = await this.getComprehensiveIPInfo();
    return info.publicIP;
  }

  /**
   * Check if user is likely using VPN
   */
  public async isUsingVPN(): Promise<boolean> {
    const info = await this.getComprehensiveIPInfo();
    return info.vpnDetection.isVPN;
  }
}

// Export convenience functions
export const getComprehensiveIPInfo = async (): Promise<ComprehensiveIPInfo> => {
  const detector = IPDetector.getInstance();
  return detector.getComprehensiveIPInfo();
};

export const getPublicIP = async (): Promise<string> => {
  const detector = IPDetector.getInstance();
  return detector.getPublicIP();
};

export const isUsingVPN = async (): Promise<boolean> => {
  const detector = IPDetector.getInstance();
  return detector.isUsingVPN();
};

export const clearIPCache = (): void => {
  const detector = IPDetector.getInstance();
  detector.clearCache();
};
