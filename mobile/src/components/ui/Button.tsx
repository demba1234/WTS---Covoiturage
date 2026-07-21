import { ActivityIndicator, Pressable, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.gold : 'transparent';
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';
  const textColor = variant === 'outline' ? colors.primary : variant === 'secondary' ? colors.textOnGold : colors.textOnPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText variant="button" color={textColor}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}
