import FingerprintJS, { GetResult } from '@fingerprintjs/fingerprintjs';
import CryptoJS from 'crypto-js';

// Obfuscated constants to hide the library usage
const SIGNATURE_PREFIX = 'ds_';
const SIGNATURE_SUFFIX = '_sig';
const HASH_ROUNDS = 3;
const SALT_KEY = 'tadle_device_salt_2024';

interface BrowserCharacteristics {
  screenInfo: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
    availWidth: number;
    availHeight: number;
  };
  locale: {
    timezone: string;
    language: string;
    languages: readonly string[];
  };
  hardware: {
    hardwareConcurrency: number;
    deviceMemory?: number;
    maxTouchPoints: number;
  };
  canvas: string;
  webgl: Record<string, unknown>;
  audio: string;
  fonts: string[];
  plugins: Array<{
    name: string;
    filename: string;
    description: string;
  }>;
}

interface CombinedFingerprintData {
  visitorId: string;
  confidence: number;
  components: Record<string, unknown>;
  browserCharacteristics: BrowserCharacteristics;
  userAgent: string;
  platform: string;
}

/**
 * Enhanced device signature generator with obfuscation
 * Generates a unique device fingerprint with additional security layers
 */
export class DeviceSignatureGenerator {
  private static instance: DeviceSignatureGenerator;
  private fpPromise: Promise<GetResult> | null = null;
  private cachedSignature: string | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DeviceSignatureGenerator {
    if (!DeviceSignatureGenerator.instance) {
      DeviceSignatureGenerator.instance = new DeviceSignatureGenerator();
    }
    return DeviceSignatureGenerator.instance;
  }

  /**
   * Initialize the fingerprint library
   */
  private async initializeFingerprinting(): Promise<GetResult> {
    if (!this.fpPromise) {
      const fp = await FingerprintJS.load();
      this.fpPromise = fp.get();
    }
    return this.fpPromise;
  }

  /**
   * Generate additional browser characteristics for enhanced fingerprinting
   */
  private getBrowserCharacteristics(): BrowserCharacteristics {
    const characteristics: BrowserCharacteristics = {
      screenInfo: {
        width: 0,
        height: 0,
        colorDepth: 0,
        pixelDepth: 0,
        availWidth: 0,
        availHeight: 0,
      },
      locale: {
        timezone: '',
        language: '',
        languages: [],
      },
      hardware: {
        hardwareConcurrency: 0,
        maxTouchPoints: 0,
      },
      canvas: '',
      webgl: {},
      audio: '',
      fonts: [],
      plugins: [],
    };

    try {
      // Screen information
      characteristics.screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
      };

      // Timezone and locale
      characteristics.locale = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        languages: navigator.languages,
      };

      // Hardware information
      characteristics.hardware = {
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
      };

      // Canvas fingerprinting
      characteristics.canvas = this.getCanvasFingerprint();

      // WebGL fingerprinting
      characteristics.webgl = this.getWebGLFingerprint();

      // Audio context fingerprinting
      characteristics.audio = this.getAudioFingerprint();

      // Font detection
      characteristics.fonts = this.getAvailableFonts();

