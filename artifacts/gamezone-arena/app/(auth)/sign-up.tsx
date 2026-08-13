import { Feather } from '@expo/vector-icons';
import { useSignUp } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import colors from '@/constants/colors';

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const busy = fetchStatus === 'fetching';
  const verifying = signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address');
  const errorMessage = errors?.fields?.emailAddress?.message || errors?.fields?.password?.message || errors?.fields?.code?.message;

  const submit = async () => {
    const result = await signUp.password({ emailAddress: email.trim(), password, firstName: displayName.trim() });
    if (result.error) return;
    await signUp.verifications.sendEmailCode();
  };

  const verify = async () => {
    await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: ({ decorateUrl }) => router.replace(decorateUrl('/') as Href) });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={colors.light.foreground} /></Pressable>
        <View style={styles.brand}><BrandMark /><Text style={styles.eyebrow}>{verifying ? 'VERIFY PLAYER PROFILE' : 'CREATE YOUR PROFILE'}</Text><Text style={styles.title}>{verifying ? 'One last check.' : 'Claim your handle.'}</Text><Text style={styles.body}>{verifying ? 'We sent a short code to your email. Enter it to secure your player profile.' : 'Start with a profile that tracks your climb across every game in the arena.'}</Text></View>
        <View style={styles.form}>
          {!verifying ? <><Text style={styles.label}>DISPLAY NAME</Text><TextInput testID="sign-up-name" value={displayName} onChangeText={setDisplayName} placeholder="How should we call you?" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /><Text style={styles.label}>EMAIL ADDRESS</Text><TextInput testID="sign-up-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="player@email.com" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /><Text style={styles.label}>PASSWORD</Text><TextInput testID="sign-up-password" value={password} onChangeText={setPassword} secureTextEntry placeholder="8+ characters" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /></> : <><Text style={styles.label}>VERIFICATION CODE</Text><TextInput testID="sign-up-code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="Enter your code" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /></>}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Pressable testID="sign-up-submit" disabled={busy || (verifying ? !code : !displayName || !email || !password)} onPress={verifying ? verify : submit} style={({ pressed }) => [styles.submit, (busy || (verifying ? !code : !displayName || !email || !password)) && styles.disabled, pressed && styles.pressed]}>
            {busy ? <ActivityIndicator color={colors.light.primaryForeground} /> : <><Text style={styles.submitText}>{verifying ? 'Verify and enter' : 'Build my profile'}</Text><Feather name="arrow-right" size={18} color={colors.light.primaryForeground} /></>}
          </Pressable>
          {verifying ? <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={styles.resend}><Text style={styles.resendText}>Send me a new code</Text></Pressable> : <Text style={styles.switchText}>Already have an account? <Link href={'/sign-in' as Href} style={styles.link}>Sign in</Link></Text>}
          <View nativeID="clerk-captcha" />
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
  form: { marginTop: 34, gap: 12 },
  label: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 5 },
  input: { minHeight: 54, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.light.input, borderWidth: 1, borderColor: colors.light.border, color: colors.light.foreground, fontSize: 15 },
  error: { color: colors.light.destructive, fontSize: 12, lineHeight: 18 },
  submit: { minHeight: 56, backgroundColor: colors.light.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginTop: 10 },
  submitText: { color: colors.light.primaryForeground, fontSize: 15, fontWeight: '800' },
  switchText: { color: colors.light.mutedForeground, textAlign: 'center', fontSize: 13, marginTop: 12 },
  link: { color: colors.light.primary, fontWeight: '800' },
  resend: { alignItems: 'center', padding: 10 },
  resendText: { color: colors.light.secondaryForeground, fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
});