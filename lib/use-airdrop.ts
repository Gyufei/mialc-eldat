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
};

const mockData = 
{
  is_active: true,
  current_day: 1,
  days: [
    {
      day_num: 1,
      is_active: true,
      boxes: [
        {
          id: 64,
          is_opened: false,
          amount: 85,
        },
        {
          id: 88,
          is_opened: false,
          amount: 2,
        },
        {
          id: 11,
          is_opened: false,
          amount: 57,
        },
      ],
    },
    {
      day_num: 2,
      is_active: false,
      boxes: [
        {
          id: 2,
          is_opened: false,
          amount: 47,
        },
        {
          id: 44,
          is_opened: false,
          amount: 64,
        },
        {
          id: 90,
          is_opened: false,
          amount: 70,
        },
      ],
    },
    {
      day_num: 3,
      is_active: false,
      boxes: [
        {
          id: 7,
          is_opened: false,
          amount: 85,
        },
        {
          id: 47,
          is_opened: false,
          amount: 68,
        },
        {
          id: 31,
          is_opened: false,
          amount: 6,
        },
      ],
    },
  ],
};

export default function useAirdrop() {
  const { user } = usePrivy();

  async function fetchAirDropData(): Promise<AirDropData> {
    const res = await Fetcher<AirDropData>(ApiPath.airdrop, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user,
      }),
    });

    return mockData;
    return res;
  }

  const airDropData = useQuery({
    queryKey: ['airdrop', user?.id],
    queryFn: fetchAirDropData,
    enabled: !!user,
  });

  return airDropData;
}
