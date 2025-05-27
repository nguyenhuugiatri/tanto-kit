import { useQuery } from '@tanstack/react-query';
import type { CSSProperties, ReactNode } from 'react';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ronin } from 'viem/chains';

import type { CommunicatorOptions } from '../communicator';
import { HostCommunicator } from '../communicator';
import { whoAmI } from './actions';
import { Account } from './embedded-auth';
import { EmbeddedMessage } from './embedded-message';
import { queryKeys } from './queries';

export interface EmbeddedContextValue {
  waypointOrigin: string;
  clientId: string;
  chainId: number;
  timeout?: number;
  ready: boolean;
  communicator: HostCommunicator<EmbeddedMessage>;
  accountError: Error | null;
  account: Account | null;
  authenticating: boolean;
  refetchAccount: () => Promise<void>;
}

export type EmbeddedProviderProps = Omit<CommunicatorOptions, 'parseResponse'> & {
  waypointOrigin: string;
  clientId: string;
  chainId?: number;
  children: ReactNode;
};

export const EmbeddedContext = createContext<EmbeddedContextValue>({
  ready: false,
  waypointOrigin: '',
  clientId: '',
  chainId: ronin.id,
  communicator: {} as HostCommunicator<EmbeddedMessage>,
  accountError: null,
  account: null,
  authenticating: true,
  refetchAccount: async () => {},
});

export function EmbeddedProvider({
  waypointOrigin,
  clientId,
  chainId = ronin.id,
  logger,
  timeout,
  children,
}: EmbeddedProviderProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState('');
  const [ready, setReady] = useState(false);

  const communicator = useRef(
    HostCommunicator.getInstance<EmbeddedMessage>({
      logger,
      timeout,
    }),
  ).current;

  const iframeStyle = useMemo<CSSProperties>(
    () => ({
      position: 'fixed',
      top: 0,
      left: 0,
      opacity: 0,
    }),
    [],
  );

  const onIframeLoaded = useCallback(() => {
    const iframe = iframeRef.current;

    if (!iframe) return;

    communicator
      .connect({
        target: iframe,
        targetOrigin: waypointOrigin,
      })
      .then(() => setReady(true));
  }, []);

  const {
    data: account,
    isLoading: accountLoading,
    error: accountError,
    refetch: refetchAccount,
  } = useQuery({
    queryKey: queryKeys.whoAmI(),
    queryFn: () => whoAmI(communicator),
    enabled: ready,
  });

  useEffect(() => {
    setSrc(`${waypointOrigin}/embedded?clientId=${clientId}&origin=${window.origin}&chainId=${chainId}`);
  }, []);

  const contextValue = useMemo(
    () => ({
      waypointOrigin,
      clientId,
      chainId,
      timeout,
      ready,
      communicator,
      accountError,
      account: account ?? null,
      authenticating: ready ? accountLoading : true,
      refetchAccount: async () => {
        await refetchAccount();
      },
    }),
    [
      waypointOrigin,
      clientId,
      chainId,
      timeout,
      ready,
      communicator,
      accountError,
      account,
      accountLoading,
      refetchAccount,
    ],
  );

  return (
    <EmbeddedContext.Provider value={contextValue}>
      {src && <iframe ref={iframeRef} src={src} onLoad={onIframeLoaded} style={iframeStyle} width={1} height={1} />}
      {children}
    </EmbeddedContext.Provider>
  );
}
