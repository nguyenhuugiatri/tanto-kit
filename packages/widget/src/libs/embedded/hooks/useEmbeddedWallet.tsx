import { useEmbeddedSession } from './useEmbeddedSession';

export function useEmbeddedWallet() {
  const { account, authenticating } = useEmbeddedSession();

  const address = account?.wallet?.identity;

  return {
    address,
    isWalletUnlocked: account?.is_wallet_unlocked ?? false,
    addressLoading: authenticating,
  };
}
