import { usePrivy } from '@privy-io/react-auth';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { motion } from 'framer-motion';
import { Download, Loader } from 'lucide-react';
import {
  BlobSource,
  BufferTarget,
  Conversion,
  Input as MediaInput,
  Mp4OutputFormat,
  Output,
  WEBM,
} from 'mediabunny';
import { toast } from 'sonner';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import useAirdrop, { AirDropBox, AirDropData } from '@/lib/use-airdrop';
import { useClaim } from '@/lib/use-claim';
import { useIsMobile } from '@/lib/use-is-mobile';
import { formatNumber } from '@/lib/utils';

import CanvasAnimation from './canvas-animation';
import ClaimWallet from './claim-wallet';
import FAQ from './faq';
import XTwitter from './icon/x-twitter';
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
  const [_showAnimation, setShowAnimation] = useState(false);
  const [showOpBtn, setShowOpBtn] = useState(false);
  const [revealSessionId, setRevealSessionId] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opBtnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // 录制相关
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedMimeTypeRef = useRef<string>('');
  const [videoElementForCanvas, setVideoElementForCanvas] = useState<HTMLVideoElement | null>(null);

  const { data: airDropData } = useAirdrop() as { data: AirDropData };

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
    if (opBtnTimerRef.current) {
      clearTimeout(opBtnTimerRef.current);
      opBtnTimerRef.current = null;
    }
    setIsRevealVisible(false);
    setOnOpeningBoxId(null);
    setShowOpBtn(false);
    setIsRecording(false);

    // 关闭弹窗时停止录制但不触发下载，并清理录制状态
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
    recordedMimeTypeRef.current = '';

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    // 清空当前 canvas 引用，下一次打开时通过重新挂载组件获得全新的 canvas
    canvasRef.current = null;
    setVideoElementForCanvas(null);
  }, []);

  const openReveal = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    if (opBtnTimerRef.current) {
      clearTimeout(opBtnTimerRef.current);
      opBtnTimerRef.current = null;
    }
    setShowAnimation(false);
    setShowOpBtn(false);
    // 每次打开都递增一次，强制重新挂载隐藏 video + CanvasAnimation，隔离上一次播放状态
    setRevealSessionId((prev) => prev + 1);
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

    opBtnTimerRef.current = setTimeout(() => {
      setShowOpBtn(true);
    }, 8500);

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
      if (opBtnTimerRef.current) {
        clearTimeout(opBtnTimerRef.current);
        opBtnTimerRef.current = null;
      }
    };
  }, [isRevealVisible]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      if (opBtnTimerRef.current) {
        clearTimeout(opBtnTimerRef.current);
        opBtnTimerRef.current = null;
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

  const startRecording = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (typeof window === 'undefined') return;
      if (!('MediaRecorder' in window)) {
        console.error('recording is not supported by your browser');
        return;
      }

      try {
        // 录制分辨率：
        // - PC：固定 1920x1080（方便分享到各类平台）
        // - 移动端：直接使用当前画布的实际像素尺寸（画布是什么样，录制就是什么样）
        const containerRect = canvasContainerRef.current?.getBoundingClientRect();
        const canvasPixelWidth = containerRect?.width ?? canvas.width;
        const canvasPixelHeight = containerRect?.height ?? canvas.height;

        const RECORDING_WIDTH = isMobile ? window.devicePixelRatio * canvasPixelWidth : 1920;
        const RECORDING_HEIGHT = isMobile ? window.devicePixelRatio * canvasPixelHeight : 1080;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = RECORDING_WIDTH;
        offscreenCanvas.height = RECORDING_HEIGHT;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        if (!offscreenCtx) {
          console.error('Failed to get offscreen canvas context');
          setIsRecording(false);
          return;
        }

        // 设置离屏 canvas 的绘制质量
        offscreenCtx.imageSmoothingEnabled = true;
        offscreenCtx.imageSmoothingQuality = 'high';

        // 从离屏 canvas 捕获流
        const stream = offscreenCanvas.captureStream(30);

        // 优先尝试使用 MP4 (H.264 + AAC)，如果不支持则回退到 WebM
        let mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2'; // H.264 + AAC
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          // 尝试其他 H.264 变体
          mimeType = 'video/mp4;codecs=h264,aac';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              // 回退到 WebM
              mimeType = 'video/webm;codecs=vp9';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                  mimeType = 'video/webm';
                }
              }
            }
          }
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];
        recordedBlobRef.current = null;
        setIsRecording(true);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
            recordedBlobRef.current = blob;
            recordedMimeTypeRef.current = recorder.mimeType;
            setIsRecording(false);
          } catch (error) {
            console.error(error);
            setIsRecording(false);
          }
        };

        recorder.start();

        // 每一帧将主 canvas 的内容绘制到离屏 canvas
        const drawFrame = () => {
          if (recorder.state === 'recording') {
            // 清空离屏 canvas
            offscreenCtx.clearRect(0, 0, RECORDING_WIDTH, RECORDING_HEIGHT);

            // 使用 canvas 的实际像素尺寸
            const sourceWidth = canvas.width;
            const sourceHeight = canvas.height;

            if (sourceWidth > 0 && sourceHeight > 0) {
              const scale = Math.max(
                RECORDING_WIDTH / sourceWidth,
                RECORDING_HEIGHT / sourceHeight
              );
              const scaledWidth = isMobile ? sourceWidth : sourceWidth * scale;
              const scaledHeight = isMobile ? sourceHeight : sourceHeight * scale;
              const x = (RECORDING_WIDTH - scaledWidth) / 2;
              const y = (RECORDING_HEIGHT - scaledHeight) / 2;

              // 将主 canvas 的内容绘制到离屏 canvas
              offscreenCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
            }
          }
        };

        // 使用 requestAnimationFrame 同步绘制
        let animationFrameId: number;
        const renderLoop = () => {
          drawFrame();
          if (recorder.state === 'recording') {
            animationFrameId = requestAnimationFrame(renderLoop);
          }
        };
        renderLoop();

        // 录制整段流程：前面的视频 + 6.5s 后的数字动画，这里简单录制 9 秒
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            cancelAnimationFrame(animationFrameId);
            recorder.stop();
          }
        }, 9000);
      } catch (error) {
        console.error(error);
        setIsRecording(false);
        toast.error('error when recording video');
      }
    },
    [isMobile]
  );

  const handleDownloadVideo = async () => {
    if (isRecording || isConverting) {
      return;
    }

    const blob = recordedBlobRef.current;
    if (!blob) {
      toast.error('video generation failed');
      return;
    }

    const mimeType = recordedMimeTypeRef.current;

    // 如果已经是 MP4 格式（H.264），直接下载，无需转换
    if (mimeType.startsWith('video/mp4')) {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tadle-reveal.mp4';
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        toast.error('video download error');
      }
      return;
    }

    // 如果是 WebM 格式，使用 Mediabunny 转换为 MP4 (H.264)
    try {
      setIsConverting(true);

      const inputOptions = {
        source: new BlobSource(blob),
        formats: [WEBM],
      } as unknown as ConstructorParameters<typeof MediaInput>[0];
      const input = new MediaInput(inputOptions);

      const bufferTarget = new BufferTarget();
      // Mp4OutputFormat 默认使用 H.264 编码
      // 分辨率已在录制时通过离屏 canvas 设置为 1920x1080
      const output = new Output({
        format: new Mp4OutputFormat(),
        target: bufferTarget,
      });

      const conversion = await Conversion.init({ input, output });

      if (!conversion.isValid) {
        toast.error('video conversion failed');
        setIsConverting(false);
        return;
      }

      await conversion.execute();

      const { buffer } = bufferTarget;
      if (!buffer) {
        toast.error('video conversion failed');
        setIsConverting(false);
        return;
      }

      const mp4Blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tadle-reveal.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('video conversion error');
    } finally {
      setIsConverting(false);
    }
  };

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
            <CarouselContent className="flex md:flex-row flex-col gap-2 md:gap-0 max-h-[720px] md:max-h-none">
              {withUnReachedSeasonBoxes.map((box) => (
                <CarouselItem
                  key={box.uuid}
                  className="md:pt-10 min-h-[240px] md:min-h-0 md:basis-1/2 lg:basis-1/3"
                >
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

      <Dialog
        open={isRevealVisible}
        onOpenChange={(opened: boolean) => {
          if (opened) {
            setIsRevealVisible(true);
          } else {
            closeReveal();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-full p-0 border-0 overflow-hidden max-w-[min(calc((100vh-2rem)*390/800),calc(100vw-2rem))] max-h-[calc(100vh-2rem)] aspect-390/800 sm:aspect-video sm:max-w-[min(calc((100vh-2rem)*16/9),calc(100vw-2rem),1920px)] sm:max-h-[calc(100vh-2rem)]"
        >
          <VisuallyHidden>
            <DialogTitle>Tadle Reveal</DialogTitle>
          </VisuallyHidden>
          <div key={revealSessionId} className="relative w-full h-full">
            {/* 隐藏的视频元素，仅用于提供帧数据给 canvas */}
            <video
              ref={videoRef}
              src="/video/1-4.mp4"
              className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
              playsInline
              muted
              autoPlay
              onLoadedData={() => {
                if (videoRef.current) {
                  setVideoElementForCanvas(videoRef.current);
                }
              }}
            />

            {/* 可见的 canvas：先显示视频，6.5 秒后再叠加数字动画 */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div ref={canvasContainerRef} className="w-full h-full sm:aspect-video">
                <CanvasAnimation
                  amount={Number(onOpeningBox?.amount ?? 0)}
                  tokenName={onOpeningBox?.asset ?? ''}
                  videoElement={videoElementForCanvas ?? undefined}
                  overlayDelayMs={6500}
                  onCanvasReady={(canvas) => {
                    canvasRef.current = canvas;
                    if (canvas && isRevealVisible && !isRecording && !recordedBlobRef.current) {
                      startRecording(canvas);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {showOpBtn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute top-3/4 sm:top-[73%] xl:top-4/5 left-0 right-0 flex justify-center px-4 z-10"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2 sm:gap-4">
                  <Button
                    onClick={() => {
                      const e = encodeURIComponent('Tadle BOXES \uD83C\uDF81');
                      window.open('https://twitter.com/intent/tweet?text='.concat(e), '_blank');
                    }}
                    className="bg-black text-white hover:bg-black/80 flex-1 max-w-45 flex flex-row gap-2 items-center"
                  >
                    Share On
                    <XTwitter style={{ width: 'auto !important', height: 16 }} />
                  </Button>
                  <Button
                    onClick={handleDownloadVideo}
                    disabled={isRecording || isConverting || !recordedBlobRef.current}
                    className="bg-black hover:bg-black/80 text-white flex-1 max-w-45 flex flex-row gap-2 items-center"
                  >
                    {isRecording || isConverting ? (
                      <Loader className="size-4 animate-spin" color="#fff" />
                    ) : (
                      <Download size="sm" color="#fff" className="size-4" />
                    )}
                    <span>Download Video</span>
                  </Button>
                </div>
                <button
                  onClick={closeReveal}
                  className="w-fit inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-[#5F57F2] [&>*]:relative [&>*]:z-10 disabled:opacity-50 h-9.5 px-4 py-2 group"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
