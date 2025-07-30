import { useEffect } from 'react';

import { PwdlessEventType, pwdlessTaskManager } from '../../web3/PwdlessTaskManager';
import { useTantoConfig } from './useTantoConfig';

export function usePwdlessEvent() {
  const { showConfirmationModal } = useTantoConfig();

  useEffect(() => {
    const handler = ({ taskId }: { taskId: string }) => {
      if (!showConfirmationModal) {
        pwdlessTaskManager.resolveTask({
          taskId,
        });
        return;
      }
    };
    pwdlessTaskManager.on(PwdlessEventType.SignMessage, handler);
    pwdlessTaskManager.on(PwdlessEventType.SignTransaction, handler);
    return () => {
      pwdlessTaskManager.off(PwdlessEventType.SignMessage, handler);
      pwdlessTaskManager.off(PwdlessEventType.SignTransaction, handler);
    };
  }, [showConfirmationModal]);
}
