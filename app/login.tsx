import { useLogin, usePrivy, Captcha } from '@privy-io/react-auth';
import { motion } from 'framer-motion';

import { useEffect, useRef } from 'react';

import Image from 'next/image';

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
  const { login } = useLogin();

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  async function handleLogin() {
    onLoggingChange(true);
    await login({
      walletChainType: 'ethereum-only',
      loginMethods: ['wallet'],
    });
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
          >
            <span className="w-full flex items-center justify-center gap-2">
              {isLogging ? 'Signing in...' : 'Sign in'}
            </span>
          </button>
          <Captcha />
        </motion.div>
      </div>
    </main>
  );
}
