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
import { StepUpgradeToPasswordless } from './components/StepUpgradeToPasswordless';

const enum Step {
  SELECT_METHOD = 1,
  OTP = 2,
  CREATE_NEW_KEYLESS_WALLET = 3,
  UPGRADE_TO_PASSWORDLESS = 4,
  SUCCESS = 5,
  RECEIVE_NEWS = 6,
}

interface EmailFormData {
  email: string;
}

const OTP_ERROR_MESSAGES = {
  400046: 'Invalid code. Please try again.',
} as const;

const STEPS_WITHOUT_BACK = new Set([Step.SUCCESS, Step.RECEIVE_NEWS, Step.CREATE_NEW_KEYLESS_WALLET]);

const getOTPErrorMessage = (error: { code?: number; message: string }): string =>
  OTP_ERROR_MESSAGES[error.code as keyof typeof OTP_ERROR_MESSAGES] || error.message || 'Failed to verify OTP.';

export function Headless(props: BoxProps) {
  const [step, setStep] = useState(Step.SELECT_METHOD);
  const [email, setEmail] = useState('');
  const [retryWaitSeconds, setRetryWaitSeconds] = useState(0);
  const [agreeReceiveNews, setAgreeReceiveNews] = useState(false);

  const isNewUser = useRef(false);

  const isModal = useIsModal();
  const { goBack: goBackRouter, replace: replaceRouter } = useWidgetRouter();
  const { waypointWallet, selectedConnector, setSelectedWallet } = useWidgetConnect();
  const { connect, status: connectStatus } = useConnectAndAuth({
    connector: selectedConnector,
  });

  const initOTPPasswordlessMutation = useMutation({
    ...mutation.initOTPPasswordless(),
    onSuccess: () => {
      setRetryWaitSeconds(0);
      authenticateOTPMutation.reset();
    },
    onError: (error: Error) => setRetryWaitSeconds(getSecondsFromMessage(error.message)),
  });
  const authenticateOTPMutation = useMutation(mutation.authenticateWithOTP());
  const createKeylessWalletMutation = useMutation(mutation.createKeylessWallet());
  const getUserProfileMutation = useMutation(mutation.getUserProfile());

  const otpError = useMemo(
    () => (authenticateOTPMutation.error ? getOTPErrorMessage(authenticateOTPMutation.error) : undefined),
    [authenticateOTPMutation.error],
  );

  const isOTPLoading = useMemo(
    () => authenticateOTPMutation.isPending || getUserProfileMutation.isPending,
    [authenticateOTPMutation.isPending, getUserProfileMutation.isPending],
  );

  const showBackButton = useMemo(() => !STEPS_WITHOUT_BACK.has(step), [step]);
  const showLogo = step === Step.SELECT_METHOD;
  const title = step === Step.SELECT_METHOD ? 'Sign in with Email & OTP' : null;

  const handleBack = useCallbackRef(() => {
    if (step === Step.SELECT_METHOD) {
      goBackRouter();
      return;
    }
    if (step === Step.UPGRADE_TO_PASSWORDLESS || step === Step.CREATE_NEW_KEYLESS_WALLET) {
      setStep(Step.SELECT_METHOD);
      return;
    }
    setStep(prev => prev - 1);
  });

  const handleEmailSubmit = useCallbackRef(async ({ email }: EmailFormData) => {
    try {
      await initOTPPasswordlessMutation.mutateAsync({ email });
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
        setStep(Step.UPGRADE_TO_PASSWORDLESS);
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

      if (isNewUser.current) {
        setStep(Step.RECEIVE_NEWS);
        return;
      }

      connect();
    } catch (error) {
      console.debug('Failed to create keyless wallet:', error);
    }
  });

  const handleResendOTP = useCallbackRef(() => {
    authenticateOTPMutation.reset();
    initOTPPasswordlessMutation.mutate({ email });
  });

  const handleUpgradeSuccess = useCallbackRef(async () => {
    await getUserProfileMutation.mutateAsync();
    connect();
    setStep(Step.SUCCESS);
  });

  const handleCancelUpgrade = useCallbackRef(() => {
    if (waypointWallet) {
      setSelectedWallet(waypointWallet);
      replaceRouter(Route.CONNECT_INJECTOR, { title: waypointWallet.name });
    }
  });

  const handleSocialSignInSuccess = useCallbackRef(async () => {
    try {
      const { preferMethod } = await getUserProfileMutation.mutateAsync();

      if (preferMethod !== 'passwordless') {
        setStep(Step.UPGRADE_TO_PASSWORDLESS);
        return;
      }

      connect();
    } catch (error) {
      if (error instanceof HttpError && error.code === ErrorCode.MPC_NOT_FOUND) {
        setStep(Step.CREATE_NEW_KEYLESS_WALLET);
      }
    }
  });

  useEffect(() => {
    initOTPPasswordlessMutation.reset();
    authenticateOTPMutation.reset();
    isNewUser.current = false;
    setRetryWaitSeconds(0);
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
            isEmailSubmitting={initOTPPasswordlessMutation.isPending}
            retryCountdownSeconds={retryWaitSeconds}
            onEmailSubmit={handleEmailSubmit}
            onEmailChange={setEmail}
            onSocialSignInSuccess={handleSocialSignInSuccess}
          />
        )}

        {step === Step.OTP && (
          <StepOTP
            email={email}
            onOTPChange={handleOTPChange}
            onOTPSubmit={handleSubmitOTP}
            onResend={handleResendOTP}
            isLoading={isOTPLoading}
            error={otpError}
            isSuccess={authenticateOTPMutation.isSuccess}
          />
        )}

        {step === Step.CREATE_NEW_KEYLESS_WALLET && (
          <StepCreatingKeyless handleCreateKeylessWallet={handleCreateKeylessWallet} />
        )}

        {step === Step.UPGRADE_TO_PASSWORDLESS && (
          <StepUpgradeToPasswordless onUpgradeSuccess={handleUpgradeSuccess} onCancelUpgrade={handleCancelUpgrade} />
        )}

        {step === Step.SUCCESS && <StepSuccess />}

        {step === Step.RECEIVE_NEWS && (
          <StepSuccessNewUser checked={agreeReceiveNews} setChecked={setAgreeReceiveNews} onContinue={connect} />
        )}
      </TransitionedView>
    </Box>
  );
}
