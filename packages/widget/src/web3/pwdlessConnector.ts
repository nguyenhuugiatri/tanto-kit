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

  return createConnector<PwdlessProvider>(() => {
    return {
      icon: '',
      id: 'pwdless',
      name: 'Pwdless',
      type: 'pwdless',
      getProvider: async () => provider,
      getAccounts: async () => provider.getAccounts(),
      getChainId: async () => provider.getChainId(),
      connect: async () => {
        const { address } = await provider.connect();
        return {
          accounts: [address],
          chainId: provider.getChainId(),
        };
      },
      isAuthorized: async () => provider.isAuthenticated(),
      disconnect: async () => provider.disconnect(),

      // TODO
      onAccountsChanged: () => {},
      onChainChanged: () => {},
      onDisconnect: () => {},
    };
  });
}
