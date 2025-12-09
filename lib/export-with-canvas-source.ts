/**
 * 使用 CanvasSource 直接导出视频
 * 
 * 这个实现允许按时间点渲染 canvas，无需先录制
 * 关键点：
 * 1. 使用离屏 canvas 进行渲染
 * 2. 通过设置 video.currentTime 跳转到任意时间点
 * 3. 根据时间点计算数字动画的进度
 */

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from 'mediabunny';

export interface CanvasExportOptions {
  // 视频元素（用于获取视频帧）
  videoElement: HTMLVideoElement;
  // Canvas 尺寸
  canvasWidth: number;
  canvasHeight: number;
  // 导出参数
  amount: number;
  tokenName: string;
  overlayDelayMs: number; // 数字动画延迟时间（毫秒）
  duration: number; // 总时长（秒）
  frameRate?: number; // 帧率，默认 30
  audioBuffer?: AudioBuffer | null; // 可选的音频
  onProgress?: (progress: number) => void; // 进度回调 (0-1)
  onCancel?: () => boolean; // 取消检查函数
}

export interface CanvasExportResult {
  success: boolean;
  buffer?: ArrayBuffer;
  error?: string;
  cancelled?: boolean;
}

/**
 * 根据时间点计算数字动画的显示值
 */
function calculateAnimationValue(
  timeMs: number,
  overlayDelayMs: number,
  amount: number,
  duration: number = 1500,
): string {
  const progress = Math.min((timeMs - overlayDelayMs) / duration, 1);
  
  if (progress <= 0) {
    return '0';
  }

  const decimalPlaces = getDecimalPlaces(amount);
  const scale = Math.pow(10, decimalPlaces);
  const targetScaledValue = Math.round(amount * scale);
  const isSubUnitAmount = amount > 0 && amount < 1;
  const startScaledValue = isSubUnitAmount && targetScaledValue > 0 ? 1 : 0;

  const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
  const interpolated =
    startScaledValue + (targetScaledValue - startScaledValue) * easedProgress;
  const animatedScaledValue = progress < 1 ? Math.round(interpolated) : targetScaledValue;
  const safeScaledValue = Math.min(
    targetScaledValue,
    Math.max(startScaledValue, animatedScaledValue),
  );

  return formatAmount(safeScaledValue, decimalPlaces, scale);
}

function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const valueString = value.toString();
  if (valueString.includes('e-')) {
    const [, exponentPart] = valueString.split('e-');
    const exponent = Number(exponentPart);
    return Number.isNaN(exponent) ? 0 : exponent;
  }

  const fraction = valueString.split('.')[1];
  return fraction ? fraction.length : 0;
}

function formatIntegerPart(value: number) {
  return Math.trunc(value).toLocaleString('en-US');
}

function formatAmount(scaledValue: number, decimalPlaces: number, scale: number): string {
  if (decimalPlaces === 0) {
    return formatIntegerPart(scaledValue);
  }

  const integerPart = Math.floor(scaledValue / scale);
  const fractionalPartNumber = Math.abs(scaledValue % scale);
  const paddedFraction = fractionalPartNumber
    .toString()
    .padStart(decimalPlaces, '0')
    .replace(/0+$/, '');

  if (paddedFraction) {
    return `${formatIntegerPart(integerPart)}.${paddedFraction}`;
  }

  return formatIntegerPart(integerPart);
}

/**
 * 在指定时间点渲染一帧到 canvas
 */
