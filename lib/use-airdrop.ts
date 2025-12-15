import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';

import { ApiPath } from './api-path';
import { Fetcher } from './fetcher';
import { trackEnhancedEvent } from './analytics/enhanced-analytics';

export type AirDropData = {
  boxes: AirDropBox[];
  current_date: number;
  base_date: number;
  next_open_time: number;
};

export type AirDropBox = {
  uuid: string;
  wallet: string;
  amount: string;
  tt_amount: string;
  tfe_amount: string;
  is_opened: boolean;
  asset: string;
  weeks: number;
  open_at: number;
};

export const MockData = {
  boxes: [
    {
      uuid: '1b4adcec-1a33-439d-a946-fccac14e3b3a',
      wallet: '0x7Be52921AEF0EEbF6F102C87e67aB43d18536591',
      amount: '0.3527',
      tt_amount: '0.3527',
      tfe_amount: '0.0000',
      is_opened: 0,
      asset: 'MON',
      weeks: 1,
      open_at: 1763568000,
    },
  ],
  base_date: 1763568000,
  current_date: 1763568000,
  next_open_time: 1763654400,
};

const UNAUTHORIZED_MESSAGE = 'Invalid Privy access token';

export default function useAirdrop() {
  const { getAccessToken, user, logout } = usePrivy();

  async function fetchAirDropData(): Promise<AirDropData | { not_eligible: true }> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token');
    }

    const wallet = user?.wallet?.address;

    if (!wallet) {
      throw new Error('No wallet connected');
    }

    const searchParams = new URLSearchParams();
    searchParams.set('wallet', wallet || '');

    try {
      const res = await Fetcher<AirDropData>(`${ApiPath.airdrop}?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return res;
    } catch (error) {
      /**
       * 接口失败 GA 上报
       * 说明：
       * - 当请求失败时，上报 `ERROR_OCCURRED` 事件，类别为 `api`
       * - 携带接口地址、状态码、错误信息与匿名钱包信息
       */
      try {
        const status = (error as { status?: number })?.status;
        const message = error instanceof Error ? error.message : String(error);
        await trackEnhancedEvent('ERROR_OCCURRED', {
          event_category: 'api',
          event_label: 'airdrop_fetch_failed',
          include_user_id: true,
          wallet_address: wallet,
          custom_parameters: {
            endpoint: ApiPath.airdrop,
            status_code: status ?? 'unknown',
            error_message: message,
            wallet_short:
              wallet && wallet.length > 10
                ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
                : wallet || 'none',
          },
        });
      } catch {}

      if (error instanceof Error && error.message === UNAUTHORIZED_MESSAGE) {
        logout();
      }

      if (error instanceof Error && error.message.includes('Not eligible')) {
        return {
          not_eligible: true,
        };
      }
    }

    return {
      not_eligible: true,
    };
  }

  const airDropData = useQuery({
    queryKey: ['airdrop', user?.id],
    queryFn: fetchAirDropData,
    enabled: !!user,
  });

  return airDropData;
}
