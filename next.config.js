const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === '1';
const isProduction = process.env.NODE_ENV === 'production' && !isPreview;

const ProdHost = 'https://sb-api.tadle.com';
const DevHost = 'https://preview-sandbox-api.tadle.com';

module.exports = {
  reactStrictMode: true,
  async headers() {
    const connectSrc = [
      "'self'",
      'https://auth.privy.io',
      'wss://relay.walletconnect.com',
      'wss://relay.walletconnect.org',
      'wss://www.walletlink.org',
      'https://*.rpc.privy.systems',
      'https://explorer-api.walletconnect.com',
      'https://cdn.tadle.com',
      isProduction ? ProdHost : DevHost,
    ]
      .filter(Boolean)
      .join(' ');

    const scriptSrc = [
      "'self'",
      'https://challenges.cloudflare.com',
      'https://auth.privy.io',
      // 中文注释：开发/预览环境放宽内联脚本以兼容 Next dev 的内联脚本
      !isProduction && "'unsafe-inline'",
    ]
      .filter(Boolean)
      .join(' ');

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.tadle.com https://explorer-api.walletconnect.com",
      "font-src 'self' https://cdn.tadle.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://oauth.telegram.org',
      'frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://oauth.telegram.org',
      `connect-src ${connectSrc}`,
      "worker-src 'self'",
      "manifest-src 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
};
