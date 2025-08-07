import { EventEmitter } from 'eventemitter3';
import { Address } from 'viem';

import { Deferred } from '../utils/defer';

export enum WalletOperationType {
  Connect = 'wallet::connect',
  SignMessage = 'wallet::sign-message',
  SignTransaction = 'wallet::sign-transaction',
}

interface WalletOperationResultMap {
  [WalletOperationType.Connect]: {
    address: Address;
    accessToken: string;
  };
  [WalletOperationType.SignMessage]: void;
  [WalletOperationType.SignTransaction]: void;
}

export enum TaskManagerEvent {
  TaskCreated = 'task:created',
  TaskResolved = 'task:resolved',
  TaskRejected = 'task:rejected',
}

interface TaskManagerEventPayload {
  [TaskManagerEvent.TaskCreated]: {
    taskId: string;
    operationType: WalletOperationType;
    params?: any;
  };
  [TaskManagerEvent.TaskResolved]: {
    taskId: string;
    operationType: WalletOperationType;
    result?: any;
  };
  [TaskManagerEvent.TaskRejected]: {
    taskId: string;
    operationType: WalletOperationType;
    error: Error;
  };
}

class WalletTaskManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletTaskManagerError';
  }
}

export class WalletTaskManager extends EventEmitter<TaskManagerEventPayload> {
  private readonly activeTasks = new Map<string, { deferred: Deferred<any>; operationType: WalletOperationType }>();

  createTask<T extends WalletOperationType, P = any>({
    operationType,
    id,
    params,
  }: {
    operationType: T;
    id?: string;
    params?: P;
  }) {
    const taskId = id ? `${operationType}::${id}` : operationType;
    if (this.activeTasks.has(taskId)) throw new WalletTaskManagerError(`Task already exists: ${taskId}`);

    const deferred = new Deferred<WalletOperationResultMap[T]>();

    this.activeTasks.set(taskId, {
      deferred,
      operationType,
    });

    this.emit(TaskManagerEvent.TaskCreated, {
      taskId,
      operationType,
      params,
    });

    return { taskId, promise: deferred.promise };
  }

  resolveTask<T extends WalletOperationType>(taskId: string, result?: WalletOperationResultMap[T]) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.deferred.resolve(result);
    this.activeTasks.delete(taskId);

    this.emit(TaskManagerEvent.TaskResolved, {
      taskId,
      operationType: task.operationType,
      result,
    });
  }

  rejectTask(taskId: string, error: Error) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.deferred.reject(error);
    this.activeTasks.delete(taskId);

    this.emit(TaskManagerEvent.TaskRejected, {
      taskId,
      operationType: task.operationType,
      error,
    });
  }

  onTaskCreated(listener: (payload: TaskManagerEventPayload[TaskManagerEvent.TaskCreated]) => void) {
    this.on(TaskManagerEvent.TaskCreated, listener);
    return () => this.off(TaskManagerEvent.TaskCreated, listener);
  }

  onTaskResolved(listener: (payload: TaskManagerEventPayload[TaskManagerEvent.TaskResolved]) => void) {
    this.on(TaskManagerEvent.TaskResolved, listener);
    return () => this.off(TaskManagerEvent.TaskResolved, listener);
  }

  onTaskRejected(listener: (payload: TaskManagerEventPayload[TaskManagerEvent.TaskRejected]) => void) {
    this.on(TaskManagerEvent.TaskRejected, listener);
    return () => this.off(TaskManagerEvent.TaskRejected, listener);
  }

  cancelTask(taskId: string, reason = 'Task cancelled'): boolean {
    if (!this.activeTasks.has(taskId)) return false;

    this.rejectTask(taskId, new Error(reason));
    return true;
  }
}

export const walletTaskManager = new WalletTaskManager();
