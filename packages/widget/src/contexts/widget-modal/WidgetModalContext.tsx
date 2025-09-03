import { createContext } from 'react';

export interface WidgetModalState {
  connectModalOpen: boolean;
  showConnectModal: () => void;
  hideConnectModal: () => void;
  setConnectModalOpen: (open: boolean) => void;

  fundModalOpen: boolean;
  showFundModal: () => void;
  hideFundModal: () => void;
  setFundModalOpen: (open: boolean) => void;
}

export const WidgetModalContext = createContext<WidgetModalState | undefined>(undefined);
