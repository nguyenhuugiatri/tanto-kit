import { useAccount } from 'wagmi';

import { SmoothWidth } from './components/animated-containers/SmoothWidth';
import { TransitionedView } from './components/animated-containers/TransitionedView';
import { Avatar } from './components/avatar/Avatar';
import { Box } from './components/box/Box';
import { Button } from './components/button/Button';
import { CSSReset } from './components/css-reset/CSSReset';
import { WidgetModalProvider } from './contexts/widget-modal/WidgetModalProvider';
import { useWidgetModal } from './hooks/useWidgetModal';
import { truncate } from './utils';
import { WidgetModal } from './WidgetModal';

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { show } = useWidgetModal();
  const normalizedAddress = address?.toLocaleLowerCase();

  return (
    <CSSReset>
      <Button intent={isConnected ? 'secondary' : 'primary'} onClick={show}>
        <SmoothWidth>
          <TransitionedView viewKey={isConnected}>
            {isConnected ? (
              <Box align="center" gap={8}>
                <Avatar seed={normalizedAddress} size="S" />
                <p>{truncate(normalizedAddress)}</p>
              </Box>
            ) : (
              <p css={{ minWidth: 120 }}>Connect Wallet</p>
            )}
          </TransitionedView>
        </SmoothWidth>
      </Button>
    </CSSReset>
  );
}

export function TantoConnectButton() {
  return (
    <WidgetModalProvider>
      <ConnectButton />
      <WidgetModal />
    </WidgetModalProvider>
  );
}
