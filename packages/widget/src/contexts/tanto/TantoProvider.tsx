import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useChains } from 'wagmi';

import { analytic } from '../../analytic';
import { RONIN_WALLET_APP_DEEPLINK } from '../../constants';
import { useConnectCallback } from '../../hooks/useConnectCallback';
import { useConnectorRequestAnalyticInterceptor } from '../../hooks/useConnectorRequestAnalyticInterceptor';
import { usePreloadTantoImages } from '../../hooks/usePreloadImages';
import { useSolveRoninConnectionConflict } from '../../hooks/useSolveRoninConnectionConflict';
import { useWalletConnectListener } from '../../hooks/useWalletConnectListener';
import { EmbeddedProvider } from '../../libs/embedded/context';
import { AccountConnectionCallback } from '../../types/connect';
import { isMobile } from '../../utils';
import { openWindow } from '../../utils/openWindow';
import { ThemeProvider, ThemeProviderProps } from '../theme/ThemeProvider';
import { WidgetModalProvider } from '../widget-modal/WidgetModalProvider';
import { TantoConfig, TantoContext } from './TantoContext';

export type TantoProviderProps = AccountConnectionCallback & {
  children?: ReactNode;
  config?: TantoConfig;
} & ThemeProviderProps;

export function TantoProvider({
  config: customConfig,
  theme,
  customThemeToken,
  onConnect,
  onDisconnect,
  children,
}: TantoProviderProps) {
  useSolveRoninConnectionConflict();
  usePreloadTantoImages();
  useConnectCallback({
    onConnect: data => {
      onConnect?.(data);
      analytic.updateSession({
        userAddress: data.address,
        force: true,
      });
      analytic.sendEvent('wallet_connect_success', {
        wallet_id: data.connectorId,
        address: data.address,
        chain_id: data.chainId,
      });
    },
    onDisconnect: () => {
      onDisconnect?.();
      analytic.sendEvent('sdk_disconnect').then(() => {
        analytic.updateSession({
          userAddress: undefined,
          force: true,
        });
      });
    },
  });
  useWalletConnectListener({
    onSignRequest: () => {
      if (isMobile()) openWindow(RONIN_WALLET_APP_DEEPLINK);
    },
  });
  useConnectorRequestAnalyticInterceptor();

  const chains = useChains();

  const defaultTantoConfig: TantoConfig = {
    reducedMotion: false,
    disableProfile: false,
    hideConnectSuccessPrompt: false,
    initialChainId: chains?.[0]?.id,
  };

  const config = useMemo<TantoConfig>(() => Object.assign({}, defaultTantoConfig, customConfig), [customConfig]);
  const contextValue = useMemo(() => ({ config }), [config]);

  /* Start Analytic Session */
  useEffect(() => {
    analytic.updateSession({});
    analytic.sendEvent('sdk_init');
  }, []);

  return (
    <TantoContext.Provider value={contextValue}>
      <ThemeProvider theme={theme} customThemeToken={customThemeToken}>
        <EmbeddedProvider
          clientId="id"
          waypointOrigin="https://id-dev.skymavis.one"
          chainId={2021}
          timeout={10_000}
          logger={console.log}
        >
          <MotionConfig reducedMotion={config.reducedMotion ? 'always' : 'never'}>
            <LazyMotion features={domAnimation} strict>
              <WidgetModalProvider>{children}</WidgetModalProvider>
            </LazyMotion>
          </MotionConfig>
        </EmbeddedProvider>
      </ThemeProvider>
    </TantoContext.Provider>
  );
}
