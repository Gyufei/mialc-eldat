'use client';

import { useRive } from '@rive-app/react-canvas';

import { type HTMLAttributes, useEffect, useRef } from 'react';

type StrengthIndicatorProps = HTMLAttributes<HTMLDivElement>;

export default function StrengthIndicator({
  className,
  style,
  ...restProps
}: StrengthIndicatorProps) {
  const { rive, RiveComponent } = useRive({
    src: '/riv/strength-indicator_v1.riv',
    stateMachines: ['State Machine 1'],
    autoBind: true,
    autoplay: true,
  });

  const { strength, hideCoin } = {
    strength: 0,
    hideCoin: false,
  };
  const strengthRef = useRef(strength);

  const stateMachineInputs = rive?.stateMachineInputs('State Machine 1');
  const vmInstances = rive?.viewModelInstance;

  useEffect(() => {
    if (!vmInstances || strength === undefined) return;

    const rotation = Math.round(360 * Math.max(0, strength));

    try {
      const rotationInstance = vmInstances.number('Rotation');
      const coinFlipTrigger = vmInstances.trigger('Coin Flip Click');
      const coinOnFlag = vmInstances.boolean('CoinOn');

      if (coinOnFlag && hideCoin) {
        coinOnFlag.value = hideCoin;
      }

      if (strength > strengthRef.current) {
        coinFlipTrigger?.trigger();
      }

      if (rotationInstance !== null) {
        rotationInstance.value = rotation;
      }

      strengthRef.current = strength;
    } catch (error) {
      console.error('Failed to update animation properties:', error);
    }
  }, [vmInstances, strength]);

  useEffect(() => {
    if (!stateMachineInputs) {
      return;
    }

    try {
      const mouseFollowInput = stateMachineInputs.find(
        (item: { name: string; value: number | boolean }) => item.name === 'MouseFollow'
      );

      if (mouseFollowInput) {
        mouseFollowInput.value = true;
      }
    } catch (error) {
      console.error('Failed to enable MouseFollow:', error);
    }
  }, [stateMachineInputs]);

  return (
    <div className={className} style={style} {...restProps}>
      <RiveComponent />
    </div>
  );
}
