'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { CircleUser, LogOut } from 'lucide-react';

import { useEffect } from 'react';

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

import { trackEnhancedEvent } from '@/lib/analytics/enhanced-analytics';
import { fmtAddr } from '@/lib/utils';

import CusChevronDown from './icon/chevron-down';

export default function Header() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const disableLogout = !ready || (ready && !authenticated);

  /**
   * 处理登出并上报 GA 事件
   * 说明：
   * - 点击时上报一次登出入口事件
   * - 首先主动断开当前网页与外部钱包的连接（ WalletConnect会向手机端推送断开信号），
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
      // 主动断开所有“已连接的钱包”的会话，以确保手机端也同步断开
      // - ConnectedWallet.disconnect(): 对 WalletConnect 等支持断开的客户端会发起会话终止
      // - 对不支持编程断开的客户端（如部分注入钱包）此调用将安全地 no-op
      try {
        for (const w of wallets || []) {
          w.disconnect?.();
        }
      } catch {}
      await logout();
      await trackEnhancedEvent('LOGOUT', {
        event_category: 'auth',
        event_label: 'success',
        include_user_id: true,
        wallet_address: user?.wallet?.address,
      });
    } catch {}
  }

  /**
   * 监听 WalletConnect 会话在“手机端主动断开”的场景
   * 目标：当检测到网页端已无任何有效连接（所有钱包 `isConnected() === false`）时，自动登出并清理缓存
   * 说明：
   * - WalletConnect 断开会触发 Privy Connector 更新，此处根据 `useWallets()` 的状态进行二次确认
   * - 注入类钱包可能无法主动通知断开事件，若网页侧检测到全部断开，则执行登出与清理
   */
  useEffect(() => {
    let cancelled = false;
    const syncOnMobileDisconnect = async () => {
      if (!ready || !authenticated) return;
      try {
        const list = wallets || [];
        const loginAddress = (user?.wallet?.address || '').toLowerCase();
        if (list.length === 0) {
          // 已无任何钱包，视为连接已解除
          await logout();
          return;
        }
        const statuses = await Promise.all(list.map((w) => w.isConnected()));
        const anyConnected = statuses.some(Boolean);
        const loginIndex = loginAddress
          ? list.findIndex((w) => (w.address || '').toLowerCase() === loginAddress)
          : -1;
        const loginConnected = loginIndex >= 0 ? !!statuses[loginIndex] : false;

        // 若“当前登录地址对应的钱包”已被移除或断开，则级联断开剩余连接并登出
        if ((!loginAddress || loginIndex === -1 || !loginConnected) && anyConnected && !cancelled) {
          try {
            for (const w of list) {
              w.disconnect?.();
            }
          } catch {}
          await logout();
          return;
        }

        // 若全部断开，也执行登出与清理
        if (!anyConnected && !cancelled) {
          await logout();
        }
      } catch {}
    };
    syncOnMobileDisconnect();
    return () => {
      cancelled = true;
    };
  }, [wallets, ready, authenticated, logout, user?.wallet?.address]);

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
