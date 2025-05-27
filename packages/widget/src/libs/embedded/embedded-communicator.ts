import type { HostCommunicator } from '../communicator';
import type { EmbeddedMessage } from './embedded-message';

export type EmbeddedCommunicator = HostCommunicator<EmbeddedMessage>;
