import { WalletWithMetadata, usePrivy } from '@privy-io/react-auth';
import { ChevronDown, Plus, Wallet } from 'lucide-react';

import { useMemo, useState } from 'react';

import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

import { cn, fmtAddr } from '@/lib/utils';

import SolanaWallets from './icon/solana-wallets';

export default function SolanaWalletConnected({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const { user, linkWallet } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);

  const solanaWallets = useMemo(() => {
    const linkEvmWallets = user?.linkedAccounts?.filter((account) => {
      return account?.type === 'wallet' && account?.chainType === 'solana';
    });

    return linkEvmWallets || [];
  }, [user]);

  const isNoWallet = solanaWallets?.length === 0;
  const isFullWallet = solanaWallets?.length === 8;

  function handleLinkWallet() {
    linkWallet({
      walletChainType: 'solana-only',
    });
    setIsOpen(false);
  }

  function handleOpen() {
    if (isNoWallet) {
      handleLinkWallet();
      return;
    }
    setIsOpen(!isOpen);
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="rounded-2xl transition-all duration-200 ease-in-out bg-alpha-50 border relative z-10 shadow-[0_0_12px_0_rgba(207,207,207,0.25)_inset] border-[#353539] hover:bg-background hover:border-[#353539] hover:shadow-[0_-10px_30px_0_rgba(110,84,255,0.20)_inset,0_0_25px_0_rgba(207,207,207,0.25)_inset,0_2px_10px_0_rgba(51,51,51,0.15)_inset]"
      >
        <button
          onClick={() => handleOpen()}
          className={cn(
            'items-center justify-center whitespace-nowrap font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 disabled:active:scale-100 hover:text-neutral-500 flex w-full h-full rounded-2xl flex-row active:scale-100',
            size === 'sm' ? 'py-4 px-4 gap-3 text-xs' : 'py-6 px-6 gap-4 text-sm',
          )}
        >
          <span
            className="inline-flex shrink-0"
            draggable="false"
            style={{ width: size === 'sm' ? 40 : 48, height: size === 'sm' ? 40 : 48 }}
          >
            <span>
              <SolanaWallets fillColor={solanaWallets?.length > 0 ? '#B8B4FE' : '#52525B'} />
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
                  size === 'sm' ? 'text-sm' : 'text-base',
                )}
              >
                <div
                  className={cn(
                    'flex items-center',
                    size === 'sm' ? 'gap-1' : 'gap-[5px]',
                  )}
                >
                  <span className="truncate">Solana Wallet</span>
                </div>
              </h4>
              <div
                className={cn(
                  'flex flex-col-reverse items-start min-[375px]:flex-row min-[375px]:items-center min-[375px]:justify-between md:justify-between lg:justify-between min-w-0',
                  size === 'sm' ? 'gap-1.5' : 'gap-2',
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-1 font-medium text-secondary',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                  )}
                >
                  {isNoWallet ? (
                    <span>Not Connected</span>
                  ) : (
                    <>
                      <span>{solanaWallets?.length}/8 connected</span>
                      <ChevronDown
                        className={cn('w-4 h-4 transition-transform', isOpen ? 'rotate-180' : '')}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </button>
        <CollapsibleContent
          className={cn('flex flex-col', size === 'sm' ? 'gap-1.5' : 'gap-2')}
        >
          <div
            data-orientation="horizontal"
            className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px"
          ></div>
          <>
            {solanaWallets?.map((wallet) => (
              <div
                className={cn('flex flex-col', size === 'sm' ? 'p-3 gap-3' : 'p-4 gap-4')}
                key={(wallet as WalletWithMetadata).address}
              >
                <div className="flex items-center justify-between text-xs gap-x-4">
                  <div className={cn('flex flex-row', size === 'sm' ? 'gap-2.5' : 'gap-3')}>
                    <Wallet
                      className={cn(
                        'text-secondary',
                        size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
                      )}
                    />
                    <div className={cn('flex flex-col items-start', size === 'sm' ? 'gap-1.5' : 'gap-2')}>
                      <button
                        className={cn(
                          'justify-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans rounded-full duration-200 active:scale-[0.98] disabled:active:scale-100 hover:text-neutral-500 flex items-center p-0 h-auto hover:opacity-70 transition-opacity',
                          size === 'sm' ? 'text-xs' : 'text-sm',
                        )}
                        aria-label="Copy address"
                      >
                        <span
                          className={cn(
                            'font-normal text-primary',
                            size === 'sm' ? 'text-xs' : 'text-sm',
                          )}
                          title="0xf60132e5Cb6A7319dF1524dc8aC6176987a5fE34"
                        >
                          {fmtAddr((wallet as WalletWithMetadata).address || '')}
                        </span>
                      </button>
                      <div
                        className={cn(
                          'border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent text-primary-foreground rounded-[0.375rem] shrink-0 bg-primary-foreground flex items-center hover:bg-button-secondary',
                          size === 'sm' ? 'gap-0.5 px-1 py-0.5' : 'gap-1 p-1',
                        )}
                        title="Not eligible for airdrop"
                      >
                        <p
                          className={cn(
                            'font-semibold text-secondary',
                            size === 'sm' ? 'text-[10px]' : 'text-2xs',
                          )}
                        >
                          NOT ELIGIBLE
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        </CollapsibleContent>
        {!isNoWallet && !isFullWallet && (
          <>
            <div
              data-orientation="horizontal"
              className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px"
            />
            <button
              onClick={handleLinkWallet}
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans rounded-full transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 hover:text-neutral-500 text-primary h-auto disabled:opacity-50 w-full',
                size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
              )}
            >
              <span
                className={cn(
                  'w-full flex items-center justify-center gap-2',
                  size === 'sm' ? 'text-xs' : 'text-sm',
                )}
              >
                <Plus className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                Add wallet
              </span>
            </button>
          </>
        )}
      </Collapsible>
    </div>
  );
}
