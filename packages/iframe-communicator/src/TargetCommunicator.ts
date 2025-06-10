import { CommunicatorError, ErrorCodes } from './errors';
import { isValidMessage } from './helpers';
import { MessageCommunicator } from './MessageCommunicator';
import { LocalStorage } from './storage';
import type { CommunicatorOptions, MessagePayload } from './types';
import { MessageMethod, MessageType } from './types';

type StorageKey = 'parent-origin';

export class TargetCommunicator<P extends MessagePayload> extends MessageCommunicator<P> {
  private static instance: TargetCommunicator<MessagePayload> | null = null;
  private storage = new LocalStorage<StorageKey>();

  private constructor(options: CommunicatorOptions = {}) {
    super(options);
  }

  static getInstance<P extends MessagePayload>(options?: CommunicatorOptions): TargetCommunicator<P> {
    return (TargetCommunicator.instance ??= new TargetCommunicator<P>(options));
  }

  async reconnect(): Promise<void> {
    const target = window.parent ?? window.opener;
    if (!target) {
      throw new CommunicatorError(
        'No parent window or opener found for reconnection',
        ErrorCodes.CONNECTION.NO_DESTINATION,
      );
    }
    this.messagePort?.close();
    this.messagePort = undefined;
    const triggerReconnectMessage = {
      type: MessageType.Request,
      method: MessageMethod.Reconnect,
    };
    const parentOrigin = this.storage.get<string>('parent-origin');
    if (!parentOrigin) {
      throw new CommunicatorError('Parent origin not found in storage', ErrorCodes.CONNECTION.PARENT_ORIGIN_NOT_FOUND);
    }
    this.log('⛔ | Connection lost, trigger reconnecting');
    await this.postMessage(triggerReconnectMessage, {
      destination: {
        target: window.parent,
        targetOrigin: parentOrigin,
      },
    });
  }

  protected override handleMessage(event: MessageEvent): void {
    if (!isValidMessage(event.data)) return;
    const { id, method, type } = event.data;
    if (method === MessageMethod.Connect && type === MessageType.Request) {
      const sourceWindow = event.source;
      const isTrustedSource = sourceWindow === window.parent || sourceWindow === window.opener;
      if (isTrustedSource && event.ports[0]) {
        this.messagePort = event.ports[0];
        this.messagePort.onmessage = this.handleMessage.bind(this);
        this.storage.put('parent-origin', event.data.payload.origin);
        const acceptMessage = {
          id,
          type: MessageType.Accept,
          method: MessageMethod.Connect,
        };
        this.postMessage(acceptMessage, {
          destination: {
            target: this.messagePort,
          },
        });
        this.log('✅ | Connected');
      }
    }
    super.handleMessage(event);
  }

  override log(message: string): void {
    this.options.logger?.(`[Target 📨] ${message}`);
  }
}
