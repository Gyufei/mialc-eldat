'use client';

import { createConfig, http } from 'wagmi';
import { WagmiProvider } from 'wagmi';
import { mainnet, monad, monadTestnet } from 'wagmi/chains';

const config = createConfig({
  chains: [mainnet, monad, monadTestnet],
  transports: {
    [mainnet.id]: http(),
    [monad.id]: http(),
    [monadTestnet.id]: http(),
  },
});

export default function CusWagmiProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
