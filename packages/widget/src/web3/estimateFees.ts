import { Client, Hex, numberToHex } from 'viem';
import { getGasPrice } from 'viem/actions';
import { ronin, saigon } from 'viem/chains';

import { httpService } from '../services/HttpService';
import { SupportedTransactionType } from './types';
import { isEIP1559CompatibleTransaction } from './utils';

export const GAS_SUGGESTION_BASE_URL: Record<number, string> = {
  [ronin.id]: 'https://wallet-manager.skymavis.com/proxy/public/v1/ronin/gas-suggestion',
  [saigon.id]: 'https://wallet-manager-stg.skymavis.one/proxy/public/v1/ronin-testnet/gas-suggestion',
} as const;

export const GAS_PRICE_BUFFER_PERCENTAGE = 2; // 2%

export const applyBuffer = (value: bigint, percentage: number): bigint => (value * BigInt(100 + percentage)) / 100n;

export interface EstimateFeesPerGasReturnType {
  gasPrice: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
}

export interface EstimateFeesPerGasParams {
  chainId: number;
  type: SupportedTransactionType;
  gasPrice?: Hex;
  maxFeePerGas?: Hex;
  maxPriorityFeePerGas?: Hex;
}

const handleEIP1559Transaction = async (params: EstimateFeesPerGasParams): Promise<EstimateFeesPerGasReturnType> => {
  const { chainId, maxFeePerGas: maxFeePerGasParam, maxPriorityFeePerGas: maxPriorityFeePerGasParam } = params;

  if (maxFeePerGasParam && maxPriorityFeePerGasParam) {
    return {
      gasPrice: '0x0',
      maxFeePerGas: maxFeePerGasParam,
      maxPriorityFeePerGas: maxPriorityFeePerGasParam,
    };
  }

  const gasSuggestion = await httpService.getEIP1559GasSuggestionAPI({ baseUrl: GAS_SUGGESTION_BASE_URL[chainId] });
  const { maxPriorityFeePerGas, maxFeePerGas } = gasSuggestion.medium;

  return {
    gasPrice: '0x0',
    maxPriorityFeePerGas: maxPriorityFeePerGasParam || numberToHex(maxPriorityFeePerGas),
    maxFeePerGas: maxFeePerGasParam || numberToHex(maxFeePerGas),
  };
};

const handleLegacyTransaction = async (client: Client, gasPrice?: Hex): Promise<EstimateFeesPerGasReturnType> => {
  if (gasPrice) {
    return {
      gasPrice,
      maxPriorityFeePerGas: '0x0',
      maxFeePerGas: '0x0',
    };
  }

  const baseGasPrice = await getGasPrice(client);
  const bufferedGasPrice = applyBuffer(baseGasPrice, GAS_PRICE_BUFFER_PERCENTAGE);

  return {
    gasPrice: numberToHex(bufferedGasPrice),
    maxPriorityFeePerGas: '0x0',
    maxFeePerGas: '0x0',
  };
};

export async function estimateFeesPerGas(
  client: Client,
  params: EstimateFeesPerGasParams,
): Promise<EstimateFeesPerGasReturnType> {
  const { type, gasPrice } = params;

  try {
    if (isEIP1559CompatibleTransaction(type)) return await handleEIP1559Transaction(params);
    return await handleLegacyTransaction(client, gasPrice);
  } catch (error) {
    throw new Error('Failed to estimate gas price. This could be due to network issues or RPC problems.');
  }
}