async function renderFrameAtTime(
  ctx: CanvasRenderingContext2D,
  videoElement: HTMLVideoElement,
  timeSeconds: number,
  canvasWidth: number,
  canvasHeight: number,
  amount: number,
  tokenName: string,
  overlayDelayMs: number,
): Promise<void> {
  // 设置视频时间点
  videoElement.currentTime = timeSeconds;

  // 等待视频 seek 完成并准备好帧
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Video seek timeout'));
    }, 5000);

    const onSeeked = () => {
      clearTimeout(timeout);
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);
      
      // 确保视频已准备好
      if (videoElement.readyState >= 2) {
        resolve();
      } else {
        // 如果还没准备好，等待 loadeddata 事件
        const onLoadedData = () => {
          videoElement.removeEventListener('loadeddata', onLoadedData);
          resolve();
        };
        videoElement.addEventListener('loadeddata', onLoadedData);
      }
    };

    const onError = () => {
      clearTimeout(timeout);
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);
      reject(new Error('Video seek error'));
    };

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.addEventListener('error', onError);

    // 如果已经 seek 完成，立即 resolve
    if (Math.abs(videoElement.currentTime - timeSeconds) < 0.1) {
      onSeeked();
    }
  });

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 绘制视频帧
  try {
    ctx.drawImage(videoElement, 0, 0, canvasWidth, canvasHeight);
  } catch (error) {
    console.warn('Failed to draw video frame:', error);
    // 继续执行，即使视频帧绘制失败
  }

  // 计算时间点（毫秒）
  const timeMs = timeSeconds * 1000;

  // 如果时间点超过 overlayDelayMs，绘制数字动画
  if (timeMs >= overlayDelayMs) {
    const displayText = calculateAnimationValue(timeMs, overlayDelayMs, amount);
    const isMobile = canvasWidth < 768;
    const baseSize = Math.min(canvasWidth, canvasHeight);
    const amountFontSize = isMobile ? 48 : baseSize * 0.22;
    const labelFontSize = baseSize * 0.125 * (tokenName === 'MON' ? 0.66 : 0.7);

    // 绘制数字
    ctx.font = `800 ${amountFontSize}px 'Britti Sans', 'Inter', sans-serif`;
    const textMetrics = ctx.measureText(displayText);
    const ascent = textMetrics.fontBoundingBoxAscent ?? 96;
    const descent = textMetrics.fontBoundingBoxDescent ?? 24;
    const textHeight = Math.max(ascent + descent, 120);
    const textTop = canvasHeight / 2 - textHeight / 2;
    const textBottom = canvasHeight / 2 + textHeight / 2;
    const gradient = ctx.createLinearGradient(0, textTop, 0, textBottom);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.4, '#FFFFFF');
    gradient.addColorStop(1, '#6A63F3');

    ctx.lineJoin = 'round';
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#05000F';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const amountCenterX = isMobile ? canvasWidth / 2 : canvasWidth / 2;
    const amountCenterY = isMobile ? canvasHeight * 0.44 : canvasHeight / 2;
    ctx.strokeText(displayText, amountCenterX, amountCenterY);
    ctx.fillStyle = gradient;
    ctx.fillText(displayText, amountCenterX, amountCenterY);

    // 绘制标签
    const labelBaselineY = isMobile ? canvasHeight * 0.584 : canvasHeight * 0.74;
    ctx.font = `800 ${labelFontSize}px 'Aeonik', 'Inter', sans-serif`;
    const labelMetrics = ctx.measureText(`$${tokenName}`);
    const labelAscent = labelMetrics.fontBoundingBoxAscent ?? 54;
    const labelDescent = labelMetrics.fontBoundingBoxDescent ?? 18;
    const labelHeight = Math.max(labelAscent + labelDescent, 72);
    const labelTop = labelBaselineY - labelHeight;
    const labelBottom = labelBaselineY;
    const labelGradient = ctx.createLinearGradient(0, labelTop, 0, labelBottom);
    labelGradient.addColorStop(0, '#FFFFFF');
    labelGradient.addColorStop(0.4, '#FFFFFF');
    labelGradient.addColorStop(1, '#6A63F3');
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#05000F';

    const labelX = isMobile
      ? canvasWidth / 2
      : tokenName === 'MON'
        ? canvasWidth * 0.93
        : canvasWidth * 0.91;
    ctx.textAlign = isMobile ? 'center' : 'right';
    ctx.textBaseline = 'bottom';
    ctx.strokeText(`$${tokenName}`, labelX, labelBaselineY);
    ctx.fillStyle = labelGradient;
    ctx.fillText(`$${tokenName}`, labelX, labelBaselineY);
  }
}

/**
 * 创建与视频时长匹配的音频缓冲区
 */
