// Clean minimal light theme — shared palette/tokens used across all screens.
// White/off-white surfaces, subtle gray borders, one clear accent color,
// neutral and modern. No dark mode.

export const colors = {
  // Backgrounds
  background: '#fafafa',
  surface: '#ffffff',
  surfaceBorder: '#e5e7eb',

  // Text
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Accent — used for buttons, links, active/selected states
  accent: '#2563eb',

  // Feedback
  danger: '#dc2626',

  // Misc
  white: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export default { colors, spacing, radii };
