import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import { type $Fetch, type FetchContext, ofetch } from 'ofetch';
import { Address, Hex } from 'viem';

import { MPC_BASE_URL, MPC_SOCKET_URL, WAYPOINT_BASE_URL } from '../constants';
import { authStorage } from './AuthStorage';

export const HTTP_STATUS_UNAUTHORIZED = 401;

declare module 'ofetch' {
  interface FetchOptions {
    shouldRefreshToken?: boolean;
    shouldTransformRequest?: boolean;
    shouldTransformResponse?: boolean;
  }
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

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

export interface GenerateNonceResponse {
  expirationTime: string;
  issuedAt: string;
  nonce: string;
  notBefore: string;
}

export interface CreateAccountResponse {
  address: string;
  idToken: string;
  userID: string;
}

export interface GasPriceLevel {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
}

export interface GasSuggestionResponse {
  baseFeePerGas: bigint;
  exactBaseFee: bigint;
  low: GasPriceLevel;
  medium: GasPriceLevel;
  high: GasPriceLevel;
}

export default class HttpService {
  private $fetch!: $Fetch;
  private waypointBaseUrl: string = WAYPOINT_BASE_URL;
  private mpcBaseUrl: string = MPC_BASE_URL;
  private mpcSocketUrl: string = MPC_SOCKET_URL;
  private clientId: string = '';
  private storage = authStorage;
  private refreshTokensPromise: Promise<RefreshTokenResponse> | null = null;

  constructor() {
    this.setup();
  }

  private setup() {
    this.$fetch = ofetch.create({
      onRequest: this.onRequest.bind(this),
      onResponse: this.onResponse.bind(this),
    });
  }

  setWaypointBaseUrl(baseUrl: string) {
    this.waypointBaseUrl = baseUrl;
  }

  setKeylessBaseUrl(baseUrl: string) {
    this.mpcBaseUrl = baseUrl;
  }

  setClientId(clientId: string) {
    this.clientId = clientId;
  }

  setKeygenSocketUrl(socketUrl: string) {
    this.mpcSocketUrl = socketUrl;
  }

  async call<T>({
    method = 'GET',
    baseUrl = this.waypointBaseUrl,
    path = '',
    data,
    ...extras
  }: {
    method?: string;
    baseUrl?: string;
    path?: string;
    data?: Record<string, any>;
  } & Record<string, any>): Promise<T> {
    const res: T = await this.$fetch(path, {
      method,
      baseURL: baseUrl,
      ...{ [method.toLowerCase() === 'get' ? 'query' : 'body']: data },
      ...extras,
    });
    return res;
  }

  private async onRequest({ options }: FetchContext) {
    const { body, query, params, shouldTransformRequest = true, shouldTransformResponse = true } = options;

    if ((query !== undefined || params !== undefined) && shouldTransformRequest)
      options.query = decamelizeKeys(query ?? params ?? {}, { deep: true });

    if (
      body &&
      typeof body === 'object' &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof FormData) &&
      shouldTransformRequest
    )
      options.body = decamelizeKeys(body, { deep: true }) as any;

    if (shouldTransformResponse)
      options.parseResponse = (responseText: string) => camelcaseKeys(JSON.parse(responseText), { deep: true });

    options.retry = false;

    const accessToken = await this.storage.getAccessToken();
    if (accessToken) options.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  private async onResponse(context: FetchContext) {
    const { response, options, request } = context;

    const isUnauthorized = response?.status === HTTP_STATUS_UNAUTHORIZED;

    if (!isUnauthorized) return;

    const { accessToken: newAccessToken } = await this.refreshTokens();

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${newAccessToken}`);

    await this.$fetch(request, {
      ...options,
      headers,
      shouldRefreshToken: false,
      onResponse(ctx) {
        Object.assign(context, ctx);
      },
    });
  }

  private async refreshTokens() {
    if (this.refreshTokensPromise) return this.refreshTokensPromise;

    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.storage.getAccessToken({ acceptExpired: true }),
        this.storage.getRefreshToken(),
      ]);

      if (!accessToken && !refreshToken) throw new Error('No access token or refresh token found');

      this.refreshTokensPromise = this.call<RefreshTokenResponse>({
        baseUrl: this.waypointBaseUrl,
        method: 'POST',
        path: '/auth/refresh-token',
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { refreshToken },
        shouldTransformRequest: false,
      });

      const tokens = await this.refreshTokensPromise;

      await this.storage.setAuth({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      return tokens;
    } catch (error) {
      await this.storage.resetAuth();
      throw error;
    } finally {
      this.refreshTokensPromise = null;
    }
  }

  async getEIP1559GasSuggestionAPI({ baseUrl }: { baseUrl: string }) {
    return this.call<GasSuggestionResponse>({
      baseUrl,
      path: '/gas-suggestion',
    });
  }

  async generateNonceAPI({ address }: { address: Address }) {
    return this.call<GenerateNonceResponse>({
      baseUrl: this.waypointBaseUrl,
      method: 'POST',
      path: '/siwe/init',
      headers: { 'sm-client-id': this.clientId },
      data: { address },
    });
  }

  async authenticateWithSiweAPI({ message, signature }: { message: string; signature: string }) {
    return this.call<CreateAccountResponse>({
      baseUrl: this.waypointBaseUrl,
      method: 'POST',
      path: '/siwe/authenticate',
      headers: { 'sm-client-id': this.clientId },
      data: { message, signature },
    });
  }

  async initOTPPasswordlessAPI({ email }: { email: string }) {
    return this.call<{ emailSent: boolean }>({
      baseUrl: this.waypointBaseUrl,
      method: 'POST',
      path: '/passwordless/init',
      headers: { 'sm-client-id': this.clientId },
      body: { email },
    });
  }

  async authenticateWithOtpAPI({ email, otp }: { email: string; otp: string }) {
    const authData = await this.call<{ accessToken: string; refreshToken: string }>({
      baseUrl: this.waypointBaseUrl,
      method: 'POST',
      path: '/passwordless/authenticate',
      headers: { 'sm-client-id': this.clientId },
      data: { email, otp },
    });
    await this.storage.setAuth(authData);
    return authData;
  }

  async getUserProfileAPI() {
    return this.call<UserProfileResponse>({
      baseUrl: this.mpcBaseUrl,
      method: 'POST',
      path: '/get-user-profile',
    });
  }

  async createKeylessWalletAPI() {
    return this.call<{ uuid: string }>({
      baseUrl: this.mpcBaseUrl,
      method: 'POST',
      path: '/keygen',
      data: { url: this.mpcSocketUrl },
    });
  }

  async signMessageAPI({ messageBase64 }: { messageBase64: string }) {
    return this.call<{ signature: Hex }>({
      baseUrl: this.mpcBaseUrl,
      method: 'POST',
      path: '/sign',
      data: { messageBase64 },
    });
  }

  async sendTransactionAPI({ tx, rpcUrl }: SendTransactionRequest) {
    return this.call<SendTransactionResponse>({
      baseUrl: this.mpcBaseUrl,
      method: 'POST',
      path: '/send',
      data: { tx, rpcUrl },
    });
  }
}

export const httpService = new HttpService();
