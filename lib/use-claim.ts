import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiPath } from './api-path';
// removed toast messages from hook to avoid cross-page toasts

import { Fetcher } from './fetcher';
import { useSendTx } from './use-send-tx';
import { ITxResponse } from './use-send-tx';

const mockTxRes = {
  data: '0x183ff085',
  from: '0x7Be52921AEF0EEbF6F102C87e67aB43d18536591',
  gas: 35000,
  to: '0xAc586b65F3cd0627D2D05AdB8EF551C9d2D76E12',
};

export function useClaim() {
  const { user } = usePrivy();
  const { send } = useSendTx();
  const queryClient = useQueryClient();

  async function executeMutation({ boxId }: { boxId: number }) {
    try {
      const txRes = await Fetcher<ITxResponse>(ApiPath.claim, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user,
          boxId: boxId,
        }),
      });

      console.log('txRes', txRes);
      const txhash = await send({ tx_data: mockTxRes });

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
