import styled from '@emotion/styled';
import { useEffect, useRef } from 'react';

import { Hourglass } from '../../../assets/Hourglass';
import { Box } from '../../../components/box/Box';
import { DotLoading } from '../../../components/dot-loading/DotLoading';

interface StepCreatingKeylessProps {
  handleCreateKeylessWallet: () => void;
}

const StyledHourglass = styled(Hourglass)({
  marginBottom: 32,
});

const Title = styled.p({
  fontSize: 20,
  fontWeight: 600,
  lineHeight: '14px',
  textAlign: 'center',
});

const Description = styled.p(({ theme }) => ({
  fontSize: 14,
  fontWeight: 400,
  color: theme.mutedText,
  maxWidth: 340,
  textAlign: 'center',
}));

export function StepCreatingKeyless({ handleCreateKeylessWallet }: StepCreatingKeylessProps) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    handleCreateKeylessWallet();
  }, []);

  return (
    <Box fullWidth vertical align="center">
      <StyledHourglass />
      <Box gap={4} mb={8} align="flex-end">
        <Title>Creating wallet</Title>
        <DotLoading />
      </Box>
      <Description>Please keep this page open.</Description>
    </Box>
  );
}
