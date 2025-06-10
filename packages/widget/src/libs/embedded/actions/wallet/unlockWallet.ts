import { EmbeddedCommunicator } from '../../embedded-communicator';

export interface UnlockWalletParameters {
  recoveryPassword: string;
}

export function unlockWallet<C extends EmbeddedCommunicator, P extends UnlockWalletParameters>(
  communicator: C,
  parameters: P,
) {
  return communicator.send<void>({
    eventName: 'waypoint:unlock-wallet',
    payload: parameters,
  });
}
