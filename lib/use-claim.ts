import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiPath } from './api-path';
// removed toast messages from hook to avoid cross-page toasts

import { Fetcher } from './fetcher';
import { trackEnhancedEvent } from './analytics/enhanced-analytics';
import { ITxResponse } from './use-send-tx';

export function useClaim() {
  const { getAccessToken, user } = usePrivy();
  const userWallet = user?.wallet?.address;
  const queryClient = useQueryClient();

  /**
   * 执行领取（claim）接口调用，并在失败时进行 GA 上报
   * 说明：
   * - 成功时返回后续用于发起链上交易的 `ITxResponse`
   * - 失败时上报 `ERROR_OCCURRED` 事件，携带接口地址、状态码、错误信息与匿名钱包信息
   */
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
      // 接口失败 GA 上报（尽量不影响主流程，失败也不抛出二次错误）
      try {
        const status = (error as { status?: number })?.status;
        const message = error instanceof Error ? error.message : String(error);
        await trackEnhancedEvent('ERROR_OCCURRED', {
          event_category: 'api',
          event_label: 'claim_execute_failed',
          include_user_id: true,
          wallet_address: userWallet,
          custom_parameters: {
            endpoint: ApiPath.claim,
            status_code: status ?? 'unknown',
            error_message: message,
            box_id: boxId,
            wallet_short:
              userWallet && userWallet.length > 10
                ? `${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`
                : userWallet || 'none',
          },
        });
      } catch {}
      throw error;
    }
  }

  /**
   * 领取接口（claim）mutation，并在成功/失败时进行 GA 上报
   * 说明：
   * - 成功：上报 `BUTTON_CLICK` 事件（claim_execute_success），附加返回的交易数据要点
   * - 失败：保留原有错误提示，并在上游 `executeMutation` 中已上报错误事件
   */
  const mutation = useMutation({
    mutationFn: executeMutation,
    onSuccess: async (txRes) => {
      queryClient.invalidateQueries({ queryKey: ['airdrop'] });
      try {
        await trackEnhancedEvent('BUTTON_CLICK', {
          event_category: 'api',
          event_label: 'claim_execute_success',
          include_user_id: true,
          wallet_address: userWallet,
          custom_parameters: {
            endpoint: ApiPath.claim,
            status_code: 200,
            tx_from: txRes?.tx_data?.from,
            tx_to: txRes?.tx_data?.to,
            box_id: txRes?.tx_data?.from ? txRes.tx_data.from : 'unknown',
            wallet_short:
              userWallet && userWallet.length > 10
                ? `${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`
                : userWallet || 'none',
          },
        });
      } catch {}
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
