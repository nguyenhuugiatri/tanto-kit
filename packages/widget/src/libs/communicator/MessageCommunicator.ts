import { EventEmitter2 } from 'eventemitter2';

import { Deferred } from '../defer';
import { Disposable } from '../disposable';
import { PING_PONG_INTERVAL_MS } from './constants';
import { CommunicatorError, ErrorCodes } from './errors';
import { generateMessageId, isValidMessage, isWindow } from './helpers';
import type {
  CommunicatorOptions,
  Destination,
  EventHandler,
  Message,
  MessagePayload,
  MessageReply,
  MessageWithOptionalId,
  UniversalMessageReply,
} from './types';
import { MessageMethod, MessageType } from './types';

export abstract class MessageCommunicator<P extends MessagePayload> {
  protected options: CommunicatorOptions;
  protected pendingMessages = new Map<string, Deferred<any>>();
  protected eventEmitter = new EventEmitter2({ wildcard: true });
  protected messagePort?: MessagePort;
  private boundHandleMessage = this.handleMessage.bind(this);
  protected disposable = Disposable.from(() => {
    this.pendingMessages.clear();
    this.messagePort?.close();
    this.messagePort = undefined;
  });

  constructor(options: CommunicatorOptions = {}) {
    this.options = options;
    this.setupMessageListeners();
  }

