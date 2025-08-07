import { jwtDecode } from 'jwt-decode';
import { Address } from 'viem';

import { tantoStorage } from '../utils/storage';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface Storage {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  removeItem(key: string): Promise<void>;
}

export class AuthStorage {
  static ADDRESS_STORAGE_KEY = 'auth.address';
  static ACCESS_TOKEN_STORAGE_KEY = 'auth.access_token';
  static REFRESH_TOKEN_STORAGE_KEY = 'auth.refresh_token';
  static ACCESS_TOKEN_EXP_KEY = 'auth.access_token_expiration';

  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async getAddress(): Promise<Address | null> {
    const address = await this.storage.getItem<Address>(AuthStorage.ADDRESS_STORAGE_KEY);
    return address ?? null;
  }

  async setAddress(value: Address): Promise<void> {
    await this.storage.setItem(AuthStorage.ADDRESS_STORAGE_KEY, value);
  }

  async getAccessToken({ acceptExpired = false }: { acceptExpired?: boolean } = {}): Promise<string | null> {
    if ((await this.isAccessTokenExpired()) && !acceptExpired) return null;
    const accessToken = await this.storage.getItem<string>(AuthStorage.ACCESS_TOKEN_STORAGE_KEY);
    return accessToken ?? null;
  }

  async setAccessToken(value: string): Promise<void> {
    const exp = this.getTokenExp(value);
    await Promise.all([
      this.storage.setItem(AuthStorage.ACCESS_TOKEN_STORAGE_KEY, value),
      this.storage.setItem(AuthStorage.ACCESS_TOKEN_EXP_KEY, exp),
    ]);
  }

  async getRefreshToken(): Promise<string | null> {
    const refreshToken = await this.storage.getItem<string>(AuthStorage.REFRESH_TOKEN_STORAGE_KEY);
    return refreshToken ?? null;
  }

  async setRefreshToken(value: string): Promise<void> {
    await this.storage.setItem(AuthStorage.REFRESH_TOKEN_STORAGE_KEY, value);
  }

  async isAccessTokenExpired(): Promise<boolean> {
    const exp = await this.storage.getItem<number>(AuthStorage.ACCESS_TOKEN_EXP_KEY);
    if (!exp) return true;
    return exp < Date.now();
  }

  async setAuth({ accessToken, refreshToken }: AuthTokens): Promise<void> {
    await Promise.all([this.setAccessToken(accessToken), this.setRefreshToken(refreshToken)]);
  }

  async resetAuth(): Promise<void> {
    await Promise.all([
      this.storage.removeItem(AuthStorage.ADDRESS_STORAGE_KEY),
      this.storage.removeItem(AuthStorage.ACCESS_TOKEN_STORAGE_KEY),
      this.storage.removeItem(AuthStorage.REFRESH_TOKEN_STORAGE_KEY),
      this.storage.removeItem(AuthStorage.ACCESS_TOKEN_EXP_KEY),
    ]);
  }

  private getTokenExp(token: string): number {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp * 1000;
  }
}

export const authStorage = new AuthStorage(tantoStorage);
