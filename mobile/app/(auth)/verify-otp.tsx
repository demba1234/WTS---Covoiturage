import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AppText, Button, ScreenContainer, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: (phone ?? '').replace(/\s/g, ''),
      token: code,
      type: 'sms',
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.replace('/(tabs)/search');
  }

  return (
    <ScreenContainer>
      <AppText variant="h2" color={colors.primary}>
        Code de vérification
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Entrez le code envoyé par SMS au {phone}.
      </AppText>

      <TextField
        label="Code reçu par SMS"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="123456"
        style={{ marginTop: spacing.lg }}
      />

      {error ? (
        <AppText variant="caption" color={colors.error}>
          {error}
        </AppText>
      ) : null}

      <Button label="Valider" onPress={handleVerify} loading={loading} style={{ marginTop: spacing.md }} />
    </ScreenContainer>
  );
}
