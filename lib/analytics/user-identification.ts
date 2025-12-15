import CryptoJS from 'crypto-js';

import { getCloudflareData } from './cloudflare-cache';
import { getCloudflareVisitorInfo } from './cloudflare-visitor';
import { DeviceSignatureGenerator } from './device-signature';
import { IPDetector } from './ip-detector';

export interface UserIdentificationData {
  // Wallet information
  walletAddress?: string;
  walletType?: string;

  // Browser fingerprint
  browserFingerprint: string;

  // IP information
  vpnIP?: string;
  realIP?: string;
  webrtcIPs?: string[];

  // Cloudflare information
  cloudflareVisitorId: string;
  cfConnectingIP?: string;
  cfCountry?: string;
  cfRay?: string;

  // Browser information
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  platform: string;

  // Session information
  sessionId: string;
  timestamp: number;

  // Additional metadata
  referrer?: string;
  pageUrl?: string;

  // Geolocation (if available)
  country?: string;
  region?: string;
  city?: string;

  // Device information
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Network information
  connectionType?: string;
  isVPN?: boolean;
  isTor?: boolean;
  isProxy?: boolean;

  // Performance metrics
  collectDuration?: number;
  errors?: string[];
}

export interface UserIdentificationOptions {
  includeWallet?: boolean;
  includeFingerprint?: boolean;
  includeIP?: boolean;
  includeCloudflare?: boolean;
  timeout?: number;
  enableCache?: boolean;
  cacheExpiry?: number;
}

/**
 * Comprehensive user identification system
 * Collects browser fingerprint, IP information, Cloudflare data, and wallet information
 */
export class UserIdentificationCollector {
  private static instance: UserIdentificationCollector;
  private deviceSignatureGenerator: DeviceSignatureGenerator;
  private ipDetector: IPDetector;
  private cachedData: UserIdentificationData | null = null;
  private cacheExpiry: number = 0;
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.deviceSignatureGenerator = DeviceSignatureGenerator.getInstance();
    this.ipDetector = IPDetector.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UserIdentificationCollector {
    if (!UserIdentificationCollector.instance) {
      UserIdentificationCollector.instance = new UserIdentificationCollector();
    }
    return UserIdentificationCollector.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const userAgent = navigator.userAgent;
    const combined = `${timestamp}_${random}_${userAgent}`;
    const hash = CryptoJS.SHA256(combined).toString();
    return `sess_${hash.substring(0, 24)}`;
  }

  /**
   * Detect device type
   */
  private detectDeviceType(): { isMobile: boolean; isTablet: boolean; isDesktop: boolean } {
    const userAgent = navigator.userAgent.toLowerCase();

    const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    return { isMobile, isTablet, isDesktop };
  }

