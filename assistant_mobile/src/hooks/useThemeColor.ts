/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#007AFF',
  secondary: '#F0F0F0',
  border: '#E5E5E5',
};

const darkColors = {
  background: '#000000',
  text: '#FFFFFF',
  primary: '#0A84FF',
  secondary: '#1C1C1E',
  border: '#38383A',
};

export function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: 'background' | 'text' | 'border'
): string {
    // RN's ColorSchemeName can also be 'unspecified' (Android) -- treat
    // anything that isn't explicitly 'dark' as the light theme.
    const scheme = useColorScheme();
    const theme: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';
    const colorFromProps = props[theme];

    // Falls back to the palette above when a caller (e.g. ThemedView, whose
    // light/darkColor props are optional overrides) doesn't supply an
    // explicit color -- these constants used to be defined but never
    // actually read, so an omitted color silently came back `undefined`.
    if (colorFromProps) {
        return colorFromProps;
    }
    return theme === 'dark' ? darkColors[colorName] : lightColors[colorName];
}
