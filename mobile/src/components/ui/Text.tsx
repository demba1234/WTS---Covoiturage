import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors, typography, TypographyVariant } from '@/theme';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function AppText({ variant = 'body', color = colors.textPrimary, style, ...props }: AppTextProps) {
  const variantStyle = typography[variant] as TextStyle;
  return <RNText style={[variantStyle, { color }, style]} {...props} />;
}
