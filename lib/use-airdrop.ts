import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';

import { ApiPath } from './api-path';
import { Fetcher } from './fetcher';

export type AirDropData = {
  is_active: boolean;
  current_day: number;
  days: AirDropDay[];
};

export type AirDropDay = {
  day_num: number;
  is_active: boolean;
  boxes: AirDropBox[];
};

export type AirDropBox = {
  id: number;
  is_opened: boolean;
  amount: number;
  is_can_open: boolean;
};

export default function useAirdrop() {
  const { getAccessToken, user } = usePrivy();

  async function fetchAirDropData(): Promise<AirDropData> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token');
    }

    const res = await Fetcher<AirDropData>(ApiPath.airdrop, {
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
