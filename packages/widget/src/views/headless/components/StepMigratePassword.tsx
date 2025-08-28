import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Box } from '../../../components/box/Box';
import { Button } from '../../../components/button/Button';
import { Input } from '../../../components/input/Input';
import { useDelayFocus } from '../../../hooks/useDelayFocus';

const passwordLessSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type PasswordLessFormData = z.infer<typeof passwordLessSchema>;

export interface StepMigratePasswordProps {
  onSubmit: (data: PasswordLessFormData) => void;
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

const Form = styled.form({
  width: '100%',
});

const StyledInput = styled(Input)({
  width: '100%',
  marginBottom: 16,
});

export function StepMigratePassword({ onSubmit }: StepMigratePasswordProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<PasswordLessFormData>({
    resolver: zodResolver(passwordLessSchema),
    mode: 'onSubmit',
    defaultValues: {
      password: '',
    },
  });

  useDelayFocus(inputRef);

  return (
    <Box fullWidth vertical align="center" gap={48}>
      <Box vertical align="center" gap={4}>
        <Title>Account migration</Title>
        <Description>Your account needs to be recovered to passwordless authentication.</Description>
      </Box>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="password"
          control={control}
          render={({ field }) => {
            const { ref, ...rest } = field;
            return (
              <StyledInput
                ref={composeRefs(inputRef, ref)}
                placeholder="Recovery password"
                error={errors.password?.message}
                {...rest}
              />
            );
          }}
        />
        <Button disabled={!isValid} fullWidth type="submit">
          Continue
        </Button>
      </Form>
    </Box>
  );
}
