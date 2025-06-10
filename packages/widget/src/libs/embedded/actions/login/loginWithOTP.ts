import { Account } from '../../embedded-auth';
import { EmbeddedCommunicator } from '../../embedded-communicator';

export interface LoginWithOTPParameters {
  email: string;
  code: string;
}

export function loginWithOTP<C extends EmbeddedCommunicator, P extends LoginWithOTPParameters>(
  communicator: C,
  parameters: P,
) {
  return communicator.send<{ account: Account | null }>({
    eventName: 'waypoint:login-otp',
    payload: parameters,
  });
}
