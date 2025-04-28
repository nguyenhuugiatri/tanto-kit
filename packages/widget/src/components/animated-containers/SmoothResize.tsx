import { type HTMLAttributes, memo } from 'react';
import useResizeObserver from 'use-resize-observer';

export const SmoothWidth = memo(({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => {
  const { width, ref } = useResizeObserver();
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
});

export const SmoothHeight = memo(({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => {
  const { height, ref } = useResizeObserver();
  return (
    <div
      style={{
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'height 0.2s',
        height: height ? `${height}px` : 'auto',
      }}
      {...rest}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
});
