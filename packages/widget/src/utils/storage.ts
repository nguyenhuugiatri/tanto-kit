import localforage from 'localforage';

export interface AsyncStorage {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  removeItem(key: string): Promise<void>;
}

export const tantoStorage = localforage.createInstance({
  name: 'TANTO_WIDGET_INDEXED_DB',
});
