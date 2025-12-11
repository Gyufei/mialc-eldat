import { CircleCheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Toaster } from 'sonner';

import type { Metadata } from 'next';

import CusPrivyProvider from './cus-privy-provider';
import CusWagmiProvider from './cus-wagmi-provider';
import { BrittiSans, CommitMono, InterLocal } from './font';
import './globals.css';
import QueryClientProviders from './query-client';

const descriptionText =
  'Tadle claim portal prepares mind-blowingly generous Monad tokens (MON) and more Monad ecosystem project tokens here for builders and contributers.';

export const metadata: Metadata = {
  title: 'Tadle Claim Portal',
  description: descriptionText,
  authors: [{ name: 'Tadle Foundation' }],
  creator: 'Tadle Foundation',
  publisher: 'Tadle Foundation',
  keywords: ['Tadle', 'Monad', 'Monad Testnet', 'parallel sandbox', 'airdrop', 'crypto', 'claim'],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Tadle Claim Portal',
    description: descriptionText,
    url: '/',
    siteName: 'Tadle Claim Portal',
    images: [
      {
        url: '/opengraph-image.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@tadle_com',
    creator: '@tadle_com',
    title: 'Tadle Claim Portal',
    description: descriptionText,
    images: ['/opengraph-image.jpg'],
  },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' }, { url: '/favicon.ico' }],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL.startsWith('http')
        ? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
        : `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://claim.tadle.com',
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={`${BrittiSans.variable} ${CommitMono.variable} ${InterLocal.variable} antialiased`}
      >
        <CusPrivyProvider>
          <CusWagmiProvider>
            <QueryClientProviders>{children}</QueryClientProviders>
          </CusWagmiProvider>
        </CusPrivyProvider>
        <Toaster
          position="top-right"
          className="toaster group"
          toastOptions={{
            classNames: {
              success:
                '!rounded-lg !border-green-600 !bg-[#22C55E]/15 backdrop-blur-[10px] md:!w-auto',
              loading:
                '!rounded-lg !border-brand-monad-purple-600-a11y-btn !bg-brand-purple-hover/15 backdrop-blur-[10px] md:!w-auto',
              warning:
                '!rounded-lg !border-yellow-600 !bg-[#EAB308]/15 backdrop-blur-[10px] md:!w-auto',
              error: '!rounded-lg !border-red-600 !bg-[#EF4444]/15 backdrop-blur-[10px] md:!w-auto',
              content: '!rounded-lg text-primary text-sm',
              info: '!rounded-lg !border !border-[#836EF9] !bg-[#836EF9]/10 backdrop-blur-[10px] text-sm md:!w-auto',
              toast: '!rounded-lg !py-2 !gap-1',
            },
            closeButton: false,
          }}
          icons={{
            loading: <Loader2Icon className="size-4 border-brand-monad-purple-600-a11y-btn" />,
            success: <CircleCheckIcon className="size-4 text-green-500 " />,
            info: <InfoIcon className="size-4 text-[#836EF9]" />,
            warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
            error: <XIcon className="size-4 text-red-500" />,
          }}
          style={
            {
              '--normal-bg': 'var(--popover)',
              '--normal-text': 'var(--popover-foreground)',
              '--normal-border': 'var(--border)',
            } as React.CSSProperties
          }
        />
      </body>
    </html>
  );
}