import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TransitionedView } from '../../components/animated-containers/TransitionedView';
import { Box, BoxProps } from '../../components/box/Box';
import { useWidgetConnect } from '../../contexts/widget-connect/useWidgetConnect';
import { useWidgetRouter } from '../../contexts/widget-router/useWidgetRouter';
import { authEventEmitter } from '../../hooks/useAuthEffect';
import { useConnectAndAuth } from '../../hooks/useConnectAndAuth';
import { headlessInjector } from '../../services/headlessInjector';
import { mutation } from '../../services/queries';
import { ConnectState } from '../../types/connect';
import { Route } from '../../types/route';
import { getSecondsFromMessage } from '../../utils/string';
import { KeylessHeader } from './components/KeylessHeader';
import { StepCreatingKeyless } from './components/StepCreatingKeyless';
import { StepOTP } from './components/StepOTP';
import { StepSelectProvider } from './components/StepSelectProvider';
import { StepSuccess } from './components/StepSuccess';

enum Step {
  SELECT_METHOD = 1,
  OTP = 2,
  CREATE_NEW_KEYLESS_WALLET = 3,
  SUCCESS = 4,
}

interface EmailFormData {
  email: string;
}

export function getOTPError(error: { code?: number; message: string }): string {
  switch (error.code) {
    case 400046:
      return 'Invalid code. Please try again.';
    default:
      return error.message || 'Failed to verify OTP.';
  }
}

export function Keyless(props: BoxProps) {
  const [step, setStep] = useState(Step.SELECT_METHOD);
  const [email, setEmail] = useState('');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const accessTokenRef = useRef<string | null>(null);

  const { goBack: goBackRouter, goTo: goToRouter } = useWidgetRouter();
  const { waypointWallet, selectedConnector, setSelectedWallet } = useWidgetConnect();
  const { connect, status: connectStatus } = useConnectAndAuth({
    connector: selectedConnector,
  });

  const otpPasswordlessMutation = useMutation({
    ...mutation.initOTPPasswordless(),
    onSuccess: () => {
      setWaitSeconds(0);
      authenticateOTPMutation.reset();
    },
    onError: (error: Error) => setWaitSeconds(getSecondsFromMessage(error.message)),
  });

  const authenticateOTPMutation = useMutation(mutation.authenticateWithOTP());
  const createKeylessWalletMutation = useMutation(mutation.createKeylessWallet());
  const getUserProfileMutation = useMutation(mutation.getUserProfile());

  const otpError = authenticateOTPMutation.error ? getOTPError(authenticateOTPMutation.error) : undefined;

  const handleBack = useCallback(() => {
    if (step === Step.SELECT_METHOD) {
      goBackRouter();
    } else {
      setStep(step - 1);
    }
  }, [step, goBackRouter]);

  const handleEmailSubmit = useCallback(
    async ({ email }: EmailFormData) => {
      try {
        await otpPasswordlessMutation.mutateAsync({ email });
        setEmail(email);
        setStep(Step.OTP);
      } catch (error) {
        console.debug('Failed to send OTP:', error);
      }
    },
    [otpPasswordlessMutation],
  );

  const handleOTPChange = useCallback(() => {
    authenticateOTPMutation.reset();
  }, [authenticateOTPMutation]);

  const handleSubmitOTP = useCallback(
    async (code: string) => {
      try {
        const { accessToken } = await authenticateOTPMutation.mutateAsync({
          email,
          otp: code,
        });
        accessTokenRef.current = accessToken;

        const { preferMethod } = await getUserProfileMutation.mutateAsync();

        if (preferMethod !== 'passwordless') {
          if (waypointWallet) {
            setSelectedWallet(waypointWallet);
            goToRouter(Route.CONNECT_INJECTOR, { title: waypointWallet.name });
          }
          return;
        }
        connect();
      } catch (error) {
        console.debug('OTP verification failed:', error);
        setStep(Step.CREATE_NEW_KEYLESS_WALLET);
      }
    },
    [email, authenticateOTPMutation, getUserProfileMutation, waypointWallet, setSelectedWallet, goToRouter, connect],
  );

  const handleCreateKeylessWallet = useCallback(async () => {
    const accessToken = accessTokenRef.current;
    if (!accessToken) {
      console.debug('No access token available');
      return;
    }

    try {
      await createKeylessWalletMutation.mutateAsync();
      connect();
    } catch (error) {
      console.debug('Failed to create keyless wallet:', error);
    }
  }, [createKeylessWalletMutation, getUserProfileMutation, connect]);

  const handleResend = useCallback(() => {
    otpPasswordlessMutation.mutate({ email });
  }, [email, otpPasswordlessMutation]);

  useEffect(() => {
    otpPasswordlessMutation.reset();
    authenticateOTPMutation.reset();
    setWaitSeconds(0);
  }, [email]);

  useEffect(() => {
    if (connectStatus === ConnectState.SUCCESS) {
      const headlessConfig = headlessInjector.resolve('headlessConfig');
      const sessionRepository = headlessInjector.resolve('sessionRepository');
      Promise.all([sessionRepository.getAccessToken(), sessionRepository.getAddress()]).then(([token, address]) => {
        if (token && address) {
          authEventEmitter.emit('success', {
            chainId: headlessConfig.chain.id,
            address,
            token,
          });
        }
      });
      setStep(Step.SUCCESS);
    }
  }, [connectStatus]);

  const showBackButton = ![Step.SUCCESS, Step.CREATE_NEW_KEYLESS_WALLET].includes(step);
  const showLogo = step === Step.SELECT_METHOD;
  const title = step === Step.SELECT_METHOD ? 'Sign in with Email & OTP' : null;

  return (
    <Box fullWidth vertical {...props}>
      <KeylessHeader
        showBackButton={showBackButton}
        onBack={handleBack}
        title={title}
        showLogo={showLogo}
        step={step}
        totalSteps={2}
      />

      <TransitionedView viewKey={step + connectStatus}>
        {step === Step.SELECT_METHOD && (
          <StepSelectProvider
            onSubmit={handleEmailSubmit}
            waitSeconds={waitSeconds}
            isLoading={otpPasswordlessMutation.isPending}
            onEmailChange={setEmail}
          />
        )}

        {step === Step.OTP && (
          <StepOTP
            email={email}
            onOTPChange={handleOTPChange}
            onOTPSubmit={handleSubmitOTP}
            onResend={handleResend}
            isLoading={authenticateOTPMutation.isPending || getUserProfileMutation.isPending}
            error={otpError}
            isSuccess={authenticateOTPMutation.isSuccess}
          />
        )}

        {step === Step.CREATE_NEW_KEYLESS_WALLET && (
          <StepCreatingKeyless handleCreateKeylessWallet={handleCreateKeylessWallet} />
        )}

        {step === Step.SUCCESS && <StepSuccess />}
      </TransitionedView>
    </Box>
  );
}
