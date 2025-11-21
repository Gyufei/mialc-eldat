'use client';

import { useEffect, useRef } from 'react';

type CanvasAnimationProps = {
  amount: number;
  tokenName: string;
};

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

const formatIntegerPart = (value: number) =>
  Math.trunc(value).toLocaleString('en-US');

export default function CanvasAnimation({ amount, tokenName }: CanvasAnimationProps) {
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

    const getFontSizes = () => {
      const isMobileNow = window.innerWidth < 768;
      return {
        amountFontSize: isMobileNow ? 100 : 168,
        labelFontSize: isMobileNow ? 48 : 68,
      };
    };

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
    const duration = 1500;
    const decimalPlaces = getDecimalPlaces(amount);
    const scale = Math.pow(10, decimalPlaces);
    const targetScaledValue = Math.round(amount * scale);
    const isSubUnitAmount = amount > 0 && amount < 1;
    const startScaledValue =
      isSubUnitAmount && targetScaledValue > 0 ? 1 : 0;
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
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const interpolated =
        startScaledValue +
        (targetScaledValue - startScaledValue) * easedProgress;
      const animatedScaledValue =
        progress < 1
          ? Math.round(interpolated)
          : targetScaledValue;
      const safeScaledValue = Math.min(
        targetScaledValue,
        Math.max(startScaledValue, animatedScaledValue),
      );
      const displayText =
        amount === 0 ? '0' : formatter(targetScaledValue === 0 ? 0 : safeScaledValue);

      ctx.clearRect(0, 0, currentWidth, currentHeight);

      const { amountFontSize, labelFontSize } = getFontSizes();
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
      ctx.strokeText(displayText, currentWidth / 2, currentHeight / 2);
      ctx.fillStyle = gradient;
      ctx.fillText(displayText, currentWidth / 2, currentHeight / 2);

      const labelBaselineY = textBottom + 112;
      ctx.font = `800 ${labelFontSize}px 'CommitMono', 'Inter', sans-serif`;
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
      
      const isMobileNow = window.innerWidth < 768;
      const labelX = isMobileNow ? currentWidth / 2 : currentWidth - 120;
      ctx.textAlign = isMobileNow ? 'center' : 'right';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(`$${tokenName}`, labelX, labelBaselineY);
      ctx.fillStyle = labelGradient;
      ctx.fillText(`$${tokenName}`, labelX, labelBaselineY);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      }
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
    };
  }, [amount, tokenName]);

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
