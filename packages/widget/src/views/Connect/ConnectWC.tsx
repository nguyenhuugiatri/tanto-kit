import { TransitionedView } from '../../components/animated-containers/TransitionedView';
import { Box } from '../../components/box/Box';
import { CopyButton } from '../../components/copy-button/CopyButton';
import { GetWalletCTA } from '../../components/get-wallet-cta/GetWalletCTA';
import { WCQRCode } from '../../components/qr-code/WCQRCode';
import { RONIN_WALLET_APP_DEEPLINK } from '../../constants';
import { useWalletConnectUri } from '../../hooks/useWalletConnectUri';
import { useWidgetConnect } from '../../hooks/useWidgetConnect';
import { CONNECT_STATES } from '../../types';
import { generateRoninMobileWCLink, isMobile } from '../../utils';
import { openWindow } from '../../utils/openWindow';
import { ConnectLayout } from './components/ConnectLayout';
import { ScanGuideline } from './components/ScanGuideline';

const ScanQRCode = ({ uri }: { uri: string | undefined }) => {
  return (
    <Box vertical align="center" justify="center" gap={20} pt={20}>
      <Box vertical align="center" justify="center" gap={16}>
        <CopyButton value={uri}>Copy link</CopyButton>
        <WCQRCode value={uri} />
        <ScanGuideline />
      </Box>
      <GetWalletCTA />
    </Box>
  );
};

export function ConnectWC() {
  const mobile = isMobile();
  const { wallet } = useWidgetConnect();
  const { uri, status, generateConnectUri } = useWalletConnectUri({
    connector: wallet?.connector,
    onReceiveDisplayUri: uri => {
      if (mobile) openWindow(generateRoninMobileWCLink(uri, RONIN_WALLET_APP_DEEPLINK));
    },
  });

  if (!wallet || !wallet.connector) return null;

  if (mobile)
    return (
      <ConnectLayout
        status={status}
        walletIcon={wallet.icon}
        walletName={wallet.name}
        wcUri={uri}
        onRetry={generateConnectUri}
      />
    );

  return (
    <TransitionedView viewKey={status}>
      {status === CONNECT_STATES.PENDING ? (
        <ScanQRCode uri={uri} />
      ) : (
        <ConnectLayout
          status={status}
          walletIcon={wallet.icon}
          walletName={wallet.name}
          wcUri={uri}
          onRetry={generateConnectUri}
        />
      )}
    </TransitionedView>
  );
}