      // Plugin information
      characteristics.plugins = Array.from(navigator.plugins).map((plugin) => ({
        name: plugin.name,
        filename: plugin.filename,
        description: plugin.description,
      }));
    } catch (error) {
      console.warn('Error collecting browser characteristics:', error);
    }

    return characteristics;
  }

  /**
   * Generate canvas fingerprint
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      canvas.width = 200;
      canvas.height = 50;

      // Draw text with different fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Tadle Device Signature 🚀', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device ID Generator', 4, 35);

      return canvas.toDataURL();
    } catch (_error) {
      return '';
    }
  }

  /**
   * Generate WebGL fingerprint
   */
  private getWebGLFingerprint(): Record<string, unknown> {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (!gl) return {};

      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        extensions: gl.getSupportedExtensions(),
      };
    } catch (_error) {
      return {};
    }
  }

  /**
   * Generate audio context fingerprint
   */
  private getAudioFingerprint(): string {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return '';

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);

      const fingerprint = analyser.frequencyBinCount.toString();

      oscillator.stop();
      audioContext.close();

      return fingerprint;
    } catch (_error) {
      return '';
    }
  }

  /**
   * Detect available fonts
   */
  private getAvailableFonts(): string[] {
    const testFonts = [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Courier New',
      'Verdana',
      'Georgia',
      'Palatino',
      'Garamond',
      'Bookman',
      'Comic Sans MS',
      'Trebuchet MS',
      'Arial Black',
      'Impact',
      'Lucida Console',
      'Tahoma',
      'Geneva',
      'Lucida Sans Unicode',
      'Franklin Gothic Medium',
      'Arial Narrow',
      'Brush Script MT',
      'Lucida Sans Typewriter',
    ];

    const availableFonts: string[] = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const baseFonts = ['monospace', 'sans-serif', 'serif'];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return [];

    // Get baseline measurements
    const baselineWidths: Record<string, number> = {};
    baseFonts.forEach((baseFont) => {
      context.font = testSize + ' ' + baseFont;
      baselineWidths[baseFont] = context.measureText(testString).width;
    });

    // Test each font
    testFonts.forEach((font) => {
      let detected = false;
      baseFonts.forEach((baseFont) => {
        context.font = testSize + ' ' + font + ', ' + baseFont;
        const width = context.measureText(testString).width;
        if (width !== baselineWidths[baseFont]) {
          detected = true;
        }
      });
      if (detected) {
        availableFonts.push(font);
      }
    });

    return availableFonts;
  }

  /**
   * Apply obfuscation to the fingerprint data
   */
  private obfuscateFingerprint(data: CombinedFingerprintData | Record<string, unknown>): string {
    try {
      // Convert data to string
      const dataString = JSON.stringify(data);

      // Apply multiple rounds of hashing with salt
      let hash = dataString;
      for (let i = 0; i < HASH_ROUNDS; i++) {
        hash = CryptoJS.SHA256(hash + SALT_KEY + i.toString()).toString();
      }

      // Add prefix and suffix to further obfuscate
      const obfuscatedHash = SIGNATURE_PREFIX + hash + SIGNATURE_SUFFIX;

      // Apply additional transformation
      const finalHash = CryptoJS.MD5(obfuscatedHash + SALT_KEY).toString();

      return finalHash;
    } catch (error) {
      console.warn('Error obfuscating fingerprint:', error);
      return CryptoJS.MD5(Date.now().toString()).toString();
    }
  }

  /**
   * Generate comprehensive device signature
   */
  public async generateDeviceSignature(): Promise<string> {
    try {
      const result = await this.initializeFingerprinting();
      return result.visitorId;
    } catch (error) {
      console.warn('Error generating device signature:', error);
      // Fallback signature based on basic browser info
      const fallbackData = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        random: Math.random(),
      };
      return this.obfuscateFingerprint(fallbackData);
    }
  }

  /**
   * Get detailed fingerprint information for debugging
   */
  public async getDetailedFingerprint(): Promise<CombinedFingerprintData | null> {
    try {
      const result = await this.initializeFingerprinting();
      const browserCharacteristics = this.getBrowserCharacteristics();

      return {
        visitorId: result.visitorId,
        confidence: result.confidence.score,
        components: result.components,
        browserCharacteristics,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };
    } catch (error) {
      console.warn('Error getting detailed fingerprint:', error);
      return null;
    }
  }

  /**
   * Clear cached signature (force regeneration)
   */
  public clearCache(): void {
    this.cachedSignature = null;
  }
}

// Export convenience functions
export const generateDeviceSignature = async (): Promise<string> => {
  const generator = DeviceSignatureGenerator.getInstance();
  return generator.generateDeviceSignature();
};

export const getDetailedFingerprint = async (): Promise<CombinedFingerprintData | null> => {
  const generator = DeviceSignatureGenerator.getInstance();
  return generator.getDetailedFingerprint();
};

export const clearFingerprintCache = (): void => {
  const generator = DeviceSignatureGenerator.getInstance();
  generator.clearCache();
};
