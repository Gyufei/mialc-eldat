'use client';

import { useEffect, useRef } from 'react';

type CanvasAnimationProps = {
  amount: number;
  tokenName: string;
  /**
   * 可选的视频元素，会在每一帧绘制到 canvas 作为背景。
   */
  videoElement?: HTMLVideoElement | null;
  /**
   * canvas 就绪时的回调，方便外部通过 captureStream 做录制。
   */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  /**
   * 叠加数字动画的延迟时间（毫秒），用于前几秒只显示视频。
   */
  overlayDelayMs?: number;
};

// 移动端文字在画布中心线基础上的微调比例（负值表示整体稍微往左）
const MOBILE_TEXT_CENTER_OFFSET_RATIO = -0.02;

const getDecimalPlaces = (value: number) => {
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
};

const formatIntegerPart = (value: number) => Math.trunc(value).toLocaleString('en-US');

export default function CanvasAnimation({
  amount,
  tokenName,
  videoElement,
  onCanvasReady,
  overlayDelayMs = 0,
}: CanvasAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // 将 canvas 暴露给外部（用于录制）
    onCanvasReady?.(canvas);

    let currentWidth = 0;
    let currentHeight = 0;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const isMobileNow = window.innerWidth < 768;
      currentWidth = isMobileNow ? window.innerWidth : rect.width;
      currentHeight = rect.height;

      if (currentWidth === 0 || currentHeight === 0) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = currentWidth * dpr;
      canvas.height = currentHeight * dpr;
      canvas.style.width = `${currentWidth}px`;
      canvas.style.height = `${currentHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();

    let animationFrameId: number;
    // 避免在 overlayDelayMs 边界来回抖动：一旦进入 overlay 阶段，就不再退回
    let hasOverlayStarted = false;
    const duration = 1500;
    const decimalPlaces = getDecimalPlaces(amount);
    const scale = Math.pow(10, decimalPlaces);
    const targetScaledValue = Math.round(amount * scale);
    const isSubUnitAmount = amount > 0 && amount < 1;
    const startScaledValue = isSubUnitAmount && targetScaledValue > 0 ? 1 : 0;
    const formatter = (scaledValue: number) => {
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
    };
    const startTime = performance.now();

    const render = () => {
      if (!currentWidth || !currentHeight) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const elapsed = now - startTime;

      // 优先使用视频实际播放时间来控制叠加时机，避免加载/卡顿导致偏移
      const playbackMs =
        videoElement && !Number.isNaN(videoElement.currentTime)
          ? videoElement.currentTime * 1000
          : elapsed;

      const isVideoReady = !!videoElement && videoElement.readyState >= 2;

      // 阶段切换采用“闸门式”逻辑，避免在 overlayDelayMs 附近抖动
      if (!hasOverlayStarted && playbackMs >= overlayDelayMs) {
        hasOverlayStarted = true;
      }

      const shouldRenderOverlay = hasOverlayStarted;

      // 如果当前这一帧既没法画视频、也不需要画文字，就不要清空画布，避免黑屏闪一下
      if (!isVideoReady && !shouldRenderOverlay) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // 先清空画布
      ctx.clearRect(0, 0, currentWidth, currentHeight);

      // 每一帧都尝试绘制视频画面作为背景
      if (isVideoReady) {
        try {
          const isMobileNow = window.innerWidth < 768;

          // 移动端：保持视频原始比例，使用「cover」策略，超出画布部分裁切掉
          if (isMobileNow) {
            const videoW = videoElement.videoWidth || currentWidth;
            const videoH = videoElement.videoHeight || currentHeight;

            if (videoW > 0 && videoH > 0) {
              const scale = Math.max(currentWidth / videoW, currentHeight / videoH);
              const drawW = videoW * scale;
              const drawH = videoH * scale;

              // 先按居中计算，再额外向左偏移一小段比例（比如 8% 的画布宽度）
              const baseDx = (currentWidth - drawW) / 2;
              // const dxOffset = currentWidth * MOBILE_VIDEO_X_OFFSET_RATIO;
              const dx = baseDx; //- dxOffset;

              const dy = (currentHeight - drawH) / 2;

              ctx.drawImage(videoElement, dx, dy, drawW, drawH);
            } else {
              // 回退：如果拿不到视频尺寸，就退化为拉伸铺满
              ctx.drawImage(videoElement, 0, 0, currentWidth, currentHeight);
            }
          } else {
            // 桌面端：保持现有逻辑，直接铺满整个画布
            ctx.drawImage(videoElement, 0, 0, currentWidth, currentHeight);
          }
        } catch {
          // 某些情况下 drawImage 可能抛错（跨域、未准备好等），忽略即可
        }
      }

      // 在 overlayDelayMs 之前，只渲染视频，不渲染文字
      if (!shouldRenderOverlay) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const progress = Math.min((playbackMs - overlayDelayMs) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const interpolated =
        startScaledValue + (targetScaledValue - startScaledValue) * easedProgress;
      const animatedScaledValue = progress < 1 ? Math.round(interpolated) : targetScaledValue;
      const safeScaledValue = Math.min(
        targetScaledValue,
        Math.max(startScaledValue, animatedScaledValue)
      );
      const displayText =
        amount === 0 ? '0' : formatter(targetScaledValue === 0 ? 0 : safeScaledValue);

      // 根据对话框中的实际可用尺寸自适应字号，避免在不同设备/窗口尺寸下字体过大
      const isMobileNow = window.innerWidth < 768;
      const baseSize = Math.min(currentWidth, currentHeight);
      const amountFontSize = isMobileNow ? 48 : baseSize * 0.22;
      const labelFontSize = baseSize * 0.125 * 0.75;

      ctx.font = `800 ${amountFontSize}px 'Britti Sans', 'Inter', sans-serif`;
      const textMetrics = ctx.measureText(displayText);
      const ascent = textMetrics.fontBoundingBoxAscent ?? 96;
      const descent = textMetrics.fontBoundingBoxDescent ?? 24;
      const textHeight = Math.max(ascent + descent, 120);
      const textTop = currentHeight / 2 - textHeight / 2;
      const textBottom = currentHeight / 2 + textHeight / 2;
      const gradient = ctx.createLinearGradient(0, textTop, 0, textBottom);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.4, '#FFFFFF');
      gradient.addColorStop(1, '#6A63F3');

      ctx.lineJoin = 'round';
      ctx.lineWidth = 20;
      ctx.strokeStyle = '#05000F';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 桌面端：严格以画布中心对齐；移动端：在画布中心基础上整体微调一点点偏左
      const amountCenterX = isMobileNow
        ? currentWidth / 2 + currentWidth * MOBILE_TEXT_CENTER_OFFSET_RATIO
        : currentWidth / 2;
      ctx.strokeText(displayText, amountCenterX, currentHeight / 2);
      ctx.fillStyle = gradient;
      ctx.fillText(displayText, amountCenterX, currentHeight / 2);

      // const labelBaselineY = textBottom + currentHeight * 0.128;
      const labelBaselineY = isMobileNow ? currentHeight * 0.7 : currentHeight * 0.74;
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

      // 移动端：tokenName 与 amount 使用同样的中心偏移；桌面端保留原逻辑靠右
      const labelX = isMobileNow
        ? currentWidth / 2 + currentWidth * MOBILE_TEXT_CENTER_OFFSET_RATIO
        : currentWidth * 0.92;
      ctx.textAlign = isMobileNow ? 'center' : 'right';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(`$${tokenName}`, labelX, labelBaselineY);
      ctx.fillStyle = labelGradient;
      ctx.fillText(`$${tokenName}`, labelX, labelBaselineY);

      // 无论数字动画是否结束，都继续请求下一帧：
      // - 数字动画在 progress 达到 1 后会保持最终数值不变
      // - 背景视频则可以继续随着 videoElement 播放进度更新画面
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
      requestAnimationFrame(render);
    });

    resizeObserver.observe(container);

    const handleWindowResize = () => {
      updateCanvasSize();
      requestAnimationFrame(render);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      // 卸载时通知外部 canvas 已失效
      onCanvasReady?.(null);
    };
  }, [amount, tokenName, videoElement, overlayDelayMs, onCanvasReady]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${tokenName} 数字动画`}
        style={{
          borderRadius: 16,
          display: 'block',
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      />
    </div>
  );
}
