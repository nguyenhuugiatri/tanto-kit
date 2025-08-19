import { useCallbackRef } from '@radix-ui/react-use-callback-ref';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TransitionedView } from '../../components/animated-containers/TransitionedView';
import { Box, BoxProps } from '../../components/box/Box';
import { useWidgetConnect } from '../../contexts/widget-connect/useWidgetConnect';
import { useWidgetRouter } from '../../contexts/widget-router/useWidgetRouter';
import { useIsModal } from '../../contexts/widget-ui-config/useIsModal';
import { authEventEmitter } from '../../hooks/useAuthEffect';
import { useConnectAndAuth } from '../../hooks/useConnectAndAuth';
import { useUnmount } from '../../hooks/useUnmount';
import { ErrorCode } from '../../services/api/errorCode';
import { HttpError } from '../../services/api/HttpClient';
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
import { StepSuccessNewUser } from './components/StepSuccessNewUser';

const enum Step {
  SELECT_METHOD = 1,
  OTP = 2,
  CREATE_NEW_KEYLESS_WALLET = 3,
  SUCCESS = 4,
  RECEIVE_NEWS = 5,
}

interface EmailFormData {
  email: string;
}

const OTP_ERRORS = {
  400046: 'Invalid code. Please try again.',
} as const;

const getOTPError = (error: { code?: number; message: string }): string =>
  OTP_ERRORS[error.code as keyof typeof OTP_ERRORS] || error.message || 'Failed to verify OTP.';

const STEPS_WITHOUT_BACK = new Set([Step.SUCCESS, Step.RECEIVE_NEWS, Step.CREATE_NEW_KEYLESS_WALLET]);

export function Headless(props: BoxProps) {
  const [step, setStep] = useState(Step.SELECT_METHOD);
  const [email, setEmail] = useState('');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [agreeReceiveNews, setAgreeReceiveNews] = useState(false);

  const isModal = useIsModal();
  const isNewUser = useRef(false);

  const { goBack: goBackRouter, replace: replaceRouter } = useWidgetRouter();
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

  const otpError = useMemo(
    () => (authenticateOTPMutation.error ? getOTPError(authenticateOTPMutation.error) : undefined),
    [authenticateOTPMutation.error],
  );

  const handleBack = useCallbackRef(() => {
    if (step === Step.SELECT_METHOD) {
      goBackRouter();
    } else {
      setStep(prev => prev - 1);
    }
  });

  const handleEmailSubmit = useCallbackRef(async ({ email }: EmailFormData) => {
    try {
      await otpPasswordlessMutation.mutateAsync({ email });
      setEmail(email);
      setStep(Step.OTP);
    } catch (error) {
      console.debug('Failed to send OTP:', error);
    }
  });

  const handleOTPChange = useCallbackRef(() => {
    authenticateOTPMutation.reset();
  });

  const handleSubmitOTP = useCallbackRef(async (code: string) => {
    try {
      const { user } = await authenticateOTPMutation.mutateAsync({ email, otp: code });
      isNewUser.current = user.isNew;

      const { preferMethod } = await getUserProfileMutation.mutateAsync();

      if (preferMethod !== 'passwordless') {
        if (waypointWallet) {
          setSelectedWallet(waypointWallet);
          replaceRouter(Route.CONNECT_INJECTOR, { title: waypointWallet.name });
        }
        return;
      }

      connect();
    } catch (error) {
      if (error instanceof HttpError && error.code === ErrorCode.MPC_NOT_FOUND) {
        setStep(Step.CREATE_NEW_KEYLESS_WALLET);
      }
    }
  });

  const handleCreateKeylessWallet = useCallbackRef(async () => {
    try {
      await createKeylessWalletMutation.mutateAsync();
      // Ensure the address is set in the session
      await getUserProfileMutation.mutateAsync();
      setStep(Step.RECEIVE_NEWS);
    } catch (error) {
      console.debug('Failed to create keyless wallet:', error);
    }
  });

  const handleResend = useCallbackRef(() => {
    otpPasswordlessMutation.mutate({ email });
  });

  const handleConnect = useCallbackRef(() => {
    connect();
  });

  useEffect(() => {
    otpPasswordlessMutation.reset();
    authenticateOTPMutation.reset();
    isNewUser.current = false;
    setWaitSeconds(0);
  }, [email]);

  useEffect(() => {
    if (connectStatus !== ConnectState.SUCCESS) return;

    const emitAuthSuccess = async () => {
      const headlessConfig = headlessInjector.resolve('headlessConfig');
      const sessionRepository = headlessInjector.resolve('sessionRepository');

      const [token, address] = await Promise.all([sessionRepository.getAccessToken(), sessionRepository.getAddress()]);

      if (token && address) {
        authEventEmitter.emit('success', {
          chainId: headlessConfig.chain.id,
          address,
          token,
        });
      }
    };

    emitAuthSuccess();

    if (!isNewUser.current) setStep(Step.SUCCESS);
  }, [connectStatus]);

  useUnmount(() => {
    if (isModal && step === Step.RECEIVE_NEWS && connectStatus !== ConnectState.SUCCESS) connect();
    if (agreeReceiveNews) {
      // TODO: Send agreeReceiveNews to backend
      console.debug('agreeReceiveNews', agreeReceiveNews);
    }
  });

  const showBackButton = !STEPS_WITHOUT_BACK.has(step);
  const showLogo = step === Step.SELECT_METHOD;
  const title = step === Step.SELECT_METHOD ? 'Sign in with Email & OTP' : null;
  const isOTPLoading = authenticateOTPMutation.isPending || getUserProfileMutation.isPending;

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

      <TransitionedView viewKey={step}>
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
            isLoading={isOTPLoading}
            error={otpError}
            isSuccess={authenticateOTPMutation.isSuccess}
          />
        )}

        {step === Step.CREATE_NEW_KEYLESS_WALLET && (
          <StepCreatingKeyless handleCreateKeylessWallet={handleCreateKeylessWallet} />
        )}

        {step === Step.SUCCESS && <StepSuccess />}

        {step === Step.RECEIVE_NEWS && (
          <StepSuccessNewUser checked={agreeReceiveNews} setChecked={setAgreeReceiveNews} connect={handleConnect} />
        )}
      </TransitionedView>
    </Box>
  );
}
