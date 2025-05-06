import { useEffect } from 'react';
import { useAccount } from 'wagmi';

import { authenticatedRoutes, publicRoutes } from '../types/route';
import { useWidget } from './useWidget';

export const useResetView = () => {
  const { view, reset } = useWidget();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (
      (isConnected && publicRoutes.includes(view.route)) ||
      (!isConnected && authenticatedRoutes.includes(view.route))
    )
      reset();
  }, [isConnected, view.route]);
};
