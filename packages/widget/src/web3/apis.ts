import { Address, Hex } from 'viem';

import { request } from '../services/request';
import { HeadlessClientErrorCode } from '../utils/crypto';

export interface ApiRequestParams {
  baseUrl: string;
  accessToken: string;
}

export interface MPCProfileResponse {
  uuid: string;
  address: Address;
  hasSupportPwdless: boolean;
  preferMethod: 'password' | 'passwordless';
}

export const getUserProfileAPI = async ({ baseUrl, accessToken }: ApiRequestParams) => {
  return request<MPCProfileResponse>(`${baseUrl}/get-user-profile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export interface KeygenResponse {
  uuid: string;
}

export const createKeylessWalletAPI = async ({
  baseUrl,
  accessToken,
  socketUrl,
}: ApiRequestParams & { socketUrl: string }) => {
  return request<KeygenResponse>(`${baseUrl}/keygen`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      url: socketUrl,
    },
  });
};

interface SignMessageRequest {
  messageBase64: string;
}

interface SignMessageResponse {
  signature: Hex;
}

export const signMessageAPI = async ({
  baseUrl,
  accessToken,
  messageBase64,
}: ApiRequestParams & SignMessageRequest) => {
  return request<SignMessageResponse>(`${baseUrl}/sign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { messageBase64 },
  });
};

interface TransactionInServerFormat {
  to: Address;
  value: Hex;
  gas: Hex;
  gasPrice: Hex;
  nonce: Hex;
  chainId: Hex;
}

interface SendTransactionRequest {
  tx: TransactionInServerFormat;
  rpcUrl: string;
}

interface SendTransactionResponse {
  txHash: Hex;
}

export const sendTransactionAPI = async ({
  baseUrl,
  accessToken,
  tx,
  rpcUrl,
}: ApiRequestParams & SendTransactionRequest) => {
  return request<SendTransactionResponse>(`${baseUrl}/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { tx, rpcUrl },
  });
};

interface MigrateShardRequest {
  shardCiphertextB64: Hex;
  shardEncryptedKeyB64: Hex;
  shardNonceB64: Hex;
}

interface MigrateShardResponse {
  uuid: string;
}

export const migrateShardAPI = async ({
  baseUrl,
  accessToken,
  shardCiphertextB64,
  shardEncryptedKeyB64,
  shardNonceB64,
}: ApiRequestParams & MigrateShardRequest) => {
  return request<MigrateShardResponse>(`${baseUrl}/migrate-shard`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      shardCiphertextB64,
      shardEncryptedKeyB64,
      shardNonceB64,
    },
  });
};

interface PullShardRequest {
  clientEncryptedKey: Hex;
}

interface PullShardResponse {
  shardCiphertextB64: Hex;
  shardEncryptedKeyB64: Hex;
  shardNonceB64: Hex;
}

export const pullShardAPI = async ({
  baseUrl,
  accessToken,
  clientEncryptedKey,
}: ApiRequestParams & PullShardRequest) => {
  return request<PullShardResponse>(`${baseUrl}/pull-shard`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { clientEncryptedKey },
  });
};

interface PublicKeyResponse {
  publicKey: string;
}

export const getPublicKeyAPI = async ({ baseUrl, accessToken }: ApiRequestParams) => {
  return request<PublicKeyResponse>(`${baseUrl}/get-public-key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

interface AsymmetricKeyResponse {
  publicKey: string;
}

export const generateAsymmetricKeyAPI = async ({ baseUrl, accessToken }: ApiRequestParams) => {
  return request<AsymmetricKeyResponse>(`${baseUrl}/generate-asymmetric-key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {},
  });
};

interface GasPriceLevel {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
}

interface GasSuggestionResponse {
  baseFeePerGas: bigint;
  exactBaseFee: bigint;
  low: GasPriceLevel;
  medium: GasPriceLevel;
  high: GasPriceLevel;
}

export const getEIP1559GasSuggestionAPI = async ({ baseUrl }: { baseUrl: string }): Promise<GasSuggestionResponse> => {
  const route = `${baseUrl}/gas-suggestion`;
  return request<GasSuggestionResponse>(route);
};
