"use client";

import { useLogin } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Loader2, VolumeX } from 'lucide-react';

import { useState } from 'react';

import Image from 'next/image';

import MonadWhiteLogo from './icon/monad-white-logo';

type LoginProps = {
  onLoginSuccess?: () => void;
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const titleLine1 = ['Enter', 'the', 'MON'];
  const titleLine2 = ['Claim', 'Portal'];
  const subtitleWords = ['Create', 'an', 'account', 'to', 'discover', 'your', 'status'];
  const wordDuration = 0.4;
  const wordDelay = 0.2;
  const lastEndTitle1 = (titleLine1.length - 1) * wordDelay + wordDuration;
  const lastEndTitle2 = (titleLine1.length + titleLine2.length - 1) * wordDelay + wordDuration;
  const lastEndSubtitle = (subtitleWords.length - 1) * wordDelay + wordDuration;
  const buttonDelay = Math.max(lastEndTitle1, lastEndTitle2, lastEndSubtitle) + 0.2;
  const volumeDelay = buttonDelay + 0.2;

  const { login } = useLogin();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    try {
      await login({
        walletChainType: 'ethereum-only',
        loginMethods: ['wallet'],
      });
      onLoginSuccess?.();
    } catch (error) {
      console.error('Login failed', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      className="relative flex h-dvh flex-col items-center justify-center bg-background px-6"
      style={{ paddingTop: 0 }}
    >
      <video
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
      <div className="absolute inset-0 bg-black opacity-10" />
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        <div style={{ opacity: 1, filter: 'blur(0px)', transform: 'none' }}>
          <span
            className="inline-flex shrink-0"
            draggable="false"
            style={{ width: 36, height: 36 }}
          >
            <span>
              <MonadWhiteLogo />
            </span>
          </span>
        </div>
        <h1 className="mt-10 bg-foreground bg-clip-text text-center text-[3rem] lg:text-[5.56rem] leading-none font-medium tracking-[-0.1rem] text-primary">
          <span className="space-x-3">
            {titleLine1.map((word, index) => (
              <motion.span
                key={index}
                className="inline-block font-britti-sans"
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: wordDuration, delay: wordDelay * index, ease: 'easeOut' }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          <br />
          <span className="space-x-3">
            {titleLine2.map((word, index) => (
              <motion.span
                key={index}
                className="inline-block font-britti-sans"
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{
                  duration: wordDuration,
                  delay: wordDelay * (index + titleLine1.length),
                  ease: 'easeOut',
                }}
              >
                {word}
              </motion.span>
            ))}
          </span>
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
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="w-full flex items-center justify-center gap-2">
                  {'Signing in...'}
                </span>
              </>
            ) : (
              <span className="w-full flex items-center justify-center gap-2">{'Sign in'}</span>
            )}
          </button>
        </motion.div>
        <motion.div
          className="absolute -bottom-30"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, delay: volumeDelay, ease: 'easeOut' }}
        >
          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 px-4 py-2 rounded-full h-14 sm:h-auto">
            <span className="flex flex-row items-center gap-2 text-center whitespace-normal">
              <VolumeX className="w-4 h-4" />
              TURN ON YOUR SOUND FOR THE BEST EXPERIENCE
            </span>
          </button>
        </motion.div>
      </div>
    </main>
  );
}
