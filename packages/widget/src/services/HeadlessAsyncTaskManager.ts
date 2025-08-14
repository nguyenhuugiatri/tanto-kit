import { Address, Hex, TypedDataDefinition } from 'viem';

import { AsyncTaskManager } from '../utils/AsyncTaskManager';
import { TransactionParams } from './helpers/types';

export enum HeadlessOperationType {
  Connect = 'wallet:connect',
  SignMessage = 'wallet:sign-message',
  SignTransaction = 'wallet:sign-transaction',
}

interface HeadlessOperationResultMap {
  [HeadlessOperationType.Connect]: { address: Address };
  [HeadlessOperationType.SignMessage]: void;
  [HeadlessOperationType.SignTransaction]: void;
}

interface HeadlessOperationParamsMap {
  [HeadlessOperationType.Connect]: undefined;
  [HeadlessOperationType.SignMessage]:
    | {
        data: Hex;
        address: Address;
      }
    | {
        address: Address;
        typedData: TypedDataDefinition | string;
      };
  [HeadlessOperationType.SignTransaction]: {
    transaction: TransactionParams;
  };
}

export class HeadlessAsyncTaskManager extends AsyncTaskManager<
  HeadlessOperationType,
  HeadlessOperationResultMap,
  HeadlessOperationParamsMap
> {}
