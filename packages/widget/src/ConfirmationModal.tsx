import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { UserRejectedRequestError } from 'viem';

import { XIcon } from './assets/XIcon';
import { Box } from './components/box/Box';
import { Button, IconButton } from './components/button/Button';
import { FlexModal } from './components/flex-modal/FlexModal';
import { useTantoConfig } from './contexts/tanto/useTantoConfig';
import { PwdlessEventType, pwdlessTaskManager } from './web3/PwdlessTaskManager';

interface Task {
  type: PwdlessEventType;
  id: string;
  params: any;
}

const TRACKED_EVENTS = [PwdlessEventType.SignMessage, PwdlessEventType.SignTransaction];

const Title = styled.div({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  fontSize: '1.25em',
  fontWeight: 500,
  wordBreak: 'break-word',
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

  const handleRemoveTask = () => {
    if (task) pwdlessTaskManager.removeTask({ taskId: task.id });
  };

  const handleCancel = () => {
    if (!task) return;
    pwdlessTaskManager.rejectTask({
      taskId: task.id,
      error: new UserRejectedRequestError(new Error('User rejected request')),
    });
    closeModal();
  };

  const handleConfirm = () => {
    if (!task) return;
    pwdlessTaskManager.resolveTask({ taskId: task.id });
    closeModal();
  };

  useEffect(() => {
    if (!showConfirmationModal) return;

    const handler = ({
      eventType,
      taskId,
      params,
    }: {
      eventType: PwdlessEventType;
      taskId: string;
      params: unknown;
    }) => {
      setTask({ id: taskId, type: eventType, params });
      setIsOpen(true);
    };

    TRACKED_EVENTS.forEach(eventType => {
      pwdlessTaskManager.on(eventType, handler);
    });

    return () => {
      TRACKED_EVENTS.forEach(eventType => {
        pwdlessTaskManager.off(eventType, handler);
      });
    };
  }, [showConfirmationModal]);

  if (!task) return null;

  return (
    <FlexModal open={isOpen} onOpenChange={setIsOpen} onAfterClose={handleRemoveTask}>
      <Box vertical gap={16}>
        <Box vertical gap={8}>
          <Title>Confirmation {task.type}</Title>
          <p>Are you sure you want to continue?</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>Params: {JSON.stringify(task.params, null, 2)}</pre>
        </Box>
        <Box gap={8}>
          <Button intent="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </Box>
      </Box>
      <CloseButton onClick={closeModal} />
    </FlexModal>
  );
}
