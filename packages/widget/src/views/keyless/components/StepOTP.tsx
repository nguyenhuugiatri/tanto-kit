import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';

import { Box } from '../../../components/box/Box';
import { OTPInput } from '../../../components/otp-input/OTPInput';
import { ResendEmail } from './ResendEmail';

export interface StepOTPProps {
  email: string;
  error?: string;
  isLoading?: boolean;
  clearOnError?: boolean;
  onOTPChange: (code: string) => void;
  onOTPSubmit: (code: string) => Promise<void>;
  onResend: () => void;
  isSuccess?: boolean;
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

export function StepOTP({
  email,
  error,
  onOTPChange,
  onOTPSubmit,
  onResend,
  isLoading = false,
  clearOnError = true,
  isSuccess = false,
}: StepOTPProps) {
  const [otp, setOTP] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const onComplete = async (code: string) => {
    try {
      await onOTPSubmit(code);
    } catch {
      if (clearOnError) setOTP('');
    }
  };

  const handleOTPChange = (code: string) => {
    setOTP(code);
    onOTPChange(code);
  };

  useEffect(() => {
    if (otp === '') ref.current?.focus();
  }, [otp]);

  return (
    <Box fullWidth vertical align="center" gap={48}>
      <Box vertical align="center" gap={4}>
        <Title>Enter confirmation code</Title>
        <Description>
          Please check <EmailHighlight>{email}</EmailHighlight> and enter the code below.
        </Description>
      </Box>
      <OTPInput
        ref={ref}
        value={otp}
        length={6}
        onChange={handleOTPChange}
        onComplete={onComplete}
        isLoading={isLoading}
        isSuccess={isSuccess}
        error={error}
      />
      <ResendEmail onResend={onResend} />
    </Box>
  );
}
