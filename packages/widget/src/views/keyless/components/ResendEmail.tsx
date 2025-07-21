import styled from '@emotion/styled';
import { useEffect } from 'react';

import { useCountdown } from '../../../hooks/useCountdown';

export interface ResendEmailProps {
  pendingTime?: number;
  className?: string;
  label?: string;
  resendText?: string;
  onResend?: () => void;
}

const Container = styled.div(({ theme }) => ({
  fontSize: 14,
  color: theme.mutedText,
  textAlign: 'center',
}));

const ResendButton = styled.span(({ theme }) => ({
  cursor: 'pointer',
  color: theme.linkColor,
}));

const Timer = styled.span({
  fontVariantNumeric: 'tabular-nums',
});

export function ResendEmail({
  onResend,
  className,
  pendingTime = 30,
  label = "Didn't get an email?",
  resendText = 'Resend code',
}: ResendEmailProps) {
  const [count, { startCountdown, resetCountdown }] = useCountdown({ countStart: pendingTime });

  useEffect(() => {
    startCountdown();
  }, [startCountdown]);

  const resendHandler = async () => {
    onResend?.();
    resetCountdown();
    startCountdown();
  };

  return (
    <Container className={className}>
      {label}{' '}
      {count === 0 ? (
        <ResendButton onClick={resendHandler}>{resendText}</ResendButton>
      ) : (
        <>
          Send a new code in <Timer>{`0${Math.floor(count)}`.slice(-2)}s</Timer>
        </>
      )}
    </Container>
  );
}
