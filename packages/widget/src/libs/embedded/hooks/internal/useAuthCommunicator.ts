import { EmbeddedError, ErrorCodes } from '../../errors';
import { useCommunicator } from '../useCommunicator';
import { useEmbeddedSession } from '../useEmbeddedSession';

export function useAuthCommunicator() {
  const { communicator } = useCommunicator();
  const { authenticated } = useEmbeddedSession();

  const proxyCommunicator = new Proxy(communicator, {
    get(target, prop: keyof typeof communicator) {
      if (prop === 'send') {
        return function (...args: Parameters<typeof target.send>) {
          if (!authenticated) {
            throw new EmbeddedError('Unauthroized sender', ErrorCodes.UNAUTHORIZED);
          }
          return target[prop](...args);
        };
      }
      return target[prop];
    },
  });

  return { communicator: proxyCommunicator };
}
