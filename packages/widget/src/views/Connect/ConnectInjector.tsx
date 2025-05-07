import { useEffect } from 'react';

import { DELAY_CONNECT } from '../../constants';
import { useTriggerConnect } from '../../hooks/useTriggerConnect';
import { useWidgetConnect } from '../../hooks/useWidgetConnect';
import { ConnectLayout } from './components/ConnectLayout';

export function ConnectInjector() {
  const { wallet } = useWidgetConnect();
  const { connect, status } = useTriggerConnect({ connector: wallet?.connector });

  useEffect(() => {
    const timer = setTimeout(connect, DELAY_CONNECT);
    return () => clearTimeout(timer);
  }, [connect, wallet?.connector]);

  if (!wallet || !wallet.connector) return null;

  return <ConnectLayout status={status} walletIcon={wallet.icon} walletName={wallet.name} onRetry={connect} />;
}
