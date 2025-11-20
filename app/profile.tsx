import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';

import ClaimWallet from './claim-wallet';
import ConnectionPart from './connection-part';
// import DiscordConnected from './discord-connected';
import FAQ from './faq';
import StrengthIndicator from './strength-indicator';

export default function Profile() {
  const { user } = usePrivy();

  const userWallet = user?.wallet?.address;

  return (
    <motion.div
      className="flex-1 w-full pt-4.5 pb-8 px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div
        className="rounded-3xl border bg-card text-card-foreground shadow-sm w-full max-w-6xl px-4 py-8 lg:px-20 lg:py-11 border-zinc-800 mx-auto"
        style={{
          background:
            'linear-gradient(180deg, rgba(148, 137, 252, 0.00) 81.19%, rgba(148, 137, 252, 0.16) 100%), var(--base-popover, #09090B)',
          boxShadow: 'rgba(162, 155, 212, 0.25) 0px 4px 54px -10px inset',
        }}
      >
        <div className="space-y-1.5 p-0 pb-4 border-b border-border flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-4">
              <div className="text-3xl font-semibold leading-none tracking-tight text-primary title-gradient">
                MON Claim Portal
              </div>
              <FAQ />
            </div>
            <div className="text-sm text-secondary">
              Begin your claim journey. Connect your wallets and socials to check your eligibility
              status.
            </div>
          </div>
          <div>
            <ClaimWallet walletAddress={userWallet} />
          </div>
        </div>
        <div className="p-0 pt-8">
          <div className="flex flex-col md:grid md:grid-cols-2 gap-8 lg:gap-22.5">
            <div className="space-y-6 md:order-last md:mt-8 h-full">
              <div className="relative w-full aspect-square">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-blue-400 bg-blue-500/30 text-blue-200 font-medium absolute -top-2 right-2 md:-top-6 md:right-2.5 z-50 text-2xs md:text-sm">
                  NOT ELIGIBLE
                </div>
                <div className="pointer-events-none md:pointer-events-auto w-full h-full">
                  <StrengthIndicator
                    strength={0}
                    hideCoin={false}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
              <p className="text-center md:text-left text-xs lg:text-sm text-secondary">
                Early reveal has begun for users who choose to participate. Read{' '}
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-britti-sans rounded-full transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 underline-offset-4 hover:text-neutral-500 px-0! text-primary hover:underline cursor-pointer p-0 m-0 h-fit">
                  FAQ
                </button>{' '}
                for more.
              </p>
            </div>
            <ConnectionPart />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
