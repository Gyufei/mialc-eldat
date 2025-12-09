'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { PerfCheckResult, assessDevicePerformance } from '@/lib/perf-check';

export default function PerfCheckPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PerfCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const w = Number(searchParams.get('w')) || 1920;
    const h = Number(searchParams.get('h')) || 1080;
    const fps = Number(searchParams.get('fps')) || 30;
    return { w, h, fps };
  }, [searchParams]);

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const res = await assessDevicePerformance({
        targetWidth: params.w,
        targetHeight: params.h,
        frameRate: params.fps,
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message || '检测失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.w, params.h, params.fps]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Device Performance Check</h1>
      {/* <p className="text-sm text-muted-foreground mb-6">
        可通过查询参数调整目标：例如 {`/perf-check?w=1920&h=1080&fps=30`}
      </p> */}

      <div className="flex items-center gap-3 mb-6">
        <Button onClick={runCheck} disabled={loading}>
          {loading ? 'Checking…' : 'Retest'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Target: {params.w}×{params.h}@{params.fps}fps
        </span>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div>
            <span className="font-medium">Risk Level: </span>
            <span
              className={
                result.risk === 'high'
                  ? 'text-red-600'
                  : result.risk === 'medium'
                    ? 'text-orange-600'
                    : 'text-green-600'
              }
            >
              {result.risk}
            </span>
          </div>

          <div>
            <span className="font-medium">Overall Score: </span>
            <span>{result.score}</span>
          </div>

          <pre className="bg-muted/50 rounded-md p-4 text-sm overflow-x-auto">
            {JSON.stringify(
              {
                hardwareConcurrency: result.hardwareConcurrency,
                deviceMemory: result.deviceMemory,
                webCodecsAvailable: result.webCodecsAvailable,
                videoEncoderSupported: result.videoEncoderSupported,
                mediaEncodingInfo: result.mediaEncodingInfo,
                rafFps: result.rafFps,
                details: result.details,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
