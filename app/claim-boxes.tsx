import { usePrivy } from '@privy-io/react-auth';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { motion } from 'framer-motion';
import { Download, Loader } from 'lucide-react';
import {
  BlobSource,
  BufferTarget,
  Conversion,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  MP4,
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

/**
 * 检查浏览器是否支持音频合并所需的 WebCodecs API
 * @returns {boolean} 如果支持所有必需的 API 则返回 true，否则返回 false
 */
function checkAudioMergeSupport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // 检查 VideoEncoder 是否支持
    if (typeof VideoEncoder === 'undefined') {
      console.warn('VideoEncoder is not supported');
      return false;
    }

    // 检查 AudioEncoder 是否支持
    if (typeof AudioEncoder === 'undefined') {
      console.warn('AudioEncoder is not supported');
      return false;
    }

    // 检查 AudioData 是否支持
    if (typeof AudioData === 'undefined') {
      console.warn('AudioData is not supported');
      return false;
    }

    // 检查 MediaStreamTrackProcessor 是否支持
    if (typeof MediaStreamTrackProcessor === 'undefined') {
      console.warn('MediaStreamTrackProcessor is not supported');
      return false;
    }

    // 检查 captureStream 方法是否支持
    const videoElement = document.createElement('video');
    // @ts-expect-error - captureStream may not be in TypeScript definitions
    if (typeof videoElement.captureStream !== 'function') {
      console.warn('captureStream is not supported');
      return false;
    }

    // 检查 VideoFrame 是否支持
    if (typeof VideoFrame === 'undefined') {
      console.warn('VideoFrame is not supported');
      return false;
    }

    // 尝试创建编码器以验证实际可用性
    try {
      const testVideoEncoder = new VideoEncoder({
        output: () => {},
        error: () => {},
      });
      testVideoEncoder.close();
    } catch (error) {
      console.warn('VideoEncoder cannot be instantiated:', error);
      return false;
    }

    try {
      const testAudioEncoder = new AudioEncoder({
        output: () => {},
        error: () => {},
      });
      testAudioEncoder.close();
    } catch (error) {
      console.warn('AudioEncoder cannot be instantiated:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error checking audio merge support:', error);
    return false;
  }
}

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
  const [downloadProgress, setDownloadProgress] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null); // 自动递增进度定时器
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedMimeTypeRef = useRef<string>('');
  const [videoElementForCanvas, setVideoElementForCanvas] = useState<HTMLVideoElement | null>(null);

  // 音频预处理相关（前置优化）
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const processedAudioDataRef = useRef<{
    planarData: Float32Array;
    sampleRate: number;
    numberOfChannels: number;
    numberOfFrames: number;
  } | null>(null);
  const videoMetadataRef = useRef<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);

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
    setDownloadProgress(0);
    // 清理进度定时器
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

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
        const containerRect = canvasContainerRef.current?.getBoundingClientRect();
        const canvasPixelWidth = containerRect?.width ?? canvas.width;
        const canvasPixelHeight = containerRect?.height ?? canvas.height;

        const RECORDING_WIDTH = isMobile ? canvasPixelWidth * 2 : 1920;
        const RECORDING_HEIGHT = isMobile ? canvasPixelHeight * 2 : 1080;

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

        recorder.onstop = async () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
            recordedBlobRef.current = blob;
            recordedMimeTypeRef.current = recorder.mimeType;
            setIsRecording(false);

            // 前置优化：录制完成后立即开始预处理音频和视频元数据
            // 这样在用户点击下载时，大部分准备工作已经完成
            (async () => {
              try {
                // 1. 获取视频元数据
                const videoUrl = URL.createObjectURL(blob);
                const tempVideo = document.createElement('video');
                tempVideo.src = videoUrl;
                tempVideo.muted = true;

                await new Promise<void>((resolve, reject) => {
                  tempVideo.onloadedmetadata = () => {
                    videoMetadataRef.current = {
                      width: tempVideo.videoWidth,
                      height: tempVideo.videoHeight,
                      duration: tempVideo.duration,
                    };
                    URL.revokeObjectURL(videoUrl);
                    resolve();
                  };
                  tempVideo.onerror = () => {
                    URL.revokeObjectURL(videoUrl);
                    reject(new Error('Failed to load video metadata'));
                  };
                });

                // 2. 加载音频文件（如果还没加载）
                if (!audioBufferRef.current) {
                  try {
                    const audioResponse = await fetch('/video/PE93NhltTYob96tF.mp3');
                    const audioArrayBuffer = await audioResponse.arrayBuffer();
                    const audioContext = new AudioContext();
                    audioBufferRef.current = await audioContext.decodeAudioData(audioArrayBuffer);
                  } catch (error) {
                    console.warn('Failed to preload audio file:', error);
                  }
                }

                // 3. 处理音频数据（如果音频和视频元数据都已准备好）
                if (audioBufferRef.current && videoMetadataRef.current) {
                  const { duration: videoDuration } = videoMetadataRef.current;
                  const audioBuffer = audioBufferRef.current;
                  const audioFrameCount = Math.round(videoDuration * audioBuffer.sampleRate);
                  const numChannels = audioBuffer.numberOfChannels;
                  const sampleRate = audioBuffer.sampleRate;

                  const processedAudioBuffer = new AudioContext().createBuffer(
                    numChannels,
                    audioFrameCount,
                    sampleRate,
                  );

                  // 复制音频数据（如果音频比视频短，则循环填充；如果长，则截取）
                  const sourceFrameCount = audioBuffer.length;
                  for (let channel = 0; channel < numChannels; channel++) {
                    const sourceData = audioBuffer.getChannelData(channel);
                    const targetData = processedAudioBuffer.getChannelData(channel);

                    for (let i = 0; i < audioFrameCount; i++) {
                      targetData[i] = sourceData[i % sourceFrameCount];
                    }
                  }

                  // 创建扁平音频数据（f32-planar 格式）
                  const planarData = new Float32Array(numChannels * audioFrameCount);
                  for (let channel = 0; channel < numChannels; channel++) {
                    const channelData = processedAudioBuffer.getChannelData(channel);
                    planarData.set(channelData, channel * audioFrameCount);
                  }

                  processedAudioDataRef.current = {
                    planarData,
                    sampleRate,
                    numberOfChannels: numChannels,
                    numberOfFrames: audioFrameCount,
                  };
                }
              } catch (error) {
                console.warn('Failed to preprocess audio/video metadata:', error);
              }
            })();
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
              if (isMobile) {
                // 移动端：直接使用 canvas 的像素尺寸绘制到离屏 canvas
                // RECORDING_WIDTH/HEIGHT 已经等于 canvas 尺寸（经过偶数处理，可能略有差异）
                offscreenCtx.drawImage(canvas, 0, 0, RECORDING_WIDTH, RECORDING_HEIGHT);
              } else {
                // PC端：需要缩放以适应 1920x1080
                const scale = Math.max(
                  RECORDING_WIDTH / sourceWidth,
                  RECORDING_HEIGHT / sourceHeight,
                );
                const scaledWidth = sourceWidth * scale;
                const scaledHeight = sourceHeight * scale;
                const x = (RECORDING_WIDTH - scaledWidth) / 2;
                const y = (RECORDING_HEIGHT - scaledHeight) / 2;

                // 将主 canvas 的内容绘制到离屏 canvas
                offscreenCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
              }
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
        }, 13000);
      } catch (error) {
        console.error(error);
        setIsRecording(false);
        toast.error('error when recording video');
      }
    },
    [isMobile],
  );

  const handleDownloadVideo = async () => {
    // 如果正在下载，阻止重复点击
    if (isRecording || isConverting || downloadProgress > 0) {
      return;
    }

    // 移动端提示用户使用 PC 下载
    if (isMobile) {
      toast.warning(
        'Due to mobile performance limitations, please use a PC browser to download the video.',
      );
      return;
    }

    const blob = recordedBlobRef.current;
    if (!blob) {
      toast.error('video generation failed');
      return;
    }

    const mimeType = recordedMimeTypeRef.current;
    const randomFileName = `${Math.floor(Math.random() * 1e10)
      .toString()
      .padStart(10, '0')}.mp4`;

    try {
      setIsConverting(true);

      // 清理之前的定时器
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      // 重置进度为0
      setDownloadProgress(0);
      await new Promise((resolve) => setTimeout(resolve, 16)); // 等待UI更新

      // 启动自动递增进度条
      // 总时间约20秒，最大到95%，增量递减
      const TARGET_TIME = 20000; // 20秒
      const MAX_PROGRESS = 95; // 最大进度95%
      const UPDATE_INTERVAL = 100; // 每100ms更新一次
      const TOTAL_UPDATES = TARGET_TIME / UPDATE_INTERVAL; // 总共200次更新

      let currentProgress = 0;
      let updateCount = 0;

      // 计算每次的增量，使用递减算法
      // 开始时增量大，逐渐变小
      const getIncrement = (progress: number, remainingUpdates: number) => {
        // 使用平方根函数使递减更平滑
        const progressRatio = progress / MAX_PROGRESS;
        // 剩余进度 / 剩余更新次数，但根据进度比例调整
        const baseIncrement = (MAX_PROGRESS - progress) / remainingUpdates;
        // 开始时速度较快，逐渐变慢
        const speedFactor = 1 - progressRatio * 0.7; // 从1.0递减到0.3
        return baseIncrement * speedFactor;
      };

      progressTimerRef.current = setInterval(() => {
        updateCount++;
        const remainingUpdates = TOTAL_UPDATES - updateCount;

        if (remainingUpdates <= 0 || currentProgress >= MAX_PROGRESS) {
          // 达到最大进度或时间到了
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
          setDownloadProgress(MAX_PROGRESS);
          return;
        }

        const increment = getIncrement(currentProgress, remainingUpdates);
        currentProgress = Math.min(currentProgress + increment, MAX_PROGRESS);
        setDownloadProgress(Math.floor(currentProgress));
      }, UPDATE_INTERVAL);

      // 辅助函数：停止进度并跳到100%
      const completeProgress = () => {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        setDownloadProgress(100);
      };

      // 使用预处理的音频数据（如果可用），否则重新加载
      let audioBuffer: AudioBuffer | null = audioBufferRef.current;
      let videoMetadata = videoMetadataRef.current;
      const processedAudioData = processedAudioDataRef.current;

      // 如果预处理数据不可用，则重新加载
      if (!audioBuffer) {
        try {
          const audioResponse = await fetch('/video/PE93NhltTYob96tF.mp3');
          const audioArrayBuffer = await audioResponse.arrayBuffer();
          const audioContext = new AudioContext();
          audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
          audioBufferRef.current = audioBuffer;
        } catch (error) {
          console.warn('Failed to load audio file, proceeding without audio:', error);
        }
      }

      // 如果视频元数据不可用，则重新获取
      if (!videoMetadata) {
        const tempVideoUrl = URL.createObjectURL(blob);
        const tempVideoForDuration = document.createElement('video');
        tempVideoForDuration.src = tempVideoUrl;
        tempVideoForDuration.muted = true;

        await new Promise<void>((resolve, reject) => {
          tempVideoForDuration.onloadedmetadata = () => {
            videoMetadata = {
              width: tempVideoForDuration.videoWidth,
              height: tempVideoForDuration.videoHeight,
              duration: tempVideoForDuration.duration,
            };
            videoMetadataRef.current = videoMetadata;
            URL.revokeObjectURL(tempVideoUrl);
            resolve();
          };
          tempVideoForDuration.onerror = () => {
            reject(new Error('Failed to load video metadata'));
            URL.revokeObjectURL(tempVideoUrl);
          };
        });
      }

      const videoDuration = videoMetadata!.duration;

      // 创建输入（支持 MP4 和 WebM）
      const inputFormats = mimeType.startsWith('video/mp4') ? [MP4] : [WEBM];
      const inputOptions = {
        source: new BlobSource(blob),
        formats: inputFormats,
      } as unknown as ConstructorParameters<typeof MediaInput>[0];
      const input = new MediaInput(inputOptions);

      const bufferTarget = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target: bufferTarget,
      });

      // 检查浏览器是否支持音频合并功能
      const supportsAudioMerge = checkAudioMergeSupport();

      // 如果不需要添加音频，或者浏览器不支持音频合并，直接转换并下载
      if (!audioBuffer || !supportsAudioMerge) {
        if (!supportsAudioMerge && audioBuffer) {
          console.warn('Browser does not support audio merging, downloading video without audio');
        }
        const conversion = await Conversion.init({ input, output });
        if (!conversion.isValid) {
          toast.error('video conversion failed');
          completeProgress();
          await new Promise((resolve) => setTimeout(resolve, 300));
          setIsConverting(false);
          setTimeout(() => setDownloadProgress(0), 200);
          return;
        }
        await conversion.execute();
        const { buffer } = bufferTarget;
        if (!buffer) {
          toast.error('video conversion failed');
          completeProgress();
          await new Promise((resolve) => setTimeout(resolve, 300));
          setIsConverting(false);
          setTimeout(() => setDownloadProgress(0), 200);
          return;
        }
        const mp4Blob = new Blob([buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(mp4Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = randomFileName;
        a.click();
        URL.revokeObjectURL(url);
        completeProgress();
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsConverting(false);
        setTimeout(() => setDownloadProgress(0), 200);
        return;
      }

      // 使用 WebCodecs API 和 mediabunny 合并视频和音频
      // 根据 demo 和迁移指南实现
      // 注意：如果合并过程中出现任何错误，将回退到只下载视频

      let videoUrl: string | null = null;
      let videoEncoder: VideoEncoder | null = null;
      let audioEncoder: AudioEncoder | null = null;
      let muxerOutput: Output | null = null;
      let videoElement: HTMLVideoElement | null = null;
      let trackProcessor: MediaStreamTrackProcessor<VideoFrame> | null = null;
      let reader: ReadableStreamDefaultReader<VideoFrame> | null = null;

      try {
        // 运行时再次检查关键 API 是否可用
        if (
          typeof VideoEncoder === 'undefined' ||
          typeof AudioEncoder === 'undefined' ||
          typeof AudioData === 'undefined'
        ) {
          throw new Error('WebCodecs API not available');
        }

        if (typeof MediaStreamTrackProcessor === 'undefined') {
          throw new Error('MediaStreamTrackProcessor not available');
        }

        // 使用预处理的音频数据（如果可用），否则重新处理
        let processedAudioDataToUse = processedAudioData;
        if (!processedAudioDataToUse && audioBuffer) {
          // 如果预处理数据不可用，则重新处理（这种情况应该很少发生）
          const targetDuration = videoDuration;
          const audioFrameCount = Math.round(targetDuration * audioBuffer.sampleRate);
          const numChannels = audioBuffer.numberOfChannels;
          const sampleRate = audioBuffer.sampleRate;
          const processedAudioBuffer = new AudioContext().createBuffer(
            numChannels,
            audioFrameCount,
            sampleRate,
          );

          const sourceFrameCount = audioBuffer.length;
          for (let channel = 0; channel < numChannels; channel++) {
            const sourceData = audioBuffer.getChannelData(channel);
            const targetData = processedAudioBuffer.getChannelData(channel);

            for (let i = 0; i < audioFrameCount; i++) {
              targetData[i] = sourceData[i % sourceFrameCount];
            }
          }

          const planarData = new Float32Array(numChannels * audioFrameCount);
          for (let channel = 0; channel < numChannels; channel++) {
            const channelData = processedAudioBuffer.getChannelData(channel);
            planarData.set(channelData, channel * audioFrameCount);
          }

          processedAudioDataToUse = {
            planarData,
            sampleRate,
            numberOfChannels: numChannels,
            numberOfFrames: audioFrameCount,
          };
        }

        if (!processedAudioDataToUse) {
          throw new Error('Processed audio data not available');
        }

        // 创建 mediabunny Output（类似 mp4-muxer 的 Muxer）
        muxerOutput = new Output({
          format: new Mp4OutputFormat(),
          target: new BufferTarget(),
        });

        // 使用预处理的视频元数据
        let videoWidth = videoMetadata!.width;
        let videoHeight = videoMetadata!.height;
        const frameRate = 30; // 假设 30fps
        videoUrl = URL.createObjectURL(blob);

        // H.264 编码器要求宽度和高度必须是偶数
        // 确保编码器配置的尺寸是偶数
        videoWidth = Math.floor(videoWidth / 2) * 2;
        videoHeight = Math.floor(videoHeight / 2) * 2;

        if (videoWidth <= 0 || videoHeight <= 0) {
          throw new Error(`Invalid video dimensions after rounding: ${videoWidth}x${videoHeight}`);
        }

        console.log('Video encoder dimensions:', videoWidth, videoHeight);

        // 创建视频和音频编码器源
        const videoSource = new EncodedVideoPacketSource('avc');
        const audioSource = new EncodedAudioPacketSource('aac');

        // 添加轨道到 output（必须在 start() 之前）
        muxerOutput.addVideoTrack(videoSource, {
          frameRate: frameRate,
        });
        muxerOutput.addAudioTrack(audioSource);

        // 启动 output
        await muxerOutput.start();

        // 创建 WebCodecs 编码器
        // 视频编码器
        videoEncoder = new VideoEncoder({
          output: async (chunk, meta) => {
            try {
              const packet = EncodedPacket.fromEncodedChunk(chunk);
              await videoSource.add(packet, meta);
            } catch (error) {
              console.error('Error adding video packet:', error);
              throw error;
            }
          },
          error: (e) => {
            console.error('Video encoder error:', e);
            throw e;
          },
        });

        // 使用更高的 AVC level 以支持 1920x1080 分辨率
        // avc1.640028 对应 AVC Level 4.0，支持最大 2048x1024
        // 或者使用 avc1.64001f 对应 AVC Level 3.1，但需要降低分辨率
        const codecString =
          videoWidth * videoHeight > 921600
            ? 'avc1.640028' // Level 4.0，支持更高分辨率
            : 'avc1.42001f'; // Level 3.1，适合较低分辨率

        try {
          videoEncoder.configure({
            codec: codecString,
            width: videoWidth,
            height: videoHeight,
            bitrate: 2e6, // 2 Mbps
          });
        } catch (error) {
          console.error('Failed to configure video encoder:', error);
          throw new Error('Video encoder configuration failed');
        }

        // 音频编码器
        audioEncoder = new AudioEncoder({
          output: async (chunk, meta) => {
            try {
              const packet = EncodedPacket.fromEncodedChunk(chunk);
              await audioSource.add(packet, meta);
            } catch (error) {
              console.error('Error adding audio packet:', error);
              throw error;
            }
          },
          error: (e) => {
            console.error('Audio encoder error:', e);
            throw e;
          },
        });

        try {
          audioEncoder.configure({
            codec: 'mp4a.40.2',
            numberOfChannels: processedAudioDataToUse.numberOfChannels,
            sampleRate: processedAudioDataToUse.sampleRate,
            bitrate: 128000,
          });
        } catch (error) {
          console.error('Failed to configure audio encoder:', error);
          throw new Error('Audio encoder configuration failed');
        }

        // 从录制的视频中提取视频帧并重新编码
        videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        videoElement.muted = true;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata loading timeout'));
          }, 10000);
          videoElement!.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          videoElement!.onerror = (_e) => {
            clearTimeout(timeout);
            reject(new Error('Failed to load video metadata'));
          };
        });

        // 创建视频流 - 运行时检查 captureStream
        // @ts-expect-error - captureStream may not be in TypeScript definitions
        if (!videoElement.captureStream || typeof videoElement.captureStream !== 'function') {
          throw new Error('captureStream is not supported');
        }

        // @ts-expect-error - captureStream may not be in TypeScript definitions
        const stream = videoElement.captureStream();
        if (!stream) {
          throw new Error('Failed to create video stream');
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error('No video track found in stream');
        }

        // 运行时检查 MediaStreamTrackProcessor
        if (typeof MediaStreamTrackProcessor === 'undefined') {
          throw new Error('MediaStreamTrackProcessor is not available');
        }

        trackProcessor = new MediaStreamTrackProcessor({
          track: videoTrack,
        }) as unknown as MediaStreamTrackProcessor<VideoFrame>;
        reader = trackProcessor.readable.getReader();

        // 处理视频帧
        const processVideoFrames = async () => {
          let frameCounter = 0;
          let hasError = false;

          try {
            await videoElement!.play();

            while (true) {
              const { done, value } = await reader!.read();
              if (done) break;

              if (value && videoEncoder && videoEncoder.state === 'configured') {
                try {
                  // value 是 VideoFrame，添加类型断言（通过 unknown 转换）
                  const videoFrame = value as unknown as VideoFrame;
                  const timestamp = (frameCounter * 1000000) / frameRate;
                  // 如果需要修改时间戳，创建新的 VideoFrame
                  const frame = new VideoFrame(videoFrame, { timestamp });
                  videoEncoder.encode(frame, {
                    keyFrame: frameCounter % (frameRate * 2) === 0, // 每 2 秒一个关键帧
                  });
                  frame.close();
                  videoFrame.close(); // 关闭原始 frame
                  frameCounter++;
                } catch (error) {
                  console.error('Error encoding frame:', error);
                  hasError = true;
                  throw error;
                }
              }
            }

            // 只有在编码器仍然打开时才调用 flush
            if (videoEncoder && videoEncoder.state !== 'closed' && !hasError) {
              await videoEncoder.flush();
            }
          } catch (error) {
            console.error('Error processing video frames:', error);
            hasError = true;
            throw error;
          } finally {
            videoElement!.pause();
            // 确保所有资源都被清理
            if (reader) {
              try {
                reader.releaseLock();
              } catch (_e) {
                // 忽略释放锁的错误
              }
            }
            if (trackProcessor) {
              try {
                trackProcessor.readable.cancel();
              } catch (_e) {
                // 忽略取消的错误
              }
            }
          }
        };

        // 处理音频数据（使用预处理的数据）
        const processAudio = async () => {
          if (!processedAudioDataToUse || !audioEncoder) {
            return;
          }

          try {
            // 运行时检查 AudioData
            if (typeof AudioData === 'undefined') {
              throw new Error('AudioData is not available');
            }

            // 使用预处理的音频数据
            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: processedAudioDataToUse.sampleRate,
              numberOfFrames: processedAudioDataToUse.numberOfFrames,
              numberOfChannels: processedAudioDataToUse.numberOfChannels,
              timestamp: 0,
              // @ts-expect-error - AudioData accepts ArrayBufferView but TypeScript types may be strict
              data: processedAudioDataToUse.planarData,
            });

            audioEncoder.encode(audioData);
            audioData.close();
            await audioEncoder.flush();
          } catch (error) {
            console.error('Error processing audio:', error);
            throw error;
          }
        };

        // 并行处理视频和音频
        await Promise.all([processVideoFrames(), processAudio()]);

        // 完成编码（确保编码器仍然打开）
        if (videoEncoder && videoEncoder.state !== 'closed') {
          try {
            await videoEncoder.flush();
          } catch (error) {
            console.warn('Video encoder flush error (may already be flushed):', error);
          }
          videoEncoder.close();
        }
        if (audioEncoder && audioEncoder.state !== 'closed') {
          try {
            await audioEncoder.flush();
          } catch (error) {
            console.warn('Audio encoder flush error (may already be flushed):', error);
          }
          audioEncoder.close();
        }

        // 完成输出
        await muxerOutput.finalize();

        // 获取最终结果
        const { buffer: finalBuffer } = muxerOutput.target as BufferTarget;
        if (!finalBuffer) {
          throw new Error('Failed to get final buffer from muxer');
        }

        const mp4Blob = new Blob([finalBuffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(mp4Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = randomFileName;
        a.click();
        URL.revokeObjectURL(url);
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }
        completeProgress();
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsConverting(false);
        setTimeout(() => setDownloadProgress(0), 200);
        return; // 成功完成，直接返回
      } catch (error) {
        console.warn('Audio merge failed, falling back to video-only download:', error);

        // 清理资源
        try {
          if (videoEncoder && videoEncoder.state !== 'closed') {
            videoEncoder.close();
          }
        } catch (_e) {
          // 忽略清理错误
        }
        try {
          if (audioEncoder && audioEncoder.state !== 'closed') {
            audioEncoder.close();
          }
        } catch (_e) {
          // 忽略清理错误
        }
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }
        if (videoElement) {
          videoElement.pause();
          videoElement.src = '';
        }
        if (reader) {
          try {
            reader.releaseLock();
          } catch (_e) {
            // 忽略释放锁的错误
          }
        }
        if (trackProcessor) {
          try {
            trackProcessor.readable.cancel();
          } catch (_e) {
            // 忽略取消的错误
          }
        }

        // 回退到只下载视频（不合并音频）
        console.log('Falling back to video-only download');
        try {
          const fallbackInput = new MediaInput({
            source: new BlobSource(blob),
            formats: mimeType.startsWith('video/mp4') ? [MP4] : [WEBM],
          } as unknown as ConstructorParameters<typeof MediaInput>[0]);
          const fallbackBufferTarget = new BufferTarget();
          const fallbackOutput = new Output({
            format: new Mp4OutputFormat(),
            target: fallbackBufferTarget,
          });

          const fallbackConversion = await Conversion.init({
            input: fallbackInput,
            output: fallbackOutput,
          });
          if (!fallbackConversion.isValid) {
            toast.error('video conversion failed');
            completeProgress();
            await new Promise((resolve) => setTimeout(resolve, 300));
            setIsConverting(false);
            setTimeout(() => setDownloadProgress(0), 200);
            return;
          }
          await fallbackConversion.execute();
          const { buffer: fallbackBuffer } = fallbackBufferTarget;
          if (!fallbackBuffer) {
            toast.error('video conversion failed');
            completeProgress();
            await new Promise((resolve) => setTimeout(resolve, 300));
            setIsConverting(false);
            setTimeout(() => setDownloadProgress(0), 200);
            return;
          }
          const fallbackMp4Blob = new Blob([fallbackBuffer], { type: 'video/mp4' });
          const fallbackUrl = URL.createObjectURL(fallbackMp4Blob);
          const fallbackA = document.createElement('a');
          fallbackA.href = fallbackUrl;
          fallbackA.download = randomFileName;
          fallbackA.click();
          URL.revokeObjectURL(fallbackUrl);
          completeProgress();
          await new Promise((resolve) => setTimeout(resolve, 300));
          setIsConverting(false);
          setTimeout(() => setDownloadProgress(0), 200);
        } catch (fallbackError) {
          console.error('Fallback video conversion also failed:', fallbackError);
          toast.error('video conversion failed');
          completeProgress();
          await new Promise((resolve) => setTimeout(resolve, 300));
          setIsConverting(false);
          setTimeout(() => setDownloadProgress(0), 200);
          return;
        }
      } finally {
        setIsConverting(false);
      }
    } catch (error) {
      // 处理主 try 块的错误
      console.error('Download failed:', error);
      // 停止进度定时器并跳到100%
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setDownloadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsConverting(false);
      setTimeout(() => setDownloadProgress(0), 200);
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
              src={isMobile ? '/video/1-4-mb.mp4' : '/video/1-4.mp4'}
              className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
              playsInline
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
                    disabled={isMobile ? false : !recordedBlobRef.current}
                    className="bg-black px-2 hover:bg-black/80 text-white flex-1 sm:w-50 w-[260px] flex flex-row gap-2 items-center relative overflow-hidden"
                    style={{
                      background:
                        !isMobile && downloadProgress > 0
                          ? `linear-gradient(to right, #5F57F2 ${downloadProgress}%, black ${downloadProgress}%)`
                          : undefined,
                    }}
                  >
                    {isMobile || (!isRecording && !isConverting) ? (
                      <Download size="sm" color="#fff" className="size-4 relative z-10" />
                    ) : (
                      <Loader className="size-4 animate-spin" color="#fff" />
                    )}
                    <span className="relative z-10">
                      {isMobile ? 'Use PC to Download' : 'Download Video'}
                    </span>
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
