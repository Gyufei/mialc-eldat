# 性能检测（perf-check.ts）

本文档说明当前前端导出/下载前的设备性能检测方案、风险评估与拦截逻辑，以及在页面与下载流程中的使用方式与可配置项。

## 目标
- 在导出视频或触发下载前进行轻量性能评估，尽量避免在弱设备或高负载场景下出现卡顿、失败或体验不佳。
- 提供清晰的风险提示与可配置的拦截阈值，并在页面展示检测细节，便于诊断与调参。

## 采集的指标
以下指标由 `lib/perf-check.ts` 的 `assessDevicePerformance` 收集：
- `hardwareConcurrency`：浏览器报告的可用 CPU 线程数（一般表示核心数或超线程数）。
- `deviceMemory`：浏览器报告的设备内存（GB，近似值，部分浏览器不提供）。
- `webCodecsAvailable`：是否具备核心 WebCodecs 能力（`VideoEncoder`、`VideoFrame`、`AudioEncoder`）。
- `videoEncoderSupported`：`VideoEncoder.isConfigSupported(...)` 对目标分辨率/帧率/码率的配置探测结果。
- `mediaEncodingInfo`：`navigator.mediaCapabilities.encodingInfo(...)` 返回的编码能力信息（`supported`、`smooth`、`powerEfficient`），部分浏览器不支持。
- `rafFps`：通过 `requestAnimationFrame` 在短时采样得到的估算 FPS（默认采样约 600ms）。
- `eventLoopLagMs`：事件循环滞后平均值（ms）。通过定期 `setTimeout` 采样“实际触发与期望触发时间差”反映主线程忙碌或长任务挤压。
- `jsHeapUsed` / `jsHeapLimit` / `jsHeapRatio`：JS 堆使用与上限及比例（仅 Chromium 浏览器提供 `performance.memory`）。

说明：
- `deviceMemory` 与 `performance.memory` 仅在部分浏览器可用（Chromium 支持较好）。不可用时字段为空，评估会自动降级但不会报错。
- `eventLoopLagMs` 与 `rafFps` 能较好反映“此刻主线程是否过载/掉帧”，与 CPU/Mem 指标结合更可靠。

## 评分与风险评估
`assessDevicePerformance` 返回一个 0-100 的 `score` 与 `risk`（`low` | `medium` | `high`）。当前策略：
- 评分要点（简单双权重）：
  - WebCodecs 可用 +20；VideoEncoder 配置支持 +20。
  - CPU 线程：≥8 +20；≥4 +10；否则 +0。
  - 设备内存：≥8GB +20；≥4GB +10；否则 +0。
  - rAF FPS：≥55 +20；≥45 +10；否则 +0。
- 风险判定：
  - 高风险（`high`）：满足任意条件之一：
    - `score < 40`；
    - `rafFps < 30`；
    - `hardwareConcurrency < 4`；
    - `webCodecsAvailable === false`；
    - `eventLoopLagMs ≥ 50`；
    - `jsHeapRatio ≥ 0.9`（JS 堆占用超过 90%）。
  - 低风险（`low`）：`score ≥ 70` 且不满足上述任何高风险条件；否则为中风险（`medium`）。

风险详情会通过 `details: string[]` 输出，页面可直接展示，例如：
- `CPU threads: 8`
- `Estimated memory: 8 GB`
- `WebCodecs available: Yes`
- `VideoEncoder config supported: Yes`
- `rAF estimated FPS: 58.7`
- `Event loop lag (avg): 12 ms`
- `JS heap usage: 34% (used 512MB / limit 1536MB)`

## 下载拦截逻辑（shouldDiscourageDownload）
函数：`shouldDiscourageDownload(result, thresholds?)`，默认阈值：
- `minHardwareConcurrency: 4`
- `minDeviceMemoryGb: 4`
- `minRafFps: 30`
- `requireSmoothEncoding: true`（如果 `mediaEncodingInfo.smooth === false` 则视为不满足）
- `maxEventLoopLagMs: 50`
- `maxHeapUsageRatio: 0.9`

拦截条件：
- 若 `result.risk === 'high'` 或 `webCodecsAvailable === false`，直接拦截。
- 否则，综合判断：
  - CPU/内存/FPS/平滑编码/事件循环滞后/JS 堆使用率，任一不达标则拦截。

可配置示例（更严格或更宽松）：
```ts
import { assessDevicePerformance, shouldDiscourageDownload } from '@/lib/perf-check';

const perf = await assessDevicePerformance({
  targetWidth: 1280,
  targetHeight: 720,
  frameRate: 30,
});

const block = shouldDiscourageDownload(perf, {
  minHardwareConcurrency: 6,
  minDeviceMemoryGb: 6,
  minRafFps: 45,
  maxEventLoopLagMs: 30,
  maxHeapUsageRatio: 0.85,
  requireSmoothEncoding: true,
});
```

## 页面与下载流程中的使用
- 页面展示：`app/performance-check/page.tsx` 读取 `assessDevicePerformance` 返回的 `details` 与 `risk` 进行展示。
- 下载流程拦截：`app/claim-boxes.tsx` 在开始下载/转码前调用检测；当 `shouldDiscourageDownload(...)` 返回 `true` 时：
  - 清除进度定时器（`progressTimerRef.current`）。
  - 重置进度（`setDownloadProgress(0)`）。
  - 结束“转换中”状态（`setIsConverting(false)`）。
  - 弹出提醒（toast）说明设备当前不适合下载。

以上逻辑确保在性能不足时，下载与进度加载都会被取消，避免资源浪费与糟糕体验。

## 跨浏览器特性与注意事项
- `performance.memory` 仅在 Chromium 系列提供；Safari/Firefox 通常没有该字段。代码已做安全探测与兜底，详情中会缺省显示。
- `navigator.mediaCapabilities` 并非所有浏览器实现；不可用时返回 `null`，评估会自动降级。
- `eventLoopLagMs` 与 `rafFps` 为通用观测指标，但它们反映的是“当前瞬时负载”，受页面与系统状态影响，建议在导出前临近时刻进行一次短测。

## 与 CanvasSource 导出关系
- 当前检测既适用于 `MediaRecorder + 转码` 路线，也适用于 `CanvasSource + WebCodecs` 直接导出路线。
- 如果计划在低端设备上允许降级导出（降低分辨率/码率/帧率），可在拦截时提供“继续下载”按钮，并根据检测结果动态调整导出参数。

## 常见问题与建议
- 检测波动：FPS 与事件循环滞后受背景任务影响，建议用户在关闭大量标签页或后台下载后重试。
- 阈值调优：
  - 更严格场景（保证更稳）：提高 `minRafFps`，降低 `maxEventLoopLagMs`，降低 `maxHeapUsageRatio`。
  - 更宽松场景（允许降级）：降低 `minRafFps` 或关闭 `requireSmoothEncoding`，并配合导出参数降级。
- 记录日志：可在拦截时上报 `risk` 与细节指标，便于后续运营与调整。

## 变更历史（关键门槛）
- 2025-12：将低 FPS 与拦截默认阈值从 `40` 下调至 `30`，并新增事件循环滞后（50ms）与 JS 堆占用（90%）纳入高风险判定与拦截。