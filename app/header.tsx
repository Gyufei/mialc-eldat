'use client';

import { usePrivy } from '@privy-io/react-auth';
import { trackEnhancedEvent } from '@/lib/analytics/enhanced-analytics';
import { CircleUser, LogOut } from 'lucide-react';

import Image from 'next/image';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { fmtAddr } from '@/lib/utils';

import CusChevronDown from './icon/chevron-down';

export default function Header() {
  const { ready, authenticated, logout, user } = usePrivy();

  const disableLogout = !ready || (ready && !authenticated);

  /**
   * 处理登出并上报 GA 事件
   * 说明：
   * - 点击时上报一次登出入口事件
   * - 成功执行后上报登出成功事件，便于追踪用户行为
   */
  async function handleLogout() {
    if (disableLogout) return;
    try {
      await trackEnhancedEvent('LOGOUT', {
        event_category: 'auth',
        event_label: 'click',
        include_user_id: true,
        wallet_address: user?.wallet?.address,
      });
      await logout();
      await trackEnhancedEvent('LOGOUT', {
        event_category: 'auth',
        event_label: 'success',
        include_user_id: true,
        wallet_address: user?.wallet?.address,
      });
    } catch {}
  }

  const userWallet = user?.wallet?.address;

  return (
    <div style={{ opacity: 1, transform: 'none' }}>
      <nav className="w-full relative z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <span
                className="inline-flex shrink-0 mt-5"
                draggable="false"
                style={{ width: 36, height: 36 }}
              >
                <span>
                  <Image src="/icons/tadle-small-logo-blue.svg" alt="Logo" width={36} height={36} />
                </span>
              </span>
            </Link>
            <div className="flex flex-row items-center gap-4">
              {/* <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-full w-8 h-8
                "
              >
                <span>
                  <VolumeX className="w-4 h-4" />
                </span>
              </button> */}
              <DropdownMenu>
                <Tooltip>
                  <DropdownMenuTrigger asChild>
                    <TooltipTrigger asChild>
                      <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans rounded-full active:scale-[0.98] disabled:active:scale-100 h-9.5 px-4 py-2 text-primary hover:bg-accent hover:text-primary transition-all duration-200">
                        <span className="flex flex-row items-center gap-2">
                          <CircleUser className="w-4 h-4" />
                          {fmtAddr(userWallet || '')}
                          <span
                            className="inline-flex shrink-0 rotate-0"
                            draggable="false"
                            style={{ width: 16, height: 16 }}
                          >
                            <span>
                              <CusChevronDown strokeColor="white" />
                            </span>
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                  </DropdownMenuTrigger>
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="bg-popover text-popover-foreground border-border border shadow-md rounded-md px-3 py-1.5 text-xs text-balance max-w-50"
                  >
                    <p>
                      This is the address used to create your profile. It&apos;s locked to this
                      profile and can&apos;t be linked to other profiles. Note: Wallets or socials
                      can only be connected to one profile at a time.
                    </p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-2 p-2">
                    <div className="rounded-full profile-picture-gradient flex items-center justify-center shrink-0 h-12 w-12" />
                    <h3
                      className="text-base font-semibold leading-normal truncate font-inter"
                      title={userWallet || ''}
                    >
                      {fmtAddr(userWallet || '')}
                    </h3>
                  </div>
                  <div className="w-full px-2 mb-2">
                    <p className="text-xs">
                      This is your profile&apos;s main address. It can&apos;t be unlinked or reused
                      to create another profile.
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <div className="size-6 flex items-center justify-center">
                      <LogOut className="text-foreground size-4" />
                    </div>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
