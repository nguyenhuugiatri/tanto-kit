import { EventEmitter } from 'eventemitter3';

import { Deferred } from './Defer';

export enum AsyncTaskManagerEvent {
  TaskCreated = 'task:created',
  TaskResolved = 'task:resolved',
  TaskRejected = 'task:rejected',
}

interface AsyncTaskEventMap<
  OperationType extends string,
  OperationResultMap extends Record<OperationType, any>,
  OperationParamsMap extends Record<OperationType, any>,
> {
  [AsyncTaskManagerEvent.TaskCreated]: {
    taskId: string;
    operationType: OperationType;
    params?: OperationParamsMap[OperationType];
  };
  [AsyncTaskManagerEvent.TaskResolved]: {
    taskId: string;
    operationType: OperationType;
    result?: OperationResultMap[OperationType];
  };
  [AsyncTaskManagerEvent.TaskRejected]: {
    taskId: string;
    operationType: OperationType;
    error: Error;
  };
}

export class TaskManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskManagerError';
  }
}

export class AsyncTaskManager<
  OperationType extends string,
  OperationResultMap extends Record<OperationType, any>,
  OperationParamsMap extends Record<OperationType, any>,
> extends EventEmitter<AsyncTaskEventMap<OperationType, OperationResultMap, OperationParamsMap>> {
  private readonly activeTasks = new Map<
    string,
    {
      deferred: Deferred<any>;
      operationType: OperationType;
    }
  >();

  createTask<T extends OperationType>(opts: { operationType: T; id?: string; params?: OperationParamsMap[T] }) {
    const taskId = opts.id ? `${opts.operationType}:${opts.id}` : opts.operationType;
    if (this.activeTasks.has(taskId)) throw new TaskManagerError(`Task already exists: ${taskId}`);

    const deferred = new Deferred<OperationResultMap[T]>();

    this.activeTasks.set(taskId, {
      deferred,
      operationType: opts.operationType,
    });

    this.emit(AsyncTaskManagerEvent.TaskCreated, {
      taskId,
      operationType: opts.operationType,
      params: opts.params,
    });

    return { taskId, promise: deferred.promise };
  }

  resolveTask<T extends OperationType>(taskId: string, result?: OperationResultMap[T]) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.deferred.resolve(result);
    this.activeTasks.delete(taskId);

    this.emit(AsyncTaskManagerEvent.TaskResolved, {
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

    this.emit(AsyncTaskManagerEvent.TaskRejected, {
      taskId,
      operationType: task.operationType,
      error,
    });
  }

  onTaskCreated(
    listener: (
      payload: AsyncTaskEventMap<
        OperationType,
        OperationResultMap,
        OperationParamsMap
      >[AsyncTaskManagerEvent.TaskCreated],
    ) => void,
  ) {
    this.on(AsyncTaskManagerEvent.TaskCreated, listener);
    return () => this.off(AsyncTaskManagerEvent.TaskCreated, listener);
  }

  onTaskResolved(
    listener: (
      payload: AsyncTaskEventMap<
        OperationType,
        OperationResultMap,
        OperationParamsMap
      >[AsyncTaskManagerEvent.TaskResolved],
    ) => void,
  ) {
    this.on(AsyncTaskManagerEvent.TaskResolved, listener);
    return () => this.off(AsyncTaskManagerEvent.TaskResolved, listener);
  }

  onTaskRejected(
    listener: (
      payload: AsyncTaskEventMap<
        OperationType,
        OperationResultMap,
        OperationParamsMap
      >[AsyncTaskManagerEvent.TaskRejected],
    ) => void,
  ) {
    this.on(AsyncTaskManagerEvent.TaskRejected, listener);
    return () => this.off(AsyncTaskManagerEvent.TaskRejected, listener);
  }

  cancelTask(taskId: string, reason: Error = new Error('Task cancelled')): boolean {
    if (!this.activeTasks.has(taskId)) return false;
    this.rejectTask(taskId, reason);
    return true;
  }
}
