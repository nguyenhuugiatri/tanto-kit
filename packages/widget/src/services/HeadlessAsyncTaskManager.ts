import { Address, Hex, TypedDataDefinition } from 'viem';

import { AsyncTaskManager } from '../utils/AsyncTaskManager';
import { TransactionParams } from './helpers/types';

export enum HeadlessOperationType {
  PersonalSign = 'wallet:personal-sign',
  SignTypedDataV4 = 'wallet:sign-typed-data-v4',
  SignTransaction = 'wallet:sign-transaction',
}

export interface HeadlessOperationConfig {
  [HeadlessOperationType.PersonalSign]: {
    params: [data: Hex, address: Address];
    result: void;
  };
  [HeadlessOperationType.SignTypedDataV4]: {
    params: [address: Address, data: TypedDataDefinition | string];
    result: void;
  };
  [HeadlessOperationType.SignTransaction]: {
    params: [transaction: TransactionParams];
    result: void;
  };
}

export type HeadlessOperationParamsMap = {
  [K in keyof HeadlessOperationConfig]: HeadlessOperationConfig[K]['params'];
};

export type HeadlessOperationResultMap = {
  [K in keyof HeadlessOperationConfig]: HeadlessOperationConfig[K]['result'];
};

export class HeadlessAsyncTaskManager extends AsyncTaskManager<
  HeadlessOperationType,
  HeadlessOperationResultMap,
  HeadlessOperationParamsMap
> {}

export type HeadlessTask = {
  [K in HeadlessOperationType]: {
    id: string;
    operationType: K;
    params: HeadlessOperationParamsMap[K];
  };
}[HeadlessOperationType];
