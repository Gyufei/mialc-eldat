import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';

import { ApiPath } from './api-path';
import { Fetcher } from './fetcher';

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

export default function useAirdrop() {
  const { getAccessToken, user } = usePrivy();

  async function fetchAirDropData(): Promise<AirDropData> {
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

    const res = await Fetcher<AirDropData>(`${ApiPath.airdrop}?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return res;
  }

  const airDropData = useQuery({
    queryKey: ['airdrop', user?.id],
    queryFn: fetchAirDropData,
    enabled: !!user,
  });

  return airDropData;
}
