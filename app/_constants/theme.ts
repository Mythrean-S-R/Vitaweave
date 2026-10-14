// VitaWeave 2.0 - Design System Tokens

export const Colors = {
  // Primary palette
  primary: '#0891b2',       // Teal
  primaryLight: '#e0f2fe',  // Light teal bg
  primaryDark: '#0e7490',   // Darker teal

  // Secondary
  secondary: '#059669',     // Soft green
  secondaryLight: '#d1fae5',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',

  // Risk levels
  riskHigh: '#dc2626',
  riskHighBg: '#fee2e2',
  riskMedium: '#d97706',
  riskMediumBg: '#fef3c7',
  riskLow: '#059669',
  riskLowBg: '#d1fae5',

  // Neutral
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',

  // Status
  danger: '#e11d48',
  dangerBg: '#fee2e2',
  warning: '#d97706',
  warningBg: '#fef3c7',
  success: '#059669',
  successBg: '#d1fae5',
  info: '#0891b2',
  infoBg: '#e0f2fe',
} as const;

export const Fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

export type RiskLevel = 'High' | 'Medium' | 'Low';

export function getRiskColors(risk: RiskLevel) {
  switch (risk) {
    case 'High':   return { bg: Colors.riskHighBg,   text: Colors.riskHigh };
    case 'Medium': return { bg: Colors.riskMediumBg, text: Colors.riskMedium };
    case 'Low':    return { bg: Colors.riskLowBg,    text: Colors.riskLow };
  }
}

export default function ThemeRoute() {
  return null;
}
