import { Address } from 'viem';

import { TaskManager } from '../utils/TaskManager';

export enum WalletOperationType {
  Connect = 'wallet:connect',
  SignMessage = 'wallet:sign-message',
  SignTransaction = 'wallet:sign-transaction',
}

interface WalletOperationResultMap {
  [WalletOperationType.Connect]: { address: Address };
  [WalletOperationType.SignMessage]: void;
  [WalletOperationType.SignTransaction]: void;
}

interface WalletOperationParamsMap {
  [WalletOperationType.Connect]: any;
  [WalletOperationType.SignMessage]: any;
  [WalletOperationType.SignTransaction]: any;
}

export class WalletTaskManager extends TaskManager<
  WalletOperationType,
  WalletOperationResultMap,
  WalletOperationParamsMap
> {}
