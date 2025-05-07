import { createContext } from 'react';

import { Wallet } from '../../types/wallet';

export enum ConnectState {
  PENDING = 'PENDING',
  OPENING_WALLET = 'OPENING_WALLET',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface WidgetConnectState {
  status: ConnectState;
  wallet: Wallet | null;
  setWallet: (wallet: Wallet) => void;
  connect: () => void;
}

export const WidgetConnectContext = createContext<WidgetConnectState | undefined>(undefined);
