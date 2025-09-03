import { XIcon } from './assets/XIcon';
import { IconButton } from './components/button/Button';
import { FlexModal } from './components/flex-modal/FlexModal';
import { CONNECT_SUCCESS_DELAY } from './constants';
import { useTantoConfig } from './contexts/tanto/useTantoConfig';
import { useConnectModal } from './contexts/widget-modal/useWidgetModal';
import { WidgetRouterProvider } from './contexts/widget-router/WidgetRouterProvider';
import { WidgetUIConfigProvider } from './contexts/widget-ui-config/WidgetUIConfigProvider';
import { useAccountEffect } from './hooks/useAccountEffect';
import { WidgetContent } from './WidgetContent';

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

export function WidgetModal() {
  const { connectModalOpen, setConnectModalOpen, hideConnectModal } = useConnectModal();
  const { hideConnectSuccessPrompt } = useTantoConfig();

  useAccountEffect({
    onConnect() {
      setTimeout(hideConnectModal, hideConnectSuccessPrompt ? 0 : CONNECT_SUCCESS_DELAY);
    },
  });

  return (
    <FlexModal open={connectModalOpen} onOpenChange={setConnectModalOpen}>
      <WidgetRouterProvider>
        <WidgetUIConfigProvider isModal>
          <WidgetContent />
          <CloseButton onClick={hideConnectModal} />
        </WidgetUIConfigProvider>
      </WidgetRouterProvider>
    </FlexModal>
  );
}
