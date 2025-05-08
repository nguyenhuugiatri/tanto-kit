import { useCallback } from 'react';
import { Connector, useConnect as useWagmiConnect, UseConnectReturnType } from 'wagmi';

import { ConnectState } from '../types';
import { isMobile, isWCConnector } from '../utils';

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

export function useConnect(connector?: Connector) {
  const { status, connect: wagmiConnect } = useWagmiConnect();

  const connect = useCallback(() => {
    if (connector) wagmiConnect({ connector });
  }, [connector, wagmiConnect]);

  return {
    status: normalizeConnectStatus(status, connector),
    connector,
    connect,
  };
}
