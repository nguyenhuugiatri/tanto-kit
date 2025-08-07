import EventEmitter from 'eventemitter3';
import { jwtDecode } from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';
import type { Address, Chain, Client, EIP1193Parameters, Hash, Hex, PublicRpcSchema, TypedDataDefinition } from 'viem';
import {
  ChainDisconnectedError,
  createPublicClient,
  hexToString,
  http,
  InternalRpcError,
  isAddressEqual,
  toHex,
  UnauthorizedProviderError,
} from 'viem';
import { ronin, saigon } from 'viem/chains';

import { authStorage } from '../services/AuthStorage';
import { httpService } from '../services/HttpService';
import { toTransactionInServerFormat } from './prepareTX';
import { TransactionParams } from './types';
import { WalletOperationType, walletTaskManager } from './WalletTaskManager';

const DEFAULT_CHAIN_ID = 2020;
const DEFAULT_BASE_URL = 'https://growing-narwhal-infinitely.ngrok-free.app/v1/public/rpc';
const TOKEN_EXPIRY_BUFFER_SECONDS = 30;

const SUPPORTED_CHAINS: Record<number, Chain> = {
  [ronin.id]: ronin,
  [saigon.id]: saigon,
};

const ERROR_MESSAGES = {
  NO_ACCESS_TOKEN: 'No access token found',
  ACCESS_TOKEN_EXPIRED: 'Access token expired',
  INVALID_ACCESS_TOKEN: 'Invalid access token',
  USER_NOT_AUTHENTICATED: 'User not authenticated',
  NO_ACCOUNT_FOUND: 'No account found',
  CHAIN_NOT_SUPPORTED: (chainId: number) => `Chain ${chainId} is not supported`,
  ADDRESS_MISMATCH: (current: Address, requested: Address) =>
    `Address mismatch: current=${current}, requested=${requested}`,
  UNABLE_TO_PARSE_TYPED_DATA: (data: string) => `Unable to parse typedData: ${data}`,
  UNABLE_TO_PERSONAL_SIGN: 'Unable to perform personal sign',
  UNABLE_TO_SIGN_TYPED_DATA: 'Unable to sign typed data',
  UNABLE_TO_SEND_TRANSACTION: 'Unable to send transaction',
} as const;

interface PwdlessProviderConfig {
  baseUrl?: string;
  chainId?: number;
}

export type PwdlessRequestSchema = [
  ...PublicRpcSchema,
  {
    Method: 'eth_accounts';
    Parameters?: undefined;
    ReturnType: Address[];
  },
  {
    Method: 'eth_requestAccounts';
    Parameters?: undefined;
    ReturnType: Address[];
  },
  {
    Method: 'eth_sendTransaction';
    Parameters: [transaction: TransactionParams];
    ReturnType: Hash;
  },
  {
    Method: 'eth_signTypedData_v4';
    Parameters: [address: Address, typedData: TypedDataDefinition | string];
    ReturnType: Hex;
  },
  {
    Method: 'personal_sign';
    Parameters: [data: Hex, address: Address];
    ReturnType: Hex;
  },
];

export class PwdlessProviderError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'PwdlessProviderError';
    this.code = code;
  }
}

export class PwdlessProvider extends EventEmitter {
  private readonly _baseUrl: string;
  private readonly _chainId: number;
  private readonly _publicClient: Client;

  private _isAuthenticated: boolean = false;
  private _accessToken: string | null = null;
  private _accessTokenExpiry: number | null = null;
  private _address: Address | null = null;
  private _storage = authStorage;

  constructor({ baseUrl = DEFAULT_BASE_URL, chainId = DEFAULT_CHAIN_ID }: PwdlessProviderConfig = {}) {
    super();
    this._baseUrl = baseUrl;
    this._chainId = chainId;
    this._publicClient = this.createPublicClient(chainId);
  }

