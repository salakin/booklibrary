// Shared palette/tokens used across all screens: light lavender canvas, dark
// text, brand green (#26A572) with green->teal->blue gradient CTAs, and a
// multi-color light avatar palette. Hind Siliguri throughout (loaded via
// @expo-google-fonts in App.js).

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

  // Master brand color; the hero and list avatars are derived from it.
  brand: '#26A572',

  // Books-screen hero banner and the header bar that merges into it
  // (a lighter shade of `brand`).
  hero: '#40B083',

  // Book/post list avatars: a light tint of a distinct hue (starting from
  // `brand` green), each with a darker letter of the same hue for
  // readability. Cycled by position, ordered so neighbors contrast.
  avatarPalette: [
    { bg: '#DFF3EA', fg: '#1E8C5F' }, // green
    { bg: '#E0ECFB', fg: '#2563B8' }, // blue
    { bg: '#FDF0DC', fg: '#B86E12' }, // amber
    { bg: '#EEE6FB', fg: '#6D3FC4' }, // purple
    { bg: '#FCE4EC', fg: '#C2185B' }, // rose
    { bg: '#DDF1F2', fg: '#1A7F86' }, // teal
  ],

  // Gradient stops for buttons, logo/avatar hex badges, header underline bars.
  gradientPrimary: ['#26A572', '#1AA89B', '#2F80ED'], // brand green -> teal -> blue
  gradientUnderline: ['#26A572', '#1AA89B', '#2F80ED'], // matches gradientPrimary

  // Shadows (used as shadowColor with low opacity, see components)
  shadowPurple: 'rgba(124, 58, 237, 0.10)',
  shadowBrand: 'rgba(38, 165, 114, 0.32)',

  // Feedback
  danger: '#dc2626',

  // Misc
  white: '#FFFFFF',
};

// Hind Siliguri covers both Bengali and Latin, so Bengali content and
// English UI text render in one consistent, readable face.
export const fonts = {
  heading: 'HindSiliguri_700Bold',
  headingBold: 'HindSiliguri_700Bold',
  body: 'HindSiliguri_600SemiBold',
  bodyMedium: 'HindSiliguri_500Medium',
  bodyRegular: 'HindSiliguri_400Regular',
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
