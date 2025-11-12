import { useAccount } from 'wagmi';
import { useSendTransaction } from 'wagmi';

import { useState } from 'react';

export interface ITxResponse {
  tx_data: ITxData;
}

interface ITxData {
  from: string;
  to: string;
  data: string;
  gas: number;
  value?: string;
  nonce?: string;
}

export function useSendTx() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const send = async (txRes: ITxResponse) => {
    if (!txRes.tx_data) {
      throw new Error('Invalid tx data');
    }

    const { from, to, data, gas, value } = txRes.tx_data;

    try {
      setIsPending(true);

      const txParams = {
        account: address as `0x${string}`,
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        ...(value ? { value: BigInt(value) } : {}),
        ...(from ? { from: from as `0x${string}` } : {}),
        ...(gas ? { gas: BigInt(gas) } : {}),
      };

      console.log('txParams', txParams, address);
      const hash = await sendTransactionAsync(txParams);
      console.log('hash', hash);
      setIsSuccess(true);
      return hash;
    } catch (err) {
      setIsError(true);
      setError(err as Error);
      console.log('err', err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    send,
    isPending,
    isSuccess,
    isError,
    error,
  };
}
