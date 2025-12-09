// 设备性能检测模块：在导出/下载视频前进行轻量评估
// 仅在浏览器环境运行。提供一个可复用的 API 和风险判断。

export type PerfCheckOptions = {
  targetWidth: number;
  targetHeight: number;
  frameRate: number;
  testDurationMs?: number; // rAF 测试时长，默认 600ms
};

export type PerfCheckResult = {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  webCodecsAvailable: boolean;
  videoEncoderSupported?: boolean;
  mediaEncodingInfo?: {
    supported?: boolean;
    smooth?: boolean;
    powerEfficient?: boolean;
  } | null;
  rafFps?: number;
  score: number; // 0-100 越高越好
  risk: 'low' | 'medium' | 'high';
  details: string[]; // 供页面展示的说明
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function estimateBitrate(width: number, height: number, framerate: number): number {
  // 粗略估算目标码率：以 720p@30fps ≈ 2Mbps 为基准，按像素与帧率缩放
  const baseBitrate = 2_000_000; // 2 Mbps
  const scale = (width * height) / (1280 * 720);
  const frScale = framerate / 30;
  const bitrate = Math.round(baseBitrate * scale * frScale);
  // 限制范围 0.8Mbps - 8Mbps，避免不合理值
  return Math.max(800_000, Math.min(8_000_000, bitrate));
}

async function measureRafFps(durationMs: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const loop = (ts: number) => {
      frames++;
      if (ts - start >= durationMs) {
        const fps = (frames * 1000) / (ts - start);
        resolve(fps);
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

async function checkVideoEncoderSupport(
  width: number,
  height: number,
  framerate: number,
): Promise<boolean | undefined> {
  if (typeof VideoEncoder === 'undefined') return undefined;
  try {
    const bitrate = estimateBitrate(width, height, framerate);
    const res = await VideoEncoder.isConfigSupported({
      codec: 'avc1.42E01E', // baseline H.264，兼容性较好
      width,
      height,
      framerate,
      bitrate,
    });
    return !!res?.supported;
  } catch {
    return false;
  }
}

async function checkMediaCapabilitiesEncoding(
  width: number,
  height: number,
  framerate: number,
): Promise<{ supported?: boolean; smooth?: boolean; powerEfficient?: boolean } | null> {
  if (
    !('mediaCapabilities' in navigator) ||
    typeof navigator.mediaCapabilities?.encodingInfo !== 'function'
  ) {
    return null;
  }
  try {
    const bitrate = estimateBitrate(width, height, framerate);
    const info = await navigator.mediaCapabilities.encodingInfo({
      type: 'record',
      video: {
        contentType: 'video/mp4; codecs="avc1.42E01E"',
        width,
        height,
        bitrate,
        framerate,
      },
    });
    return {
      supported: info?.supported,
      smooth: info?.smooth,
      powerEfficient: info?.powerEfficient,
    };
  } catch {
    return null;
  }
}

export async function assessDevicePerformance(options: PerfCheckOptions): Promise<PerfCheckResult> {
  if (!isBrowser()) {
    return {
      webCodecsAvailable: false,
      score: 0,
      risk: 'high',
      details: ['Non-browser environment; unable to assess'],
    };
  }

  const { targetWidth, targetHeight, frameRate, testDurationMs = 600 } = options;

  const details: string[] = [];
  const hardwareConcurrency: number | undefined =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : undefined;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory; // 单位 GB（近似）
  const webCodecsAvailable =
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof AudioEncoder !== 'undefined';

  const [rafFps, videoEncoderSupported, mediaEncodingInfo] = await Promise.all([
    measureRafFps(testDurationMs).catch(() => undefined),
    checkVideoEncoderSupport(targetWidth, targetHeight, frameRate).catch(() => undefined),
    checkMediaCapabilitiesEncoding(targetWidth, targetHeight, frameRate).catch(() => null),
  ]);

  if (hardwareConcurrency !== undefined) details.push(`CPU threads: ${hardwareConcurrency}`);
  if (deviceMemory !== undefined) details.push(`Estimated memory: ${deviceMemory} GB`);
  details.push(`WebCodecs available: ${webCodecsAvailable ? 'Yes' : 'No'}`);
  if (videoEncoderSupported !== undefined)
    details.push(`VideoEncoder config supported: ${videoEncoderSupported ? 'Yes' : 'No'}`);
  if (rafFps !== undefined) details.push(`rAF estimated FPS: ${rafFps.toFixed(1)}`);
  if (mediaEncodingInfo) {
    const { supported, smooth, powerEfficient } = mediaEncodingInfo;
    details.push(
      `MediaCapabilities: supported=${supported ?? 'unknown'}, smooth=${smooth ?? 'unknown'}, powerEfficient=${powerEfficient ?? 'unknown'}`,
    );
  }

  // 简单双权重评分（0-100）
  let score = 0;
  if (webCodecsAvailable) score += 20;
  if (videoEncoderSupported) score += 20;

  if (hardwareConcurrency !== undefined) {
    if (hardwareConcurrency >= 8) score += 20;
    else if (hardwareConcurrency >= 4) score += 10;
    else score += 0;
  }

  if (deviceMemory !== undefined) {
    if (deviceMemory >= 8) score += 20;
    else if (deviceMemory >= 4) score += 10;
    else score += 0;
  }

  if (rafFps !== undefined) {
    if (rafFps >= 55) score += 20;
    else if (rafFps >= 45) score += 10;
    else score += 0;
  }

  // 根据关键指标判断风险
  let risk: 'low' | 'medium' | 'high' = 'medium';
  const lowFps = !!rafFps && rafFps < 30;
  const weakCpu = !!hardwareConcurrency && hardwareConcurrency < 4;
  const weakMem = !!deviceMemory && deviceMemory < 4;
  const noWebCodecs = !webCodecsAvailable;
  const notSmooth = mediaEncodingInfo?.smooth === false;

  if (score >= 70 && !lowFps && !weakCpu && !weakMem && !notSmooth && !noWebCodecs) risk = 'low';
  if (score < 40 || lowFps || weakCpu || noWebCodecs) risk = 'high';

  return {
    hardwareConcurrency,
    deviceMemory,
    webCodecsAvailable,
    videoEncoderSupported,
    mediaEncodingInfo,
    rafFps,
    score,
    risk,
    details,
  };
}

export type DiscourageThresholds = {
  minHardwareConcurrency: number;
  minDeviceMemoryGb: number;
  minRafFps: number;
  requireSmoothEncoding: boolean;
};

export function shouldDiscourageDownload(
  result: PerfCheckResult,
  thresholds?: Partial<DiscourageThresholds>,
): boolean {
  const t: DiscourageThresholds = {
    minHardwareConcurrency: 4,
    minDeviceMemoryGb: 4,
    minRafFps: 30,
    requireSmoothEncoding: true,
    ...thresholds,
  };

  if (result.risk === 'high') return true;
  if (result.webCodecsAvailable === false) return true;

  const hcOk =
    result.hardwareConcurrency === undefined ||
    result.hardwareConcurrency >= t.minHardwareConcurrency;
  const memOk = result.deviceMemory === undefined || result.deviceMemory >= t.minDeviceMemoryGb;
  const fpsOk = result.rafFps === undefined || result.rafFps >= t.minRafFps;
  const smoothOk = !t.requireSmoothEncoding || result.mediaEncodingInfo?.smooth !== false;

  return !(hcOk && memOk && fpsOk && smoothOk);
}