  private parseTypedData(data: TypedDataDefinition | string): TypedDataDefinition {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as TypedDataDefinition;
      } catch {
        throw new InternalRpcError(new Error(ERROR_MESSAGES.UNABLE_TO_PARSE_TYPED_DATA(data)));
      }
    }
    return data;
  }

  private validateAddressMatch(requestedAddress: Address, currentAddress: Address | null): void {
    if (!currentAddress) {
      throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.NO_ACCOUNT_FOUND));
    }
    if (!isAddressEqual(requestedAddress, currentAddress)) {
      throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.ADDRESS_MISMATCH(currentAddress, requestedAddress)));
    }
  }

  private getValidAccessToken(accessToken: string | null): string {
    if (!accessToken) {
      throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.NO_ACCESS_TOKEN));
    }

    const now = Date.now() / 1000;

    if (this._accessTokenExpiry && this._accessTokenExpiry > now + TOKEN_EXPIRY_BUFFER_SECONDS) {
      return accessToken;
    }

    try {
      const { exp } = jwtDecode(accessToken);

      if (typeof exp !== 'number' || exp <= now + TOKEN_EXPIRY_BUFFER_SECONDS) {
        throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.ACCESS_TOKEN_EXPIRED));
      }

      this._accessTokenExpiry = exp;
      return accessToken;
    } catch (error) {
      if (error instanceof UnauthorizedProviderError) throw error;
      throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.INVALID_ACCESS_TOKEN));
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.USER_NOT_AUTHENTICATED));
    }
  }

  private createPublicClient(chainId: number): Client {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) {
      throw new ChainDisconnectedError(new Error(ERROR_MESSAGES.CHAIN_NOT_SUPPORTED(chainId)));
    }

    return createPublicClient({
      chain,
      transport: http(),
    });
  }

  private async waitForUserConfirm<T>(
    operationType: WalletOperationType,
    params: unknown,
    executor: () => Promise<T>,
  ): Promise<T> {
    const { promise: confirmPromise } = walletTaskManager.createTask({
      operationType,
      id: uuidv4(),
      params,
    });

    await confirmPromise;
    return executor();
  }

  async isAuthenticated(): Promise<boolean> {
    const [storedAddress, storedToken, storedRefreshToken] = await Promise.all([
      this._storage.getAddress(),
      this._storage.getAccessToken(),
      this._storage.getRefreshToken(),
    ]);

    if (!storedAddress || !storedToken || !storedRefreshToken) {
      this._isAuthenticated = false;
      return false;
    }

    try {
      // Uncomment this for syncing with the server address
      // const { address: serverAddress, preferMethod } = await getUserProfileAPI({
      //   baseUrl: this._baseUrl,
      // });

      // if (preferMethod !== 'passwordless') {
      //   this._isAuthenticated = false;
      //   return false;
      // }

      // if (!isAddressEqual(storedAddress, serverAddress)) {
      //   this._address = serverAddress;
      //   await this._storage.setAddress(serverAddress);
      // } else {
      //   this._address = storedAddress;
      // }

      this._accessToken = this.getValidAccessToken(storedToken);
      this._address = storedAddress;
      this._isAuthenticated = true;
      return true;
    } catch {
      this._isAuthenticated = false;
      this._accessToken = null;
      this._address = null;
      this._accessTokenExpiry = null;

      this.disconnect();
      return false;
    }
  }

  getChainId(): number {
    return this._chainId;
  }

  getAccounts(): Address[] {
    return this._isAuthenticated && this._address ? [this._address] : [];
  }

  async requestAccounts(): Promise<Address[]> {
    await this.ensureAuthenticated();

    if (!this._address) {
      throw new UnauthorizedProviderError(new Error(ERROR_MESSAGES.NO_ACCOUNT_FOUND));
    }

    return [this._address];
  }

  async connect(): Promise<{ address: Address; accessToken: string }> {
    if (this._isAuthenticated && this._address && this._accessToken) {
      return {
        address: this._address,
        accessToken: this._accessToken,
      };
    }

    const { promise } = walletTaskManager.createTask({
      operationType: WalletOperationType.Connect,
    });

    const { address, accessToken } = await promise;

    this._address = address;
    this._accessToken = this.getValidAccessToken(accessToken);

    await Promise.all([this._storage.setAccessToken(accessToken), this._storage.setAddress(address)]);

    return { address, accessToken };
  }

  disconnect(): void {
    this._isAuthenticated = false;
    this._accessToken = null;
    this._address = null;
    this._accessTokenExpiry = null;
    this._storage.resetAuth();
  }

  private personalSign = async (params: [data: Hex, address: Address]): Promise<Hex> => {
    const [data, address] = params;

    this.validateAddressMatch(address, this._address);

    try {
      const messageToSign = hexToString(data);
      const messageBase64 = btoa(messageToSign);

      const { signature } = await httpService.signMessageAPI({
        messageBase64,
      });

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(ERROR_MESSAGES.UNABLE_TO_PERSONAL_SIGN);
      throw new InternalRpcError(errorMessage);
    }
  };

  private signTypedDataV4 = async (params: [address: Address, data: TypedDataDefinition | string]): Promise<Hex> => {
    const [address, data] = params;

    this.validateAddressMatch(address, this._address);

    const typedData = this.parseTypedData(data);

    try {
      const messageToSign = JSON.stringify(typedData);
      const messageBase64 = btoa(messageToSign);

      const { signature } = await httpService.signMessageAPI({
        messageBase64,
      });

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(ERROR_MESSAGES.UNABLE_TO_SIGN_TYPED_DATA);
      throw new InternalRpcError(errorMessage);
    }
  };

  private sendTransaction = async (params: [transaction: TransactionParams]): Promise<Hash> => {
    const [transaction] = params;

    if (transaction.from) {
      this.validateAddressMatch(transaction.from, this._address);
    }

    try {
      const transactionData = await toTransactionInServerFormat({
        chain: { chainId: this._chainId, rpcUrl: this._publicClient.transport.url },
        transaction,
        currentAddress: this._address!,
      });

      const { txHash } = await httpService.sendTransactionAPI({
        tx: transactionData,
        rpcUrl: this._publicClient.transport.url,
      });

      return txHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(ERROR_MESSAGES.UNABLE_TO_SEND_TRANSACTION);
      throw new InternalRpcError(errorMessage);
    }
  };

  public request = async <ReturnType = unknown>(args: EIP1193Parameters<PwdlessRequestSchema>) => {
    const { method, params } = args;

    switch (method) {
      case 'eth_accounts':
        return this.getAccounts() as ReturnType;

      case 'eth_requestAccounts':
        return (await this.requestAccounts()) as ReturnType;

      case 'eth_chainId':
        return toHex(this._chainId) as ReturnType;

      case 'personal_sign':
        return this.waitForUserConfirm(WalletOperationType.SignMessage, params, () =>
          this.personalSign(params),
        ) as ReturnType;

      case 'eth_signTypedData_v4':
        return this.waitForUserConfirm(WalletOperationType.SignMessage, params, () =>
          this.signTypedDataV4(params),
        ) as ReturnType;

      case 'eth_sendTransaction':
        return this.waitForUserConfirm(WalletOperationType.SignTransaction, params, () =>
          this.sendTransaction(params),
        ) as ReturnType;

      default:
        return this._publicClient.request(args) as ReturnType;
    }
  };

  static resolveConnect({ address, accessToken }: { address: Address; accessToken: string }): void {
    // Next tick
    setTimeout(() => {
      walletTaskManager.resolveTask(WalletOperationType.Connect, { address, accessToken });
    });
  }
}
