import { usePrivy } from '@privy-io/react-auth';

import { cn } from '@/lib/utils';

import Discord from './icon/discord';

export default function DiscordConnected({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const { user, linkDiscord } = usePrivy();
  const discordName = user?.discord?.username;

  function handleLinkDiscord() {
    if (discordName) {
      return;
    }
    linkDiscord();
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <button
        onClick={handleLinkDiscord}
        className={cn(
          'justify-center whitespace-nowrap font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-britti-sans disabled:active:scale-100 hover:text-neutral-500 flex w-full items-center h-auto transition-all duration-200 rounded-2xl border relative z-10 bg-alpha-50 border-border active:scale-100 cursor-pointer hover:bg-background hover:border-brand-purple-hover/25 hover:shadow-[0_-10px_30px_0_rgba(110,84,255,0.20)_inset,0_0_25px_0_rgba(82,82,82,0.25)_inset,0_2px_10px_0_rgba(51,51,51,0.15)_inset]',
          size === 'sm' ? 'py-4 px-4 gap-3 text-xs' : 'py-6 px-6 gap-4 text-sm',
        )}
      >
        <span
          className="inline-flex shrink-0"
          draggable="false"
          style={{ width: size === 'sm' ? 40 : 48, height: size === 'sm' ? 40 : 48 }}
        >
          <span>
            <Discord fillColor={discordName ? '#B8B4FE' : '#52525B'} />
          </span>
        </span>
        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center w-full min-w-0',
            size === 'sm' ? 'gap-1.5 sm:gap-3' : 'gap-2 sm:gap-4',
          )}
        >
          <div className={cn('flex flex-col flex-1 min-w-0', size === 'sm' ? 'gap-1' : 'gap-2')}>
            <h4
              className={cn(
                'font-medium text-primary truncate text-left',
                size === 'sm' ? 'text-base' : 'text-lg',
              )}
            >
              <div
                className={cn(
                  'flex items-center min-w-0',
                  size === 'sm' ? 'gap-1' : 'gap-[5px]',
                )}
              >
                <span
                  className={cn(
                    'truncate text-ellipsis min-w-0',
                    size === 'sm' ? 'text-base' : 'text-lg',
                  )}
                >
                  {discordName ? discordName : 'Discord'}
                </span>
              </div>
            </h4>
            {!discordName && (
              <div
                className={cn(
                  'flex flex-col-reverse items-start min-[375px]:flex-row min-[375px]:items-center min-[375px]:justify-between md:justify-between lg:justify-between min-w-0',
                  size === 'sm' ? 'gap-1.5' : 'gap-2',
                )}
              >
                <p
                  className={cn(
                    'font-medium text-tertiary',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                  )}
                >
                  Not connected
                </p>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

