import styled from '@emotion/styled';

import { Box } from '../../../components/box/Box';
import { OTPInput } from '../../../components/otp-input/OTPInput';
import { ResendEmail } from './ResendEmail';

export interface StepOTPProps {
  email: string;
  isLoading?: boolean;
  onOTPSubmit: (code: string) => void;
  onResend: () => void;
}

const Title = styled.h1({
  fontSize: 20,
  fontWeight: 600,
  textAlign: 'center',
});

const Description = styled.p(({ theme }) => ({
  fontSize: 14,
  fontWeight: 400,
  color: theme.mutedText,
  maxWidth: 340,
  textAlign: 'center',
}));

const EmailHighlight = styled.span(({ theme }) => ({
  color: theme.bodyText,
}));

export function StepOTP({ email, onOTPSubmit, onResend, isLoading = false }: StepOTPProps) {
  return (
    <Box fullWidth vertical align="center" gap={48}>
      <Box vertical align="center" gap={4}>
        <Title>Enter confirmation code</Title>
        <Description>
          Please check <EmailHighlight>{email}</EmailHighlight> and enter the code below.
        </Description>
      </Box>
      <OTPInput length={6} onComplete={onOTPSubmit} isDisabled={isLoading} />
      <ResendEmail onResend={onResend} />
    </Box>
  );
}
