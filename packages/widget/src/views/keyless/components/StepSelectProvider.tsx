import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../../components/button/Button';
import { Countdown } from '../../../components/countdown/Countdown';
import { Input } from '../../../components/input/Input';
import { TRANSITION_DURATION } from '../../../constants';

const emailSchema = z.object({
  email: z.email('Invalid email address.').min(1, 'Email is required.'),
});

type EmailFormData = z.infer<typeof emailSchema>;

export interface StepSelectProviderProps {
  isLoading?: boolean;
  defaultEmail?: string;
  waitSeconds?: number;
  error?: string;
  onEmailChange: (email: string) => void;
  onSubmit: (data: EmailFormData) => void;
}

const Form = styled.form({
  display: 'flex',
  flexDirection: 'column',
  marginTop: 32,
  gap: 16,
});

export function StepSelectProvider(props: StepSelectProviderProps) {
  const { onSubmit, defaultEmail = '', waitSeconds = 0, isLoading = false, error, onEmailChange } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: 'onSubmit',
    defaultValues: {
      email: defaultEmail,
    },
  });

  const email = watch('email');

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, TRANSITION_DURATION * 1.5);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            placeholder="your@gmail.com"
            ref={inputRef}
            readOnly={isLoading}
            error={error || errors.email?.message}
            value={field.value}
            onChange={email => {
              field.onChange(email);
              onEmailChange(email);
            }}
          />
        )}
      />
      <Countdown pendingTime={waitSeconds}>
        {({ count }) => {
          return count === 0 ? (
            <Button fullWidth disabled={!email || !isValid} loading={isLoading} type="submit">
              Continue
            </Button>
          ) : (
            <Button fullWidth disabled>
              Try again in {count.toString().padStart(2, '0')}s
            </Button>
          );
        }}
      </Countdown>
    </Form>
  );
}
