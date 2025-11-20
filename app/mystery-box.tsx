import { LoaderCircle, RotateCcw } from 'lucide-react';

import { Fragment } from 'react';

import Image from 'next/image';

import { Button } from '@/components/ui/button';

import { AirDropBox } from '@/lib/use-airdrop';
import { cn, formatNumber } from '@/lib/utils';

export type MysteryBoxProps = {
  index: number;
  isWeekActive: boolean;

  boxData: AirDropBox;
  isOpening: boolean;
  onOpen?: (boxId: string) => void;
  onReplay?: (boxId: string) => void;
};

export function MysteryBox({
  index,
  isWeekActive,
  boxData,
  isOpening,
  onOpen,
  onReplay,
}: MysteryBoxProps) {
  const isOpened = isWeekActive && boxData.is_opened;
  const isCanOpen = isWeekActive && !isOpened && !isOpening;

  function handleClick() {
    if (!isWeekActive || isOpened || isOpening) {
      return;
    }

    onOpen?.(boxData.uuid);
  }

  function handleClickBtn() {
    if (isOpened) {
      onReplay?.(boxData.uuid);
    } else {
      handleClick?.();
    }
  }

  return (
    <div className="flex flex-col items-center user-select-none">
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={!isCanOpen}
        className="flex flex-col w-full h-full bg-transparent! items-center justify-center border-0 hover:bg-transparent rounded-none p-0 gap-0 m-1 group"
      >
        <div className="relative mb-9">
          {isCanOpen && (
            <Fragment>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-box-glow-1 w-full h-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(55, 30, 225, 1) 0%, rgba(55, 30, 225, 0.9) 22%, rgba(55, 30, 225, 0.8) 55%, transparent 100%)',
                  filter: 'blur(40px)',
                  zIndex: 0,
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-box-glow-2 w-full h-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(0, 69, 154, 1) 0%, rgba(0, 69, 154, 0.9) 22%, rgba(0, 69, 154, 0.8) 55%, transparent 100%)',
                  filter: 'blur(40px)',
                  zIndex: 1,
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full h-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(38, 106, 255, 1) 0%, rgba(38, 106, 255, 1) 30%, rgba(38, 106, 255, 1) 50%, rgba(38, 106, 255, 1) 70%, transparent 100%)',
                  filter: 'blur(43px)',
                  zIndex: 3,
                }}
              />
            </Fragment>
          )}

          <Image
            src={isCanOpen ? '/animations/unopened-box_v2.gif' : `/animations/empty-tier-1.png`}
            alt="Mystery Box"
            width={160}
            height={160}
            priority
            className={cn('cursor-pointer relative z-10', {
              'animate-box-bounce': isCanOpen,
              'scale-[1.7]': !isCanOpen,
            })}
            unoptimized
          />

          {isCanOpen && (
            <Image
              src="/animations/box-sparkles.gif"
              alt="Sparkles"
              width={170}
              height={170}
              className="absolute top-0 left-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              unoptimized
            />
          )}

          {(isOpened || !isCanOpen) && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center flex-col gap-1 z-10',
                !isCanOpen && !isOpened && 'blur'
              )}
            >
              <p className="font-inter text-2xl leading-none font-medium text-center">
                {formatNumber(boxData.amount)}
              </p>
              <p
                className="text-lg leading-none font-medium text-center"
                style={{
                  background: 'linear-gradient(180deg, #FFF 10.63%, #775DFF 125.63%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {boxData.asset}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-center">
          <p className="text-sm font-normal text-muted-foreground">
            Week {boxData.weeks} • Box #{index + 1}
          </p>

          <div
            onClick={handleClickBtn}
            className="text-primary flex items-center gap-2 text-base font-medium justify-start h-auto px-3 py-2 group-hover:underline group-hover:text-secondary transition-all duration-200"
          >
            {isOpening ? (
              <>
                <LoaderCircle className="w-4 h-4 mr-0 animate-spin" />
                Opening...
              </>
            ) : isOpened ? (
              <>
                <RotateCcw className="w-4 h-4 mr-0" />
                Replay
              </>
            ) : (
              'Open Box'
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}
