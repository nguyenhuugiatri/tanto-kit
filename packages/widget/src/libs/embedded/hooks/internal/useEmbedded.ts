import { useContext } from 'react';

import type { EmbeddedContextValue } from '../../context';
import { EmbeddedContext } from '../../context';

export function useEmbedded(): EmbeddedContextValue {
  const context = useContext(EmbeddedContext);
  if (!context) {
    throw new Error('useEmbedded must be used within an EmbeddedProvider');
  }
  return context;
}
