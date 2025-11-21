import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

import useAirdrop, { AirDropBox } from '@/lib/use-airdrop';
import { useClaim } from '@/lib/use-claim';
import { useIsMobile } from '@/lib/use-is-mobile';
import { formatNumber } from '@/lib/utils';

import CanvasAnimation from './canvas-animation';
import ClaimWallet from './claim-wallet';
import FAQ from './faq';
import MonadWhiteLogo from './icon/monad-white-logo';
import { MysteryBox } from './mystery-box';
import SeasonBox from './season-box';

const CURRENT_SEASON = 1;

function getSeasonInitWeek(seasonBoxes: AirDropBox[]) {
  const weeks = seasonBoxes.map((box) => box.weeks);
  return Math.max(...weeks);
}

function mockUnOpenedBoxes(seasonBoxes: AirDropBox[]) {
  const initWeek = getSeasonInitWeek(seasonBoxes);
  const wantFillBoxNumber = 8 - seasonBoxes.length;
  const newBoxes: AirDropBox[] = [...seasonBoxes];

  for (let i = 0; i < wantFillBoxNumber; i++) {
    const newBox: AirDropBox = {
      uuid: `mock-${i}`,
      weeks: initWeek + i + 1,
      wallet: '',
      amount: '0',
      tt_amount: '0',
      tfe_amount: '0',
      is_opened: false,
      asset: 'MON',
      open_at: 0,
    };

    newBoxes.push(newBox);
  }

  return newBoxes;
}

function getBoxInWeekIndex(boxes: AirDropBox[], boxId: string) {
  const boxWeek = boxes.find((box) => box.uuid === boxId)?.weeks;
  if (!boxWeek) {
    return 0;
  }

  const weekBoxes = boxes.filter((box) => box.weeks === boxWeek);
  return weekBoxes.findIndex((box) => box.uuid === boxId);
}

