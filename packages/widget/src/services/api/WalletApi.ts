import type { Address, Hex } from 'viem';

import { HeadlessConfig } from '../HeadlessConfig';
import { SessionRepository } from '../SessionRepository';
import { HttpClient } from './HttpClient';

export interface UserProfileResponse {
  uuid: string;
  address: Address;
  hasSupportPwdless: boolean;
  preferMethod: 'recovery_password' | 'passwordless';
}

export interface SendTransactionRequest {
  tx: {
    to: Address;
    value: Hex;
    gas: Hex;
    gasPrice: Hex;
    nonce: Hex;
    chainId: Hex;
  };
  rpcUrl: string;
}

export interface SendTransactionResponse {
  txHash: Hex;
}

export interface PullShardResponse {
  shardCiphertextB64: string;
  shardEncryptedKeyB64: string;
  shardNonceB64: string;
}

export class WalletApi {
  static inject = ['headlessConfig', 'httpClient', 'sessionRepository'] as const;

  constructor(
    private headlessConfig: HeadlessConfig,
    private httpClient: HttpClient,
    private sessionRepository: SessionRepository,
  ) {}

  getUserProfile = async (): Promise<UserProfileResponse> => {
    const profile = await this.httpClient.call<UserProfileResponse>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/get-user-profile',
    });
    if (profile.preferMethod === 'passwordless') await this.sessionRepository.setAddress(profile.address);
    return profile;
  };

  createKeylessWallet = async (): Promise<{ uuid: string }> => {
    return this.httpClient.call<{ uuid: string }>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/keygen',
      data: { url: this.headlessConfig.mpcSocketUrl },
    });
  };

  getExchangePublicKey = async (): Promise<{ publicKey: string }> => {
    return this.httpClient.call<{ publicKey: string }>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/get-exchange-public-key',
    });
  };

  generateExchangeAsymmetricKey = async (): Promise<{ publicKey: string }> => {
    return this.httpClient.call<{ publicKey: string }>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/generate-exchange-key',
    });
  };

  pullClientShard = async (clientEncryptedKey: string): Promise<PullShardResponse> => {
    return this.httpClient.call<PullShardResponse>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/pull-shard',
      data: { clientEncryptedKey },
    });
  };

  signMessage = async ({ messageBase64 }: { messageBase64: string }): Promise<{ signature: Hex }> => {
    return this.httpClient.call<{ signature: Hex }>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/sign',
      data: { messageBase64 },
    });
  };

  sendTransaction = async ({
    tx,
    rpcUrl,
  }: {
    tx: SendTransactionRequest['tx'];
    rpcUrl: string;
  }): Promise<SendTransactionResponse> => {
    return this.httpClient.call<SendTransactionResponse>({
      baseUrl: this.headlessConfig.mpcBaseUrl,
      method: 'POST',
      path: '/send',
      shouldTransformRequest: false,
      data: { tx, rpc_url: rpcUrl },
    });
  };
}
