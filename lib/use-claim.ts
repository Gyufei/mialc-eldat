import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiPath } from './api-path';
// removed toast messages from hook to avoid cross-page toasts

import { Fetcher } from './fetcher';
import { ITxResponse } from './use-send-tx';

export function useClaim() {
  const { getAccessToken, user } = usePrivy();
  const userWallet = user?.wallet?.address;
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
          wallet: userWallet,
          box_id: boxId,
        }),
      });

      return txRes;
    } catch (error) {
      throw error;
    }
  }

  const mutation = useMutation({
    mutationFn: executeMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airdrop'] });
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
