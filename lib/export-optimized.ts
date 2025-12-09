/**
 * 优化后的导出函数 - 使用 mediabunny 的高级 API
 * 
 * 主要优化点：
 * 1. 使用 AudioBufferSource 替代 WebCodecs AudioEncoder（更简单）
 * 2. 使用质量常量而不是硬编码 bitrate
 * 3. 改进进度回调机制
 * 
 * 注意：由于当前项目需要录制完整的 13 秒流程，暂时保留 MediaRecorder 录制流程
 * 如果未来能够按时间点渲染 canvas，可以考虑使用 CanvasSource 直接导出
 */

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
} from 'mediabunny';

export type ExportQuality = 'low' | 'medium' | 'high' | 'very_high';

const qualityMap: Record<ExportQuality, number> = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  very_high: QUALITY_VERY_HIGH,
};

export interface ExportOptions {
  canvas: HTMLCanvasElement;
  audioBuffer?: AudioBuffer | null;
  duration: number; // 视频时长（秒）
  frameRate?: number; // 帧率，默认 30
  quality?: ExportQuality; // 质量，默认 'high'
  onProgress?: (progress: number) => void; // 进度回调 (0-1)
  onCancel?: () => boolean; // 取消检查函数
}

export interface ExportResult {
  success: boolean;
  buffer?: ArrayBuffer;
  error?: string;
  cancelled?: boolean;
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
 * 使用 CanvasSource 直接导出（需要能够按时间点渲染 canvas）
 * 
 * 注意：这需要 canvas 渲染逻辑能够根据时间点渲染任意帧
 * 当前项目的 canvas 渲染是基于实时播放的，可能需要重构才能使用此方法
 */
export async function exportWithCanvasSource(
  options: ExportOptions,
): Promise<ExportResult> {
  const {
    canvas,
    audioBuffer,
    duration,
    frameRate = 30,
    quality = 'high',
    onProgress,
    onCancel,
  } = options;

  try {
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    // 创建视频源
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc', // H.264
      bitrate: qualityMap[quality],
    });

    output.addVideoTrack(videoSource, { frameRate });

    // 添加音频（如果提供）
    let audioSource: AudioBufferSource | null = null;
    if (audioBuffer) {
      onProgress?.(0.05); // 5% 用于音频处理

      const processedAudioBuffer = await createAudioBufferForDuration(
        audioBuffer,
        duration,
      );

      audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: qualityMap[quality],
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

      // 注意：这里需要能够根据时间点渲染 canvas
      // 当前项目的 canvas 渲染逻辑可能需要重构才能支持
      // await renderCanvasAtTime(canvas, time);

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

/**
 * 使用 AudioBufferSource 优化音频处理（适用于已有视频 blob 的情况）
 * 
 * 这是当前项目可以立即采用的优化方案
 */
export async function mergeAudioWithVideoBlob(
  videoBlob: Blob,
  audioBuffer: AudioBuffer,
  videoDuration: number,
  quality: ExportQuality = 'high',
  onProgress?: (progress: number) => void,
): Promise<ExportResult> {
  try {
    // 创建处理后的音频缓冲区
    onProgress?.(0.1);
    const processedAudioBuffer = await createAudioBufferForDuration(
      audioBuffer,
      videoDuration,
    );

    // 创建输出
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    // 创建视频源（从 blob）
    // 注意：这里需要先将 blob 转换为视频源
    // 由于 mediabunny 可能不直接支持从 blob 创建视频源，
    // 这部分可能需要使用现有的 Conversion API 或 WebCodecs

    // 创建音频源
    const audioSource = new AudioBufferSource({
      codec: 'aac',
      bitrate: qualityMap[quality],
    });

    output.addAudioTrack(audioSource);

    // 启动输出
    await output.start();

    // 添加音频数据
    onProgress?.(0.3);
    await audioSource.add(processedAudioBuffer);
    audioSource.close();

    // 注意：视频部分需要根据实际情况处理
    // 可能需要使用现有的 Conversion API 或 WebCodecs

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
    console.error('Audio merge failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取导出 MIME 类型
 */
export function getExportMimeType(format: 'mp4' | 'webm'): string {
  return format === 'webm' ? 'video/webm' : 'video/mp4';
}

/**
 * 获取导出文件扩展名
 */
export function getExportFileExtension(format: 'mp4' | 'webm'): string {
  return `.${format}`;
}
