# 导出功能优化建议

## 参考代码分析

参考代码使用了 mediabunny 的高级 API，主要特点：

1. **CanvasSource** - 直接从 canvas 生成视频帧，无需先录制
2. **AudioBufferSource** - 直接处理 AudioBuffer，比 WebCodecs AudioEncoder 更简单
3. **进度回调机制** - 明确的 `onProgress` 回调
4. **质量常量** - 使用 `QUALITY_LOW/MEDIUM/HIGH/VERY_HIGH` 而不是硬编码 bitrate

## 当前实现 vs 参考代码

### 当前实现流程
1. 使用 MediaRecorder 录制 canvas 流（先录制）
2. 录制完成后，使用 mediabunny Conversion API 转换格式
3. 如果需要添加音频，使用 WebCodecs API 重新编码视频和音频

### 参考代码流程
1. 使用 CanvasSource 直接从 canvas 渲染帧并导出（直接导出）
2. 使用 AudioBufferSource 处理音频
3. 使用 Output API 直接输出

## 可优化的点

### 1. 使用 CanvasSource 替代 MediaRecorder（推荐）

**优势：**
- 不需要先录制整个视频，内存占用更小
- 可以直接控制每一帧的渲染
- 性能更好，减少中间步骤

**注意事项：**
- 需要能够按时间点渲染 canvas 的每一帧
- 当前项目需要录制 13 秒的完整流程，可能需要调整渲染逻辑

### 2. 使用 AudioBufferSource 替代 WebCodecs AudioEncoder（推荐）

**优势：**
- 代码更简单，不需要手动处理 AudioData
- mediabunny 会自动处理编码细节
- 减少对 WebCodecs API 的依赖

### 3. 改进进度回调机制（推荐）

**优势：**
- 基于实际处理进度的真实进度，而不是模拟进度条
- 更好的用户体验

### 4. 使用质量常量（可选）

**优势：**
- 代码更清晰
- 更容易调整质量设置

## 实施建议

由于当前项目需要录制一个包含视频背景和数字动画的完整流程（13秒），完全采用参考代码的方式可能需要重构渲染逻辑。

**建议的优化方案：**

1. **保留当前录制流程**，但优化音频处理部分：
   - 使用 `AudioBufferSource` 替代 WebCodecs AudioEncoder
   - 简化音频处理代码

2. **改进进度回调**：
   - 使用真实的处理进度而不是模拟进度条

3. **可选：完全重构为直接导出模式**：
   - 如果能够按时间点渲染 canvas，可以使用 CanvasSource
   - 这需要重构 canvas 渲染逻辑，使其能够根据时间点渲染任意帧

## 代码示例

见 `lib/export-optimized.ts` - 提供了使用 AudioBufferSource 和 CanvasSource 的优化版本

## 具体优化建议

### 1. 立即可以采用的优化：使用 AudioBufferSource

当前代码在 `handleDownloadVideo` 函数中使用 WebCodecs AudioEncoder 处理音频。可以简化为使用 `AudioBufferSource`：

**当前代码（复杂）：**
```typescript
// 需要手动创建 AudioData，使用 WebCodecs AudioEncoder
const audioData = new AudioData({
  format: 'f32-planar',
  sampleRate: processedAudioDataToUse.sampleRate,
  numberOfFrames: processedAudioDataToUse.numberOfFrames,
  numberOfChannels: processedAudioDataToUse.numberOfChannels,
  timestamp: 0,
  data: processedAudioDataToUse.planarData,
});
audioEncoder.encode(audioData);
```

**优化后（简单）：**
```typescript
// 直接使用 AudioBuffer，mediabunny 自动处理
const audioSource = new AudioBufferSource({
  codec: 'aac',
  bitrate: QUALITY_HIGH,
});
await audioSource.add(audioBuffer); // 直接传入 AudioBuffer
```

### 2. 使用质量常量

**当前代码：**
```typescript
bitrate: 2e6, // 硬编码
bitrate: 128000, // 硬编码
```

**优化后：**
```typescript
import { QUALITY_HIGH, QUALITY_MEDIUM } from 'mediabunny';

bitrate: QUALITY_HIGH, // 使用常量
```

### 3. 改进进度回调

**当前代码：**
- 使用模拟进度条（定时器递增）
- 不反映实际处理进度

**优化后：**
- 基于实际处理进度（帧数/总帧数）
- 更准确的进度反馈

### 4. 未来优化：使用 CanvasSource（需要重构）

如果能够重构 canvas 渲染逻辑，使其能够根据时间点渲染任意帧，可以使用 `CanvasSource` 直接导出：

**优势：**
- 不需要先录制再转换
- 内存占用更小
- 性能更好

**挑战：**
- 需要重构 `CanvasAnimation` 组件，使其能够根据时间点渲染
- 需要处理视频元素的同步问题

## 实施优先级

1. **高优先级（立即实施）**：
   - 使用 `AudioBufferSource` 替代 WebCodecs AudioEncoder
   - 使用质量常量替代硬编码 bitrate

2. **中优先级（短期）**：
   - 改进进度回调机制
   - 代码结构优化（提取导出函数）

3. **低优先级（长期）**：
   - 考虑使用 `CanvasSource` 直接导出（需要重构渲染逻辑）
