import type { Theme } from '@emotion/react';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { usePreloadTantoImages } from '../../hooks/usePreloadImages';
import { ThemeProvider } from '../theme/ThemeProvider';

export interface TantoProviderProps {
  theme?: Theme;
  children: ReactNode;
}

export function TantoProvider({ theme, children }: TantoProviderProps) {
  usePreloadTantoImages();

  return (
    <ThemeProvider theme={theme}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </ThemeProvider>
  );
}
