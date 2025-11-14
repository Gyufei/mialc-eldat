import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Box, ChevronRight, Info, Share2, X } from 'lucide-react';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

// import { Dialog, DialogContent } from '@/components/ui/dialog';

import useAirdrop, { AirDropDay } from '@/lib/use-airdrop';
import { useClaim } from '@/lib/use-claim';
import { cn } from '@/lib/utils';

import ClaimWallet from './claim-wallet';
import FAQ from './faq';
import MonadWhiteLogo from './icon/monad-white-logo';
import { MysteryBox } from './mystery-box';

const ClaimBoxAnimation = dynamic(() => import('./claim-box-animation'), { ssr: false });

type DayBoxProps = {
  dayData: AirDropDay;
  onSelectDay: (day: number) => void;
  isSelected: boolean;
};

function DayBox({ dayData, isSelected, onSelectDay }: DayBoxProps) {
  const { boxes } = dayData;

  const handleSelectDay = () => {
    if (!dayData.is_active) {
      return;
    }
    onSelectDay(dayData.day_num);
  };

  const openedBoxes = boxes.filter((box) => box.is_opened).length;
  const totalBoxes = boxes.length;

  const dayLabelClass = [
    'text-[11px] uppercase tracking-[0.25em]',
    isSelected ? 'text-primary opacity-80' : 'text-tertiary',
  ]
    .filter(Boolean)
    .join(' ');

  const dayNumberClass = [
    'text-xl font-semibold leading-5',
    isSelected ? 'text-white' : dayData.is_active ? 'text-primary' : 'text-secondary',
    dayData.is_active ? '' : 'opacity-70',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex w-full flex-col items-center gap-6 text-center md:flex-1">
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            'flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 bg-black/30 backdrop-blur-sm transition-all duration-300',
            dayData.is_active
              ? 'border-[#7D6BF1] shadow-[inset_0_2px_18px_rgba(114,108,169,0.35)]'
              : 'border-border'
          )}
        >
          <span className={dayLabelClass}>Day</span>
          <span className={dayNumberClass}>{dayData.day_num}</span>
        </div>
        <button
          onClick={handleSelectDay}
          type="button"
          disabled={!dayData.is_active}
          className={cn(
            'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-sm font-medium transition-colors duration-200 group',
            dayData.is_active
              ? 'text-[#5C5B5E] cursor-pointer hover:text-primary shadow-[inset_0_2px_18px_rgba(114,108,169,0.35)]'
              : 'text-tertiary cursor-not-allowed opacity-60'
          )}
        >
          <Box className="h-4 w-4" />
          {dayData.is_active ? (
            <>
              <span className="text-white">{openedBoxes}</span>
              <span className="text-[#5C5B5E] group-hover:text-white">/ {totalBoxes}</span>
            </>
          ) : (
            <span className="text-[#5C5B5E]">?</span>
          )}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ClaimBoxes() {
  const { user } = usePrivy();
  const userWallet = user?.wallet?.address;

  const [onOpeningBoxId, setOnOpeningBoxId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isRevealVisible, setIsRevealVisible] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: airDropData } = useAirdrop();

  const dayBoxes = useMemo<AirDropDay[]>(() => {
    if (!airDropData?.days?.length) {
      return [];
    }

    return airDropData.days;
  }, [airDropData]);

  const onOpeningBox = useMemo(() => {
    const currentDay = dayBoxes.find((dayBox) => dayBox.day_num === selectedDay);
    if (!currentDay) {
      return null;
    }

    return currentDay.boxes.find((box) => box.id === onOpeningBoxId);
  }, [dayBoxes, onOpeningBoxId, selectedDay]);

  const { mutate: claimBox, isSuccess, isError } = useClaim();

  const availableDayNumbers = dayBoxes.map((dayBox) => dayBox.day_num);

  const preferredCurrentDay =
    airDropData?.current_day && availableDayNumbers.includes(airDropData.current_day)
      ? airDropData.current_day
      : undefined;

  const activeDay =
    (availableDayNumbers.includes(selectedDay) ? selectedDay : preferredCurrentDay) ??
    dayBoxes[0]?.day_num ??
    1;

  const totalRevealedMon = dayBoxes.reduce((total, day) => {
    const dayTotal = day.boxes.reduce((sum, box) => {
      if (!box.is_opened) {
        return sum;
      }

      return sum + box.amount;
    }, 0);

    return total + dayTotal;
  }, 0);

  const selectedDayBoxes = dayBoxes.find((dayBox) => dayBox.day_num === activeDay);

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
    setOnOpeningBoxId(null);
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

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        closeReveal();
      }, 100);
    }
  }, [closeReveal, isSuccess]);

  useEffect(() => {
    if (isError) {
      setTimeout(() => {
        closeReveal();
      }, 100);
    }
  }, [isError]);

  const handleOpenBox = (boxId: number) => {
    setOnOpeningBoxId(boxId);
    openReveal();
    claimBox({ boxId });
  };

  const handleReplayBox = (_boxId: number) => {
    openReveal();
  };

  return (
    <motion.div
      className="flex w-full flex-1 px-4 pb-8 pt-4.5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
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

        <div className="mt-10 flex flex-col items-center gap-5">
          <div className="flex w-full max-w-xl flex-col items-center gap-4 md:flex-row md:items-center md:gap-4">
            {dayBoxes.map((dayBox, index) => (
              <Fragment key={dayBox.day_num}>
                {index !== 0 && (
                  <div className="hidden flex-1 mb-10 md:block">
                    <div className="h-px w-full bg-[#3E3E40]" />
                  </div>
                )}
                <DayBox
                  dayData={dayBox}
                  isSelected={dayBox.day_num === activeDay}
                  onSelectDay={setSelectedDay}
                />
              </Fragment>
            ))}
          </div>

          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
            {selectedDayBoxes?.boxes.map((box, index) => (
              <MysteryBox
                key={`${activeDay}-${box.id}`}
                index={index}
                boxData={box}
                dayData={selectedDayBoxes}
                isOpening={onOpeningBoxId === box.id}
                onOpen={(boxId) => handleOpenBox(boxId)}
                onReplay={(boxId) => handleReplayBox(boxId)}
              />
            ))}
          </div>

          <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between mt-6">
            <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-black/40 px-5 py-4 text-center shadow-[0_0_40px_-12px_rgba(149,137,252,0.45)_inset] md:flex-1 md:flex-row md:items-center md:justify-between md:text-left">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-monad-purple-600/30">
                  <MonadWhiteLogo />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-semibold text-primary">
                    {totalRevealedMon.toLocaleString('en-US')} MON
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.12em] text-tertiary">
                    <Info className="h-3.5 w-3.5" /> Total Revealed MON
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:gap-4">
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
              <div className="w-full h-full sm:aspect-video">
                <ClaimBoxAnimation amount={onOpeningBox?.amount ?? 0} />
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

      {/* <Dialog open={isRevealVisible} onOpenChange={setIsRevealVisible}>
        <DialogContent
          showCloseButton={false}
          className="w-full p-0 border-0 overflow-hidden max-w-[min(calc((100vh-2rem)*390/800),calc(100vw-2rem))] max-h-[calc(100vh-2rem)] aspect-390/800 sm:aspect-video sm:max-w-[min(calc((100vh-2rem)*16/9),calc(100vw-2rem),1920px)] sm:max-h-[calc(100vh-2rem)]"
        >
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src="/video/box-rarity-1_v2.mp4"
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
              onEnded={closeReveal}
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full sm:aspect-video">
                <ClaimBoxAnimation amount={onOpeningBox?.amount ?? 0} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeReveal}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogContent>
      </Dialog> */}
    </motion.div>
  );
}
