import type { HTMLAttributes } from 'react';
import useResizeObserver from 'use-resize-observer';

import { hasValue } from '../../utils/common';

export function SmoothWidth({ children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { width, ref } = useResizeObserver();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box',
        transition: 'width 150ms',
        overflow: 'hidden',
        width: hasValue(width) ? `${width}px` : 'auto',
      }}
      {...rest}
    >
      <div css={{ width: 'fit-content' }} ref={ref}>
        {children}
      </div>
    </div>
  );
}
