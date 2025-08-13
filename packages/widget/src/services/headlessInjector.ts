import { createInjector } from 'typed-inject';

import { tantoStorage } from '../utils/storage';
import { AuthApi } from './api/AuthApi';
import { HttpClient } from './api/HttpClient';
import { WalletApi } from './api/WalletApi';
import { headlessConfig } from './HeadlessConfig';
import { HeadlessProvider } from './HeadlessProvider';
import { SessionRepository } from './SessionRepository';
import { WalletService } from './WalletService';
import { WalletTaskManager } from './WalletTaskManager';

export function createHeadlessInjector() {
  return createInjector()
    .provideValue('headlessConfig', headlessConfig)
    .provideValue('storage', tantoStorage)

    .provideClass('sessionRepository', SessionRepository)
    .provideClass('httpClient', HttpClient)

    .provideClass('authApi', AuthApi)
    .provideClass('walletApi', WalletApi)

    .provideClass('walletTaskManager', WalletTaskManager)
    .provideClass('walletService', WalletService)
    .provideClass('headlessProvider', HeadlessProvider);
}

export const headlessInjector = createHeadlessInjector();
