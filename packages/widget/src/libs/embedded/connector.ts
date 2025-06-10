import { HostCommunicator } from '@sky-mavis/tanto-iframe-communicator';
import { createConnector } from '@wagmi/core';

import { whoAmI } from './actions';
import { EmbeddedMessage } from './embedded-message';
import { EmbeddedProvider } from './provider/embedded-provider';

export function embeddedConnector() {
  const communicator = HostCommunicator.getInstance<EmbeddedMessage>({
    logger: console.debug,
  });
  const provider = new EmbeddedProvider({ communicator });

  const _connect = async () => {
    const account = await whoAmI(communicator);
    return {
      accounts: account?.wallet?.identity ? [account.wallet.identity] : [],
      chainId: 2020,
    };
  };

  const _getAccounts = async () => {
    const account = await whoAmI(communicator);
    return account?.wallet?.identity ? [account.wallet.identity] : [];
  };

  return createConnector(() => {
    return {
      icon: '',
      id: 'embedded',
      name: 'Ronin Keyless Walllet',
      type: 'embedded',
      connect: _connect,
      getAccounts: _getAccounts,
      getChainId: async () => 2020,
      getProvider: async () => provider,
      isAuthorized: () => whoAmI(communicator).then(account => !!account?.wallet?.identity),
      disconnect: async () => {},
      onAccountsChanged: () => {},
      onChainChanged: () => {},
      onDisconnect: () => {},
    };
  });
}
