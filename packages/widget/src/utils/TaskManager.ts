import { EventEmitter } from 'eventemitter3';

import { Deferred } from './Defer';

export enum TaskManagerEvent {
  TaskCreated = 'task:created',
  TaskResolved = 'task:resolved',
  TaskRejected = 'task:rejected',
}

interface TaskManagerEventPayload<
  TOperationType extends string,
  TResultMap extends Record<TOperationType, any>,
  TParamsMap extends Record<TOperationType, any>,
> {
  [TaskManagerEvent.TaskCreated]: {
    taskId: string;
    operationType: TOperationType;
    params?: TParamsMap[TOperationType];
  };
  [TaskManagerEvent.TaskResolved]: {
    taskId: string;
    operationType: TOperationType;
    result?: TResultMap[TOperationType];
  };
  [TaskManagerEvent.TaskRejected]: {
    taskId: string;
    operationType: TOperationType;
    error: Error;
  };
}

export class TaskManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskManagerError';
  }
}

export class TaskManager<
  TOperationType extends string,
  TResultMap extends Record<TOperationType, any>,
  TParamsMap extends Record<TOperationType, any>,
> extends EventEmitter<TaskManagerEventPayload<TOperationType, TResultMap, TParamsMap>> {
  private readonly activeTasks = new Map<
    string,
    {
      deferred: Deferred<any>;
      operationType: TOperationType;
    }
  >();

  createTask<T extends TOperationType>(opts: { operationType: T; id?: string; params?: TParamsMap[T] }) {
    const taskId = opts.id ? `${opts.operationType}:${opts.id}` : opts.operationType;
    if (this.activeTasks.has(taskId)) throw new TaskManagerError(`Task already exists: ${taskId}`);

    const deferred = new Deferred<TResultMap[T]>();

    this.activeTasks.set(taskId, {
      deferred,
      operationType: opts.operationType,
    });

    this.emit(TaskManagerEvent.TaskCreated, {
      taskId,
      operationType: opts.operationType,
      params: opts.params,
    });

    return { taskId, promise: deferred.promise };
  }

  resolveTask<T extends TOperationType>(taskId: string, result?: TResultMap[T]) {
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

  onTaskCreated(
    listener: (
      payload: TaskManagerEventPayload<TOperationType, TResultMap, TParamsMap>[TaskManagerEvent.TaskCreated],
    ) => void,
  ) {
    this.on(TaskManagerEvent.TaskCreated, listener);
    return () => this.off(TaskManagerEvent.TaskCreated, listener);
  }

  onTaskResolved(
    listener: (
      payload: TaskManagerEventPayload<TOperationType, TResultMap, TParamsMap>[TaskManagerEvent.TaskResolved],
    ) => void,
  ) {
    this.on(TaskManagerEvent.TaskResolved, listener);
    return () => this.off(TaskManagerEvent.TaskResolved, listener);
  }

  onTaskRejected(
    listener: (
      payload: TaskManagerEventPayload<TOperationType, TResultMap, TParamsMap>[TaskManagerEvent.TaskRejected],
    ) => void,
  ) {
    this.on(TaskManagerEvent.TaskRejected, listener);
    return () => this.off(TaskManagerEvent.TaskRejected, listener);
  }

  cancelTask(taskId: string, reason = 'Task cancelled'): boolean {
    if (!this.activeTasks.has(taskId)) return false;
    this.rejectTask(taskId, new Error(reason));
    return true;
  }
}
