import styled from '@emotion/styled';
import { useCallbackRef } from '@radix-ui/react-use-callback-ref';
import { useState } from 'react';

import { HighFive } from '../../../assets/HighFive';
import { Box } from '../../../components/box/Box';
import { Button } from '../../../components/button/Button';
import { Checkbox } from '../../../components/checkbox/Checkbox';

const StyledTitle = styled.div(({ theme }) => ({
  fontSize: 20,
  color: theme.bodyText,
  fontWeight: 600,
  textAlign: 'center',
}));

const StyledDescription = styled.div(({ theme }) => ({
  fontSize: 14,
  color: theme.mutedText,
  textAlign: 'center',
  marginBottom: 38,
}));

interface StepSuccessNewUserProps {
  checked: boolean;
  setChecked: (checked: boolean) => void;
  connect: () => void;
}

export function StepSuccessNewUser({ checked, setChecked, connect }: StepSuccessNewUserProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = useCallbackRef(() => {
    setIsLoading(true);
    connect();
  });

  return (
    <Box fullWidth vertical align="center" gap={20}>
      <HighFive />
      <Box vertical align="center" gap={4}>
        <StyledTitle>Welcome to Ronin Wallet!</StyledTitle>
        <StyledDescription>You can now fully enjoy your wallet.</StyledDescription>
        <Checkbox checked={checked} onChange={setChecked} label="I agree to receive updates & news" />
      </Box>
      <Button fullWidth loading={isLoading} onClick={handleConnect}>
        Let's go
      </Button>
    </Box>
  );
}
