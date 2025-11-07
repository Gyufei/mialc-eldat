import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BrittiSans, CommitMono } from './font';
import QueryClientProviders from './query-client';
import CusPrivyProvider from './cus-privy-provider';
import CusWagmiProvider from './cus-wagmi-provider';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tadle Claim Portal',
  description: "Official Tadle airdrop claim. Connect your crypto wallet and web3 social accounts to see if you're eligible for rewards.",
  authors: [{ name: 'Tadle Foundation' }],
  creator: 'Tadle Foundation',
  publisher: 'Tadle Foundation',
  keywords: ['Tadle', 'Monad', 'blockchain', 'crypto', 'claim', 'rewards', 'wallet', 'web3', 'ethereum'],
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
    description: "Official Tadle airdrop claim. Connect your crypto wallet and web3 social accounts to see if you're eligible for rewards.",
    url: 'https://claim.tadle.com',
    siteName: 'Tadle Claim Portal',
    images: [
      {
        url: 'https://claim.tadle.com/opengraph-image.jpg?8711bfc4e8de7a39',
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
    description: "Official Tadle airdrop claim. Connect your crypto wallet and web3 social accounts to see if you're eligible for rewards.",
    images: ['https://claim.tadle.com/opengraph-image.jpg'],
  },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' }, { url: '/favicon.ico' }],
  },
  manifest: '/manifest.webmanifest',
  metadataBase: new URL('https://claim.tadle.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`${inter.variable} ${BrittiSans.variable} ${CommitMono.variable} antialiased`}>
        <CusPrivyProvider>
          <CusWagmiProvider>
            <QueryClientProviders>{children}</QueryClientProviders>
          </CusWagmiProvider>
        </CusPrivyProvider>
      </body>
    </html>
  );
}
