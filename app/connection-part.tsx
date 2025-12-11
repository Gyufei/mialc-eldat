import { cn } from '@/lib/utils';

import DiscordConnected from './discord-connected';
// import EmailConnected from './email-connected';
import EvmWalletConnected from './evm-wallet-connected';
// import FarcasterConnected from './farcaster-connected';
// import SolanaWalletConnected from './solana-wallet-connected';
// import TelegramConnected from './telegram-connected';
import TwitterConnected from './twitter-connected';

export default function ConnectionPart({
  size = 'lg',
  className,
}: {
  size?: 'lg' | 'sm';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col md:order-first relative', className)}>
      <div className={cn('shrink-0', size === 'sm' ? 'mb-3' : 'mb-4')}>
        <h3
          className={cn(
            'font-inter font-semibold',
            size === 'sm' ? 'text-base mb-1' : 'text-lg mb-2'
          )}
        >
          Connections
        </h3>
        {/* <p className={cn('text-secondary', size === 'sm' ? 'text-xs leading-5' : 'text-sm')}>
          Each eligible wallet and account adds to your claim strength. Changes save automatically
          and sync with your profile.
        </p> */}
      </div>
      <div
        className={cn(
          'md:flex-1 md:relative rounded-b-2xl overflow-hidden',
          size === 'sm' ? 'space-y-2 md:min-h-[260px]' : 'space-y-3 md:min-h-[300px]'
        )}
      >
        <div className="md:absolute md:inset-0">
          <div
            className={cn(
              'flex flex-col overflow-y-auto pr-2 h-full',
              size === 'sm' ? 'gap-2' : 'gap-3'
            )}
          >
            <div className={size === 'sm' ? 'space-y-2' : 'space-y-3'}>
              <EvmWalletConnected size={size} />
              {/* <SolanaWalletConnected size={size} /> */}
              <TwitterConnected size={size} />
              {/* <EmailConnected size={size} /> */}
              <DiscordConnected size={size} />
              {/* <TelegramConnected size={size} /> */}
              {/* <FarcasterConnected size={size} /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
