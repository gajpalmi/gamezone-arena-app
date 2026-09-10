import { Feather } from '@/components/Feather';
import { useSignIn } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import colors from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [codeSent, setCodeSent] = useState(false);
  const [localError, setLocalError] = useState('');

  const busy = fetchStatus === 'fetching';

  const clerkError =
    errors?.fields?.identifier?.message ||
    errors?.fields?.code?.message ||
    errors?.fields?.password?.message ||
    '';

  const errorMessage = localError || clerkError;

  // ---------------------------------------------------------
  // STEP 1
  // Email -> Send OTP
  // ---------------------------------------------------------
  const sendCode = async () => {
    setLocalError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    try {
      const { error: createError } = await signIn.create({
        identifier: cleanEmail,
      });

      if (createError) {
        setLocalError(
          createError.message ||
            'No account was found for this email address.',
        );
        return;
      }

      const { error: sendCodeError } =
        await signIn.resetPasswordEmailCode.sendCode();

      if (sendCodeError) {
        setLocalError(
          sendCodeError.message ||
            'Unable to send the verification code.',
        );
        return;
      }

      setEmail(cleanEmail);
      setCodeSent(true);
    } catch (error) {
      console.log('Forgot password error:', error);

      setLocalError(
        'Unable to send the verification code. Please try again.',
      );
    }
  };

  // ---------------------------------------------------------
  // STEP 2
  // OTP Verify
  // ---------------------------------------------------------
  const verifyCode = async () => {
    setLocalError('');

    const cleanCode = code.trim();

    if (!cleanCode) {
      setLocalError('Please enter the OTP sent to your email.');
      return;
    }

    try {
      const { error } =
        await signIn.resetPasswordEmailCode.verifyCode({
          code: cleanCode,
        });

      if (error) {
        setLocalError(
          error.message ||
            'Invalid or expired OTP. Please try again.',
        );
        return;
      }
    } catch (error) {
      console.log('Verify OTP error:', error);

      setLocalError(
        'Invalid or expired OTP. Please try again.',
      );
    }
  };

  // ---------------------------------------------------------
  // STEP 3
  // New Password
  // ---------------------------------------------------------
  const submitNewPassword = async () => {
    setLocalError('');

    if (!password) {
      setLocalError('Please enter your new password.');
      return;
    }

    if (password.length < 8) {
      setLocalError(
        'Password must be at least 8 characters.',
      );
      return;
    }

    if (!confirmPassword) {
      setLocalError(
        'Please confirm your new password.',
      );
      return;
    }

    if (confirmPassword.length < 8) {
      setLocalError(
        'Confirm password must be at least 8 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      const { error } =
        await signIn.resetPasswordEmailCode.submitPassword({
          password,
          signOutOfOtherSessions: true,
        });

      if (error) {
        setLocalError(
          error.message ||
            'Could not update your password.',
        );
        return;
      }

      // Clerk should now have a complete sign-in.
      if (signIn.status === 'complete') {
        const { error: finalizeError } =
          await signIn.finalize({
            navigate: async ({
              session,
              decorateUrl,
            }) => {
              if (session?.currentTask) {
                console.log(
                  'Clerk session task:',
                  session.currentTask,
                );
                return;
              }

              const url = decorateUrl('/');

              router.replace(url as Href);
            },
          });

        if (finalizeError) {
          setLocalError(
            finalizeError.message ||
              'Password changed, but sign-in could not be completed.',
          );
          return;
        }
      }
    } catch (error) {
      console.log(
        'Reset password error:',
        error,
      );

      setLocalError(
        'Could not update your password. Please try again.',
      );
    }
  };

  // ---------------------------------------------------------
  // STEP 4
  // 2FA / Unsupported Extra Requirement
  // ---------------------------------------------------------
  if (signIn.status === 'needs_second_factor') {
    return (
      <Screen contentStyle={styles.content}>
        <View style={styles.container}>
          <View style={styles.brand}>
            <BrandMark />
          </View>

          <Text style={styles.eyebrow}>
            PLAYER ACCESS
          </Text>

          <Text style={styles.title}>
            Verification required
          </Text>

          <Text style={styles.body}>
            Your account requires an additional
            verification step. Please complete it
            before continuing.
          </Text>

          <Pressable
            onPress={() =>
              router.replace('/sign-in' as Href)
            }
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              Back to login
            </Text>

            <Feather
              name="arrow-right"
              size={18}
              color={colors.light.primaryForeground}
            />
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ---------------------------------------------------------
  // STEP 3 UI
  // New Password Screen
  // ---------------------------------------------------------
  if (signIn.status === 'needs_new_password') {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <Screen contentStyle={styles.content}>
          <View style={styles.container}>
            <Pressable
              onPress={() => router.back()}
              style={styles.back}
            >
              <Feather
                name="arrow-left"
                size={20}
                color={colors.light.foreground}
              />
            </Pressable>

            <View style={styles.brand}>
              <BrandMark />
            </View>

            <Text style={styles.eyebrow}>
              PASSWORD RESET
            </Text>

            <Text style={styles.title}>
              Create a new password.
            </Text>

            <Text style={styles.body}>
              Your email has been verified. Choose a
              new password with at least 8 characters
              for your Gamezone Arena account.
            </Text>

            <View style={styles.form}>

              {/* NEW PASSWORD */}
              <Text style={styles.label}>
                NEW PASSWORD
              </Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  testID="forgot-password-new-password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setLocalError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={64}
                  placeholder="Enter your new password"
                  placeholderTextColor={
                    colors.light.mutedForeground
                  }
                  style={styles.passwordInput}
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(
                      !showPassword,
                    )
                  }
                  style={styles.showButton}
                >
                  <Feather
                    name={
                      showPassword
                        ? 'eye-off'
                        : 'eye'
                    }
                    size={18}
                    color={colors.light.primary}
                  />

                  <Text style={styles.showText}>
                    {showPassword
                      ? 'HIDE'
                      : 'SHOW'}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.passwordHint}>
                Use 8 or more characters.
              </Text>

              {/* CONFIRM PASSWORD */}
              <Text style={styles.label}>
                CONFIRM PASSWORD
              </Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  testID="forgot-password-confirm-password"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setLocalError('');
                  }}
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={64}
                  placeholder="Confirm your password"
                  placeholderTextColor={
                    colors.light.mutedForeground
                  }
                  style={styles.passwordInput}
                />

                <Pressable
                  onPress={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword,
                    )
                  }
                  style={styles.showButton}
                >
                  <Feather
                    name={
                      showConfirmPassword
                        ? 'eye-off'
                        : 'eye'
                    }
                    size={18}
                    color={colors.light.primary}
                  />

                  <Text style={styles.showText}>
                    {showConfirmPassword
                      ? 'HIDE'
                      : 'SHOW'}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.passwordHint}>
                Re-enter the same password.
              </Text>

              {/* ERROR */}
              {errorMessage ? (
                <Text style={styles.error}>
                  {errorMessage}
                </Text>
              ) : null}

              {/* UPDATE BUTTON */}
              <Pressable
                testID="forgot-password-submit"
                disabled={
                  busy ||
                  !password ||
                  !confirmPassword
                }
                onPress={submitNewPassword}
                style={({ pressed }) => [
                  styles.button,
                  (busy ||
                    !password ||
                    !confirmPassword) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator
                    color={
                      colors.light.primaryForeground
                    }
                  />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Update password
                    </Text>

                    <Feather
                      name="check"
                      size={18}
                      color={
                        colors.light.primaryForeground
                      }
                    />
                  </>
                )}
              </Pressable>
            </View>

            <Text style={styles.securityText}>
              Your password is securely managed by Clerk.
            </Text>
          </View>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  // ---------------------------------------------------------
  // STEP 2 UI
  // OTP Screen
  // ---------------------------------------------------------
  if (codeSent) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <Screen contentStyle={styles.content}>
          <View style={styles.container}>
            <Pressable
              onPress={() => {
                setCodeSent(false);
                setCode('');
                setLocalError('');
              }}
              style={styles.back}
            >
              <Feather
                name="arrow-left"
                size={20}
                color={colors.light.foreground}
              />
            </Pressable>

            <View style={styles.brand}>
              <BrandMark />
            </View>

            <Text style={styles.eyebrow}>
              VERIFY ACCOUNT
            </Text>

            <Text style={styles.title}>
              Check your email.
            </Text>

            <Text style={styles.body}>
              We sent a verification code to:
            </Text>

            <Text style={styles.emailText}>
              {email}
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>
                VERIFICATION CODE
              </Text>

              <TextInput
                testID="forgot-password-code"
                value={code}
                onChangeText={(value) => {
                  setCode(
                    value.replace(
                      /[^0-9]/g,
                      '',
                    ),
                  );
                  setLocalError('');
                }}
                keyboardType="number-pad"
                maxLength={64}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter OTP"
                placeholderTextColor={
                  colors.light.mutedForeground
                }
                style={[
                  styles.input,
                  styles.codeInput,
                ]}
              />

              {errorMessage ? (
                <Text style={styles.error}>
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                testID="forgot-password-verify"
                disabled={
                  busy ||
                  !code.trim()
                }
                onPress={verifyCode}
                style={({ pressed }) => [
                  styles.button,
                  (busy ||
                    !code.trim()) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator
                    color={
                      colors.light.primaryForeground
                    }
                  />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Verify OTP
                    </Text>

                    <Feather
                      name="arrow-right"
                      size={18}
                      color={
                        colors.light.primaryForeground
                      }
                    />
                  </>
                )}
              </Pressable>

              <Pressable
                disabled={busy}
                onPress={sendCode}
                style={styles.resendButton}
              >
                <Feather
                  name="refresh-cw"
                  size={15}
                  color={colors.light.primary}
                />

                <Text style={styles.resendText}>
                  Resend code
                </Text>
              </Pressable>
            </View>
          </View>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  // ---------------------------------------------------------
  // STEP 1 UI
  // Email Screen
  // ---------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <Screen contentStyle={styles.content}>
        <View style={styles.container}>
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={colors.light.foreground}
            />
          </Pressable>

          <View style={styles.brand}>
            <BrandMark />
          </View>

          <Text style={styles.eyebrow}>
            PLAYER ACCESS
          </Text>

          <Text style={styles.title}>
            Forgot your password?
          </Text>

          <Text style={styles.body}>
            Enter the email address connected to your
            Gamezone Arena account and we'll send you
            a verification code.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              EMAIL ADDRESS
            </Text>

            <TextInput
              testID="forgot-password-email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setLocalError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="player@email.com"
              placeholderTextColor={
                colors.light.mutedForeground
              }
              style={styles.input}
            />

            {errorMessage ? (
              <Text style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              testID="forgot-password-send"
              disabled={
                busy ||
                !email.trim()
              }
              onPress={sendCode}
              style={({ pressed }) => [
                styles.button,
                (busy ||
                  !email.trim()) &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  color={
                    colors.light.primaryForeground
                  }
                />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    Send OTP
                  </Text>

                  <Feather
                    name="arrow-right"
                    size={18}
                    color={
                      colors.light.primaryForeground
                    }
                  />
                </>
              )}
            </Pressable>
          </View>

          <Text style={styles.switchText}>
            Remember your password?{' '}

            <Link
              href="/sign-in"
              asChild
            >
              <Text style={styles.link}>
                Back to login
              </Text>
            </Link>
          </Text>

          <Text style={styles.securityText}>
            Password reset codes are sent securely
            to your registered email address.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.light.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  container: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  brand: {
    marginTop: 10,
    marginBottom: 20,
  },

  eyebrow: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
  },

  title: {
    color: colors.light.foreground,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 12,
    lineHeight: 40,
  },

  body: {
    color: colors.light.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 340,
  },

  emailText: {
    color: colors.light.primary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },

  form: {
    marginTop: 30,
    gap: 12,
  },

  label: {
    color: colors.light.mutedForeground,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 7,
  },

  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.light.input,
    borderWidth: 1,
    borderColor: colors.light.border,
    color: colors.light.foreground,
    fontSize: 15,
  },

  passwordContainer: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.light.input,
    borderWidth: 1,
    borderColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 8,
    color: colors.light.foreground,
    fontSize: 15,
  },

  showButton: {
    minHeight: 52,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  showText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  passwordHint: {
    color: colors.light.mutedForeground,
    fontSize: 11,
    marginTop: -5,
  },

  codeInput: {
    letterSpacing: 6,
    fontSize: 20,
    fontWeight: '700',
  },

  error: {
    color: colors.light.destructive,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
  },

  button: {
    minHeight: 56,
    backgroundColor: colors.light.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 18,
  },

  buttonText: {
    color: colors.light.primaryForeground,
    fontSize: 15,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.78,
  },

  resendButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 2,
  },

  resendText: {
    color: colors.light.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  switchText: {
    color: colors.light.mutedForeground,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 22,
  },

  link: {
    color: colors.light.primary,
    fontWeight: '800',
  },

  securityText: {
    color: colors.light.mutedForeground,
    opacity: 0.75,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 20,
  },
});