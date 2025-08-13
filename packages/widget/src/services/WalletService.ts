import type { Address, Hash, Hex, PublicClient, TypedDataDefinition } from 'viem';
import { createPublicClient, hexToString, http, InternalRpcError, UnauthorizedProviderError } from 'viem';

import { WalletApi } from './api/WalletApi';
import { HeadlessConfig } from './HeadlessConfig';
import { toTransactionInServerFormat } from './helpers/prepareTransaction';
import { TransactionParams } from './helpers/types';
import { SessionRepository } from './SessionRepository';
import { WalletOperationType, WalletTaskManager } from './WalletTaskManager';

export class WalletService {
  private address: Address | null = null;

  static inject = ['headlessConfig', 'sessionRepository', 'walletApi', 'walletTaskManager'] as const;

  constructor(
    private headlessConfig: HeadlessConfig,
    private sessionRepository: SessionRepository,
    private walletApi: WalletApi,
    private walletTaskManager: WalletTaskManager,
  ) {}

  async getSignableAddress(): Promise<Address> {
    if (this.address) return this.address;

    const [storedAddress, isAccessTokenExpired] = await Promise.all([
      this.sessionRepository.getAddress(),
      this.sessionRepository.isAccessTokenExpired(),
    ]);

    if (!isAccessTokenExpired && storedAddress) {
      this.address = storedAddress;
      return storedAddress;
    }

    if (!storedAddress) throw new UnauthorizedProviderError(new Error('No stored address found'));

    const { address, preferMethod } = await this.walletApi.getUserProfile();
    if (preferMethod !== 'passwordless')
      throw new UnauthorizedProviderError(new Error('User passwordless auth is not supported'));

    this.walletTaskManager.resolveTask(WalletOperationType.Connect, { address });
    this.address = address;
    return address;
  }

  async ensureSignable(): Promise<void> {
    await this.getSignableAddress();
  }

  personalSign = async (params: [data: Hex, address: Address]): Promise<Hex> => {
    try {
      await this.ensureSignable();
      const [data] = params;
      const messageToSign = hexToString(data);
      const messageBase64 = btoa(messageToSign);
      const { signature } = await this.walletApi.signMessage({ messageBase64 });
      return signature;
    } catch (error) {
      throw new InternalRpcError(error instanceof Error ? error : new Error('Unable to personal sign'));
    }
  };

  signTypedDataV4 = async (params: [address: Address, data: TypedDataDefinition | string]): Promise<Hex> => {
    try {
      await this.ensureSignable();
      const data = params[1];
      const messageToSign = typeof data === 'string' ? data : JSON.stringify(data);
      const messageBase64 = btoa(messageToSign);
      const { signature } = await this.walletApi.signMessage({ messageBase64 });
      return signature;
    } catch (error) {
      throw new InternalRpcError(error instanceof Error ? error : new Error('Unable to sign typed data'));
    }
  };

  sendTransaction = async (params: [transaction: TransactionParams]): Promise<Hash> => {
    try {
      const [transaction] = params;
      const address = await this.getSignableAddress();
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
    } catch (error) {
      throw new InternalRpcError(error instanceof Error ? error : new Error('Unable to send transaction'));
    }
  };

  getAddress(): Address | null {
    return this.address;
  }

  getChainId(): number {
    return this.headlessConfig.chain.id;
  }

  getPublicClient(): PublicClient {
    return createPublicClient({
      chain: this.headlessConfig.chain,
      transport: http(this.headlessConfig.rpcUrl),
    });
  }

  disconnect(): void {
    this.address = null;
    this.sessionRepository.clear();
  }
}
