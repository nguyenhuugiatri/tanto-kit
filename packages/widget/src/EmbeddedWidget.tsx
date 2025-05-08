import styled from '@emotion/styled';
import { GetAccountReturnType } from '@wagmi/core';
import type { Compute } from '@wagmi/core/internal';
import { useAccountEffect } from 'wagmi';

import { CONNECT_SUCCESS_DELAY } from './constants';
import { WidgetRouterProvider } from './contexts/widget-router/WidgetRouterProvider';
import { useWidgetRouter } from './hooks/useWidgetRouter';
import { WidgetContent } from './WidgetContent';

const EmbeddedContainer = styled.div(({ theme }) => ({
  width: '100%',
  padding: '8px 20px 20px 20px',
  backgroundColor: theme.modalBackgroundColor,
}));

export interface TantoEmbeddedWidgetProps {
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

function EmbeddedWidget({ onConnect }: TantoEmbeddedWidgetProps) {
  const { reset } = useWidgetRouter();

  useAccountEffect({
    onConnect: connectData => {
      onConnect?.(connectData);
      setTimeout(reset, CONNECT_SUCCESS_DELAY);
    },
  });

  return (
    <EmbeddedContainer>
      <WidgetContent />
    </EmbeddedContainer>
  );
}

export function TantoEmbeddedWidget(props: TantoEmbeddedWidgetProps) {
  return (
    <WidgetRouterProvider>
      <EmbeddedWidget {...props} />
    </WidgetRouterProvider>
  );
}
