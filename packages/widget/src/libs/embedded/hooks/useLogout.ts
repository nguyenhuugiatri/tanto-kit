import { useMutation } from '@tanstack/react-query';

import { logout as callLogout } from '../actions';
import { mutationKeys } from '../queries';
import { useAuthCommunicator } from './internal/useAuthCommunicator';
import { useEmbeddedSession } from './useEmbeddedSession';

export function useLogout() {
  const { communicator } = useAuthCommunicator();
  const { refetchAccount } = useEmbeddedSession();

  const {
    mutate: logout,
    isPending: logoutLoading,
    error: logoutError,
  } = useMutation({
    mutationKey: mutationKeys.loginWithOTP(),
    mutationFn: async () => {
      const result = await callLogout(communicator);
      await refetchAccount();
      return result;
    },
  });

  return {
    logout,
    logoutLoading,
    logoutError,
  };
}
