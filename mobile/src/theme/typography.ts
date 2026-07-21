/**
 * Cormorant Garamond pour les titres, Inter pour le texte courant.
 * Les noms de police doivent correspondre aux clés chargées via useFonts
 * dans app/_layout.tsx (packages @expo-google-fonts/*).
 */
export const fontFamily = {
  headingRegular: 'CormorantGaramond_500Medium',
  heading: 'CormorantGaramond_600SemiBold',
  headingBold: 'CormorantGaramond_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const typography = {
  h1: { fontFamily: fontFamily.headingBold, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 34 },
  h3: { fontFamily: fontFamily.heading, fontSize: 21, lineHeight: 28 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fontFamily.bodySemiBold, fontSize: 16, lineHeight: 20 },
} as const;

export type TypographyVariant = keyof typeof typography;
