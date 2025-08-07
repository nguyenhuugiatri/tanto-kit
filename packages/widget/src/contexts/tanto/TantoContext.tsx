import { createContext } from 'react';

export interface TantoConfig {
  clientId?: string;
  reducedMotion?: boolean;
  disableProfile?: boolean;
  hideConnectSuccessPrompt?: boolean;
  initialChainId?: number;
  createAccountOnConnect?: boolean;
  showConfirmationModal?: boolean;
  __internal_waypointBaseUrl?: string;
  __internal_mpcBaseUrl?: string;
  __internal_mpcSocketUrl?: string;
}

export interface TantoState {
  config: TantoConfig;
}

export const TantoContext = createContext<TantoState | undefined>(undefined);