async function createAudioBufferForDuration(
  sourceAudioBuffer: AudioBuffer,
  targetDuration: number,
): Promise<AudioBuffer> {
  const audioContext = new AudioContext();
  const targetFrameCount = Math.round(targetDuration * sourceAudioBuffer.sampleRate);
  const numChannels = sourceAudioBuffer.numberOfChannels;
  const sampleRate = sourceAudioBuffer.sampleRate;

  const outputBuffer = audioContext.createBuffer(
    numChannels,
    targetFrameCount,
    sampleRate,
  );

  // 如果音频比视频短，则循环填充；如果长，则截取
  const sourceFrameCount = sourceAudioBuffer.length;
  for (let channel = 0; channel < numChannels; channel++) {
    const sourceData = sourceAudioBuffer.getChannelData(channel);
    const targetData = outputBuffer.getChannelData(channel);

    for (let i = 0; i < targetFrameCount; i++) {
      targetData[i] = sourceData[i % sourceFrameCount];
    }
  }

  return outputBuffer;
}

/**
 * 使用 CanvasSource 直接导出视频
 */
export async function exportWithCanvasSource(
  options: CanvasExportOptions,
): Promise<CanvasExportResult> {
  const {
    videoElement,
    canvasWidth,
    canvasHeight,
    amount,
    tokenName,
    overlayDelayMs,
    duration,
    frameRate = 30,
    audioBuffer,
    onProgress,
    onCancel,
  } = options;

  try {
    // 创建离屏 canvas 用于导出
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const exportCtx = exportCanvas.getContext('2d', {
      alpha: false, // 不透明，性能更好
      willReadFrequently: false,
    });

    if (!exportCtx) {
      return { success: false, error: 'Failed to create canvas context' };
    }

    // 设置高质量渲染
    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';

    // 创建输出
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    // 创建视频源
    const videoSource = new CanvasSource(exportCanvas, {
      codec: 'avc', // H.264
      bitrate: QUALITY_HIGH,
    });

    output.addVideoTrack(videoSource, { frameRate });

    // 添加音频（如果提供）
    let audioSource: AudioBufferSource | null = null;
    if (audioBuffer) {
      onProgress?.(0.05); // 5% 用于音频处理

      // const processedAudioBuffer = await createAudioBufferForDuration(
      //   audioBuffer,
      //   duration,
      // );

      audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: QUALITY_HIGH,
      });

      output.addAudioTrack(audioSource);
    }

    // 启动输出
    await output.start();

    // 添加音频数据
    if (audioSource && audioBuffer) {
      const processedAudioBuffer = await createAudioBufferForDuration(
        audioBuffer,
        duration,
      );
      await audioSource.add(processedAudioBuffer);
      audioSource.close();
    }

    // 确保视频元素已加载
    if (videoElement.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);

        videoElement.addEventListener('loadeddata', () => {
          clearTimeout(timeout);
          resolve();
        });

        videoElement.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Video loading error'));
        });
      });
    }

    // 渲染每一帧
    const totalFrames = Math.ceil(duration * frameRate);
    let cancelled = false;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // 检查取消
      if (onCancel?.()) {
        cancelled = true;
        break;
      }

      const time = frameIndex / frameRate;
      const frameDuration = 1 / frameRate;

      // 根据时间点渲染 canvas
      try {
        await renderFrameAtTime(
          exportCtx,
          videoElement,
          time,
          canvasWidth,
          canvasHeight,
          amount,
          tokenName,
          overlayDelayMs,
        );
      } catch (error) {
        console.warn(`Failed to render frame at ${time}s:`, error);
        // 继续处理下一帧
        continue;
      }

      // 添加帧到视频源
      await videoSource.add(time, frameDuration);

      // 更新进度
      const videoProgress = audioBuffer
        ? 0.05 + (frameIndex / totalFrames) * 0.95
        : frameIndex / totalFrames;
      onProgress?.(videoProgress);
    }

    if (cancelled) {
      await output.cancel();
      return { success: false, cancelled: true };
    }

    videoSource.close();
    await output.finalize();

    onProgress?.(1);

    const { buffer } = output.target as BufferTarget;
    if (!buffer) {
      return { success: false, error: 'Failed to get output buffer' };
    }

    return {
      success: true,
      buffer,
    };
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
}
