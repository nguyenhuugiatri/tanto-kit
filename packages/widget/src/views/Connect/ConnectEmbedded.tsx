import { useEffect, useState } from 'react';

import { Button } from '../../components/button/Button';
import { useConnect } from '../../hooks/useConnect';
import { useWidgetConnect } from '../../hooks/useWidgetConnect';
import { useCreateWallet } from '../../libs/embedded/hooks/useCreateWallet';
import { useEmbeddedSession } from '../../libs/embedded/hooks/useEmbeddedSession';
import { useEmbeddedWallet } from '../../libs/embedded/hooks/useEmbeddedWallet';
import { useLoginWithEmail } from '../../libs/embedded/hooks/useLoginWithEmail';
import { useUnlockWallet } from '../../libs/embedded/hooks/useUnlockWallet';
import { ConnectLayout } from './components/ConnectLayout';

export function ConnectEmbedded() {
  const { selectedWallet, selectedConnector } = useWidgetConnect();
  const { status, connect } = useConnect({ connector: selectedConnector });
  const { authenticated, authenticating } = useEmbeddedSession();
  const { sendOTP, loginWithOTP, sendOTPLoading, loginWithOTPLoading } = useLoginWithEmail();
  const { address, isWalletUnlocked } = useEmbeddedWallet();
  const { createWallet, createWalletLoading } = useCreateWallet();
  const { unlockWallet, unlockWalletLoading, isShowUnlockWalletComponent, UnlockWalletComponent } = useUnlockWallet();

  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');

  useEffect(() => {
    if (authenticated) connect();
  }, [authenticated, connect]);

  if (!selectedWallet) return null;

  if (authenticating) return <div>Loading...</div>;

  if (!authenticated) {
    return (
      <div>
        <p>Login to continue</p>
        <div>
          <input onChange={event => setEmail(event.target.value)} />
          <Button
            onClick={() =>
              sendOTP({
                email,
              })
            }
          >
            {sendOTPLoading ? 'Loading' : 'Send OTP'}
          </Button>
        </div>
        <div>
          <input onChange={event => setOTP(event.target.value)} />
          <Button
            onClick={() =>
              loginWithOTP({
                email,
                code: otp,
              })
            }
          >
            {loginWithOTPLoading ? 'Loading' : 'Verify OTP'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        {(() => {
          if (!address)
            return (
              <Button onClick={() => createWallet()}>
                {createWalletLoading ? 'Loading' : 'Create keyless wallet'}
              </Button>
            );

          if (!isWalletUnlocked) {
            return (
              <div>
                <Button onClick={() => unlockWallet()}>{unlockWalletLoading ? 'Loading' : 'Unlock Wallet'}</Button>
                <div>
                  {isShowUnlockWalletComponent && (
                    <UnlockWalletComponent
                      style={{
                        width: 400,
                        height: 600,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          }

          return <ConnectLayout wallet={selectedWallet} status={status} onRetry={connect} />;
        })()}
      </div>
    </div>
  );
}
