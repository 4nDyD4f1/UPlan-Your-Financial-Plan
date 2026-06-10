/**
 * UPlan — useTheme Hook
 * Combines system color scheme + user preference → returns active theme
 */

import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { lightTheme, darkTheme, type ThemeColors } from '../constants/colors';

export function useTheme(): { theme: ThemeColors; isDark: boolean } {
  const systemScheme = useColorScheme();
  const { preference } = useThemeStore();

  const activeScheme = preference === 'system' ? systemScheme ?? 'dark' : preference;
  const isDark = activeScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return { theme, isDark };
}
