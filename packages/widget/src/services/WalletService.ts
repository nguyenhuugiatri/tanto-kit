import type { Address, Hash, Hex, PublicClient, TypedDataDefinition } from 'viem';
import { createPublicClient, hexToString, http, InternalRpcError, UnauthorizedProviderError } from 'viem';

import { WalletApi } from './api/WalletApi';
import { HeadlessAsyncTaskManager, HeadlessOperationType } from './HeadlessAsyncTaskManager';
import { HeadlessConfig } from './HeadlessConfig';
import { toTransactionInServerFormat } from './helpers/prepareTransaction';
import { TransactionParams } from './helpers/types';
import { SessionRepository } from './SessionRepository';

export class WalletService {
  private address: Address | null = null;
  private publicClient: PublicClient | null = null;

  static inject = ['headlessConfig', 'sessionRepository', 'walletApi', 'headlessAsyncTaskManager'] as const;

  constructor(
    private headlessConfig: HeadlessConfig,
    private sessionRepository: SessionRepository,
    private walletApi: WalletApi,
    private headlessAsyncTaskManager: HeadlessAsyncTaskManager,
  ) {}

  async getSignableAddress(): Promise<Address> {
    if (this.address) return this.address;

    const storedAddress = await this.sessionRepository.getAddress();
    const isExpired = await this.sessionRepository.isAccessTokenExpired();

    // No stored address = no session
    if (!storedAddress) {
      throw new UnauthorizedProviderError(new Error('No authenticated session found. Please connect your wallet.'));
    }

    if (!isExpired) {
      this.address = storedAddress;
      return storedAddress;
    }

    return this.fetchAndSaveAddress();
  }

  private async fetchAndSaveAddress(): Promise<Address> {
    try {
      const { address, preferMethod } = await this.walletApi.getUserProfile();
      if (preferMethod !== 'passwordless') {
        throw new UnauthorizedProviderError(new Error('Passwordless authentication is required for this wallet.'));
      }
      this.headlessAsyncTaskManager.resolveTask(HeadlessOperationType.Connect, { address });
      this.address = address;
      return address;
    } catch (error) {
      throw new UnauthorizedProviderError(
        new Error('Failed to fetch user profile. Please reconnect your wallet.', { cause: error }),
      );
    }
  }

  private async withSignable<T>(fn: (address: Address) => Promise<T>): Promise<T> {
    const address = await this.getSignableAddress();
    return fn(address);
  }

  personalSign = async (params: [data: Hex, address: Address]): Promise<Hex> => {
    try {
      return await this.withSignable(async () => {
        const [data] = params;
        const messageToSign = hexToString(data);
        const messageBase64 = btoa(messageToSign);
        const { signature } = await this.walletApi.signMessage({ messageBase64 });
        return signature;
      });
    } catch (error) {
      throw new InternalRpcError(new Error('Unable to personal sign', { cause: error }));
    }
  };

  signTypedDataV4 = async (params: [address: Address, data: TypedDataDefinition | string]): Promise<Hex> => {
    try {
      return await this.withSignable(async () => {
        const data = params[1];
        const messageToSign = typeof data === 'string' ? data : JSON.stringify(data);
        const messageBase64 = btoa(messageToSign);
        const { signature } = await this.walletApi.signMessage({ messageBase64 });
        return signature;
      });
    } catch (error) {
      throw new InternalRpcError(new Error('Unable to sign typed data', { cause: error }));
    }
  };

  sendTransaction = async (params: [transaction: TransactionParams]): Promise<Hash> => {
    try {
      return await this.withSignable(async address => {
        const [transaction] = params;
        const transactionData = await toTransactionInServerFormat({
          chain: { chainId: this.headlessConfig.chain.id, rpcUrl: this.headlessConfig.rpcUrl },
          transaction,
          currentAddress: address,
        });
        const { txHash } = await this.walletApi.sendTransaction({
          tx: transactionData,
          rpcUrl: this.headlessConfig.rpcUrl,
        });
        return txHash;
      });
    } catch (error) {
      throw new InternalRpcError(new Error('Unable to send transaction', { cause: error }));
    }
  };

  getAddress(): Address | null {
    return this.address;
  }

  getChainId(): number {
    return this.headlessConfig.chain.id;
  }

  getPublicClient(): PublicClient {
    if (!this.publicClient) {
      this.publicClient = createPublicClient({
        chain: this.headlessConfig.chain,
        transport: http(this.headlessConfig.rpcUrl),
      });
    }
    return this.publicClient;
  }

  async disconnect(): Promise<void> {
    await this.sessionRepository.clear();
    this.address = null;
    this.publicClient = null;
  }
}
