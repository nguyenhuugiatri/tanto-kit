import { type HTMLAttributes } from 'react';
import useResizeObserver from 'use-resize-observer';

type SmoothWidth = HTMLAttributes<HTMLDivElement> & {
  offset?: number;
};

export const SmoothWidth = ({ children, offset = 4, ...rest }: SmoothWidth) => {
  const { width, ref } = useResizeObserver({
    box: 'border-box',
    round: n => n + offset,
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'width 0.2s',
        width: width ? `${width}px` : 'auto',
      }}
      {...rest}
    >
      <div style={{ width: 'fit-content', whiteSpace: 'nowrap' }} ref={ref}>
        {children}
      </div>
    </div>
  );
};
