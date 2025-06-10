import EventEmitter2 from 'eventemitter2';
import type { Chain, Client, EIP1193Parameters, TypedDataDefinition } from 'viem';
import {
  ChainDisconnectedError,
  createPublicClient,
  hexToString,
  http,
  InvalidParamsRpcError,
  isHex,
  toHex,
} from 'viem';
import { ronin, saigon } from 'viem/chains';

import { sendTransaction, signMessage, whoAmI } from '../actions';
import { EmbeddedCommunicator } from '../embedded-communicator';
import { RoninWaypointRequestSchema } from './eip1193';

const DEFAULT_CHAIN_ID = 2020;
const CHAIN_MAPPING: Record<number, Chain> = {
  [ronin.id]: ronin,
  [saigon.id]: saigon,
};

interface EmbeddedProviderOptions {
  communicator: EmbeddedCommunicator;
  chainId?: number;
}

export class EmbeddedProvider extends EventEmitter2 {
  private _chainId: number;
  private _communicator: EmbeddedCommunicator;
  private _publicClient: Client;

  constructor({ communicator, chainId = DEFAULT_CHAIN_ID }: EmbeddedProviderOptions) {
    super();
    this._chainId = chainId;
    this._communicator = communicator;
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

  public request = async <ReturnType = unknown>(args: EIP1193Parameters<RoninWaypointRequestSchema>) => {
    const { method, params } = args;

    switch (method) {
      case 'eth_chainId':
        return toHex(this._chainId) as ReturnType;

      case 'eth_accounts':
      case 'eth_requestAccounts': {
        const account = await whoAmI(this._communicator);
        return (account?.wallet ? [account.wallet.identity] : []) as ReturnType;
      }

      case 'personal_sign': {
        const [data, address] = params;
        const message = isHex(data) ? hexToString(data) : data;
        const { signature } = await signMessage(this._communicator, {
          address,
          message,
        });
        return signature;
      }

      case 'eth_signTypedData_v4': {
        const [address, data] = params;
        const typedData = (() => {
          try {
            if (typeof data === 'string') {
              return JSON.parse(data) as TypedDataDefinition;
            }
            return data;
          } catch {
            throw new InvalidParamsRpcError(new Error('eth_signTypedData_v4: could NOT parse typed data.'));
          }
        })();
        const { signature } = await signMessage(this._communicator, {
          address,
          message: JSON.stringify(typedData),
        });
        return signature;
      }

      case 'eth_sendTransaction': {
        const [transaction] = params;
        const { hash } = await sendTransaction(this._communicator, transaction);
        return hash;
      }

      default: {
        return this._publicClient.request(args) as ReturnType;
      }
    }
  };
}
