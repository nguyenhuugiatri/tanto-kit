import localforage from 'localforage';
import { Address } from 'viem';

const STORAGE_NAME = 'TANTO_WIDGET_INDEXED_DB';

export enum TantoStorageKey {
  AccessToken = 'accessToken',
  Address = 'address',
}

interface TantoWidgetData {
  [TantoStorageKey.AccessToken]: string;
  [TantoStorageKey.Address]: Address;
}

const storage = localforage.createInstance({
  name: STORAGE_NAME,
});

async function setItem<K extends keyof TantoWidgetData>(key: K, value: TantoWidgetData[K]): Promise<void> {
  await storage.setItem(key, value);
}

async function getItem<K extends keyof TantoWidgetData>(key: K): Promise<TantoWidgetData[K] | null> {
  return await storage.getItem<TantoWidgetData[K]>(key);
}

async function removeItem<K extends keyof TantoWidgetData>(key: K): Promise<void> {
  await storage.removeItem(key);
}

export const tantoStorage = {
  setItem,
  getItem,
  removeItem,
};
