"use client";

import { useEffect, useRef } from "react";

type CanvasAnimationProps = {
  amount: number;
  tokenName: string;
};

export default function CanvasAnimation({
  amount,
  tokenName,
}: CanvasAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let currentWidth = 0;
    let currentHeight = 0;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      currentWidth = rect.width;
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
    const startValue = 0;
    const startTime = performance.now();

    const render = () => {
      if (!currentWidth || !currentHeight) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const currentValue = Math.round(
        startValue + (amount - startValue) * easedProgress,
      );

      ctx.clearRect(0, 0, currentWidth, currentHeight);

      ctx.font = "800 168px 'Britti Sans', 'Inter', sans-serif";
      const textMetrics = ctx.measureText(String(currentValue));
      const ascent = textMetrics.fontBoundingBoxAscent ?? 96;
      const descent = textMetrics.fontBoundingBoxDescent ?? 24;
      const textHeight = Math.max(ascent + descent, 120);
      const textTop = currentHeight / 2 - textHeight / 2;
      const textBottom = currentHeight / 2 + textHeight / 2;
      const gradient = ctx.createLinearGradient(0, textTop, 0, textBottom);
      gradient.addColorStop(0, "#FFFFFF");
      gradient.addColorStop(0.4, "#FFFFFF");
      gradient.addColorStop(1, "#6A63F3");
      const formattedValue = currentValue.toLocaleString("en-US");

      ctx.lineJoin = "round";
      ctx.lineWidth = 20;
      ctx.strokeStyle = "#05000F";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(formattedValue, currentWidth / 2, currentHeight / 2);
      ctx.fillStyle = gradient;
      ctx.fillText(formattedValue, currentWidth / 2, currentHeight / 2);

      const labelBaselineY = textBottom + 112;
      ctx.font = "800 68px 'CommitMono', 'Inter', sans-serif";
      const labelMetrics = ctx.measureText(`$${tokenName}`);
      const labelAscent = labelMetrics.fontBoundingBoxAscent ?? 54;
      const labelDescent = labelMetrics.fontBoundingBoxDescent ?? 18;
      const labelHeight = Math.max(labelAscent + labelDescent, 72);
      const labelTop = labelBaselineY - labelHeight;
      const labelBottom = labelBaselineY;
      const labelGradient = ctx.createLinearGradient(0, labelTop, 0, labelBottom);
      labelGradient.addColorStop(0, "#FFFFFF");
      labelGradient.addColorStop(0.4, "#FFFFFF");
      labelGradient.addColorStop(1, "#6A63F3");
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#05000F";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.strokeText(`$${tokenName}`, currentWidth - 120, labelBaselineY);
      ctx.fillStyle = labelGradient;
      ctx.fillText(`$${tokenName}`, currentWidth - 120, labelBaselineY);

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

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [amount, tokenName]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${tokenName} 数字动画`}
        style={{
          borderRadius: 16,
          display: "block",
          width: "100%",
          height: "100%",
          background: "transparent",
        }}
      />
    </div>
  );
}