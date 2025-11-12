'use client';

import { toBlob, toPng } from 'html-to-image';
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import XTwitter from './icon/x-twitter';

export default function ShareDialog() {
  const [shareOpen, setShareOpen] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle', 'loading', 'success'
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'loading', 'success'

  const isProcessing = downloadStatus === 'loading' || copyStatus === 'loading';

  useEffect(() => {
    if (downloadStatus === 'success') {
      const timer = window.setTimeout(() => setDownloadStatus('idle'), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [downloadStatus]);

  useEffect(() => {
    if (copyStatus === 'success') {
      const timer = window.setTimeout(() => setCopyStatus('idle'), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [copyStatus]);

  // 检查剪贴板权限
  const checkClipboardPermission = async () => {
    try {
      if (!('permissions' in navigator)) return false;
      const { state } = await navigator.permissions.query({
        // @ts-expect-error: clipboard-write 尚未在 TS 中完全定义
        name: 'clipboard-write',
      });
      return state === 'granted';
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // 写入剪贴板
  const writeClipboard = async (blob: Blob) => {
    const clipboardItem = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([clipboardItem]);
  };

  const getShareBlob = async () => {
    if (!shareCardRef.current) {
      throw new Error('Share card is not ready');
    }
    const blob = await toBlob(shareCardRef.current, {
      cacheBust: true,
      backgroundColor: 'transparent',
      pixelRatio: 2,
    });

    if (!blob) {
      throw new Error('Failed to generate image blob');
    }

    return blob;
  };

  // 下载图像
  const downloadImage = async () => {
    if (!shareCardRef.current || isProcessing) {
      return;
    }

    setDownloadStatus('loading');
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        backgroundColor: 'transparent',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = 'monad-claim.png';
      link.href = dataUrl;
      link.click();

      setDownloadStatus('success');
      toast.success('Download successful', {
        id: 'download-success',
      });
    } catch (error) {
      console.error(error);
      setDownloadStatus('idle');
      toast.error('Failed to download', {
        id: 'download-error',
      });
    }
  };

  const trySystemShare = async (blob: Blob) => {
    if (!('share' in navigator) || !('canShare' in navigator)) {
      return false;
    }

    try {
      const file = new File([blob], 'monad-claim.png', { type: 'image/png' });
      if (!navigator.canShare?.({ files: [file] })) {
        return false;
      }
      await navigator.share({ files: [file] });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const tryClipboardCopy = async (blob: Blob) => {
    if (!('clipboard' in navigator) || !('write' in navigator.clipboard)) {
      return false;
    }

    if (!(await checkClipboardPermission())) {
      return false;
    }

    try {
      await writeClipboard(blob);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // 复制或分享图像
  const copyOrShareImage = async () => {
    if (!shareCardRef.current || isProcessing) {
      return;
    }

    setCopyStatus('loading');
    try {
      const blob = await getShareBlob();

      if (await trySystemShare(blob)) {
        setCopyStatus('success');
        toast.success('Shared image successfully', {
          id: 'share-success',
        });
        return;
      }

      if (await tryClipboardCopy(blob)) {
        setCopyStatus('success');
        toast.success('Copied to clipboard', {
          id: 'copy-success',
        });
        return;
      }

      setCopyStatus('idle');
      toast.error('Unable to copy. Please refresh the page and try again, or just take a screenshot.', {
        id: 'copy-unable',
      });
    } catch (error) {
      console.error(error);
      setCopyStatus('idle');
      toast.error('Failed to copy or share', {
        id: 'copy-share-failed',
      });
    }
  };

  // 分享到 Twitter
  const shareOnTwitter = async () => {
    if (!shareCardRef.current || isProcessing) {
      return;
    }

    try {
      const blob = await getShareBlob();

      if (await trySystemShare(blob)) {
        return;
      }

      if (!(await tryClipboardCopy(blob))) {
        toast.error('Unable to prepare image. Please take a screenshot instead.', {
          id: 'share-prepare-failed',
        });
        return;
      }

      toast.success('Image copied. Paste it into your tweet!', {
        id: 'twitter-copy-success',
      });

      const encodedText = encodeURIComponent('MONAD BOXES \uD83C\uDF81');
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
    } catch (error) {
      console.error(error);
      toast.error('Failed to share on Twitter', {
        id: 'twitter-error',
      });
    }
  };

  return (
    <>
      <button
        onClick={() => setShareOpen(true)}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary *:relative *:z-10 disabled:opacity-50 h-9.5 px-4 py-2 w-full"
        data-state="closed"
        data-slot="tooltip-trigger"
      >
        <span className="flex items-center gap-2">
          <Share2 className="w-[18px] h-[18px]" />
          Share
        </span>
      </button>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] py-8 px-6 outline-none overflow-y-auto max-h-[90vh] gap-y-6 border-border shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_-10px_50px_0_rgba(154,137,230,0.20)_inset]">
          <DialogHeader className="flex flex-col text-center sm:text-left gap-y-1.5 m-0">
            <DialogTitle className="text-2xl font-medium text-primary text-center">
              Sorry, you are ineligible right now.
            </DialogTitle>
            <DialogDescription className="text-sm text-secondary text-center">
              Connect eligible accounts to increase your claim strength.
            </DialogDescription>
          </DialogHeader>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                ref={shareCardRef}
                onClick={copyOrShareImage}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    copyOrShareImage();
                  }
                }}
                className="relative rounded-xl overflow-hidden cursor-pointer hover:opacity-70 transition-opacity duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6e54ff]"
              >
                <div className="relative w-full aspect-4/5 overflow-hidden">
                  <Image
                    alt="Share Bottom Ineligible"
                    width={1089}
                    height={1701}
                    src="/images/share-no-eligible.png"
                    style={{
                      position: 'absolute',
                      height: '100%',
                      width: '100%',
                      inset: 0,
                      color: 'transparent',
                    }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent
              align="center"
              side="right"
              className="px-3 py-1.5 text-balance relative text-white text-sm font-medium leading-5 rounded-full bg-[#6e54ff]"
            >
              <p className="font-medium">Click to Copy</p>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  transformOrigin: '0px 0px',
                  transform: 'translateY(50%) rotate(90deg) translateX(-50%)',
                  top: 12,
                }}
              >
                <svg
                  className="z-50 translate-y-[calc(-50%)] rotate-45 rounded-[2px] border-r border-b border-border fill-[#6e54ff] bg-[#6e54ff] size-2"
                  width={10}
                  height={5}
                  viewBox="0 0 30 10"
                  preserveAspectRatio="none"
                  style={{ display: 'block' }}
                >
                  <polygon points="0,0 30,0 15,10" />
                </svg>
              </span>
            </TooltipContent>
          </Tooltip>
          <div className="flex gap-4">
            <button
              onClick={shareOnTwitter}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary *:relative *:z-10 disabled:opacity-50 h-9.5 px-4 py-2 w-full"
            >
              <span className="flex flex-row gap-2 items-center">
                Share on
                <span
                  className="inline-flex shrink-0"
                  draggable="false"
                  style={{ width: 16, height: 16 }}
                >
                  <span>
                    <XTwitter />
                  </span>
                </span>
              </span>
            </button>
            <button
              onClick={copyOrShareImage}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary *:relative *:z-10 disabled:opacity-50 h-10 w-14"
              disabled={isProcessing}
            >
              {copyStatus === 'loading' ? (
                <Loader2 className="animate-spin" />
              ) : copyStatus === 'success' ? (
                <Check />
              ) : (
                <Copy />
              )}
            </button>
            <button
              onClick={downloadImage}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary *:relative *:z-10 disabled:opacity-50 h-10 w-14"
              disabled={isProcessing}
            >
              {downloadStatus === 'loading' ? (
                <Loader2 className="animate-spin" />
              ) : downloadStatus === 'success' ? (
                <Check />
              ) : (
                <Download />
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
