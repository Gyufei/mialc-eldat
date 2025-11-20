import { Copy, Loader2, Wallet } from 'lucide-react';

import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import useAirdrop from '@/lib/use-airdrop';
import { fmtAddr } from '@/lib/utils';

import ConnectionPart from './connection-part';

type ClaimWalletProps = {
  walletAddress?: string;
};

export default function ClaimWallet({ walletAddress }: ClaimWalletProps) {
  const { data: airDropData, isLoading: isAirdropLoading } = useAirdrop();
  const isAirdropActive = airDropData && airDropData?.current_date >= airDropData?.base_date;

  const [walletPopoverOpen, setWalletPopoverOpen] = useState(false);

  const formattedAddress = fmtAddr(walletAddress || '');

  return (
    <>
      <Popover open={walletPopoverOpen} onOpenChange={setWalletPopoverOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <div>
                <button
                  onClick={() => setWalletPopoverOpen(true)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 h-9.5 px-4 py-2 group"
                >
                  <span className="flex items-center gap-2 w-auto">
                    <Wallet className="w-4 h-4" />
                    Claim Wallet: {formattedAddress}
                  </span>
                </button>
              </div>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground border-border border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance max-w-xs">
            Your sign-in address has been set as your Claim wallet. Click this button anytime to
            change it.
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="border-border outline-none overflow-y-auto max-h-[90vh] sm:w-md w-[320px]">
          <h2 className="text-foreground text-left my-2 font-semibold">Claim Wallet</h2>
          <div className="w-full space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-x-4 py-2.5 px-4 bg-primary-foreground rounded-md border border-border h-16">
                <Wallet className="w-5 h-5 text-secondary" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-sm text-primary">{formattedAddress}</div>
                  <div className="text-sm text-green-500">Connected</div>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans rounded-full transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 hover:text-neutral-500 h-9 p-0"
                  aria-label="Copy address"
                >
                  <span>
                    <Copy className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>
            {isAirdropActive && <ConnectionPart size="sm" />}
            {isAirdropLoading && (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setWalletPopoverOpen(false)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 h-9.5 px-4 py-2 w-full"
                data-testid="cancel-claim-wallet-button"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
