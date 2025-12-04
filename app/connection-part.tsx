import { cn } from '@/lib/utils';

import DiscordConnected from './discord-connected';
// import EmailConnected from './email-connected';
import EvmWalletConnected from './evm-wallet-connected';
// import FarcasterConnected from './farcaster-connected';
import CusChevronDown from './icon/chevron-down';
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
        <p className={cn('text-secondary', size === 'sm' ? 'text-xs leading-5' : 'text-sm')}>
          Each eligible wallet and account adds to your claim strength. Changes save automatically
          and sync with your profile.
        </p>
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
          <div
            className={cn(
              'hidden md:flex absolute w-full bottom-0 left-0 z-20 pointer-events-none items-center justify-center scroll-fade-gradient',
              size === 'sm' ? 'h-10' : 'h-12'
            )}
          >
            <div
              className={cn(
                'flex w-fit items-center rounded-full border border-text-disabled bg-alpha-50 pointer-events-auto',
                size === 'sm' ? 'gap-0.5 px-1 py-0.5' : 'gap-1 px-1.5 py-1'
              )}
            >
              <span
                className="inline-flex shrink-0 rotate-0"
                draggable="false"
                style={{ width: size === 'sm' ? 12 : 14, height: size === 'sm' ? 12 : 14 }}
              >
                <span>
                  <CusChevronDown strokeColor="#52525B" />
                </span>
              </span>
              <p
                className={cn(
                  'font-medium text-tertiary',
                  size === 'sm' ? 'text-[11px]' : 'text-xs'
                )}
              >
                Scroll for more
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