export default function ClaimBoxes() {
  const { user } = usePrivy();
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const userWallet = user?.wallet?.address;
  const isMobile = useIsMobile();

  const [onOpeningBoxId, setOnOpeningBoxId] = useState<string | null>(null);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(CURRENT_SEASON);

  const [isRevealVisible, setIsRevealVisible] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: airDropData } = useAirdrop();

  const seasonBoxes = useMemo<AirDropBox[]>(() => {
    if (selectedSeasonIndex === 1) {
      return airDropData?.boxes ?? [];
    }

    return [];
  }, [airDropData, selectedSeasonIndex]);

  const withUnReachedSeasonBoxes = useMemo<AirDropBox[]>(() => {
    return mockUnOpenedBoxes(seasonBoxes ?? []);
  }, [seasonBoxes]);

  const initWeek = useMemo(() => {
    return getSeasonInitWeek(seasonBoxes ?? []);
  }, [seasonBoxes]);

  const [currentWeek, setCurrentWeek] = useState<number>(initWeek);

  const handleChangeCurrentWeek = useCallback((week: number) => {
    setCurrentWeek(week);
  }, []);

  const onOpeningBox = useMemo(() => {
    return seasonBoxes.find((box) => box.uuid === onOpeningBoxId);
  }, [seasonBoxes, onOpeningBoxId]);

  const { mutate: claimBox, isError } = useClaim();

  function calcTotalRevealed(boxes: AirDropBox[], asset: string, type: 'tfe_amount' | 'tt_amount') {
    return boxes.reduce((total, box) => {
      if (!box.is_opened || box.asset !== asset) {
        return total;
      }

      return total + Number(box[type as keyof AirDropBox]);
    }, 0);
  }

  const totalTfeMon = calcTotalRevealed(seasonBoxes, 'MON', 'tfe_amount');
  const totalTtMon = calcTotalRevealed(seasonBoxes, 'MON', 'tt_amount');
  const totalTfeTle = calcTotalRevealed(seasonBoxes, 'TLE', 'tfe_amount');
  const totalTtTle = calcTotalRevealed(seasonBoxes, 'TLE', 'tt_amount');

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
          console.error('Error playing video', error);
        });
      }
    }

    animationTimerRef.current = setTimeout(() => {
      setShowAnimation(true);
    }, 6500);

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
    if (isError) {
      toast.error('Failed to claim box, please try again later');
    }
  }, [isError]);

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      const selectedBox = withUnReachedSeasonBoxes[selectedIndex];
      if (!selectedBox) return;
      setCurrentWeek((prev) => (prev === selectedBox.weeks ? prev : selectedBox.weeks));
    };

    handleSelect();
    carouselApi.on('select', handleSelect);

    return () => {
      carouselApi.off('select', handleSelect);
    };
  }, [carouselApi, withUnReachedSeasonBoxes]);

  useEffect(() => {
    if (!carouselApi) return;
    const targetIndex = withUnReachedSeasonBoxes.findIndex((box) => box.weeks === currentWeek);
    if (targetIndex < 0) return;
    if (carouselApi.selectedScrollSnap() === targetIndex) return;
    carouselApi.scrollTo(targetIndex);
  }, [carouselApi, currentWeek, withUnReachedSeasonBoxes]);

  const handleOpenBox = (boxId: string) => {
    setOnOpeningBoxId(boxId);
    openReveal();
    claimBox({ boxId });
  };

  const handleReplayBox = (boxId: string) => {
    setOnOpeningBoxId(boxId);
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
            {Array.from({ length: isMobile ? 1 : 3 }).map((_, index) => (
              <Fragment key={index}>
                {index !== 0 && (
                  <div className="hidden flex-1 mb-10 md:block">
                    <div className="h-px w-full bg-[#3E3E40]" />
                  </div>
                )}
                <SeasonBox
                  isActive={selectedSeasonIndex === index + 1}
                  seasonIndex={index + 1}
                  isSelected={selectedSeasonIndex === index + 1}
                  onSelectSeason={() => setSelectedSeasonIndex(index + 1)}
                  totalWeeks={8}
                  currentWeek={currentWeek}
                  onChangeCurrentWeek={handleChangeCurrentWeek}
                />
              </Fragment>
            ))}
          </div>

          <Carousel
            opts={{
              align: 'center',
            }}
            orientation={isMobile ? 'vertical' : 'horizontal'}
            setApi={setCarouselApi}
            className="w-full max-w-3xl"
          >
            <CarouselContent className="flex md:flex-row flex-col gap-2 md:gap-0 max-h-[700px] md:max-h-none">
              {withUnReachedSeasonBoxes.map((box) => (
                <CarouselItem key={box.uuid} className="md:basis-1/2 lg:basis-1/3">
                  <MysteryBox
                    key={`${box.uuid}`}
                    index={getBoxInWeekIndex(withUnReachedSeasonBoxes, box.uuid) ?? 0}
                    isWeekActive={box.weeks <= initWeek}
                    boxData={box}
                    isOpening={onOpeningBoxId === box.uuid}
                    onOpen={(boxId: string) => handleOpenBox(boxId)}
                    onReplay={(boxId: string) => handleReplayBox(boxId)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {isMobile ? null : (
              <>
                <CarouselNext />
                <CarouselPrevious />
              </>
            )}
          </Carousel>

          <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between mt-6">
            <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-black/40 px-5 py-4 text-center shadow-[0_0_40px_-12px_rgba(149,137,252,0.45)_inset] md:flex-1 md:flex-row md:items-center md:justify-between md:text-left">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-monad-purple-600/30">
                  <MonadWhiteLogo />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-col md:flex-row md:items-center md:gap-1 text-xl font-semibold text-primary">
                    <span className="text-sm text-secondary">Testnet Faucet Engagement:</span>
                    <span>
                      {formatNumber(totalTfeMon)}
                      <span className="text-xs text-secondary"> MON </span>+{' '}
                      {formatNumber(totalTfeTle)}{' '}
                      <span className="text-xs text-secondary"> TLE </span>
                    </span>
                  </span>
                  <span className="text-xl flex flex-col md:flex-row md:items-center md:gap-1 font-semibold text-primary">
                    <span className="text-sm text-secondary">Testnet Transaction:</span>
                    <span>
                      {formatNumber(totalTtMon)} <span className="text-xs text-secondary">MON</span>{' '}
                      + {formatNumber(totalTtTle)}{' '}
                      <span className="text-xs text-secondary">TLE</span>
                    </span>
                  </span>
                  {/* <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.12em] text-tertiary">
                    <Info className="h-3.5 w-3.5" /> Total Revealed
                  </span> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isRevealVisible && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/95 transition-opacity duration-400">
          <video
            ref={videoRef}
            src="/video/1-4.mp4"
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            onEnded={closeReveal}
          />

          {showAnimation && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <div className="w-full h-full sm:aspect-video">
                <CanvasAnimation
                  amount={Number(onOpeningBox?.amount ?? 0)}
                  tokenName={onOpeningBox?.asset ?? ''}
                />
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
    </motion.div>
  );
}
