export const colors = {
  background: {
    primary: '#0a0a0a',
    card: '#111111',
    elevated: '#1a1a1a',
  },
  border: {
    default: '#222222',
    subtle: '#1a1a1a',
    dashed: '#555555',
    error: '#ff4444',
  },
  brand: {
    primary: '#9CE41C',
  },
  text: {
    primary: '#ffffff',
    secondary: '#888888',
    label: '#999999',
    placeholder: '#666666',
    link: '#666666',
    disabled: '#555555',
    onBrand: '#0a0a0a',
  },
  feedback: {
    error: '#ff4444',
    success: '#9CE41C',
    warning: '#ff9900',
  },
} as const;

export const typography = {
  display: {
    fontSize: 48,
    fontWeight: '900' as const,
    letterSpacing: 8,
  },
  headingXl: {
    fontSize: 40,
    fontWeight: '900' as const,
    letterSpacing: -1,
    lineHeight: 44,
  },
  headingLg: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headingMd: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 2,
  },
  button: {
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 60,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 12,
  lg: 16,
} as const;

export const components = {
  buttonPrimary: {
    backgroundColor: colors.brand.primary,
    color: colors.text.onBrand,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
    letterSpacing: typography.button.letterSpacing,
    paddingVertical: 18,
    borderRadius: borderRadius.none,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: colors.text.link,
    fontSize: typography.button.fontSize,
    borderColor: colors.border.default,
  },
  input: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.default,
    borderColorError: colors.border.error,
    color: colors.text.primary,
    placeholderTextColor: colors.text.placeholder,
    cursorColor: colors.brand.primary,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  card: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.subtle,
    borderRadius: borderRadius.lg,
  },
  tabBar: {
    backgroundColor: colors.background.primary,
    borderColor: colors.border.subtle,
    activeColor: colors.brand.primary,
    inactiveColor: colors.text.disabled,
    fontSize: 14,
  },
  dashedZone: {
    borderColor: colors.border.dashed,
  },
} as const;
