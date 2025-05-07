import { useCallback } from 'react';

import { XIcon } from './assets/XIcon';
import { IconButton } from './components/button/Button';
import { FlexModal } from './components/flex-modal/FlexModal';
import { CONNECT_SUCCESS_DELAY } from './constants';
import { WidgetRouterProvider } from './contexts/widget-router/WidgetRouterProvider';
import { useWidgetModal } from './hooks/useWidgetModal';
import { WidgetContent } from './WidgetContent';

export function WidgetModal() {
  const { open, setOpen, hide } = useWidgetModal();

  const onConnect = useCallback(() => {
    setTimeout(hide, CONNECT_SUCCESS_DELAY);
  }, [hide]);

  return (
    <FlexModal open={open} onOpenChange={setOpen}>
      <WidgetRouterProvider>
        <WidgetContent
          close={<IconButton intent="secondary" variant="plain" icon={<XIcon />} onClick={hide} />}
          onConnect={onConnect}
        />
      </WidgetRouterProvider>
    </FlexModal>
  );
}
