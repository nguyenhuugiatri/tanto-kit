import styled from '@emotion/styled';
import { BaseConnector, requestInjectedConnectors } from '@sky-mavis/tanto-connect';
import { useEffect, useState } from 'react';

import { XIcon } from './assets/XIcon';
import { Box } from './components/box/Box';
import { Button, IconButton } from './components/button/Button';
import { CSSReset } from './components/css-reset/CSSReset';
import { FlexModal, FocusOutsideEvent, PointerDownOutsideEvent } from './components/flex-modal/FlexModal';
import { MAX_Z_INDEX } from './constants';
import { useFundModal } from './contexts/widget-modal/useWidgetModal';

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

const Title = styled.div({
  alignItems: 'center',
  fontSize: '1.25em',
  fontWeight: 500,
  marginTop: 8,
});

const Description = styled.div(({ theme }) => ({
  color: theme.mutedText,
}));

export function FundModal() {
  const [connectors, setConnectors] = useState<BaseConnector[]>([]);
  const { fundModalOpen, setFundModalOpen, hideFundModal } = useFundModal();

  const handleInteractOutside = (e: PointerDownOutsideEvent | FocusOutsideEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('wcm-modal')) {
      e.preventDefault();
    }
  };

  const handleConnect = async (connector: BaseConnector) => {
    const provider = await connector.getProvider();
    const clone = { ...provider };
    const accounts = await clone.request({
      method: 'eth_requestAccounts',
    });
    console.log('accounts', accounts);
  };

  useEffect(() => {
    requestInjectedConnectors().then(setConnectors);
  }, []);

  useEffect(() => {
    const w3mcss = document.createElement('style');
    w3mcss.innerHTML = `w3m-modal, wcm-modal{ --wcm-z-index: ${MAX_Z_INDEX}; --w3m-z-index:${MAX_Z_INDEX}; }`;
    document.head.appendChild(w3mcss);
    return () => {
      document.head.removeChild(w3mcss);
    };
  }, []);

  return (
    <FlexModal open={fundModalOpen} onOpenChange={setFundModalOpen} onInteractOutside={handleInteractOutside}>
      <CSSReset>
        <Box vertical maxWidth={400} gap={24}>
          <Box vertical gap={12}>
            <Title>Fund</Title>
            <Description>You are requested to fund your wallet.</Description>
          </Box>
          {connectors.map(connector => (
            <Box key={connector.id} vertical gap={12}>
              <p>{connector.name}</p>
              <Button fullWidth onClick={() => handleConnect(connector)}>
                Connect
              </Button>
            </Box>
          ))}
        </Box>
      </CSSReset>
      <CloseButton onClick={hideFundModal} />
    </FlexModal>
  );
}
