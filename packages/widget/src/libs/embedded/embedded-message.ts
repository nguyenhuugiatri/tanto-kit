export type WindowMessage = {
  state: string;
} & (
  | {
      type: 'fail';
      error: {
        code: number;
        message: string;
      };
    }
  | {
      type: 'success';
      data: string | object;
    }
);

export interface EmbeddedWhoAmIMessage {
  eventName: 'waypoint:whoami';
}

export interface EmbeddedLoginOTPMessage {
  eventName: 'waypoint:login-otp';
  payload: {
    email: string;
    code?: string;
  };
}

export interface EmbeddedCreateWalletMessage {
  eventName: 'waypoint:create-wallet';
}

export interface EmbeddedUnlockWalletMessage {
  eventName: 'waypoint:unlock-wallet';
  payload: {
    recoveryPassword: string;
  };
}

export interface EmbeddedSignMessage {
  eventName: 'waypoint:sign';
  payload: {
    address: `0x${string}`;
    message: string;
  };
}

export interface EmbeddedSendTransaction {
  eventName: 'waypoint:send';
  payload: Record<string, any>;
}

export interface EmbeddedLogout {
  eventName: 'waypoint:logout';
}

export interface EmbeddedCheckGasSponsor {
  eventName: 'waypoint:check-gas-sponsor';
  payload: Record<string, any>;
}

export type EmbeddedMessage =
  | EmbeddedWhoAmIMessage
  | EmbeddedLoginOTPMessage
  | EmbeddedCreateWalletMessage
  | EmbeddedUnlockWalletMessage
  | EmbeddedSignMessage
  | EmbeddedSendTransaction
  | EmbeddedLogout
  | EmbeddedCheckGasSponsor;

export type EmbeddedMessageWithId = EmbeddedMessage & { id: string };

export type EmbeddedEventName = EmbeddedMessage['eventName'];
