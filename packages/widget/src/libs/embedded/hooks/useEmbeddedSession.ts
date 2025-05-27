import { useEmbedded } from './internal/useEmbedded';

export function useEmbeddedSession() {
  const { account, authenticating, refetchAccount, accountError } = useEmbedded();

  return {
    authenticated: !!account,
    authenticating,
    accountError,
    account,
    refetchAccount,
  };
}
