'use client';

import { usePrivy } from '@privy-io/react-auth';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import useAirdrop from '@/lib/use-airdrop';

import ClaimBoxes from './claim-boxes';
import Footer from './footer';
import Header from './header';
import Login from './login';
import Profile from './profile';
import SaveBtn from './save-btn';

// import Profile from './profile';

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const [isLogging, setIsLogging] = useState(false);

  const { data: airDropData, isLoading: isAirdropLoading } = useAirdrop();
  const isNotEligible = airDropData && 'not_eligible' in airDropData && airDropData.not_eligible;
  const isAirdropActive =
    airDropData &&
    !isNotEligible &&
    'current_date' in airDropData &&
    'base_date' in airDropData &&
    airDropData?.current_date >= airDropData?.base_date;

  useEffect(() => {
    let lastErrorTimestamp = 0;
    const originalConsoleError = console.error;

    console.error = (...args) => {
      originalConsoleError(...args);

      const normalizedMessage = args
        .map((arg) => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch {
              return '[object]';
            }
          }
          return String(arg);
        })
        .join(' ')
        .toLowerCase();

      const now = Date.now();
      const throttleExpired = now - lastErrorTimestamp > 2000;

      if (normalizedMessage.includes('provider_error') && throttleExpired) {
        lastErrorTimestamp = now;
        if (normalizedMessage.includes('user rejected')) {
          toast.error('Wallet connection was cancelled.');
        } else if (normalizedMessage.includes('internal error')) {
          toast.error('Failed to connect wallet. Please try again.', {
            description:
              "If you're connecting with Phantom, close the modal. Then, select the right account and try again.",
            duration: 15000,
          });
        }
      } else if (normalizedMessage.includes('invalid_data') && throttleExpired) {
        lastErrorTimestamp = now;
        toast.error('Failed to connect wallet.', {
          description: 'Please refresh the page and try again.',
          duration: 15000,
        });
      }
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  if (!ready) {
    return (
      <main className="relative flex justify-center items-center min-h-screen w-full bg-background">
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
        {isAirdropLoading ? (
          <div className="h-[calc(100vh-100px)] flex items-center justify-center">
            <LoaderCircle className="w-10 h-10 animate-spin" />
          </div>
        ) : isAirdropActive ? (
          <ClaimBoxes />
        ) : (
          <Profile />
        )}
        <Footer />
      </div>
      {!isAirdropActive && <SaveBtn />}
    </main>
  );
}
