import {
  ALIVE_INTERVAL_MS,
  CHECK_ALIVE_TIMEOUT_MS,
  CONNECT_TIMEOUT,
  CONNECTED_EVENT,
  MAX_PING_PONG_ATTEMPTS,
  PING_PONG_INTERVAL_MS,
} from './constants';
import { CommunicatorError, ErrorCodes } from './errors';
import { isValidMessage, sleep } from './helpers';
import { MessageCommunicator } from './MessageCommunicator';
import type { CommunicatorOptions, Destination, MessagePayload } from './types';
import { MessageMethod, MessageType } from './types';

export class HostCommunicator<P extends MessagePayload> extends MessageCommunicator<P> {
  private static instance: HostCommunicator<MessagePayload> | null = null;
  private isReady = false;
  private isConnected = false;
  private connectedDestination?: Destination;
  private keepAliveTimer?: NodeJS.Timeout;

  private constructor(options: CommunicatorOptions = {}) {
    super(options);
  }

  static getInstance<P extends MessagePayload>(options?: CommunicatorOptions): HostCommunicator<P> {
    return (HostCommunicator.instance ??= new HostCommunicator<P>(options));
  }

  waitForConnected(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }
      const waitForConnectedHandler = () => {
        this.isConnected = true;
        clearTimeout(timeout);
        resolve();
      };
      const timeout = setTimeout(() => {
        this.eventEmitter.off(CONNECTED_EVENT, waitForConnectedHandler);
        reject(new CommunicatorError('HostCommunicator is not connected', ErrorCodes.CONNECTION.CONNECT_TIMEOUT));
      }, CONNECT_TIMEOUT);
      this.disposable.add(() => clearTimeout(timeout));
      this.eventEmitter.once(CONNECTED_EVENT, waitForConnectedHandler);
    });
  }

  private async waitForConnection(destination: Destination): Promise<void> {
    if (this.isReady) return;
    const pingMessage = {
      type: MessageType.Request,
      method: MessageMethod.Ping,
    };
    let attempts = 0;
    while (!this.isReady && attempts < MAX_PING_PONG_ATTEMPTS) {
      this.postMessage(pingMessage, { destination }).then(() => {
        this.log('👍 | Target loaded - ready to connect');
        this.isReady = true;
      });
      await sleep(PING_PONG_INTERVAL_MS);
      attempts++;
    }
    if (!this.isReady) {
      this.cleanup();
      throw new CommunicatorError(
        `Ping attempts exceeded the maximum limit of ${MAX_PING_PONG_ATTEMPTS}`,
        ErrorCodes.CONNECTION.MAX_ATTEMPTS,
        { attempts: MAX_PING_PONG_ATTEMPTS },
      );
    }
  }

  async reconnect(): Promise<void> {
    if (!this.connectedDestination) {
      throw new CommunicatorError('No destination available for reconnection', ErrorCodes.CONNECTION.NO_DESTINATION);
    }
    this.isReady = false;
    this.messagePort?.close();
    this.messagePort = undefined;
    this.log('⛔ | Connection lost, reconnecting');
    await this.connect(this.connectedDestination);
  }

  private keepAlive(): void {
    if (!this.messagePort) {
      throw new CommunicatorError(
        'Cannot start keep-alive: MessagePort not initialized',
        ErrorCodes.CONNECTION.PORT_NOT_INITIALIZED,
      );
    }
    clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = setInterval(async () => {
      const isAlive = await this.ping({ target: this.messagePort! }, CHECK_ALIVE_TIMEOUT_MS);
      if (!isAlive) await this.reconnect();
    }, ALIVE_INTERVAL_MS);
    this.disposable.add(() => clearInterval(this.keepAliveTimer));
  }

  async connect(destination: Destination): Promise<void> {
    const channel = new MessageChannel();
    this.messagePort = channel.port1;
    this.messagePort.onmessage = this.handleMessage.bind(this);
    const connectMessage = {
      type: MessageType.Request,
      method: MessageMethod.Connect,
      payload: {
        origin: window.location.origin,
      },
    };
    await this.waitForConnection(destination);
    await this.postMessage(connectMessage, {
      destination,
      transfer: [channel.port2],
    });
    this.connectedDestination = destination;
    this.eventEmitter.emit(CONNECTED_EVENT);
    this.keepAlive();
    this.log('✅ | Connected');
  }

  protected override handleMessage(event: MessageEvent): void {
    if (!isValidMessage(event.data)) return;
    const { id, method, type } = event.data;
    if (method === MessageMethod.Reconnect && type === MessageType.Request) {
      this.reconnect().then(() => {
        const acceptMessage = {
          id,
          type: MessageType.Accept,
          method: MessageMethod.Reconnect,
        };
        event.source?.postMessage(acceptMessage, { targetOrigin: event.origin });
      });
      return;
    }
    super.handleMessage(event);
  }

  override log(message: string): void {
    this.options.logger?.(`[Host 📭] ${message}`);
  }
}
