import { usePrivy } from '@privy-io/react-auth';

import Email from './icon/email';

export default function EmailConnected() {
  const { user, linkEmail } = usePrivy();
  const emailAddress = user?.email?.address;

  function handleLinkEmail() {
    if (emailAddress) {
      return;
    }
    linkEmail();
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <button
        onClick={handleLinkEmail}
        className="justify-center whitespace-nowrap text-sm font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-britti-sans disabled:active:scale-100 hover:text-neutral-500 flex w-full items-center h-auto py-6 px-6 transition-all duration-200 rounded-2xl border gap-4 relative z-10 bg-alpha-50 border-border active:scale-100 cursor-pointer hover:bg-background hover:border-brand-purple-hover/25 hover:shadow-[0_-10px_30px_0_rgba(110,84,255,0.20)_inset,0_0_25px_0_rgba(82,82,82,0.25)_inset,0_2px_10px_0_rgba(51,51,51,0.15)_inset]"
      >
        <span
          className="inline-flex shrink-0"
          draggable="false"
          style={{ width: 48, height: 48 }}
        >
          <span>
            <Email fillColor={emailAddress ? '#B8B4FE' : '#52525B'} />
          </span>
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2 sm:gap-4 min-w-0">
          <div className="flex flex-col flex-1 min-w-0 gap-2">
            <h4 className="font-medium text-primary truncate text-left text-lg">
              <div className="flex items-center gap-[5px] min-w-0">
                <span className="truncate text-ellipsis text-lg min-w-0">
                  {emailAddress ? emailAddress : 'Email'}
                </span>
              </div>
            </h4>
            {!emailAddress && (
              <div className="flex flex-col-reverse items-start min-[375px]:flex-row min-[375px]:items-center min-[375px]:justify-between md:justify-between lg:justify-between gap-2 min-w-0">
                <p className="text-sm font-medium text-tertiary">Not connected</p>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

