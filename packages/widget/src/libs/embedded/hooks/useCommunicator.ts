import { useEmbedded } from './internal/useEmbedded';

export function useCommunicator() {
  const { ready, communicator } = useEmbedded();

  return {
    ready,
    communicator,
  };
}
