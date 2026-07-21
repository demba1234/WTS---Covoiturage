import { router } from 'expo-router';
import { useState } from 'react';
import { AppText, Button, ScreenContainer, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

export default function SignInScreen() {
  const [phone, setPhone] = useState('+221 ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    setError(null);
    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: phone.replace(/\s/g, ''),
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
  }

  return (
    <ScreenContainer scroll>
      <AppText variant="h1" color={colors.primary} style={{ marginTop: spacing.xl }}>
        WTS Covoiturage
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Réservez votre place sur les trajets domicile-travail à Dakar.
      </AppText>

      <TextField
        label="Numéro de téléphone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+221 77 000 00 00"
        style={{ marginTop: spacing.xl }}
      />

      {error ? (
        <AppText variant="caption" color={colors.error}>
          {error}
        </AppText>
      ) : null}

      <Button label="Recevoir un code" onPress={handleSendCode} loading={loading} style={{ marginTop: spacing.md }} />

      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
        En continuant, vous acceptez les conditions d'utilisation de WTS Covoiturage.
      </AppText>
    </ScreenContainer>
  );
}
