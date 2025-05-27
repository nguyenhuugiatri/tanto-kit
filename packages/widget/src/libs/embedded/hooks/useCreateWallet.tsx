import { useMutation } from '@tanstack/react-query';

import { createWallet as callCreateWallet } from '../actions';
import { mutationKeys } from '../queries';
import { useAuthCommunicator } from './internal/useAuthCommunicator';
import { useEmbeddedSession } from './useEmbeddedSession';

export function useCreateWallet() {
  const { communicator } = useAuthCommunicator();
  const { refetchAccount } = useEmbeddedSession();

  const {
    mutate: createWallet,
    isPending: createWalletLoading,
    error: createWalletError,
  } = useMutation({
    mutationKey: mutationKeys.createWallet(),
    mutationFn: async () => {
      const result = await callCreateWallet(communicator);
      await refetchAccount();
      return result;
    },
  });

  return {
    createWallet,
    createWalletLoading,
    createWalletError,
  };
}
