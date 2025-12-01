'use client';

import { PrivyProvider } from '@privy-io/react-auth';

import { isProduction } from '@/lib/api-path';

export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || isProduction
    ? 'cmi5tijs501zok10cgqzneakt'
    : 'cmhlr7b9p00uslc0cq25fjedn';

export default function CusPrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off',
          },
        },
        appearance: {
          theme: 'dark',
          logo: '/icons/logo.svg',
          accentColor: '#676FFF',
          walletChainType: 'ethereum-only',
          walletList: [
            'metamask',
            'okx_wallet',
            'coinbase_wallet',
            'backpack',
            'phantom',
            'haha_wallet',
            'detected_ethereum_wallets',
            'wallet_connect',
            'wallet_connect_qr',
          ],
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
