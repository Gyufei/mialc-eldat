'use client';

import { usePrivy } from '@privy-io/react-auth';
import { LoaderCircle, Save } from 'lucide-react';

import { useState } from 'react';

import Image from 'next/image';

import ClaimBoxs from './claim-boxs';
import Footer from './footer';
import Header from './header';
import Login from './login';
import Profile from './profile';

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const [isLogging, setIsLogging] = useState(false);

  if (!ready) {
    return (
      <main className="relative flex justify-center items-center min-h-screen w-full bg-background">
        <LoaderCircle className="w-10 h-10 animate-spin" />
      </main>
    );
  }

  if (!authenticated || isLogging) {
    return <Login isLogging={isLogging} onLoggingChange={setIsLogging} />;
  }

  return (
    <main className="relative flex flex-col min-h-screen w-full bg-background">
      <div className="inset-0 fixed">
        <Image
          src="/background.png"
          alt="Background"
          fill
          className="object-cover object-center absolute inset-0"
          sizes="100vw"
          decoding="async"
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            inset: '0px',
            color: 'transparent',
          }}
        />
      </div>
      <div className="fixed inset-0 h-screen bg-black opacity-50"></div>
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Header />
        <Profile />
        <ClaimBoxs />
        <Footer />
      </div>
      <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 text-white text-sm font-medium leading-5 bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 fixed bottom-8 right-8 z-50 size-10 p-0 rounded-full shadow-lg">
        <span>
          <Save className="w-5 h-5" />
        </span>
      </button>
    </main>
  );
}
