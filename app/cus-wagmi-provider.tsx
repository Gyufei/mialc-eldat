"use client";
import { createConfig, http } from 'wagmi';
import { mainnet, monadTestnet } from 'wagmi/chains';
import { WagmiProvider } from 'wagmi';

const config = createConfig({
  chains: [mainnet, monadTestnet],
  transports: {
    [mainnet.id]: http(),
    [monadTestnet.id]: http(),
  },
});

export default function CusWagmiProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
