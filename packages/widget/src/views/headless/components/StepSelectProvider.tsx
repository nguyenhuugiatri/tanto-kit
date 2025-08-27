import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Box } from '../../../components/box/Box';
import { Button } from '../../../components/button/Button';
import { Countdown } from '../../../components/countdown/Countdown';
import { Input } from '../../../components/input/Input';
import { TRANSITION_DURATION } from '../../../constants';
import { SocialButtons } from './SocialButtons';

const emailSchema = z.object({
  email: z.email('Invalid email address.').min(1, 'Email is required.'),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface StepSelectProviderProps {
  isEmailSubmitting?: boolean;
  retryCountdownSeconds?: number;
  onEmailChange: (email: string) => void;
  onEmailSubmit: (data: EmailFormData) => void;
  onSocialSignInSuccess: () => void;
}

const Form = styled.form({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  marginTop: '32px !important',
  gap: 16,
});

export function StepSelectProvider({
  isEmailSubmitting = false,
  retryCountdownSeconds = 0,
  onEmailChange,
  onEmailSubmit,
  onSocialSignInSuccess,
}: StepSelectProviderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: 'onSubmit',
  });

  const emailValue = watch('email');

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, TRANSITION_DURATION * 1.5);
    return () => clearTimeout(timeout);
  }, []);

  const canSubmitEmail = emailValue && isValid && !isEmailSubmitting;

  return (
    <Box vertical gap={16}>
      <Form onSubmit={handleSubmit(onEmailSubmit)}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              placeholder="your@gmail.com"
              ref={inputRef}
              readOnly={isEmailSubmitting}
              error={errors.email?.message}
              value={field.value}
              onChange={email => {
                field.onChange(email);
                onEmailChange(email);
              }}
            />
          )}
        />

        <Countdown pendingTime={retryCountdownSeconds}>
          {({ count }) => {
            const isCountingDown = count > 0;

            if (isCountingDown) {
              return (
                <Button fullWidth disabled>
                  Try again in {count.toString().padStart(2, '0')}s
                </Button>
              );
            }

            return (
              <Button fullWidth disabled={!canSubmitEmail} loading={isEmailSubmitting} type="submit">
                Continue
              </Button>
            );
          }}
        </Countdown>
      </Form>

      <SocialButtons onSuccess={onSocialSignInSuccess} />
    </Box>
  );
}
