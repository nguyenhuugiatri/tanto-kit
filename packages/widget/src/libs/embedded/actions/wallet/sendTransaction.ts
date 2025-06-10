import type { Hex } from 'viem';

import { EmbeddedCommunicator } from '../../embedded-communicator';

export type SendTransactionParameters = Record<string, any>;

export interface SendTransactionResult {
  hash: Hex;
}

export function sendTransaction<C extends EmbeddedCommunicator, P extends SendTransactionParameters>(
  communicator: C,
  parameters: P,
) {
  return communicator.send<SendTransactionResult>({
    eventName: 'waypoint:send',
    payload: parameters,
  });
}
