import type { PropsWithChildren } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { ConfirmationModal } from '../../ConfirmationModal';
import { FundModal } from '../../FundModal';
import { WidgetModal } from '../../WidgetModal';
import type { WidgetModalState } from './WidgetModalContext';
import { WidgetModalContext } from './WidgetModalContext';

function useModalStateValue() {
  const [open, setOpen] = useState(false);

  return {
    open,
    setOpen,
    showModal: useCallback(() => setOpen(true), []),
    hideModal: useCallback(() => setOpen(false), []),
  };
}

export function WidgetModalProvider({ children }: PropsWithChildren) {
  const {
    open: connectModalOpen,
    setOpen: setConnectModalOpen,
    showModal: showConnectModal,
    hideModal: hideConnectModal,
  } = useModalStateValue();
  const {
    open: fundModalOpen,
    setOpen: setFundModalOpen,
    showModal: showFundModal,
    hideModal: hideFundModal,
  } = useModalStateValue();

  const contextValue = useMemo<WidgetModalState>(
    () => ({
      connectModalOpen,
      showConnectModal,
      hideConnectModal,
      setConnectModalOpen,
      fundModalOpen,
      showFundModal,
      hideFundModal,
      setFundModalOpen,
    }),
    [connectModalOpen, showConnectModal, hideConnectModal, fundModalOpen, showFundModal, hideFundModal],
  );

  return (
    <WidgetModalContext.Provider value={contextValue}>
      {children}
      <WidgetModal />
      <ConfirmationModal />
      <FundModal />
    </WidgetModalContext.Provider>
  );
}
