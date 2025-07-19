import { ArrowLeftIcon } from '../../../assets/ArrowLeftIcon';
import { RoninLogo } from '../../../assets/RoninLogo';
import { TransitionedView } from '../../../components/animated-containers/TransitionedView';
import { Box } from '../../../components/box/Box';
import { IconButton } from '../../../components/button/Button';
import { SimpleStepper } from '../../../components/simple-stepper/SimpleStepper';

export interface KeylessHeaderProps {
  title?: string | null;
  step?: number | null;
  totalSteps?: number;
  showLogo?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function KeylessHeader({
  title,
  step,
  totalSteps,
  showLogo = false,
  showBackButton = true,
  onBack,
}: KeylessHeaderProps) {
  return (
    <Box fullWidth justify="space-between" pr={44}>
      {showBackButton && (
        <IconButton aria-label="Back" intent="secondary" variant="plain" icon={<ArrowLeftIcon />} onClick={onBack} />
      )}

      <TransitionedView viewKey={`${showLogo}-${title}`}>
        <Box vertical align="center" gap={20} pt={20}>
          <SimpleStepper step={step} total={totalSteps} />
          <KeylessTitle title={title} showLogo={showLogo} />
        </Box>
      </TransitionedView>
    </Box>
  );
}

interface KeylessTitleProps {
  title?: string | null;
  showLogo: boolean;
}

function KeylessTitle({ title, showLogo }: KeylessTitleProps) {
  if (!title && !showLogo) return null;

  return (
    <Box vertical gap={16} align="center">
      {showLogo && <RoninLogo css={{ width: 48, height: 48 }} />}
      {title && (
        <p
          css={{
            fontSize: 20,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {title}
        </p>
      )}
    </Box>
  );
}
