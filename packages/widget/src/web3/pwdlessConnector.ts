import { createConnector } from '@wagmi/core';

import { PwdlessProvider } from './PwdlessProvider';

interface PwdlessConnectorOptions {
  baseUrl: string;
  chainId: number;
}

export function pwdlessConnector(options: PwdlessConnectorOptions) {
  const provider = new PwdlessProvider({
    baseUrl: options.baseUrl,
    chainId: options.chainId,
  });

  const _connect = async () => {
    const { address } = await provider.connect();
    return {
      accounts: [address] as const,
      chainId: provider.getChainId(),
    };
  };

  const _getAccounts = async () => {
    const address = provider.getAddress();
    return address ? ([address] as const) : [];
  };

  return createConnector(() => {
    return {
      icon: '',
      id: 'pwdless',
      name: 'Pwdless',
      type: 'pwdless',
      connect: _connect,
      getAccounts: _getAccounts,
      getChainId: async () => provider.getChainId(),
      getProvider: async () => provider,
      isAuthorized: async () => provider.isConnected(),
      disconnect: async () => provider.disconnect(),
      onAccountsChanged: () => {},
      onChainChanged: () => {},
      onDisconnect: () => {},
    };
  });
}
