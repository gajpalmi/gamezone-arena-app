import { Feather } from '@expo/vector-icons';
import { useSignIn } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import colors from '@/constants/colors';

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const busy = fetchStatus === 'fetching';
  const errorMessage = errors?.fields?.identifier?.message || errors?.fields?.password?.message;

  const submit = async () => {
    const result = await signIn.password({ emailAddress: email.trim(), password });
    if (result.error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: ({ decorateUrl }) => router.replace(decorateUrl('/') as Href) });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={colors.light.foreground} /></Pressable>
        <View style={styles.brand}><BrandMark /><Text style={styles.eyebrow}>PLAYER ACCESS</Text><Text style={styles.title}>Welcome back.</Text><Text style={styles.body}>Your stats, streaks, and next high score are right where you left them.</Text></View>
        <View style={styles.form}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput testID="sign-in-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="player@email.com" placeholderTextColor={colors.light.mutedForeground} style={styles.input} />
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput testID="sign-in-password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" placeholderTextColor={colors.light.mutedForeground} style={styles.input} />
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Pressable testID="sign-in-submit" disabled={busy || !email || !password} onPress={submit} style={({ pressed }) => [styles.submit, (busy || !email || !password) && styles.disabled, pressed && styles.pressed]}>
            {busy ? <ActivityIndicator color={colors.light.primaryForeground} /> : <><Text style={styles.submitText}>Enter the arena</Text><Feather name="arrow-right" size={18} color={colors.light.primaryForeground} /></>}
          </Pressable>
          <Text style={styles.switchText}>New to Gamezone? <Link href={'/sign-up' as Href} style={styles.link}>Create an account</Link></Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  content: { flexGrow: 1, paddingTop: 20 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  brand: { marginTop: 44 },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 36 },
  title: { color: colors.light.foreground, fontSize: 36, fontWeight: '800', marginTop: 12 },
  body: { color: colors.light.mutedForeground, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 320 },
  form: { marginTop: 38, gap: 12 },
  label: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 7 },
  input: { minHeight: 54, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.light.input, borderWidth: 1, borderColor: colors.light.border, color: colors.light.foreground, fontSize: 15 },
  error: { color: colors.light.destructive, fontSize: 12, lineHeight: 18 },
  submit: { minHeight: 56, backgroundColor: colors.light.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginTop: 10 },
  submitText: { color: colors.light.primaryForeground, fontSize: 15, fontWeight: '800' },
  switchText: { color: colors.light.mutedForeground, textAlign: 'center', fontSize: 13, marginTop: 14 },
  link: { color: colors.light.primary, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
});