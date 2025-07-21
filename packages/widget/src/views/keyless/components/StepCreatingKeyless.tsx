import styled from '@emotion/styled';

import { Hourglass } from '../../../assets/Hourglass';
import { Box } from '../../../components/box/Box';
import { DotLoading } from '../../../components/dot-loading/DotLoading';

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

export function StepCreatingKeyless() {
  return (
    <Box fullWidth vertical align="center" pb={12}>
      <StyledHourglass />
      <Box gap={4} mb={8} align="flex-end">
        <Title>Creating wallet</Title>
        <DotLoading />
      </Box>
      <Description>Please keep this page open.</Description>
    </Box>
  );
}
