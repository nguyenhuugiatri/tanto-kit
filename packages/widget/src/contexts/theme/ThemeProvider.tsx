import { css, Global, ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { type PropsWithChildren, useMemo } from 'react';

import { tantoDarkTheme, tantoLightTheme } from '../../styles/theme';
import type { WidgetTheme } from '../../types/theme';

export interface ThemeProviderProps {
  theme?: WidgetTheme['name'];
  customThemeToken?: DeepPartial<WidgetTheme>;
}

export function ThemeProvider(props: PropsWithChildren<ThemeProviderProps>) {
  const { children, theme: themeName = 'dark', customThemeToken } = props;
  const theme = useMemo(() => {
    const baseTheme = themeName === 'dark' ? tantoDarkTheme : tantoLightTheme;
    const theme = Object.assign({}, baseTheme, customThemeToken);

    if (customThemeToken && Object.hasOwn(customThemeToken, 'colors')) {
      Object.assign(theme.colors, customThemeToken.colors);
    }

    return theme;
  }, [themeName, customThemeToken]);

  return (
    <EmotionThemeProvider theme={theme}>
      <DefaultFontLoader />
      {children}
    </EmotionThemeProvider>
  );
}

function DefaultFontLoader() {
  return (
    <Global
      styles={css`
        @font-face {
          font-family: 'Work Sans';
          font-style: normal;
          font-weight: 100 900;
          font-display: swap;
          src: url('https://fonts.gstatic.com/s/worksans/v19/QGYsz_wNahGAdqQ43Rh_fKDptfpA4Q.woff2') format('woff2');
        }
      `}
    />
  );
}
