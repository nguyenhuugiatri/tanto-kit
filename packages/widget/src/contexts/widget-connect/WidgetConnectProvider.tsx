import { PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { Connector, useConnect, UseConnectReturnType } from 'wagmi';

import { Wallet } from '../../types/wallet';
import { isMobile, isWCConnector } from '../../utils';
import { ConnectState, WidgetConnectContext, WidgetConnectState } from './WidgetConnectContext';

const normalizeConnectStatus = (status: UseConnectReturnType['status'], connector?: Connector) => {
  switch (status) {
    case 'idle':
    case 'pending':
      if (isWCConnector(connector?.id) && isMobile()) return ConnectState.OPENING_WALLET;
      return ConnectState.PENDING;
    case 'success':
      return ConnectState.SUCCESS;
    case 'error':
      return ConnectState.ERROR;
  }
};

export const WidgetConnectProvider = ({ children }: PropsWithChildren) => {
  const { status, connect: wagmiConnect } = useConnect();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const connect = useCallback(() => {
    const connector = wallet?.connector;
    if (connector) wagmiConnect({ connector });
  }, [wallet, wagmiConnect]);

  const contextValue = useMemo<WidgetConnectState>(
    () => ({
      status: normalizeConnectStatus(status, wallet?.connector),
      wallet,
      setWallet,
      connect,
    }),
    [status, wallet, connect],
  );

  return <WidgetConnectContext.Provider value={contextValue}>{children}</WidgetConnectContext.Provider>;
};
