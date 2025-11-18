'use client';

import { PrivyProvider } from '@privy-io/react-auth';

// import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

// const solanaConnectors = toSolanaWalletConnectors({
//   // By default, shouldAutoConnect is enabled
//   shouldAutoConnect: true,
// });

export default function CusPrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cmhlr7b9p00uslc0cq25fjedn"
      config={{
        loginMethods: ['wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off',
          },
          // solana: {
          //   createOnLogin: 'off',
          // },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          walletChainType: 'ethereum-and-solana',
          walletList: [
            'metamask',
            'okx_wallet',
            'phantom',
            'backpack',
            'coinbase_wallet',
            'haha_wallet',
            'detected_ethereum_wallets',
            'wallet_connect',
            'wallet_connect_qr',
          ],
          logo: '/icons/monad-logo-full.svg',
        },
        // externalWallets: {
        //   solana: {
        //     connectors: solanaConnectors,
        //   },
        // },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
