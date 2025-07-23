import { EventEmitter } from 'events';
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

import { getUserProfileAPI, sendTransactionAPI, signMessageAPI } from './apis';
import { toTransactionInServerFormat } from './prepareTX';
import { TransactionParams } from './types';

const DEFAULT_CHAIN_ID = 2020;
const DEFAULT_BASE_URL = 'https://growing-narwhal-infinitely.ngrok-free.app/v1/public/rpc';

const CHAIN_MAPPING: Record<number, Chain> = {
  [ronin.id]: ronin,
  [saigon.id]: saigon,
};

interface PwdlessProviderOptions {
  baseUrl?: string;
  chainId?: number;
  accessToken: string;
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
  private _baseUrl: string;
  private _chainId: number;
  private _accessToken: string;
  private _publicClient: Client;
  private _isInitialized = false;
  private _address: Address | null = null;

  constructor({ baseUrl = DEFAULT_BASE_URL, chainId = DEFAULT_CHAIN_ID, accessToken }: PwdlessProviderOptions) {
    super();
    this._baseUrl = baseUrl;
    this._accessToken = accessToken;
    this._chainId = chainId;
    this._publicClient = this.createPublicClient(chainId);
  }

  private createPublicClient(chainId: number) {
    const chain = CHAIN_MAPPING[chainId];
    if (!chain) throw new ChainDisconnectedError(new Error(`Chain ${chainId} is not supported.`));
    return createPublicClient({
      chain,
      transport: http(),
    });
  }

  private async initialize() {
    if (this._isInitialized) return;

    try {
      const { address, hasSupportPwdless } = await getUserProfileAPI({
        baseUrl: this._baseUrl,
        accessToken: this._accessToken,
      });

      if (!hasSupportPwdless) throw new PwdlessProviderError('User does not support passwordless', 4001);

      this._address = address;
      this._isInitialized = true;
    } catch (error) {
      throw new PwdlessProviderError(`Pwdless Provider initialization failed: ${error}`, 4001);
    }
  }

  getAccounts = (): Address[] => {
    if (this._address && this._isInitialized) return [this._address];
    return [];
  };

  requestAccounts = async (): Promise<Address[]> => {
    await this.initialize();
    if (this._address && this._isInitialized) return [this._address];
    throw new UnauthorizedProviderError(new Error('Pwdless Provider is not initialized or account not available'));
  };

  personalSign = async (params: [data: Hex, address: Address]): Promise<Hex> => {
    const [data, address] = params;
    const [currentAddress] = await this.requestAccounts();

    if (!isAddressEqual(address, currentAddress)) {
      throw new UnauthorizedProviderError(
        new Error(`Address mismatch: current=${currentAddress}, requested=${address}`),
      );
    }

    try {
      const messageToSign = hexToString(data);
      const messageBase64 = btoa(messageToSign);

      const { signature } = await signMessageAPI({
        baseUrl: this._baseUrl,
        accessToken: this._accessToken,
        messageBase64,
      });

      return signature;
    } catch (err) {
      if (err instanceof Error) throw new InternalRpcError(err);
      throw new InternalRpcError(new Error('Unable to perform personal sign'));
    }
  };

  signTypedDataV4 = async (params: [address: Address, data: TypedDataDefinition | string]): Promise<Hex> => {
    const [address, data] = params;

    let typedData: TypedDataDefinition;
    try {
      if (typeof data === 'string') {
        typedData = JSON.parse(data) as TypedDataDefinition;
      } else {
        typedData = data;
      }
    } catch (err) {
      throw new InternalRpcError(new Error(`Unable to parse typedData: ${data}`));
    }

    const [currentAddress] = await this.requestAccounts();
    if (!isAddressEqual(address, currentAddress)) {
      throw new UnauthorizedProviderError(
        new Error(`Address mismatch: current=${currentAddress}, requested=${address}`),
      );
    }

    try {
      const messageToSign = JSON.stringify(typedData);
      const messageBase64 = btoa(messageToSign);

      const { signature } = await signMessageAPI({
        baseUrl: this._baseUrl,
        accessToken: this._accessToken,
        messageBase64,
      });

      return signature;
    } catch (err) {
      if (err instanceof Error) throw new InternalRpcError(err);
      throw new InternalRpcError(new Error('Unable to sign typed data'));
    }
  };

  sendTransaction = async (params: [transaction: TransactionParams]): Promise<Hash> => {
    const [tx] = params;
    const [currentAddress] = await this.requestAccounts();

    if (tx.from && !isAddressEqual(tx.from, currentAddress)) {
      throw new UnauthorizedProviderError(
        new Error(`Transaction from address mismatch: current=${currentAddress}, requested=${tx.from}`),
      );
    }

    try {
      const txData = await toTransactionInServerFormat({
        chain: { chainId: this._chainId, rpcUrl: this._publicClient.transport.url },
        transaction: tx,
        currentAddress,
      });

      const { txHash } = await sendTransactionAPI({
        baseUrl: this._baseUrl,
        accessToken: this._accessToken,
        tx: txData,
        rpcUrl: this._publicClient.transport.url,
      });

      return txHash;
    } catch (err) {
      if (err instanceof Error) throw new InternalRpcError(err);
      throw new InternalRpcError(new Error('Unable to send transaction'));
    }
  };

  public request = async <ReturnType = unknown>(args: EIP1193Parameters<PwdlessRequestSchema>) => {
    const { method, params } = args;

    switch (method) {
      case 'eth_accounts': {
        const result = this.getAccounts();
        return result as ReturnType;
      }

      case 'eth_requestAccounts': {
        const result = await this.requestAccounts();
        return result as ReturnType;
      }

      case 'eth_chainId': {
        return toHex(this._chainId) as ReturnType;
      }

      case 'personal_sign': {
        return this.personalSign(params) as ReturnType;
      }

      case 'eth_signTypedData_v4': {
        return this.signTypedDataV4(params) as ReturnType;
      }

      case 'eth_sendTransaction': {
        return this.sendTransaction(params) as ReturnType;
      }

      default: {
        return this._publicClient.request(args) as ReturnType;
      }
    }
  };

  /* -------------------------------------------- */
  /*              Utilities functions             */
  /* -------------------------------------------- */

  getChainId = (): number => {
    return this._chainId;
  };

  isConnected = (): boolean => {
    return this._isInitialized && !!this._address;
  };

  getAddress = (): Address | null => {
    return (this._address as Address) || null;
  };

  updateAccessToken = (newToken: string) => {
    this._accessToken = newToken;
  };
}
