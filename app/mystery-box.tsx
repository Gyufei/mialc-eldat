import { LoaderCircle, RotateCcw } from 'lucide-react';

import { Fragment } from 'react';

import Image from 'next/image';

import { Button } from '@/components/ui/button';

import { AirDropBox, AirDropDay } from '@/lib/use-airdrop';
import { cn } from '@/lib/utils';

export type MysteryBoxProps = {
  index: number;
  dayData: AirDropDay;
  boxData: AirDropBox;
  isOpening: boolean;
  onOpen?: (boxId: number) => void;
  onReplay?: (boxId: number) => void;
};

export function MysteryBox({
  index,
  boxData,
  isOpening,
  dayData,
  onOpen,
  onReplay,
}: MysteryBoxProps) {
  const isOpened = boxData.is_opened;
  const isCanOpen = boxData.is_can_open;

  const isDisabled = !dayData.is_active;

  function handleClick() {
    if (isOpened || isOpening) {
      return;
    }

    onOpen?.(boxData.id);
  }

  function handleClickBtn() {
    if (isOpened) {
      onReplay?.(boxData.id);
    } else {
      onOpen?.(boxData.id);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isOpening || isDisabled}
        className="flex flex-col w-full h-full bg-transparent! items-center justify-center border-0 hover:bg-transparent rounded-none p-0 gap-0 m-9 group"
      >
        <div className="relative mb-9">
          {isCanOpen && !isOpened && (
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
            src={
              isCanOpen && !isOpened
                ? '/animations/unopened-box_v2.gif'
                : `/animations/empty-tier-${boxData.amount < 9_999 ? 1 : boxData.amount < 39_999 ? 2 : 3}.png`
            }
            alt="Mystery Box"
            width={160}
            height={160}
            priority
            className={cn('cursor-pointer relative z-10', {
              'animate-box-bounce': isCanOpen && !isOpened,
              'scale-[1.7]': !isCanOpen || isOpened,
            })}
            unoptimized
          />

          {isCanOpen && !isOpened && (
            <Image
              src="/animations/box-sparkles.gif"
              alt="Sparkles"
              width={170}
              height={170}
              className="absolute top-0 left-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              unoptimized
            />
          )}

          {(!isCanOpen || isOpened) && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center flex-col gap-1 z-10',
                !isCanOpen && 'blur'
              )}
            >
              <p className="font-inter text-2xl leading-none font-medium text-center">
                {boxData.amount.toLocaleString('en-US')}
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
                MON
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-center">
          <p className="text-sm font-normal text-muted-foreground">
            Day {dayData.day_num} • Box #{index + 1}
          </p>

          <div
            onClick={handleClickBtn}
            className="text-primary flex items-center gap-2 text-base font-medium justify-start h-auto px-3 py-2 group-hover:underline group-hover:text-secondary transition-all duration-200"
          >
            {isCanOpen ? (
              isOpened ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-0" />
                  Replay
                </>
              ) : (
                'Open Box'
              )
            ) : isOpening ? (
              <>
                <LoaderCircle className="w-4 h-4 mr-0 animate-spin" />
                Opening...
              </>
            ) : (
              <div className="h-10"></div>
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}
