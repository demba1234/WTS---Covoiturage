/**
 * Palette de marque WTS Covoiturage.
 * Violet, or et ivoire — sobre, élégant, lumineux. Ne pas ajouter de teintes
 * saturées additionnelles sans validation de la direction artistique.
 */
export const colors = {
  primary: '#792283',
  primaryDark: '#5C1A64',
  primaryLight: '#9A4AA6',
  primarySurface: '#F3E9F4',

  gold: '#C9A84C',
  goldLight: '#E0C98A',
  goldSurface: '#F8F1DE',

  ivory: '#FAF8F5',
  white: '#FFFFFF',

  textPrimary: '#221A24',
  textSecondary: '#6B5F6E',
  textOnPrimary: '#FAF8F5',
  textOnGold: '#221A24',

  border: '#E4DFE6',
  surface: '#FFFFFF',
  background: '#FAF8F5',

  success: '#3A7D5C',
  warning: '#B8860B',
  error: '#B3261E',
} as const;

export type ColorToken = keyof typeof colors;
