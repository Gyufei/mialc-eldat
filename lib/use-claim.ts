import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiPath } from './api-path';
// removed toast messages from hook to avoid cross-page toasts

import { Fetcher } from './fetcher';
import { useSendTx } from './use-send-tx';
import { ITxResponse } from './use-send-tx';

export function useClaim() {
  const { getAccessToken } = usePrivy();
  const { send } = useSendTx();
  const queryClient = useQueryClient();

  async function executeMutation({ boxId }: { boxId: string }) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token');
    }
    try {
      const txRes = await Fetcher<ITxResponse>(ApiPath.claim, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boxId: boxId,
        }),
      });

      const txhash = await send({ tx_data: txRes.tx_data });

      // const saveHashRes = await Fetcher<{ status: boolean; message: string }>(
      //   ApiPath.checkInComplete,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       tx_hash: txhash,
      //       wallet: address,
      //     }),
      //   }
      // );

      return txhash;
    } catch (error) {
      throw error;
    }
  }

  const mutation = useMutation({
    mutationFn: executeMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCheckIn'] });
    },
    onError: (e) => {
      console.log('e====', e.message);
      if (e.message.includes('User rejected')) {
        toast.error('User rejected the transaction');
      }
    },
  });

  return mutation;
}
