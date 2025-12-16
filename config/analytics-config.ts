/**
 * Analytics configuration constants
 * Centralized configuration for Google Analytics and other analytics services
 */
import { isProduction } from '@/lib/api-path';

// Environment-based Google Analytics configuration
const getGoogleAnalyticsId = () => {
  // 如果有环境变量，优先使用环境变量
  if (process.env.NEXT_PUBLIC_GA_ID) {
    return process.env.NEXT_PUBLIC_GA_ID;
  }

  // 根据环境区分GA ID
  if (isProduction) {
    return 'G-R5YV691RBP'; // 生产环境GA ID
  } else {
    return 'G-CYFQ6PE2Z5'; // 开发/测试环境GA ID
  }
};

export const GA_ID = getGoogleAnalyticsId();

// Analytics configuration object for future extensibility
export const ANALYTICS_CONFIG = {
  googleAnalytics: {
    measurementId: GA_ID,
    enabled: !!GA_ID,
  },
  // Future analytics services can be added here
  // mixpanel: { ... },
  // amplitude: { ... },
} as const;
