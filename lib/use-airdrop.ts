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
