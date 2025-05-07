export interface WidgetTheme {
  name: string;
  fontFamily: string;
  colors: {
    // button
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonPrimaryActive: string;
    buttonPrimaryForeground: string;
    buttonSecondary: string;
    buttonSecondaryHover: string;
    buttonSecondaryActive: string;
    buttonSecondaryForeground: string;
    buttonDisabled: string;
    buttonDisabledForeground: string;
    spinner: string;
    neutral: string;
    overlay: string;
    background: string;
    foreground: string;
    modalBorder: string;
    scrollbarTrack: string;
    scrollbarThumb: string;
    link: string;
    border: string;
    errorBorder: string;
    error: string;
    listItem: string;
    listItemHover: string;
    listItemActive: string;
  };
  shadow: {
    modal: string;
  };
}
