import { useState } from 'react';

import { TransitionedView } from '../../components/animated-containers/TransitionedView';
import { Box, BoxProps } from '../../components/box/Box';
import { useWidgetRouter } from '../../contexts/widget-router/useWidgetRouter';
import { KeylessHeader } from './components/KeylessHeader';
import { StepCreatingKeyless } from './components/StepCreatingKeyless';
import { StepMigratePassword } from './components/StepMigratePassword';
import { StepOTP } from './components/StepOTP';
import { StepSelectProvider } from './components/StepSelectProvider';
import { StepSuccess } from './components/StepSuccess';

enum Step {
  SELECT_METHOD = 1,
  OTP = 2,
  MIGRATE_PASSWORD_LESS = 3,
  CREATE_NEW_KEYLESS_WALLET = 4,
  SUCCESS = 5,
}

interface EmailFormData {
  email: string;
}

interface PasswordLessFormData {
  password: string;
}

export function Keyless(props: BoxProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(Step.SELECT_METHOD);
  const [email, setEmail] = useState('');
  const { goBack: goBackRouter } = useWidgetRouter();

  const next = (nextStep: Step) => setStep(nextStep);
  const back = () => {
    if (step === Step.SELECT_METHOD) return goBackRouter();
    if (step === Step.MIGRATE_PASSWORD_LESS) return setStep(Step.SELECT_METHOD);
    return setStep(step - 1);
  };

  const handleEmailSubmit = ({ email }: EmailFormData) => {
    setEmail(email);
    setStep(Step.OTP);
  };

  const handleSubmitOTP = async (_code: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);

    const randomStep =
      Math.random() > 0.5
        ? Step.MIGRATE_PASSWORD_LESS
        : Math.random() > 0.5
        ? Step.CREATE_NEW_KEYLESS_WALLET
        : Step.SUCCESS;
    setStep(randomStep);
  };

  const handlePasswordlessSubmit = (_password: PasswordLessFormData) => next(Step.SUCCESS);
  const handleResend = async () => {};

  const showBackButton = step !== Step.SUCCESS;
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
        totalSteps={3}
      />

      <TransitionedView viewKey={step}>
        {step === Step.SELECT_METHOD && <StepSelectProvider onSubmit={handleEmailSubmit} />}
        {step === Step.OTP && (
          <StepOTP email={email} onOTPSubmit={handleSubmitOTP} onResend={handleResend} isLoading={isLoading} />
        )}
        {step === Step.MIGRATE_PASSWORD_LESS && <StepMigratePassword onSubmit={handlePasswordlessSubmit} />}
        {step === Step.CREATE_NEW_KEYLESS_WALLET && <StepCreatingKeyless />}
        {step === Step.SUCCESS && <StepSuccess />}
      </TransitionedView>
    </Box>
  );
}
