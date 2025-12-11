import { CircleCheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Toaster } from 'sonner';



import type { Metadata } from 'next';
import { Inter } from 'next/font/google';



import CusPrivyProvider from './cus-privy-provider';
import CusWagmiProvider from './cus-wagmi-provider';
import { BrittiSans, CommitMono } from './font';
import './globals.css';
import QueryClientProviders from './query-client';





const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tadle Claim Portal',
  description:
    "Official Tadle airdrop claim. Connect your crypto wallet and web3 social accounts to see if you're eligible for rewards.",
  authors: [{ name: 'Tadle Foundation' }],
  creator: 'Tadle Foundation',
  publisher: 'Tadle Foundation',
  keywords: [
    'Tadle',
    'Monad',
    'blockchain',
    'crypto',
    'claim',
    'rewards',
    'wallet',
    'web3',
    'ethereum',
  ],
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
    description:
      "Official Tadle airdrop claim. Connect your crypto wallet and web3 social accounts to see if you're eligible for rewards.",
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
    site: '@tadle',
    creator: '@tadle',
    title: 'Tadle Claim Portal',
    description:
      "Official Tadle airdrop claim. Connect your crypto wallet and web3 social accounts to see if you're eligible for rewards.",
    images: ['/opengraph-image.jpg'],
  },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' }, { url: '/favicon.ico' }],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? 'https://claim.tadle.com',
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
        className={`${inter.variable} ${BrittiSans.variable} ${CommitMono.variable} antialiased`}
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
            loading: <Loader2Icon size="sm" className="border-brand-monad-purple-600-a11y-btn" />,
            success: <CircleCheckIcon size="sm" className="size-4 text-green-500 " />,
            info: <InfoIcon size="sm" className="size-4 text-[#836EF9]" />,
            warning: <TriangleAlertIcon size="sm" className="size-4 text-yellow-500" />,
            error: <XIcon size="sm" className="size-4 text-red-500" />,
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