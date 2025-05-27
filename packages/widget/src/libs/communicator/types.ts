export interface PortDestination {
  target: MessagePort;
}
export interface IframeDestination {
  target: HTMLIFrameElement;
  targetOrigin: string;
}
export interface WindowDestination {
  target: Window;
  targetOrigin: string;
}
export type Destination = PortDestination | IframeDestination | WindowDestination;

export interface CommunicatorOptions {
  timeout?: number;
  logger?: (message: string) => void;
  parseResponse?: (response: any) => any;
}

export interface MessagePayload {
  eventName: string;
  [key: string]: any;
}

export enum MessageMethod {
  Ping = 'ping',
  Connect = 'connect',
  Reconnect = 'reconnect',
  Execute = 'execute',
}

export enum MessageType {
  Request = 'request',
  Accept = 'accept',
  Decline = 'decline',
}

export interface Message<P = any> {
  id: string;
  type: MessageType;
  method: MessageMethod;
  payload?: P;
}

export type MessageWithOptionalId<P = any> = Omit<Message<P>, 'id'> & {
  id?: string;
};

export interface MessageReply {
  accept: (response: any) => void;
  decline: (reason: any) => void;
}

export interface UniversalMessageReply {
  accept: (id: Message['id'], payload: any) => Promise<void>;
  decline: (id: Message['id'], payload: any) => Promise<void>;
}

export type EventHandler<P extends MessagePayload, K extends P['eventName'] | '*'> = K extends '*'
  ? (message: { id: Message<P>['id'] } & P, reply: MessageReply) => void
  : (message: { id: Extract<Message<P>, { key: K }>['id'] } & Extract<P, { key: K }>, reply: MessageReply) => void;
