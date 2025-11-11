import { usePrivy } from '@privy-io/react-auth';
import { Box, Info, LucideIcon, RotateCcw, Share2, X } from 'lucide-react';

import { useCallback, useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

import ClaimWallet from './claim-wallet';
import FAQ from './faq';
import MonadWhiteLogo from './icon/monad-white-logo';
import { MysteryBox, MysteryBoxProps } from './mystery-box';

const ClaimBoxAnimation = dynamic(() => import('./claim-box-animation'), { ssr: false });

type DayBoxConfig = {
  day: number;
  label: string;
  icon: LucideIcon;
  cta: string;
  boxes: MysteryBoxProps[];
};

type DayBoxProps = DayBoxConfig & {
  onSelectDay: (day: number) => void;
};

const dayBoxes: DayBoxConfig[] = [
  {
    day: 1,
    label: 'Reveal opens soon',
    icon: Box,
    cta: '???',
    boxes: [
      {
        amount: 2_500,
        day: 1,
        boxNumber: 1,
        isOpened: false,
        isOpening: false,
        isDisabled: false,
        blurContent: false,
        index: 0,
      },
      {
        amount: 7_500,
        day: 1,
        boxNumber: 2,
        isOpened: true,
        isOpening: false,
        isDisabled: false,
        blurContent: false,
        index: 1,
      },
      {
        amount: 15_000,
        day: 1,
        boxNumber: 3,
        isOpened: true,
        isOpening: false,
        isDisabled: false,
        blurContent: true,
        index: 2,
      },
    ],
  },
  {
    day: 2,
    label: 'Stay tuned',
    icon: Box,
    cta: '???',
    boxes: [
      {
        amount: 10_000,
        day: 2,
        boxNumber: 1,
        isOpened: false,
        isOpening: true,
        isDisabled: false,
        blurContent: false,
        index: 0,
      },
      {
        amount: 24_000,
        day: 2,
        boxNumber: 2,
        isOpened: false,
        isOpening: false,
        isDisabled: true,
        blurContent: false,
        index: 1,
      },
      {
        amount: 32_500,
        day: 2,
        boxNumber: 3,
        isOpened: true,
        isOpening: false,
        isDisabled: false,
        blurContent: false,
        index: 2,
      },
    ],
  },
  {
    day: 3,
    label: 'Unlock your drop',
    icon: Box,
    cta: '???',
    boxes: [
      {
        amount: 8_000,
        day: 3,
        boxNumber: 1,
        isOpened: false,
        isOpening: false,
        isDisabled: false,
        blurContent: false,
        index: 0,
      },
      {
        amount: 19_500,
        day: 3,
        boxNumber: 2,
        isOpened: true,
        isOpening: false,
        isDisabled: false,
        blurContent: false,
        index: 1,
      },
      {
        amount: 41_200,
        day: 3,
        boxNumber: 3,
        isOpened: true,
        isOpening: false,
        isDisabled: false,
        blurContent: false,
        index: 2,
      },
    ],
  },
];

function DayBox({ day, label, icon: Icon, cta, onSelectDay }: DayBoxProps) {
  const handleSelectDay = () => {
    onSelectDay(day);
  };

  return (
    <div className="flex w-full flex-col items-center gap-6 text-center md:flex-1">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-border bg-muted/10 shadow-[inset_0_2px_12px_rgba(114,108,169,0.35)]">
          <span className="text-[11px] uppercase tracking-[0.25em] text-tertiary">Day</span>
          <span className="text-xl font-semibold leading-5 text-primary">{day}</span>
        </div>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-secondary/70">
          {label}
        </div>
        <button
          onClick={handleSelectDay}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-colors duration-200 hover:border-primary/60 hover:text-primary"
          type="button"
        >
          <Icon className="h-4 w-4" />
          {cta}
        </button>
      </div>
    </div>
  );
}

export default function ClaimBoxes() {
  const { user } = usePrivy();
  const userWallet = user?.wallet?.address;

  const [selectedDay, setSelectedDay] = useState(dayBoxes[0]?.day ?? 1);
  const [isRevealVisible, setIsRevealVisible] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeReveal = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setShowAnimation(false);
    setIsRevealVisible(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const openReveal = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    setShowAnimation(false);
    setIsRevealVisible(true);
  }, []);

  useEffect(() => {
    if (!isRevealVisible) return;

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.error('自动播放视频失败', error);
        });
      }
    }

    animationTimerRef.current = setTimeout(() => {
      setShowAnimation(true);
    }, 5000);

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [isRevealVisible]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const handleOpenBox = (day: number, amount: number, index: number) => {
    openReveal();
    console.log('[Mock] Requesting to open box', { day, amount, index });
  };

  const handleReplayBox = (day: number, index: number) => {
    openReveal();
    console.log('[Mock] Requesting box replay', { day, index });
  };

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
            {dayBoxes.map((dayBox) => (
              <div key={dayBox.day} className="flex flex-col items-center gap-6 md:flex-1">
                <DayBox {...dayBox} onSelectDay={setSelectedDay} />
              </div>
            ))}
          </div>

          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dayBoxes
              .find((dayBox) => dayBox.day === selectedDay)
              ?.boxes.map((box) => (
                <MysteryBox
                  key={`${selectedDay}-${box.boxNumber}`}
                  {...box}
                  onOpen={(amount, index) => handleOpenBox(selectedDay, amount, index)}
                  onReplay={() => handleReplayBox(selectedDay, box.index)}
                />
              ))}
          </div>

          <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-black/40 px-5 py-4 text-center shadow-[0_0_40px_-12px_rgba(149,137,252,0.45)_inset] md:flex-1 md:flex-row md:items-center md:justify-between md:text-left">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-monad-purple-600/30">
                  <MonadWhiteLogo />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-semibold text-primary">0 MON</span>
                  <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.12em] text-tertiary">
                    <Info className="h-3.5 w-3.5" /> Total Revealed MON
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:gap-4">
                <button
                  className="inline-flex w-full items-center border-none justify-center gap-2 whitespace-nowrap rounded-full cursor-pointer bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-all duration-200 hover:border-primary/60 hover:text-primary md:w-auto"
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                  Replays
                </button>
                <button
                  className="relative inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-radial-tertiary px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:opacity-90 md:w-auto"
                  type="button"
                >
                  <Share2 className="h-4 w-4" />
                  Share Progress
                </button>
              </div>
            </div>
          </div>

          {/* <div className="mt-4 flex w-full justify-center">
            <button
              className="inline-flex border-none cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border-text-disabled bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-colors duration-200 hover:border-primary/60 hover:text-primary"
              type="button"
            >
              <Eye className="h-4 w-4" />
              Show connections
            </button>
          </div> */}
        </div>
      </div>

      {isRevealVisible && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/95 transition-opacity duration-400">
          <video
            ref={videoRef}
            src="/video/box-rarity-1_v2.mp4"
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            onEnded={closeReveal}
          />

          {showAnimation && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <div className="w-full max-w-4xl">
                <ClaimBoxAnimation />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={closeReveal}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
