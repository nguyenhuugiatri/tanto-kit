import { useAccount, useAccountEffect, useBalance } from 'wagmi';

import { TransitionedView } from './components/animated-containers/TransitionedView';
import { FlexModal } from './components/flex-modal/FlexModal';
import { CONNECT_WIDGET_HIDE_DELAY, RONIN_WALLET_DEEEPLINK } from './constants';
import { usePreloadTantoImages } from './hooks/usePreloadImages';
import { useResetView } from './hooks/useResetView';
import { useWalletConnectListener } from './hooks/useWalletConnectListener';
import { useWidget } from './hooks/useWidget';
import { isMobile } from './utils';
import { openWindow } from './utils/openWindow';
import { views } from './views';

export function TantoWidget() {
  const { view, open, setOpen, hide, goBack } = useWidget();
  const { address, chainId, connector } = useAccount();

  useWalletConnectListener({
    connector,
    onSignRequest: () => {
      if (isMobile()) openWindow(RONIN_WALLET_DEEEPLINK);
    },
  });

  useBalance({ address, chainId });
  useAccountEffect({
    onConnect() {
      setTimeout(hide, CONNECT_WIDGET_HIDE_DELAY);
    },
  });

  useResetView();
  usePreloadTantoImages();

  return (
    <FlexModal
      title={view.title}
      open={open}
      showBackButton={view.showBackButton}
      onOpenChange={setOpen}
      onBack={goBack}
    >
      <TransitionedView viewKey={view.route}>{views[view.route]}</TransitionedView>
    </FlexModal>
  );
}