  private setupMessageListeners(): void {
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('message', this.boundHandleMessage);
      this.disposable.add(() => globalThis.removeEventListener('message', this.boundHandleMessage));
    }
  }

  private isPingMessage(message: Message): boolean {
    return message.method === MessageMethod.Ping && message.type === MessageType.Request;
  }

  protected handleMessage(event: MessageEvent): void {
    const message = event.data;
    if (!isValidMessage(message)) return;
    if (this.isPingMessage(message)) {
      this.handlePingPongExchange(event, message);
      return;
    }
    this.log(`🔷 | Received message: ${JSON.stringify(message)}`);
    this.resolveAndEmitMessage(message);
  }

  private handlePingPongExchange(event: MessageEvent, message: Message<P>): void {
    const pongMessage = {
      id: message.id,
      type: MessageType.Accept,
      method: MessageMethod.Ping,
    };
    if (event.currentTarget instanceof MessagePort) {
      this.messagePort?.postMessage(pongMessage);
      return;
    }
    event.source?.postMessage(pongMessage, { targetOrigin: event.origin });
  }

  protected resolveAndEmitMessage(message: Message<P>): void {
    const { id, type, payload } = message;
    const deferred = this.pendingMessages.get(id);
    if (deferred) {
      switch (type) {
        case MessageType.Accept:
          deferred.resolve(this.options.parseResponse ? this.options.parseResponse(payload) : payload);
          break;
        case MessageType.Decline:
          deferred.reject(payload);
          break;
      }
      this.pendingMessages.delete(id);
      return;
    }
    if (type === MessageType.Request && payload) {
      this.eventEmitter.emit(payload.key, { id: message.id, ...payload }, this.createReplyHandler(message));
    }
  }

  protected createReplyHandler(message: Message<P>): MessageReply {
    if (!this.messagePort) {
      throw new CommunicatorError('Connection not established', ErrorCodes.CONNECTION.PORT_NOT_INITIALIZED);
    }

    const port = this.messagePort;
    return {
      accept: response =>
        this.postMessage(
          {
            ...message,
            type: MessageType.Accept,
            payload: response,
          },
          { destination: { target: port } },
        ),
      decline: reason =>
        this.postMessage(
          {
            ...message,
            type: MessageType.Decline,
            payload: reason,
          },
          { destination: { target: port } },
        ),
    };
  }

  protected async ensureConnection(): Promise<void> {
    if (!this.messagePort) return this.reconnect();
    const isAlive = await this.ping({ target: this.messagePort }, PING_PONG_INTERVAL_MS);
    if (!isAlive) await this.reconnect();
  }

  public async send<R = any>(
    message: P,
    options?: {
      timeout?: number;
    },
  ): Promise<R> {
    await this.ensureConnection();
    return this.postMessage(
      {
        method: MessageMethod.Execute,
        type: MessageType.Request,
        payload: message,
      },
      {
        destination: { target: this.messagePort! },
        timeout: options?.timeout ?? this.options.timeout,
      },
    );
  }

  protected async ping(destination: Destination, timeout?: number): Promise<boolean> {
    try {
      await this.postMessage(
        {
          type: MessageType.Request,
          method: MessageMethod.Ping,
        },
        {
          destination,
          timeout,
        },
      );
      return true;
    } catch (error) {
      this.log(`⚠️ | Ping check failed - connection may be dead: ${error}`);
      return false;
    }
  }

  protected async postMessage<R>(
    message: MessageWithOptionalId,
    options: {
      destination: Destination;
      transfer?: Transferable[];
      timeout?: number;
    },
  ): Promise<R> {
    const { destination, transfer, timeout } = options ?? {};
    const id = message.id ?? generateMessageId();
    const deferred = new Deferred<R>({
      timeout,
      timeoutReason: new CommunicatorError('Send message timed out', ErrorCodes.MESSAGE.SEND_TIMEOUT),
    });
    this.pendingMessages.set(id, deferred);
    const normalizedMessage: Message<P> = { ...message, id };
    if (normalizedMessage.method !== MessageMethod.Ping) {
      this.log(`🔶 | Sending message: ${JSON.stringify(normalizedMessage)}`);
    }
    (() => {
      const { target } = destination;
      const targetOrigin = 'targetOrigin' in destination ? destination.targetOrigin : undefined;
      if (target instanceof MessagePort) {
        target.postMessage(normalizedMessage, transfer || []);
        return;
      }
      if (!targetOrigin) {
        throw new CommunicatorError(
          'targetOrigin is required for Window or Iframe communication',
          ErrorCodes.MESSAGE.MISSING_ORIGIN,
          { destinationType: target.constructor.name },
        );
      }
      if (target instanceof HTMLIFrameElement) {
        target.contentWindow?.postMessage(normalizedMessage, targetOrigin, transfer);
        return;
      }
      if (isWindow(target)) {
        target.postMessage(normalizedMessage, targetOrigin, transfer);
        return;
      }
      throw new CommunicatorError('Invalid destination type provided', ErrorCodes.CONNECTION.INVALID_TARGET, {
        providedType: target ? (target as any).constructor?.name : 'undefined',
        allowedTypes: ['MessagePort', 'Worker', 'Window', 'HTMLIFrameElement'],
      });
    })();
    return deferred.promise;
  }

  public get universalReply(): UniversalMessageReply {
    return {
      accept: async (id: Message['id'], payload: any): Promise<void> => {
        await this.ensureConnection();
        this.postMessage(
          {
            id,
            method: MessageMethod.Execute,
            type: MessageType.Accept,
            payload,
          },
          { destination: { target: this.messagePort! } },
        );
      },
      decline: async (id: Message['id'], payload: any): Promise<void> => {
        await this.ensureConnection();
        this.postMessage(
          {
            id,
            method: MessageMethod.Execute,
            type: MessageType.Decline,
            payload,
          },
          { destination: { target: this.messagePort! } },
        );
      },
    };
  }

  abstract reconnect(): Promise<void>;

  public on<K extends P['eventName'] | '*'>(key: K, handler: EventHandler<P, K>): void {
    this.eventEmitter.on(key, handler);
  }

  public off<K extends P['eventName'] | '*'>(key: K, handler: EventHandler<P, K>): void {
    this.eventEmitter.off(key, handler);
  }

  public removeAllListeners(): void {
    this.eventEmitter.removeAllListeners();
  }

  public cleanup(): void {
    this.removeAllListeners();
    this.disposable.dispose();
  }

  protected log(message: string): void {
    this.options.logger?.(message);
  }
}
