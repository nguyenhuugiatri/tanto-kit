import type { Hex } from 'viem';

import { EmbeddedCommunicator } from '../../embedded-communicator';

export interface SignMessageParameters {
  address: `0x${string}`;
  message: string;
}

export interface SignMessageResult {
  signature: Hex;
}

export function signMessage<C extends EmbeddedCommunicator, P extends SignMessageParameters>(
  communicator: C,
  parameters: P,
) {
  return communicator.send<SignMessageResult>({
    eventName: 'waypoint:sign',
    payload: parameters,
  });
}
