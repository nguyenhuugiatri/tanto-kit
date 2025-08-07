import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { UserRejectedRequestError } from 'viem';

import { XIcon } from './assets/XIcon';
import { Box } from './components/box/Box';
import { Button, IconButton } from './components/button/Button';
import { FlexModal } from './components/flex-modal/FlexModal';
import { useTantoConfig } from './contexts/tanto/useTantoConfig';
import { WalletOperationType, walletTaskManager } from './web3/WalletTaskManager';

interface Task {
  type: WalletOperationType;
  id: string;
  params: any;
}

const TRACKED_EVENTS = [WalletOperationType.SignMessage, WalletOperationType.SignTransaction];

const Title = styled.div({
  alignItems: 'center',
  fontSize: '1.5em',
  fontWeight: 600,
  marginTop: 8,
});

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      css={{ position: 'absolute', top: 0, right: 0 }}
      intent="secondary"
      variant="plain"
      aria-label="Close"
      icon={<XIcon />}
      onClick={onClick}
    />
  );
}

export function ConfirmationModal() {
  const { showConfirmationModal } = useTantoConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  const closeModal = () => setIsOpen(false);

  const handleRemoveTaskOnClose = () => {
    if (!task) return;
    walletTaskManager.cancelTask(task.id);
    closeModal();
  };

  const handleCancel = () => {
    if (!task) return;
    walletTaskManager.rejectTask(task.id, new UserRejectedRequestError(new Error('User rejected request')));
    closeModal();
  };

  const handleConfirm = () => {
    if (!task) return;
    walletTaskManager.resolveTask(task.id);
    closeModal();
  };

  useEffect(() => {
    if (!showConfirmationModal) {
      const unsubscribe = walletTaskManager.onTaskCreated(({ taskId }) => {
        walletTaskManager.resolveTask(taskId);
      });
      return () => {
        unsubscribe();
      };
    }

    const unsubscribe = walletTaskManager.onTaskCreated(({ taskId, operationType, params }) => {
      if (!TRACKED_EVENTS.includes(operationType)) return;
      setTask({ id: taskId, type: operationType, params });
      setIsOpen(true);
    });

    return () => {
      unsubscribe();
    };
  }, [showConfirmationModal]);

  if (!task) return null;

  return (
    <FlexModal open={isOpen} onOpenChange={setIsOpen} onAfterClose={handleRemoveTaskOnClose}>
      <Box vertical gap={16}>
        <Box vertical gap={8}>
          <Title>Message Signing Request</Title>
          <p>Are you sure you want to continue?</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>Params: {JSON.stringify(task.params, null, 2)}</pre>
        </Box>
        <Box fullWidth gap={8}>
          <Button fullWidth intent="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button fullWidth onClick={handleConfirm}>
            Confirm
          </Button>
        </Box>
      </Box>
      <CloseButton onClick={closeModal} />
    </FlexModal>
  );
}
