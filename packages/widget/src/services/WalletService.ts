import type { Address, Hash, Hex, PublicClient, TypedDataDefinition } from 'viem';
import { createPublicClient, http, InternalRpcError, toPrefixedMessage, UnauthorizedProviderError } from 'viem';

import { AESDecrypt, arrayBufferToBase64, encryptContent, hexToBase64 } from '../utils/convertor';
import { parseTypedData, prepareTypedData } from '../utils/prepare-typed-data';
import { ErrorCode } from './api/errorCode';
import { HttpError } from './api/HttpClient';
import { WalletApi } from './api/WalletApi';
import { HeadlessConfig } from './HeadlessConfig';
import { toTransactionInServerFormat } from './helpers/prepareTransaction';
import { TransactionParams } from './helpers/types';
import { SessionRepository } from './SessionRepository';

export class WalletService {
  static inject = ['headlessConfig', 'sessionRepository', 'walletApi'] as const;

  private address: Address | null = null;
  private publicClient: PublicClient;
  private publicKey: string | null = null;

  constructor(
    private headlessConfig: HeadlessConfig,
    private sessionRepository: SessionRepository,
    private walletApi: WalletApi,
  ) {
    this.publicClient = createPublicClient({
      chain: this.headlessConfig.chain,
      transport: http(this.headlessConfig.rpcUrl),
    });
  }

  getAddress(): Address | null {
    return this.address;
  }

  getChainId(): number {
    return this.headlessConfig.chain.id;
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  private genExchangeAsymmetricKey = async () => {
    try {
      return await this.withSignable(async () => {
        const { publicKey } = await this.walletApi.generateExchangeAsymmetricKey();
        this.publicKey = publicKey;
        return publicKey;
      });
    } catch (error) {
      throw new InternalRpcError(new Error('Unable to generate exchange asymmetric key', { cause: error }));
    }
  };

  getExchangePublicKey = async () => {
    if (this.publicKey) return this.publicKey;

    try {
      return await this.withSignable(async () => {
        const { publicKey } = await this.walletApi.getExchangePublicKey();
        this.publicKey = publicKey;
        return publicKey;
      });
    } catch (error) {
      if (error instanceof HttpError && error.code === ErrorCode.MPC_NOT_FOUND)
        return await this.genExchangeAsymmetricKey();
      throw error;
    }
  };

  pullClientShard = async () => {
    try {
      return await this.withSignable(async () => {
        const publicKey = await this.getExchangePublicKey();
        const { encryptedContent, encryptionKey } = await encryptContent(publicKey);
        const { shardCiphertextB64, shardNonceB64 } = await this.walletApi.pullClientShard(
          arrayBufferToBase64(encryptedContent),
        );

        return AESDecrypt({
          ciphertextB64: shardCiphertextB64,
          nonceB64: shardNonceB64,
          aesKey: encryptionKey,
        });
      });
    } catch (error) {
      throw new InternalRpcError(new Error('Unable to pull shard', { cause: error }));
    }
  };

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

  async fetchAndSaveAddress(): Promise<Address> {
    try {
      const { address, preferMethod } = await this.walletApi.getUserProfile();
      if (preferMethod !== 'passwordless') {
        throw new UnauthorizedProviderError(new Error('Passwordless authentication is required for this wallet.'));
      }
      this.address = address;
      return address;
    } catch (error) {
      throw new UnauthorizedProviderError(
        new Error('Failed to fetch user profile. Please reconnect your wallet.', { cause: error }),
      );
    }
  }

  personalSign = async (params: [data: Hex, address: Address]): Promise<Hex> => {
    try {
      return await this.withSignable(async () => {
        const [message] = params;
        const messageBase64 = hexToBase64(toPrefixedMessage({ raw: message }));
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
        const rawTypedData = params[1];
        const typedData = parseTypedData(rawTypedData);
        const messageBase64 = hexToBase64(prepareTypedData(typedData));
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

  async disconnect(): Promise<void> {
    this.address = null;
    await this.sessionRepository.clear();
  }

  private async withSignable<T>(fn: (address: Address) => Promise<T>): Promise<T> {
    const address = await this.getSignableAddress();
    return fn(address);
  }
}
