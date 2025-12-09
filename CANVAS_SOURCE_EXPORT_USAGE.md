# 使用 CanvasSource 直接导出 - 使用指南

## 概述

`export-with-canvas-source.ts` 提供了一个使用 CanvasSource 直接导出的实现，无需先录制再转换。

## 关键特性

1. **按时间点渲染**：通过设置 `video.currentTime` 跳转到任意时间点
2. **数字动画计算**：根据时间点计算数字动画的进度，无需实时播放
3. **离屏渲染**：使用离屏 canvas 进行渲染，不影响显示
4. **直接导出**：使用 CanvasSource 直接从 canvas 生成视频帧

## 使用方法

### 在 claim-boxes.tsx 中集成

```typescript
import { exportWithCanvasSource } from '@/lib/export-with-canvas-source';

// 在 handleDownloadVideo 函数中，替换现有的导出逻辑
const handleDownloadVideoWithCanvasSource = async () => {
  if (isRecording || isConverting || downloadProgress > 0) {
    return;
  }

  if (isMobile) {
    toast.warning(
      'Due to mobile performance limitations, please use a PC browser to download the video.',
    );
    return;
  }

  // 获取必要的参数
  const videoElement = videoRef.current;
  if (!videoElement) {
    toast.error('Video element not available');
    return;
  }

  // 获取 canvas 尺寸
  const containerRect = canvasContainerRef.current?.getBoundingClientRect();
  const canvasWidth = containerRect?.width ?? 1920;
  const canvasHeight = containerRect?.height ?? 1080;

  // 获取音频（如果可用）
  let audioBuffer: AudioBuffer | null = audioBufferRef.current;
  if (!audioBuffer) {
    try {
      const audioResponse = await fetch('/video/PE93NhltTYob96tF.mp3');
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      const audioContext = new AudioContext();
      audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
    } catch (error) {
      console.warn('Failed to load audio file, proceeding without audio:', error);
    }
  }

  const randomFileName = `${Math.floor(Math.random() * 1e10)
    .toString()
    .padStart(10, '0')}.mp4`;

  try {
    setIsConverting(true);
    setDownloadProgress(0);

    const result = await exportWithCanvasSource({
      videoElement,
      canvasWidth,
      canvasHeight,
      amount: Number(onOpeningBox?.amount ?? 0),
      tokenName: onOpeningBox?.asset ?? '',
      overlayDelayMs: 6500,
      duration: 13, // 13秒
      frameRate: 30,
      audioBuffer,
      onProgress: (progress) => {
        setDownloadProgress(Math.floor(progress * 100));
      },
    });

    if (!result.success) {
      if (result.cancelled) {
        toast.info('Export cancelled');
      } else {
        toast.error(result.error || 'Export failed');
      }
      setIsConverting(false);
      setTimeout(() => setDownloadProgress(0), 200);
      return;
    }

    // 下载视频
    if (result.buffer) {
      const mp4Blob = new Blob([result.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = randomFileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setIsConverting(false);
    setTimeout(() => setDownloadProgress(0), 200);
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Export failed');
    setIsConverting(false);
    setTimeout(() => setDownloadProgress(0), 200);
  }
};
```

## 工作原理

### 1. 视频帧获取
- 通过设置 `videoElement.currentTime = timeSeconds` 跳转到指定时间点
- 等待 `seeked` 事件确保视频帧已准备好
- 使用 `ctx.drawImage(videoElement, ...)` 绘制视频帧

### 2. 数字动画计算
- 根据时间点计算动画进度：`progress = (timeMs - overlayDelayMs) / duration`
- 使用缓动函数计算动画值：`easedProgress = 1 - (1 - progress)^3`
- 根据进度计算显示的数值

### 3. 逐帧渲染
- 循环遍历每一帧（基于 frameRate）
- 对每一帧：
  1. 设置视频时间点
  2. 等待视频 seek 完成
  3. 渲染视频帧
  4. 如果时间点超过 overlayDelayMs，渲染数字动画
  5. 将帧添加到 CanvasSource

## 优势

1. **无需录制**：不需要先录制再转换，减少内存占用
2. **精确控制**：可以精确控制每一帧的渲染
3. **可重复**：可以多次导出，结果一致
4. **性能更好**：避免了 MediaRecorder 的中间步骤

## 注意事项

1. **视频加载**：确保视频元素已加载完成（`readyState >= 2`）
2. **Seek 延迟**：每次 seek 需要等待，可能比实时播放慢
3. **内存使用**：虽然不需要录制，但需要处理每一帧
4. **浏览器兼容性**：需要支持 CanvasSource 和视频 seek 功能

## 性能考虑

- **帧率**：默认 30fps，可以根据需要调整
- **分辨率**：使用实际需要的分辨率，避免过大
- **音频**：音频处理在视频渲染之前完成，不阻塞视频渲染

## 与当前实现的对比

| 特性 | 当前实现（MediaRecorder） | CanvasSource 实现 |
|------|-------------------------|------------------|
| 内存占用 | 需要存储录制的 blob | 不需要存储中间结果 |
| 导出速度 | 需要先录制再转换 | 直接导出 |
| 精确度 | 依赖实时播放 | 可以精确控制每一帧 |
| 可重复性 | 每次录制可能略有差异 | 结果完全一致 |
| 复杂度 | 需要处理录制和转换 | 需要处理 seek 和渲染 |

## 建议

- **首次使用**：可以先测试小段视频（如 3-5 秒）验证功能
- **性能测试**：在目标设备上测试导出速度
- **错误处理**：添加适当的错误处理和用户反馈
- **回退方案**：保留现有的 MediaRecorder 实现作为回退
