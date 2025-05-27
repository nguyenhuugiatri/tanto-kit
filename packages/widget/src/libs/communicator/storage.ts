const DEFAULT_PREFIX = 'tanto.EMBEDDED.';

class LocalStorage<K extends string> {
  private prefix: string;

  constructor(prefix = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  private constructKey(key: K): string {
    return `${this.prefix}:${key}`;
  }

  get<T>(key: K): T | undefined {
    const value = localStorage.getItem(this.constructKey(key));
    return value === null ? undefined : (JSON.parse(value) as T);
  }

  put<T>(key: K, value: T | undefined): void {
    if (value !== undefined) {
      localStorage.setItem(this.constructKey(key), JSON.stringify(value));
    } else {
      this.del(key);
    }
  }

  del(key: K): void {
    localStorage.removeItem(this.constructKey(key));
  }

  getKeys(): string[] {
    return Object.entries(localStorage).map(([key]) => key);
  }
}

export { LocalStorage };
