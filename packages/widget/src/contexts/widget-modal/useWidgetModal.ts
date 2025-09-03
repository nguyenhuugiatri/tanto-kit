import { useContext } from 'react';

import { TantoWidgetError, TantoWidgetErrorCodes } from '../../utils/errors';
import { WidgetModalContext } from './WidgetModalContext';

export function useConnectModal() {
  const context = useContext(WidgetModalContext);
  if (context === undefined) {
    throw new TantoWidgetError(
      TantoWidgetErrorCodes.CONTEXT_NOT_INITIALIZED,
      'useConnectModal must be used within a WidgetModalProvider',
    );
  }
  return {
    connectModalOpen: context.connectModalOpen,
    setConnectModalOpen: context.setConnectModalOpen,
    showConnectModal: context.showConnectModal,
    hideConnectModal: context.hideConnectModal,
  };
}

export function useFundModal() {
  const context = useContext(WidgetModalContext);
  if (context === undefined) {
    throw new TantoWidgetError(
      TantoWidgetErrorCodes.CONTEXT_NOT_INITIALIZED,
      'useFundModal must be used within a WidgetModalProvider',
    );
  }
  return {
    fundModalOpen: context.fundModalOpen,
    setFundModalOpen: context.setFundModalOpen,
    showFundModal: context.showFundModal,
    hideFundModal: context.hideFundModal,
  };
}
