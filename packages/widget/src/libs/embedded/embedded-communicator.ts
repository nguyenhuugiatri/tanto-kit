import type { HostCommunicator } from '@sky-mavis/tanto-iframe-communicator';

import type { EmbeddedMessage } from './embedded-message';

export type EmbeddedCommunicator = HostCommunicator<EmbeddedMessage>;
