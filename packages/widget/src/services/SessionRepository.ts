import { jwtDecode } from 'jwt-decode';
import { Address } from 'viem';

interface Storage {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  removeItem(key: string): Promise<void>;
}

export class SessionRepository {
  static ADDRESS_STORAGE_KEY = 'auth.address';
  static ACCESS_TOKEN_STORAGE_KEY = 'auth.access_token';
  static REFRESH_TOKEN_STORAGE_KEY = 'auth.refresh_token';
  static ACCESS_TOKEN_EXP_KEY = 'auth.access_token_expiration';

  static inject = ['storage'] as const;

  constructor(private storage: Storage) {}

  async getAddress(): Promise<Address | null> {
    const address = await this.storage.getItem<Address>(SessionRepository.ADDRESS_STORAGE_KEY);
    return address ?? null;
  }

  async setAddress(value: Address): Promise<void> {
    await this.storage.setItem(SessionRepository.ADDRESS_STORAGE_KEY, value);
  }

  async getAccessToken({ acceptExpired = false }: { acceptExpired?: boolean } = {}): Promise<string | null> {
    if ((await this.isAccessTokenExpired()) && !acceptExpired) return null;
    const accessToken = await this.storage.getItem<string>(SessionRepository.ACCESS_TOKEN_STORAGE_KEY);
    return accessToken ?? null;
  }

  async setAccessToken(value: string): Promise<void> {
    const exp = this.getTokenExp(value);
    await Promise.all([
      this.storage.setItem(SessionRepository.ACCESS_TOKEN_STORAGE_KEY, value),
      this.storage.setItem(SessionRepository.ACCESS_TOKEN_EXP_KEY, exp),
    ]);
  }

  async getRefreshToken(): Promise<string | null> {
    const refreshToken = await this.storage.getItem<string>(SessionRepository.REFRESH_TOKEN_STORAGE_KEY);
    return refreshToken ?? null;
  }

  async setRefreshToken(value: string): Promise<void> {
    await this.storage.setItem(SessionRepository.REFRESH_TOKEN_STORAGE_KEY, value);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.storage.removeItem(SessionRepository.ADDRESS_STORAGE_KEY),
      this.storage.removeItem(SessionRepository.ACCESS_TOKEN_STORAGE_KEY),
      this.storage.removeItem(SessionRepository.REFRESH_TOKEN_STORAGE_KEY),
      this.storage.removeItem(SessionRepository.ACCESS_TOKEN_EXP_KEY),
    ]);
  }

  async isAccessTokenExpired(): Promise<boolean> {
    const exp = await this.storage.getItem<number>(SessionRepository.ACCESS_TOKEN_EXP_KEY);
    if (!exp) return true;
    return exp < Date.now();
  }

  private getTokenExp(token: string): number {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp * 1000;
  }
}
