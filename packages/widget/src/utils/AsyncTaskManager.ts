import { v4 as uuidv4 } from 'uuid';

import { Deferred } from './defer';

export class AsyncTaskManager<T = any> {
  private readonly pendingTasks: Map<string, Deferred<T>> = new Map();

  public createTask(): { taskId: string; promise: Promise<T> } {
    const taskId = uuidv4();
    const deferred = new Deferred<T>();

    this.pendingTasks.set(taskId, deferred);

    return {
      taskId,
      promise: deferred.promise,
    };
  }

  public resolveTask(taskId: string, result: T): boolean {
    const task = this.pendingTasks.get(taskId);
    if (!task) return false;

    this.pendingTasks.delete(taskId);
    task.resolve(result);
    return true;
  }

  public rejectTask(taskId: string, error: any): boolean {
    const task = this.pendingTasks.get(taskId);
    if (!task) return false;

    this.pendingTasks.delete(taskId);
    task.reject(error);
    return true;
  }
}
