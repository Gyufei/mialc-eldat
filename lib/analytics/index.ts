// Analytics tracking utilities using @next/third-parties/google
import { GA_ID } from '@/config/analytics-config';





// Analytics events configuration
export const ANALYTICS_EVENTS = {
  // Wallet Connection Events
  WALLET_CONNECT: 'wallet_connect',

  // Trading Events
  TRADE_INITIATED: 'trade_initiated',
  TRADE_COMPLETED: 'trade_completed',
  TRADE_FAILED: 'trade_failed',

  // General UI Events
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  // Auth & Engagement Events
  LOGIN: 'login',
  LOGOUT: 'logout',
  // Airdrop/Claim interactions
  BOX_CLICK: 'box_click',
  VIDEO_DOWNLOAD: 'video_download',
  SHARE_CLICK: 'share_click',

  // Error Events
  ERROR_OCCURRED: 'error_occurred',
  USER_INFO: 'user_info',
} as const;

// Analytics parameters interface
export interface AnalyticsParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  currency?: string;
  token_address?: string;
  token_symbol?: string;
  amount?: string;
  account_type?: 'EOA' | 'DSA';
  network?: string;
  error_message?: string;
  page_path?: string;
  // 是否包含用户识别信息（IP、指纹、Cloudflare ID 等）
  include_user_id?: boolean;
  // User identification parameters for GA
  user_fingerprint?: string;
  real_ip?: string;
  vpn_ip?: string;
  cloudflare_visitor_id?: string;
  session_id?: string;
  custom_parameters?: Record<string, unknown>;
}

// Track events using gtag (provided by @next/third-parties/google)
/**
 * 统一的 GA 事件上报函数
 * 说明：
 * - 使用 `window.gtag('event', ...)` 上报事件到 GA4
 * - 支持将 `custom_parameters` 扁平化为顶层字段，便于 GA 查询与分析
 * - 可选携带用户识别信息（指纹、IP、Cloudflare Visitor ID 等）
 */
export const trackEvent = (
  eventName: keyof typeof ANALYTICS_EVENTS,
  parameters: AnalyticsParams = {},
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const eventAction = ANALYTICS_EVENTS[eventName];

    // Helper function to safely serialize custom parameters
    const serializeCustomParameters = (
      customParams?: Record<string, unknown>,
    ): Record<string, string | number | boolean> => {
      if (!customParams) return {};

      const serialized: Record<string, string | number | boolean> = {};

      for (const [key, value] of Object.entries(customParams)) {
        if (value === null || value === undefined) {
          continue; // Skip null/undefined values
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          serialized[key] = value;
        } else if (typeof value === 'object') {
          // Serialize objects as JSON strings
          try {
            serialized[key] = JSON.stringify(value);
          } catch (_error) {
            serialized[key] = '[object Object]';
          }
        } else {
          // Convert other types to string
          serialized[key] = String(value);
        }
      }

      return serialized;
    };

    // Flatten all parameters to top-level for GA compatibility
    const gaEventData = {
      event_category: parameters.event_category || 'engagement',
      event_label: parameters.event_label,
      value: parameters.value,
      currency: parameters.currency,
      // User identification data as top-level parameters for GA
      user_fingerprint: parameters.user_fingerprint,
      real_ip: parameters.real_ip,
      vpn_ip: parameters.vpn_ip,
      cloudflare_visitor_id: parameters.cloudflare_visitor_id,
      session_id: parameters.session_id,
      // Flatten custom parameters to top-level instead of nesting
      token_address: parameters.token_address,
      token_symbol: parameters.token_symbol,
      amount: parameters.amount,
      account_type: parameters.account_type,
      network: parameters.network,
      error_message: parameters.error_message,
      page_path: parameters.page_path,
      // Serialize and flatten any additional custom parameters
      ...serializeCustomParameters(parameters.custom_parameters),
    };

    window.gtag('event', eventAction, gaEventData);
  }
};

// Track page views
export const trackPageView = (page_path: string, page_title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_ID, {
      page_path,
      page_title,
    });
  }
};

// Track user properties
export const setUserProperties = (properties: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_ID, {
      custom_map: properties,
    });
  }
};

// Track conversions for important actions
export const trackConversion = (conversionId: string, value?: number, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value,
      currency,
    });
  }
};

// Helper function to track wallet connection
export const trackWalletConnection = (address: string, accountType: 'EOA' | 'DSA') => {
  trackEvent('WALLET_CONNECT', {
    event_category: 'wallet',
    event_label: accountType,
    account_type: accountType,
    custom_parameters: {
      wallet_address: address.slice(0, 6) + '...' + address.slice(-4), // Anonymize address
    },
  });
};

// Helper function to track trading activities
export const trackTrade = (
  action: 'initiated' | 'completed' | 'failed',
  sellToken: string,
  buyToken: string,
  amount: string,
  errorMessage?: string,
) => {
  const eventMap = {
    initiated: 'TRADE_INITIATED' as const,
    completed: 'TRADE_COMPLETED' as const,
    failed: 'TRADE_FAILED' as const,
  };

  trackEvent(eventMap[action], {
    event_category: 'trading',
    event_label: `${sellToken}_to_${buyToken}`,
    value: parseFloat(amount) || undefined,
    custom_parameters: {
      sell_token: sellToken,
      buy_token: buyToken,
      trade_amount: amount,
      error_message: errorMessage,
    },
  });
};

// Helper function to track protocol interactions
export const trackProtocolInteraction = (
  protocol: 'uniswap' | 'ambient' | 'apriori' | 'magma' | 'nad_fun' | 'nad_name_service',
  action: string,
  details?: Record<string, unknown>,
) => {
  trackEvent('BUTTON_CLICK', {
    event_category: 'protocol_interaction',
    event_label: `${protocol}_${action}`,
    custom_parameters: {
      protocol,
      action,
      ...details,
    },
  });
};

// Declare global gtag type for TypeScript
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}