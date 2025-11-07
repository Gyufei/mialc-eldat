import { usePrivy } from '@privy-io/react-auth';
import { Box, Eye, Info, LucideIcon, RotateCcw, Share2 } from 'lucide-react';

import ClaimWallet from './claim-wallet';
import FAQ from './faq';
import MonadWhiteLogo from './icon/monad-white-logo';

type DayBoxConfig = {
  day: number;
  label: string;
  icon: LucideIcon;
  cta: string;
};

const dayBoxes: DayBoxConfig[] = [
  { day: 1, label: 'Reveal opens soon', icon: Box, cta: '???' },
  { day: 2, label: 'Stay tuned', icon: Box, cta: '???' },
  { day: 3, label: 'Unlock your drop', icon: Box, cta: '???' },
];

function DayBox({ day, label, icon: Icon, cta }: DayBoxConfig) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-border bg-muted/10 shadow-[inset_0_2px_12px_rgba(114,108,169,0.35)]">
        <span className="text-[11px] uppercase tracking-[0.25em] text-tertiary">Day</span>
        <span className="text-3xl font-semibold leading-8 text-primary">{day}</span>
      </div>
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-secondary/70">
        {label}
      </div>
      <button
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-colors duration-200 hover:border-primary/60 hover:text-primary"
        type="button"
        disabled
      >
        <Icon className="h-4 w-4" />
        {cta}
      </button>
    </div>
  );
}

export default function ClaimBoxs() {
  const { user } = usePrivy();
  const userWallet = user?.wallet?.address;

  return (
    <div className="flex w-full flex-1 px-4 pb-8 pt-4.5">
      <div
        className="w-full max-w-6xl px-4 py-8 lg:px-20 lg:py-11 border-zinc-800 mx-auto relative rounded-3xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(148, 137, 252, 0.08) 0%, rgba(18, 16, 36, 0.78) 100%), var(--base-popover, #09090B)',
          boxShadow: 'rgba(162, 155, 212, 0.25) 0px 4px 54px -10px inset',
        }}
      >
        <div className="p-0 pb-4 border-b border-border flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="title-gradient text-3xl font-semibold leading-none tracking-tight text-primary">
                Open Your Boxes
              </h1>
              <FAQ />
            </div>
            <p className="text-sm text-secondary">
              Each box is an airdrop, how many will you open?
            </p>
          </div>
          <ClaimWallet walletAddress={userWallet} />
        </div>

        <div className="mt-10 flex flex-col items-center gap-10">
          <div className="flex w-full max-w-3xl flex-col items-center gap-10 md:flex-row md:justify-between">
            {dayBoxes.map((config) => (
              <div key={config.day} className="flex flex-col items-center gap-6 md:flex-1">
                <DayBox {...config} />
              </div>
            ))}
          </div>

          <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center justify-between gap-4 rounded-2xl border border-border bg-black/40 px-5 py-4 shadow-[0_0_40px_-12px_rgba(149,137,252,0.45)_inset]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-monad-purple-600/30">
                  <MonadWhiteLogo />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-xl font-semibold text-primary">0 MON</span>
                  <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.12em] text-tertiary">
                    <Info className="h-3.5 w-3.5" /> Total Revealed MON
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:w-auto md:flex-row md:gap-4">
                <button
                  className="inline-flex items-center border-none justify-center gap-2 whitespace-nowrap rounded-full cursor-pointer bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-all duration-200 hover:border-primary/60 hover:text-primary"
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                  Replays
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-radial-tertiary px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
                  type="button"
                >
                  <Share2 className="h-4 w-4" />
                  Share Progress
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex w-full justify-center">
            <button
              className="inline-flex border-none cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border-text-disabled bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-colors duration-200 hover:border-primary/60 hover:text-primary"
              type="button"
            >
              <Eye className="h-4 w-4" />
              Show connections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
