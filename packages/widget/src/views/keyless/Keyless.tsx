import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { TransitionedView } from '../../components/animated-containers/TransitionedView';
import { Box, BoxProps } from '../../components/box/Box';
import { useTantoConfig } from '../../contexts/tanto/useTantoConfig';
import { useWidgetConnect } from '../../contexts/widget-connect/useWidgetConnect';
import { useWidgetRouter } from '../../contexts/widget-router/useWidgetRouter';
import { useConnectAndAuth } from '../../hooks/useConnectAndAuth';
import { mutation } from '../../services/queries';
import { Route } from '../../types/route';
import { getSecondsFromMessage } from '../../utils/string';
import { PwdlessProvider } from '../../web3/PwdlessProvider';
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

export function getOTPError(error: { code?: number; message: string }) {
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
  const { goBack: goBackRouter, goTo: goToRouter } = useWidgetRouter();
  const { hideConnectSuccessPrompt } = useTantoConfig();
  const [waitSeconds, setWaitSeconds] = useState(0);
  const { waypointWallet, selectedConnector, setSelectedWallet } = useWidgetConnect();
  const { connect: triggerConnect } = useConnectAndAuth({ connector: selectedConnector });

  const {
    mutateAsync: authenticateWithOTP,
    isPending: isAuthenticateWithOTPPending,
    error: authenticateWithOTPError,
    reset: resetAuthenticateWithOTP,
    isSuccess: isAuthenticateWithOTPSuccess,
  } = useMutation(mutation.authenticateWithOTP());
  const {
    mutateAsync: initOTPPasswordless,
    isPending: isInitOTPPasswordlessPending,
    reset: resetInitOTPPasswordless,
  } = useMutation({
    ...mutation.initOTPPasswordless(),
    onSuccess: () => {
      setWaitSeconds(0);
      resetAuthenticateWithOTP();
    },
    onError: error => setWaitSeconds(getSecondsFromMessage(error.message)),
  });
  const { mutateAsync: createKeylessWallet } = useMutation(mutation.createKeylessWallet());

  const { mutateAsync: getUserProfile, isPending: isGetUserProfilePending } = useMutation(mutation.getUserProfile());

  const otpError = authenticateWithOTPError ? getOTPError(authenticateWithOTPError) : undefined;

  const back = () => {
    if (step === Step.SELECT_METHOD) return goBackRouter();
    return setStep(step - 1);
  };

  const handleEmailSubmit = async ({ email }: EmailFormData) => {
    try {
      await initOTPPasswordless({ email });
      setStep(Step.OTP);
    } catch {}
  };

  const handleOTPChange = () => {
    resetAuthenticateWithOTP();
  };

  const handleSubmitOTP = async (_code: string) => {
    const { accessToken } = await authenticateWithOTP({ email, otp: _code });
    localStorage.setItem('accessToken', accessToken);
    try {
      const { address, preferMethod } = await getUserProfile();
      if (preferMethod !== 'passwordless') {
        if (!waypointWallet) return;
        setSelectedWallet(waypointWallet);
        goToRouter(Route.CONNECT_INJECTOR, { title: waypointWallet.name });
        return;
      }
      triggerConnect();
      PwdlessProvider.resolveConnect({ address, accessToken });
      if (!hideConnectSuccessPrompt) setStep(Step.SUCCESS);
    } catch (error) {
      setStep(Step.CREATE_NEW_KEYLESS_WALLET);
    }
  };

  const handleCreateKeylessWallet = async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;
    try {
      await createKeylessWallet();
      const { address } = await getUserProfile();
      triggerConnect();
      PwdlessProvider.resolveConnect({ address, accessToken });
      if (!hideConnectSuccessPrompt) setStep(Step.SUCCESS);
    } catch {}
  };

  const handleResend = async () => {
    initOTPPasswordless({ email });
  };

  useEffect(() => {
    resetInitOTPPasswordless();
    resetAuthenticateWithOTP();
    setWaitSeconds(0);
  }, [email]);

  useEffect(() => {}, [step]);

  const showBackButton = ![Step.SUCCESS, Step.CREATE_NEW_KEYLESS_WALLET].includes(step);
  const showLogo = step === Step.SELECT_METHOD;
  const title = step === Step.SELECT_METHOD ? 'Sign in with Email & OTP' : null;

  return (
    <Box fullWidth vertical {...props}>
      <KeylessHeader
        showBackButton={showBackButton}
        onBack={back}
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
            isLoading={isInitOTPPasswordlessPending}
            onEmailChange={setEmail}
          />
        )}
        {step === Step.OTP && (
          <StepOTP
            email={email}
            onOTPChange={handleOTPChange}
            onOTPSubmit={handleSubmitOTP}
            onResend={handleResend}
            isLoading={isAuthenticateWithOTPPending || isGetUserProfilePending}
            error={otpError}
            isSuccess={isAuthenticateWithOTPSuccess}
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
