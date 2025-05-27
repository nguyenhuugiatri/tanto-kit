import { useMutation } from '@tanstack/react-query';

import {
  loginWithOTP as callLoginWithOTP,
  LoginWithOTPParameters,
  sendOTP as callSendOTP,
  SendOTPParameters,
} from '../actions';
import { mutationKeys } from '../queries';
import { useEmbedded } from './internal/useEmbedded';
import { useCommunicator } from './useCommunicator';

export function useLoginWithEmail() {
  const { communicator } = useCommunicator();
  const { refetchAccount } = useEmbedded();

  const {
    mutate: sendOTP,
    isPending: sendOTPLoading,
    error: sendOTPError,
  } = useMutation({
    mutationKey: mutationKeys.sendOTP(),
    mutationFn: (parameters: SendOTPParameters) => callSendOTP(communicator, parameters),
  });

  const {
    mutate: loginWithOTP,
    isPending: loginWithOTPLoading,
    error: loginWithOTPError,
  } = useMutation({
    mutationKey: mutationKeys.loginWithOTP(),
    mutationFn: async (parameters: LoginWithOTPParameters) => {
      const { account } = await callLoginWithOTP(communicator, parameters);
      await refetchAccount();
      return account;
    },
  });

  return {
    sendOTP,
    sendOTPLoading,
    sendOTPError,
    loginWithOTP,
    loginWithOTPLoading,
    loginWithOTPError,
  };
}
