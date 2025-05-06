import { GetAccountReturnType } from '@wagmi/core';
import type { Compute } from '@wagmi/core/internal';
import { useState } from 'react';
import { useAccountEffect } from 'wagmi';

import { TransitionedView } from './components/animated-containers/TransitionedView';
import { FlexModal } from './components/flex-modal/FlexModal';
import { usePreloadTantoImages } from './hooks/usePreloadImages';
import { useResetView } from './hooks/useResetView';
import { useWidget } from './hooks/useWidget';
import { views } from './views';

interface TantoEmbeddedWidgetProps {
  onConnect?: (
    data: Compute<
      Pick<
        Extract<GetAccountReturnType, { status: 'connected' }>,
        'address' | 'addresses' | 'chain' | 'chainId' | 'connector'
      > & {
        isReconnected: boolean;
      }
    >,
  ) => void;
}

export function TantoEmbeddedWidget({ onConnect }: TantoEmbeddedWidgetProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { view, goBack } = useWidget();

  useAccountEffect({
    onConnect,
  });

  useResetView();
  usePreloadTantoImages();

  return (
    <>
      <div ref={setContainer} />
      <FlexModal container={container} title={view.title} showBackButton={view.showBackButton} onBack={goBack}>
        <TransitionedView viewKey={view.route}>{views[view.route]}</TransitionedView>
      </FlexModal>
    </>
  );
}
