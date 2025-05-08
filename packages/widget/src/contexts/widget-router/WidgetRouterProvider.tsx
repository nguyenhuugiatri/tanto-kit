import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

import { VISIBILITY_TRANSITION_DURATION } from '../../constants';
import { useUnmount } from '../../hooks/useUnmount';
import { authenticatedRoutes, internalRoutes, publicRoutes, Route } from '../../types/route';
import { View, WidgetRouterContext, WidgetRouterState } from './WidgetRouterContext';

const viewConfigs: Record<Route, View> = {
  [Route.WALLETS]: {
    route: Route.WALLETS,
    title: (
      <p
        css={theme => ({
          fontSize: 11,
          fontWeight: 500,
          color: theme.neutralColor,
          transform: 'translateY(6px)',
          textTransform: 'uppercase',
          textAlign: 'center',
        })}
      >
        Powered by Ronin Wallet
      </p>
    ),
  },
  [Route.PROFILE]: {
    route: Route.PROFILE,
    title: <p css={{ textAlign: 'center' }}>Connected</p>,
  },
  [Route.CONNECT_INJECTOR]: {
    route: Route.CONNECT_INJECTOR,
  },
  [Route.CONNECT_WC]: {
    route: Route.CONNECT_WC,
  },
};

export const WidgetRouterProvider = ({ children }: PropsWithChildren) => {
  const { isConnected } = useAccount();

  const getInitialView = useCallback(
    (route?: Route) => {
      if (route) return viewConfigs[route];
      return isConnected ? viewConfigs[Route.PROFILE] : viewConfigs[Route.WALLETS];
    },
    [isConnected],
  );

  const [routerState, setRouterState] = useState(() => {
    const initialView = getInitialView();
    return { view: initialView, history: [initialView] };
  });

  const reset = useCallback(
    (route?: Route) => {
      const initialView = getInitialView(route);
      setRouterState({ view: initialView, history: [initialView] });
    },
    [getInitialView],
  );

  const goTo = useCallback(
    (nextRoute: Route, options: Omit<View, 'route'> = {}) => {
      if (!isConnected && authenticatedRoutes.includes(nextRoute)) return;

      setRouterState(({ view: currentView, history }) => {
        const isSameView = nextRoute === currentView.route;
        const newView: View = {
          route: nextRoute,
          title: options.title ?? currentView.title,
          showBackButton: options.showBackButton ?? (!isSameView && history.length > 0),
          ...options,
        };

        return {
          view: newView,
          history: isSameView ? history : [...history, newView],
        };
      });
    },
    [isConnected],
  );

  const goBack = useCallback(() => {
    setRouterState(prevRouterState => {
      const { history } = prevRouterState;
      if (history.length <= 1) return prevRouterState;

      const newHistory = history.slice(0, -1);
      return {
        view: newHistory[newHistory.length - 1],
        history: newHistory,
      };
    });
  }, []);

  useEffect(() => {
    const { route } = routerState.view;
    const shouldReset =
      (isConnected && publicRoutes.includes(route)) || (!isConnected && authenticatedRoutes.includes(route));

    if (shouldReset) reset();
  }, [isConnected, routerState.view.route, reset]);

  useUnmount(() => {
    if (internalRoutes.includes(routerState.view.route)) setTimeout(reset, VISIBILITY_TRANSITION_DURATION);
  });

  const contextValue = useMemo<WidgetRouterState>(
    () => ({
      view: routerState.view,
      history: routerState.history,
      goTo,
      goBack,
      reset,
    }),
    [routerState, goTo, goBack, reset],
  );

  return <WidgetRouterContext.Provider value={contextValue}>{children}</WidgetRouterContext.Provider>;
};
