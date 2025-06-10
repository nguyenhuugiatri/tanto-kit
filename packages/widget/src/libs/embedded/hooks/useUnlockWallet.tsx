import { Deferred, generateMessageId } from '@sky-mavis/tanto-iframe-communicator';
import { useMutation } from '@tanstack/react-query';
import type { IframeHTMLAttributes } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { WindowMessage } from '../embedded-message';
import { mutationKeys } from '../queries';
import { useEmbedded } from './internal/useEmbedded';
import { useEmbeddedSession } from './useEmbeddedSession';

const DEFAULT_UNLOCK_WALLET_TIMEOUT = 60_000;

interface UnlockWalletData {
  address: `0x${string}`;
}

type UnlockWalletIframeProps = Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'src'>;

export function useUnlockWallet() {
  const { waypointOrigin, clientId, chainId } = useEmbedded();
  const { refetchAccount } = useEmbeddedSession();
  const [isShowUnlockWalletComponent, setIsShowUnlockWalletComponent] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('');
  const deferUnlockWallet = useRef<Deferred<UnlockWalletData> | null>(null);
  const requestId = useRef(generateMessageId()).current;

  const {
    mutate: unlockWallet,
    isPending: unlockWalletLoading,
    error: unlockWalletError,
  } = useMutation({
    mutationKey: mutationKeys.createWallet(),
    mutationFn: async () => {
      try {
        setIsShowUnlockWalletComponent(true);
        deferUnlockWallet.current = new Deferred<UnlockWalletData>({
          timeout: DEFAULT_UNLOCK_WALLET_TIMEOUT,
        });
        const result = await deferUnlockWallet.current.promise;
        setIsShowUnlockWalletComponent(false);
        await refetchAccount();
        return result;
      } finally {
        setIsShowUnlockWalletComponent(false);
        deferUnlockWallet.current = null;
      }
    },
  });

  useEffect(() => {
    setIframeSrc(
      `${waypointOrigin}/embedded/unlock?clientId=${clientId}&origin=${window.origin}&chainId=${chainId}&state=${requestId}`,
    );
  }, [waypointOrigin, clientId, chainId, requestId]);

  useEffect(() => {
    const handleMessageEvent = (event: MessageEvent<WindowMessage>) => {
      if (event.origin !== waypointOrigin || !deferUnlockWallet.current) return;

      const message = event.data;
      if (message.state !== requestId) return;

      switch (message.type) {
        case 'fail':
          deferUnlockWallet.current.reject(new Error(message.error?.message || 'Unlock failed'));
          break;
        default:
          try {
            const normalizedData = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;

            deferUnlockWallet.current.resolve(normalizedData as UnlockWalletData);
          } catch (parseError) {
            deferUnlockWallet.current.reject(
              new Error(
                `Failed to parse unlock data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
              ),
            );
          }
          break;
      }
    };

    window.addEventListener('message', handleMessageEvent);
    return () => window.removeEventListener('message', handleMessageEvent);
  }, [waypointOrigin, requestId]);

  const UnlockWalletComponent = useCallback(
    (props: UnlockWalletIframeProps) =>
      isShowUnlockWalletComponent ? <iframe {...props} src={iframeSrc} title="Unlock Wallet" /> : null,
    [iframeSrc, isShowUnlockWalletComponent],
  );

  return {
    unlockWallet,
    unlockWalletLoading,
    unlockWalletError,
    isShowUnlockWalletComponent,
    UnlockWalletComponent,
  };
}
