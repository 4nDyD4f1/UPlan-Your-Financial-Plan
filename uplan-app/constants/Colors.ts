/**
 * UPlan Color Tokens
 * Primary: #FF00D5 (Magenta Pink)
 * Dark: #B30095 | Light: #FF4DE2 | Lighter: #FF99EE
 */

export const UPlanColors = {
  // Primary palette
  primary: '#FF00D5',
  primaryLight: '#FF4DE2',
  primaryDark: '#B30095',
  primaryLighter: '#FF99EE',
  primaryTint: '#FFE8FB',
  primarySubtle: 'rgba(255, 0, 213, 0.1)',
  primaryGlow: 'rgba(255, 0, 213, 0.25)',

  // Accent
  accent: '#00E5FF',
  accentDark: '#00B8CC',
  accentLight: '#33EBFF',
  accentSubtle: 'rgba(0, 229, 255, 0.1)',
  accentGlow: 'rgba(0, 229, 255, 0.2)',

  // Semantic
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.1)',
  danger: '#EF4444',
  dangerSubtle: 'rgba(239, 68, 68, 0.1)',
  info: '#6366F1',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
};

export const lightTheme = {
  background: '#F9F5FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0E6FF',
  card: '#FFFFFF',
  border: '#E8E0F0',
  borderHover: '#D0C0E0',

  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  primary: UPlanColors.primary,
  primaryLight: UPlanColors.primaryLight,
  accent: UPlanColors.accent,

  tabBar: '#FFFFFF',
  tabBarBorder: '#F0E6FF',
  tabBarActive: UPlanColors.primary,
  tabBarInactive: '#9CA3AF',

  input: '#F5F0FA',
  inputBorder: '#E8E0F0',

  statusBar: 'dark' as const,
};

export const darkTheme = {
  background: '#0A0A0B',
  surface: '#161618',
  surfaceAlt: '#1E1E21',
  card: '#161618',
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',

  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  primary: UPlanColors.primary,
  primaryLight: UPlanColors.primaryLight,
  accent: UPlanColors.accent,

  tabBar: '#111113',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  tabBarActive: UPlanColors.primary,
  tabBarInactive: '#6B7280',

  input: '#1A1A1D',
  inputBorder: 'rgba(255, 255, 255, 0.06)',

  statusBar: 'light' as const,
};

export type ThemeColors = typeof lightTheme;
