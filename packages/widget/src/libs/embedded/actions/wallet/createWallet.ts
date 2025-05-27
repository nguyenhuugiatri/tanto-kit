import type { Address } from 'viem';

import { EmbeddedCommunicator } from '../../embedded-communicator';

export interface CreateWalletResult {
  address: Address | undefined;
}

export function createWallet<C extends EmbeddedCommunicator>(communicator: C) {
  return communicator.send<CreateWalletResult>({
    eventName: 'waypoint:create-wallet',
  });
}
