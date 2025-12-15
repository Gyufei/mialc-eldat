import { Captcha, useLogin, usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { trackEnhancedEvent } from '@/lib/analytics/enhanced-analytics';

export default function Login({
  isLogging,
  onLoggingChange,
}: {
  isLogging: boolean;
  onLoggingChange: (bool: boolean) => void;
}) {
  const titleLines = [
    ['Tadle', 'offers'],
    ['insane', 'incentives'],
    ['for', 'every'],
    ['true', 'contributor'],
  ];
  const subtitleWords = ['Connect', 'your', 'accounts', 'to', 'claim', 'your', 'incentives'];
  const wordDuration = 0.4;
  const wordDelay = 0.2;
  const totalTitleWords = titleLines.reduce((sum, line) => sum + line.length, 0);
  const lastEndTitle = (totalTitleWords - 1) * wordDelay + wordDuration;
  const lastEndSubtitle = (subtitleWords.length - 1) * wordDelay + wordDuration;
  const buttonDelay = Math.max(lastEndTitle, lastEndSubtitle) + 0.2;

  const { authenticated } = usePrivy();
  const { login } = useLogin({
    /**
     * 登录完成回调并上报 GA 事件
     * 说明：
     * - 成功登录后上报 `LOGIN` 事件，携带用户识别信息
     * - 记录登录方式、是否新用户等信息便于分析
     */
    onComplete: async ({ user, isNewUser, wasAlreadyAuthenticated, loginMethod }) => {
      try {
        await trackEnhancedEvent('LOGIN', {
          event_category: 'auth',
          event_label: 'success',
          wallet_address: user?.wallet?.address,
          include_user_id: true,
          custom_parameters: {
            is_new_user: !!isNewUser,
            already_authenticated: !!wasAlreadyAuthenticated,
            login_method: loginMethod || 'unknown',
          },
        });
      } catch {}
    },
    /**
     * 登录失败回调并上报 GA 事件
     */
    onError: async (error) => {
      try {
        await trackEnhancedEvent('LOGIN', {
          event_category: 'auth',
          event_label: 'error',
          include_user_id: true,
          custom_parameters: {
            error_message: String(error),
          },
        });
      } catch {}
    },
  });

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  // 登录按钮门槛与冷却：要求人机验证通过后才可点击，并在一次登录后进入短暂冷却
  const [_captchaPassed, setCaptchaPassed] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  /**
   * 登录按钮点击处理
   * 说明：
   * - 不再以 `captchaPassed` 作为按钮禁用条件，Privy 的 Captcha 为“隐式挑战”，组件挂载即自动验证
   * - 由 Privy SDK 在登录流程前进行预验证，如验证失败将抛出错误并阻止登录
   * - 保留冷却时间，避免频繁触发登录行为
   */
  async function handleLogin() {
    if (cooldownSec > 0) return;
    onLoggingChange(true);
    try {
      // 登录入口点击上报
      await trackEnhancedEvent('LOGIN', {
        event_category: 'auth',
        event_label: 'click',
        include_user_id: true,
      });
      await login({
        walletChainType: 'ethereum-only',
        loginMethods: ['wallet'],
      });
      setCooldownSec(10);
    } catch (_err) {
      // 登录或验证失败，恢复按钮可用状态
      toast.error('Login failed. Please try again.');
      onLoggingChange(false);
    }
  }

  function handleVideo2Play() {
    if (video1Ref.current) {
      video1Ref.current.style.display = 'none';
    }
    if (video2Ref.current) {
      video2Ref.current.style.display = 'block';
      video2Ref.current.play();
      setTimeout(() => {
        onLoggingChange(false);
      }, 2200);
    }
  }

  function handleVideo2Ended() {
    onLoggingChange(false);
  }

  useEffect(() => {
    if (isLogging && authenticated) {
      handleVideo2Play();
    }
  }, [authenticated, isLogging]);

  return (
    <main
      className="relative flex h-dvh flex-col items-center justify-center bg-background px-6"
      style={{ paddingTop: 0 }}
    >
      <video
        ref={video1Ref}
        autoPlay={true}
        muted={true}
        disablePictureInPicture={true}
        disableRemotePlayback={true}
        loop={true}
        playsInline={true}
        poster="/background.png"
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/animations/landing/default.mp4" type="video/mp4" />
        <Image
          src="/background.png"
          alt="Background"
          fill
          className="object-cover object-center absolute inset-0"
          sizes="100vw"
          decoding="async"
          loading="lazy"
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            inset: '0px',
            color: 'transparent',
          }}
        />
      </video>
      <video
        ref={video2Ref}
        muted={true}
        disablePictureInPicture={true}
        disableRemotePlayback={true}
        playsInline={true}
        poster="/background.png"
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ display: 'none' }}
        onEnded={handleVideo2Ended}
      >
        <source src="/animations/landing/enter-portal.mp4" type="video/mp4" />
        <Image
          src="/background.png"
          alt="Background"
          fill
          className="object-cover object-center absolute inset-0"
          sizes="100vw"
          decoding="async"
          loading="lazy"
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            inset: '0px',
            color: 'transparent',
          }}
        />
      </video>
      <div className="absolute inset-0 bg-black opacity-10" />
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        <div style={{ opacity: 1, filter: 'blur(0px)', transform: 'none' }}>
          <span
            className="inline-flex shrink-0"
            draggable="false"
            style={{ width: 36, height: 36 }}
          >
            <span>
              <Image src="/icons/logo-small-white.svg" alt="Logo" width={36} height={36} />
            </span>
          </span>
        </div>
        <h1 className="mt-10 bg-foreground bg-clip-text text-center text-[3rem] lg:text-[5.56rem] leading-none font-medium tracking-[-0.1rem] text-primary">
          {(() => {
            let offset = 0;
            return titleLines.map((line, lineIdx) => (
              <span key={`line-${lineIdx}`} className="space-x-3">
                {line.map((word, index) => (
                  <motion.span
                    key={`${lineIdx}-${index}`}
                    className="inline-block font-britti-sans"
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{
                      duration: wordDuration,
                      delay: wordDelay * (offset + index),
                      ease: 'easeOut',
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
                {((offset += line.length), null)}
                <br />
              </span>
            ));
          })()}
        </h1>
        <p className="mt-4 text-center">
          {subtitleWords.map((word, index) => (
            <motion.span
              key={index}
              className="inline-block mr-1"
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: wordDuration, delay: wordDelay * index, ease: 'easeOut' }}
            >
              {word}
            </motion.span>
          ))}
        </p>
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, delay: buttonDelay, ease: 'easeOut' }}
        >
          <button
            onClick={handleLogin}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-primary [&>*]:relative [&>*]:z-10 h-9.5 px-4 py-2 shadow-login-button"
            disabled={cooldownSec > 0}
          >
            <span className="w-full flex items-center justify-center gap-2">
              {isLogging
                ? 'Signing in...'
                : cooldownSec > 0
                  ? `Retry in ${cooldownSec}s`
                  : 'Sign in'}
            </span>
          </button>
          <Captcha
            onSuccess={(token: string) => setCaptchaPassed(!!token)}
            onExpire={() => {
              setCaptchaPassed(false);
              toast.warning('Verification expired. Please try again.');
            }}
            onError={() => {
              setCaptchaPassed(false);
              toast.error('Verification failed. Please try again.');
            }}
          />
        </motion.div>
      </div>
    </main>
  );
}
