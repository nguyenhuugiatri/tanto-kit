import type { Address, Hex } from 'viem';

import { HeadlessConfig } from '../HeadlessConfig';
import { SessionRepository } from '../SessionRepository';
import { HttpClient, UserProfileResponse } from './HttpClient';

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
    await this.sessionRepository.setAddress(profile.address);
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
      data: { tx, rpcUrl },
    });
  };
}
