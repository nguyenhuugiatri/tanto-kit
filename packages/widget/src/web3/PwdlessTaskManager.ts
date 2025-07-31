import EventEmitter from 'eventemitter3';
import { Address } from 'viem';

import { Deferred } from '../utils/defer';

const DEFAULT_TIMEOUT = 20_000;

export enum PwdlessEventType {
  Connect = 'tanto::connect',
  SignMessage = 'tanto::sign-message',
  SignTransaction = 'tanto::sign-transaction',
}

interface PwdlessResponseMap {
  [PwdlessEventType.Connect]: {
    address: Address;
    accessToken: string;
  };
  [PwdlessEventType.SignMessage]: void;
  [PwdlessEventType.SignTransaction]: void;
}

class TaskManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskManagerError';
  }
}

export class PwdlessTaskManager {
  private readonly eventEmitter = new EventEmitter();
  private readonly tasks = new Map<string, Deferred<any>>();

  createTask<E extends PwdlessEventType, P = any>({
    eventType,
    id,
    params,
  }: {
    eventType: E;
    id?: string;
    params?: P;
  }) {
    const taskId = id ? `${eventType}::${id}` : eventType;
    if (this.tasks.has(taskId)) throw new TaskManagerError(`Task already exists: ${taskId}`);

    const deferred = new Deferred<PwdlessResponseMap[E]>();
    this.tasks.set(taskId, deferred);

    this.eventEmitter.emit(eventType, { eventType, taskId, promise: deferred.promise, params });

    return { taskId, promise: deferred.promise };
  }

  createTaskWithTimeout<E extends PwdlessEventType, P = any>({
    eventType,
    id,
    timeoutMs = DEFAULT_TIMEOUT,
    params,
  }: {
    eventType: E;
    id?: string;
    timeoutMs?: number;
    params?: P;
  }) {
    const task = this.createTask<E, P>({ eventType, id, params });

    const timeout = setTimeout(() => {
      this.rejectTask({ taskId: task.taskId, error: new TaskManagerError(`Task timed out: ${task.taskId}`) });
    }, timeoutMs);

    task.promise.finally(() => clearTimeout(timeout));
    return task;
  }

  resolveTask<E extends PwdlessEventType>({ taskId, data }: { taskId: string; data?: PwdlessResponseMap[E] }) {
    const deferred = this.tasks.get(taskId);
    if (!deferred) throw new TaskManagerError(`No pending task found for: ${taskId}`);
    deferred.resolve(data);
    this.tasks.delete(taskId);
  }

  rejectTask({ taskId, error }: { taskId: string; error: Error }) {
    const deferred = this.tasks.get(taskId);
    if (!deferred) throw new TaskManagerError(`No pending task found for: ${taskId}`);
    deferred.reject(error);
    this.tasks.delete(taskId);
  }

  getTask<E extends PwdlessEventType>({
    eventType,
    id,
  }: {
    eventType: E;
    id?: string;
  }): Deferred<PwdlessResponseMap[E]> {
    const taskId = id ? `${eventType}::${id}` : eventType;
    const deferred = this.tasks.get(taskId);
    if (!deferred) throw new TaskManagerError(`No pending task found for: ${taskId}`);
    return deferred;
  }

  removeTask({ taskId }: { taskId: string }) {
    this.tasks.delete(taskId);
  }

  on<E extends PwdlessEventType, P = any>(
    eventType: E,
    listener: (params: { eventType: E; taskId: string; promise: Deferred<PwdlessResponseMap[E]>; params: P }) => void,
  ) {
    this.eventEmitter.on(eventType, listener);
  }

  off<E extends PwdlessEventType, P = any>(
    eventType: E,
    listener: (params: { eventType: E; taskId: string; promise: Deferred<PwdlessResponseMap[E]>; params: P }) => void,
  ) {
    this.eventEmitter.off(eventType, listener);
  }
}

export const pwdlessTaskManager = new PwdlessTaskManager();
