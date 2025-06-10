import { EmbeddedCommunicator } from '../embedded-communicator';

export function logout<C extends EmbeddedCommunicator>(communicator: C) {
  return communicator.send<void>({
    eventName: 'waypoint:logout',
  });
}
