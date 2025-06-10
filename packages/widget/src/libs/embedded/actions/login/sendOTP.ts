import { EmbeddedCommunicator } from '../../embedded-communicator';

export interface SendOTPParameters {
  email: string;
}

export function sendOTP<C extends EmbeddedCommunicator, P extends SendOTPParameters>(communicator: C, parameters: P) {
  return communicator.send<{
    email_sent: boolean;
  }>({
    eventName: 'waypoint:login-otp',
    payload: parameters,
  });
}
