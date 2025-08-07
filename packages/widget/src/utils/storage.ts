import localforage from 'localforage';

export const tantoStorage = localforage.createInstance({
  name: 'TANTO_WIDGET_INDEXED_DB',
});