  /**
   * Get browser information
   */
  private getBrowserInfo() {
    const screen = window.screen;
    const deviceType = this.detectDeviceType();

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      platform: navigator.platform,
      referrer: document.referrer,
      pageUrl: window.location.href,
      ...deviceType,
    };
  }

  /**
   * Get network connection information
   */
  private getConnectionInfo(): { connectionType?: string } {
    try {
      type NetworkInformationLike = { effectiveType?: string; type?: string } | undefined;
      type NavigatorWithConn = Navigator & {
        connection?: NetworkInformationLike;
        mozConnection?: NetworkInformationLike;
        webkitConnection?: NetworkInformationLike;
      };
      const nav = navigator as NavigatorWithConn;
      const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

      if (connection) {
        return {
          connectionType: connection.effectiveType || connection.type || 'unknown',
        };
      }
    } catch (error) {
      console.warn('Failed to get connection info:', error);
    }

    return {};
  }

  /**
   * Collect comprehensive user identification data
   */
  public async collectUserIdentification(
    options: UserIdentificationOptions = {},
  ): Promise<UserIdentificationData> {
    const startTime = Date.now();
    const errors: string[] = [];

    const {
      includeWallet = true,
      includeFingerprint = true,
      includeIP = true,
      includeCloudflare = true,
      timeout = 15000,
      enableCache = true,
      cacheExpiry = this.DEFAULT_CACHE_DURATION,
    } = options;

    // Return cached data if available and not expired
    if (enableCache && this.cachedData && Date.now() < this.cacheExpiry) {
      return this.cachedData;
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection timeout')), timeout);
      });

      // Collect data with timeout
      const dataPromise = this.collectDataInternal({
        includeWallet,
        includeFingerprint,
        includeIP,
        includeCloudflare,
        errors,
      });

      const result = await Promise.race([dataPromise, timeoutPromise]);

      // Calculate collection duration
      const collectDuration = Date.now() - startTime;
      result.collectDuration = collectDuration;
      result.errors = errors.length > 0 ? errors : undefined;

      // Cache the result
      if (enableCache) {
        this.cachedData = result;
        this.cacheExpiry = Date.now() + cacheExpiry;
      }

      return result;
    } catch (error) {
      console.error('Failed to collect user identification:', error);
      errors.push(`Collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Return minimal fallback data
      const browserInfo = this.getBrowserInfo();
      const sessionId = this.generateSessionId();

      return {
        sessionId,
        browserFingerprint: 'fallback_' + CryptoJS.MD5(JSON.stringify(browserInfo)).toString(),
        cloudflareVisitorId: 'fallback_' + CryptoJS.MD5(sessionId).toString(),
        timestamp: Date.now(),
        collectDuration: Date.now() - startTime,
        errors,
        ...browserInfo,
      };
    }
  }

  /**
   * Internal data collection method
   */
  private async collectDataInternal(options: {
    includeWallet: boolean;
    includeFingerprint: boolean;
    includeIP: boolean;
    includeCloudflare: boolean;
    errors: string[];
  }): Promise<UserIdentificationData> {
    const { includeWallet, includeFingerprint, includeIP, includeCloudflare, errors } = options;

    // Get basic browser information
    const browserInfo = this.getBrowserInfo();
    const connectionInfo = this.getConnectionInfo();
    const sessionId = this.generateSessionId();

    // Collect data in parallel
    const promises: Promise<unknown>[] = [];

    // Browser fingerprint
    let fingerprintPromise: Promise<string> | null = null;
    if (includeFingerprint) {
      fingerprintPromise = this.deviceSignatureGenerator
        .generateDeviceSignature()
        .catch((error: Error) => {
          errors.push(`Fingerprint error: ${error.message}`);
          return 'fingerprint_error_' + CryptoJS.MD5(sessionId).toString();
        });
      promises.push(fingerprintPromise);
    }

    // IP detection
    let ipPromise: Promise<unknown> | null = null;
    if (includeIP) {
      ipPromise = this.ipDetector.getComprehensiveIPInfo().catch((error: Error) => {
        errors.push(`IP detection error: ${error.message}`);
        return {
          publicIP: 'unknown',
          privateIPs: [],
          vpnDetection: { isVPN: false, confidence: 0, indicators: [] },
          timestamp: Date.now(),
        };
      });
      promises.push(ipPromise);
    }

    // Cloudflare information
    let cloudflarePromise: Promise<unknown> | null = null;
    if (includeCloudflare) {
      cloudflarePromise = getCloudflareVisitorInfo().catch((error: Error) => {
        errors.push(`Cloudflare error: ${error.message}`);
        return {
          visitorId: 'cf_error_' + CryptoJS.MD5(sessionId).toString(),
          traceInfo: {},
          headers: {},
          timestamp: Date.now(),
        };
      });
      promises.push(cloudflarePromise);
    }

    // Wait for all promises to resolve
    await Promise.allSettled(promises);

    // Get results
    const browserFingerprint = fingerprintPromise ? await fingerprintPromise : 'not_collected';
    const ipInfo = ipPromise ? await ipPromise : null;
    const cloudflareInfo = cloudflarePromise ? await cloudflarePromise : null;

    // Type-safe IP info extraction
    const ipData = ipInfo as {
      publicIP?: string;
      privateIPs?: string[];
      realIP?: string;
      vpnDetection?: {
        isVPN?: boolean;
        vpnIP?: string;
        realIP?: string;
      };
      geolocation?: {
        country?: string;
        region?: string;
        city?: string;
      };
    } | null;

    // Type-safe Cloudflare info extraction
    const cfData = cloudflareInfo as {
      visitorId?: string;
      headers?: Record<string, string>;
      country?: string;
      region?: string;
      city?: string;
    } | null;

    // Wallet information (will be set externally)
    const walletInfo = includeWallet
      ? {
          walletAddress: undefined,
          walletType: undefined,
        }
      : {};

    // Prepare final data
    const identificationData: UserIdentificationData = {
      ...browserInfo,
      ...connectionInfo,
      ...walletInfo,
      sessionId,
      browserFingerprint: typeof browserFingerprint === 'string' ? browserFingerprint : 'error',
      timestamp: Date.now(),

      // IP information - Use vpnDetection results which now correctly handle all cases
      realIP: ipData?.vpnDetection?.realIP || ipData?.publicIP,
      vpnIP: ipData?.vpnDetection?.vpnIP,
      webrtcIPs: ipData?.privateIPs,
      isVPN: ipData?.vpnDetection?.isVPN,

      // Cloudflare information
      cloudflareVisitorId: cfData?.visitorId || 'cf_unavailable',
      cfConnectingIP: cfData?.headers?.['cf-connecting-ip'],
      cfCountry: cfData?.country,
      cfRay: cfData?.headers?.['cf-ray'],

      // Geolocation
      country: cfData?.country || ipData?.geolocation?.country,
      region: cfData?.region || ipData?.geolocation?.region,
      city: cfData?.city || ipData?.geolocation?.city,
    };

    return identificationData;
  }

  /**
   * Update wallet information
   */
  public updateWalletInfo(walletAddress: string, walletType: string): void {
    if (this.cachedData) {
      this.cachedData.walletAddress = walletAddress;
      this.cachedData.walletType = walletType;
    }
  }

  /**
   * Store identification data locally and optionally send to analytics
   * Replaces the previous API-based storage with local storage
   */
  public async storeIdentificationData(data: UserIdentificationData): Promise<boolean> {
    try {
      // Get additional Cloudflare headers from the existing endpoint
      const cfHeaders = await this.getCloudflareHeaders();

      // Prepare the complete identification record
      const identificationRecord = {
        ...data,
        cfConnectingIP: cfHeaders.cfConnectingIP,
        cfCountry: cfHeaders.cfCountry || data.cfCountry,
        cfRay: cfHeaders.cfRay || data.cfRay,
        userAgent: cfHeaders.userAgent || data.userAgent,
        timestamp: Date.now(),
        requestId: cfHeaders.cfRay || `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage for persistence
      this.saveToLocalStorage(identificationRecord);

      // Store in sessionStorage for current session
      this.saveToSessionStorage(identificationRecord);

      // Log the collected data (replaces server-side logging)
      console.log('User identification data collected and stored locally:', {
        sessionId: identificationRecord.sessionId,
        walletAddress: identificationRecord.walletAddress
          ? `${identificationRecord.walletAddress.substring(0, 6)}...${identificationRecord.walletAddress.substring(identificationRecord.walletAddress.length - 4)}`
          : 'none',
        browserFingerprint: identificationRecord.browserFingerprint.substring(0, 16) + '...',
        cloudflareVisitorId: identificationRecord.cloudflareVisitorId.substring(0, 16) + '...',
        vpnIP: identificationRecord.vpnIP,
        realIP: identificationRecord.realIP,
        cfConnectingIP: identificationRecord.cfConnectingIP,
        country: identificationRecord.cfCountry || identificationRecord.country,
        timestamp: identificationRecord.createdAt,
      });

      return true;
    } catch (error) {
      console.error('Error storing user identification data:', error);
      return false;
    }
  }

  /**
   * Get Cloudflare headers using unified caching
   */
  private async getCloudflareHeaders(): Promise<{
    cfConnectingIP?: string;
    cfCountry?: string;
    cfRay?: string;
    userAgent?: string;
  }> {
    try {
      const data = await getCloudflareData();
      const headers = data.headers || data.cfHeaders || {};

      return {
        cfConnectingIP: data.clientIP,
        cfCountry: data.country,
        cfRay: headers['cf-ray'],
        userAgent: headers['user-agent'],
      };
    } catch (error) {
      console.warn('Failed to get Cloudflare headers:', error);
      return {};
    }
  }

  /**
   * Save identification data to localStorage
   */
  private saveToLocalStorage(data: UserIdentificationData): void {
    try {
      const storageKey = 'user_identification_data';
      const existingData = this.getFromLocalStorage();

      // Keep a history of identification records (max 10)
      const history = existingData?.history || [];
      history.unshift(data);
      if (history.length > 10) {
        history.splice(10);
      }

      const storageData = {
        current: data,
        history,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Save identification data to sessionStorage
   */
  private saveToSessionStorage(data: UserIdentificationData): void {
    try {
      const storageKey = 'user_identification_session';
      sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error);
    }
  }

  /**
   * Get identification data from localStorage
   */
  public getFromLocalStorage(): {
    current: UserIdentificationData;
    history: UserIdentificationData[];
    lastUpdated: number;
  } | null {
    try {
      const storageKey = 'user_identification_data';
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to get from localStorage:', error);
      return null;
    }
  }

  /**
   * Get identification data from sessionStorage
   */
  public getFromSessionStorage(): UserIdentificationData | null {
    try {
      const storageKey = 'user_identification_session';
      const data = sessionStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to get from sessionStorage:', error);
      return null;
    }
  }

  /**
   * Get user identification data by session ID or wallet address
   * Replaces the GET API endpoint functionality
   */
  public getUserIdentificationData(
    sessionId?: string,
    walletAddress?: string,
  ): {
    success: boolean;
    data?: UserIdentificationData;
    message: string;
  } {
    try {
      const localData = this.getFromLocalStorage();
      const sessionData = this.getFromSessionStorage();

      // Check current session first
      if (sessionId && sessionData?.sessionId === sessionId) {
        return {
          success: true,
          data: sessionData,
          message: 'User identification data found in current session',
        };
      }

      // Check localStorage history
      if (localData) {
        // Check current data
        if (sessionId && localData.current.sessionId === sessionId) {
          return {
            success: true,
            data: localData.current,
            message: 'User identification data found in localStorage',
          };
        }

        if (walletAddress && localData.current.walletAddress === walletAddress) {
          return {
            success: true,
            data: localData.current,
            message: 'User identification data found by wallet address',
          };
        }

        // Check history
        const historyMatch = localData.history.find(
          (item) =>
            (sessionId && item.sessionId === sessionId) ||
            (walletAddress && item.walletAddress === walletAddress),
        );

        if (historyMatch) {
          return {
            success: true,
            data: historyMatch,
            message: 'User identification data found in history',
          };
        }
      }

      return {
        success: false,
        message: 'No user identification data found',
      };
    } catch (error) {
      console.error('Error retrieving user identification data:', error);
      return {
        success: false,
        message: 'Error retrieving user identification data',
      };
    }
  }

  /**
   * Clear cached data
   */
  public clearCache(): void {
    this.cachedData = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get cached data if available
   */
  public getCachedData(): UserIdentificationData | null {
    if (this.cachedData && Date.now() < this.cacheExpiry) {
      return this.cachedData;
    }
    return null;
  }
}

// Export convenience functions
export const collectUserIdentification = async (
  options?: UserIdentificationOptions,
): Promise<UserIdentificationData> => {
  const collector = UserIdentificationCollector.getInstance();
  return collector.collectUserIdentification(options);
};

export const updateWalletInfo = (walletAddress: string, walletType: string): void => {
  const collector = UserIdentificationCollector.getInstance();
  collector.updateWalletInfo(walletAddress, walletType);
};

export const storeIdentificationData = async (data: UserIdentificationData): Promise<boolean> => {
  const collector = UserIdentificationCollector.getInstance();
  return collector.storeIdentificationData(data);
};

export const getUserIdentificationData = (sessionId?: string, walletAddress?: string) => {
  const collector = UserIdentificationCollector.getInstance();
  return collector.getUserIdentificationData(sessionId, walletAddress);
};

export const getIdentificationFromLocalStorage = () => {
  const collector = UserIdentificationCollector.getInstance();
  return collector.getFromLocalStorage();
};

export const getIdentificationFromSessionStorage = () => {
  const collector = UserIdentificationCollector.getInstance();
  return collector.getFromSessionStorage();
};

export const clearIdentificationCache = (): void => {
  const collector = UserIdentificationCollector.getInstance();
  collector.clearCache();
};
