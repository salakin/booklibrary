// Neon Arcade - Light theme — shared palette/tokens used across all screens.
// Light lavender canvas, dark purple-black text, magenta/purple/cyan accents,
// gradient CTAs, and hexagon avatar badges. Orbitron for headings, Rajdhani
// for body text (loaded via @expo-google-fonts in App.js).

export const colors = {
  // Backgrounds
  background: '#F7F4FC',
  surface: '#FFFFFF',
  surfaceAlt: '#FDFBFF',
  surfaceBorder: '#EBDCF5',

  // Text
  textPrimary: '#1A1330',
  textSecondary: '#6B6285',
  textMuted: '#6B6285',

  // Accents
  magenta: '#FF2E9A',
  purple: '#7C3AED',
  cyan: '#00B8D9',

  // Primary "accent" kept for anything that still needs a single flat color
  // (spinners, tint colors, nav active state) — magenta/purple midpoint.
  accent: '#7C3AED',

  // Gradient stops for buttons, logo/avatar hex badges, header underline bars.
  gradientPrimary: ['#FF2E9A', '#7C3AED'],
  gradientUnderline: ['#FF2E9A', '#00B8D9'],

  // Shadows (used as shadowColor with low opacity, see components)
  shadowPurple: 'rgba(124, 58, 237, 0.10)',
  shadowMagenta: 'rgba(255, 46, 154, 0.32)',

  // Feedback
  danger: '#dc2626',

  // Misc
  white: '#FFFFFF',
};

export const fonts = {
  heading: 'Orbitron_800ExtraBold',
  headingBold: 'Orbitron_700Bold',
  body: 'Rajdhani_600SemiBold',
  bodyMedium: 'Rajdhani_500Medium',
  bodyRegular: 'Rajdhani_500Medium',
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

export default { colors, fonts, spacing, radii };
