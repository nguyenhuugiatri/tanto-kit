import { useContext } from 'react';

import { WidgetUIConfigContext } from '../contexts/widget-ui-config/WidgetUIConfigContext';

export function useWidgetUIConfig() {
  const context = useContext(WidgetUIConfigContext);
  if (context === undefined) {
    throw new Error('useWidgetUIConfig must be used within a WidgetUIConfigProvider');
  }
  return context.config ?? {};
}
