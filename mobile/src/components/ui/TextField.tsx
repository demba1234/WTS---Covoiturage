import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { AppText } from './Text';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {label}
        </AppText>
      ) : null}
      <TextInput placeholderTextColor={colors.textSecondary} style={[styles.input, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});
