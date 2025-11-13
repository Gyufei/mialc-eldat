import { usePrivy } from '@privy-io/react-auth';
import { decodeImage, useRive } from '@rive-app/react-canvas';

import { useCallback, useEffect } from 'react';

import { useIsMobile } from '@/lib/use-is-mobile';

export default function ClaimBoxAnimation({ amount }: { amount: number }) {
  const { user } = usePrivy();
  const userTwitter = user?.twitter;

  const isMobile = useIsMobile();

  const { rive, RiveComponent } = useRive({
    src: isMobile ? '/riv/monad-amount-mobile-v2.riv' : '/riv/monad-amount-desktop-v2.riv',
    autoBind: true,
    autoplay: true,
    stateMachines: ['State Machine 1'],
  });

  const vmInstances = rive?.viewModelInstance;

  useEffect(() => {
    if (!vmInstances) return;

    const vmAmount = vmInstances.number('Monad Amount LVL 1');

    if (vmAmount) {
      setTimeout(() => {
        vmAmount.value = amount;
      }, 1000);
    }
  }, [vmInstances, amount]);

  const getPfpImage = useCallback(async () => {
    try {
      const imgUrl = userTwitter?.profilePictureUrl;
      if (!imgUrl) return null;

      const t = await fetch(imgUrl);
      const a = await t.arrayBuffer();
      return await decodeImage(new Uint8Array(a));
    } catch (error) {
      console.error('Error getting PFP image', error);
      return null;
    }
  }, [userTwitter]);

  useEffect(() => {
    async function initValueOfAni() {
      if (vmInstances) {
        const beginToggle = vmInstances.boolean('Username+Image Toggle');
        if (!beginToggle) return;

        if (userTwitter && userTwitter.username && userTwitter.profilePictureUrl) {
          beginToggle.value = true;
        } else {
          beginToggle.value = false;
          return;
        }

        const un = vmInstances.string('Username');
        if (un) {
          un.value = userTwitter?.username ? `@${userTwitter?.username}` : 'Anonymous';
        }

        const userPfp = vmInstances.image('ProfilePic');
        if (userPfp) {
          userPfp.value = userTwitter?.profilePictureUrl ? await getPfpImage() : null;
        }
      }
    }

    initValueOfAni();
  }, [userTwitter]);

  return (
    <div className="h-[400px] w-full">
      <div style={{ width: '100%', height: '100%' }}>
        <RiveComponent />
      </div>
    </div>
  );
}
