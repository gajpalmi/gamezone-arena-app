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

import { Feather } from '@/components/Feather';
import { useSignIn } from '@clerk/expo';
import {
  Href,
  Link,
  useRouter,
} from 'expo-router';

export default function SignInScreen() {
  const router = useRouter();

  const {
    signIn,
    errors,
    fetchStatus,
  } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);
  const [localError, setLocalError] =
    useState('');

  const busy =
    fetchStatus === 'fetching';

  const clerkError =
    errors?.fields?.identifier?.message ||
    errors?.fields?.password?.message ||
    '';

  const errorMessage =
    localError || clerkError;

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    !busy;

  async function submit() {
    if (!email.trim()) {
      setLocalError(
        'Please enter your email address.',
      );
      return;
    }

    if (password.length < 8) {
      setLocalError(
        'Password must be at least 8 characters.',
      );
      return;
    }

    if (busy) {
      return;
    }

    setLocalError('');

    try {
      const { error } =
        await signIn.password({
          emailAddress:
            email.trim().toLowerCase(),
          password,
        });

      if (error) {
        setLocalError(
          error.message ||
            'Incorrect email or password.',
        );
        return;
      }

      if (
        signIn.status ===
        'complete'
      ) {
        const {
          error: finalizeError,
        } = await signIn.finalize({
          navigate: ({
            decorateUrl,
          }) => {
            router.replace(
              decorateUrl('/') as Href,
            );
          },
        });

        if (finalizeError) {
          setLocalError(
            finalizeError.message ||
              'Unable to complete sign in.',
          );
        }

        return;
      }

      if (
        signIn.status ===
        'needs_second_factor'
      ) {
        setLocalError(
          'Additional verification is required for this account.',
        );
        return;
      }

      if (
        signIn.status ===
        'needs_client_trust'
      ) {
        setLocalError(
          'Additional device verification is required.',
        );
        return;
      }

      setLocalError(
        'Sign-in could not be completed. Please try again.',
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please try again.';

      setLocalError(message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.container}>

        {/* BACK BUTTON */}
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.back}
          disabled={busy}
        >
          <Feather
            name="arrow-left"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        {/* HEADER */}
        <Text style={styles.brand}>
          GAMEZONE ARENA
        </Text>

        <Text style={styles.eyebrow}>
          PLAYER ACCESS
        </Text>

        <Text style={styles.title}>
          Welcome back.
        </Text>

        <Text style={styles.body}>
          Login to continue playing.
        </Text>

        <View style={styles.form}>

          {/* EMAIL */}
          <Text style={styles.label}>
            EMAIL ADDRESS
          </Text>

          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setLocalError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="player@email.com"
            placeholderTextColor="#71809F"
            style={styles.input}
            editable={!busy}
          />

          {/* PASSWORD */}
          <Text style={styles.label}>
            PASSWORD
          </Text>

          <View style={styles.passwordContainer}>

            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setLocalError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
              autoComplete="password"
              placeholder="Enter your password"
              placeholderTextColor="#71809F"
              style={styles.passwordInput}
              editable={!busy}
              maxLength={64}
              onSubmitEditing={submit}
            />

            {/* SHOW / HIDE PASSWORD */}
            <Pressable
              onPress={() =>
                setShowPassword(
                  !showPassword,
                )
              }
              style={styles.showButton}
              disabled={busy}
            >
              <Feather
                name={
                  showPassword
                    ? 'eye-off'
                    : 'eye'
                }
                size={18}
                color="#43DDF8"
              />

              <Text style={styles.showText}>
                {showPassword
                  ? 'HIDE'
                  : 'SHOW'}
              </Text>
            </Pressable>

          </View>

          {/* PASSWORD HINT */}
          <Text style={styles.passwordHint}>
            Password must be at least 8 characters.
          </Text>

          {/* FORGOT PASSWORD */}
          <Pressable
            onPress={() =>
              router.push(
                '/forgot-password' as Href,
              )
            }
            style={styles.forgot}
            disabled={busy}
          >
            <Text style={styles.forgotText}>
              Forgot password?
            </Text>
          </Pressable>

          {/* ERROR */}
          {!!errorMessage && (
            <View style={styles.errorBox}>

              <Feather
                name="alert-circle"
                size={17}
                color="#FF6675"
              />

              <Text style={styles.error}>
                {errorMessage}
              </Text>

            </View>
          )}

          {/* LOGIN BUTTON */}
          <Pressable
            disabled={!canSubmit}
            onPress={submit}
            style={[
              styles.button,
              !canSubmit &&
                styles.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator
                color="#06111D"
              />
            ) : (
              <>
                <Text
                  style={styles.buttonText}
                >
                  ENTER THE ARENA
                </Text>

                <Feather
                  name="arrow-right"
                  size={18}
                  color="#06111D"
                />
              </>
            )}
          </Pressable>

          {/* SIGN UP */}
          <Text style={styles.switchText}>
            New to Gamezone?{' '}

            <Link
              href="/sign-up"
              style={styles.link}
            >
              Create an account
            </Link>
          </Text>

        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050A17',
  },

  container: {
    flex: 1,
    padding: 22,
    justifyContent: 'center',
  },

  back: {
    position: 'absolute',
    top: 22,
    left: 22,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#111C34',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brand: {
    color: '#43DDF8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 28,
  },

  eyebrow: {
    color: '#43DDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 10,
  },

  body: {
    color: '#8996B3',
    fontSize: 15,
    marginTop: 8,
  },

  form: {
    marginTop: 32,
    gap: 10,
  },

  label: {
    color: '#8996B3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 7,
  },

  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#111C34',
    borderWidth: 1,
    borderColor: '#304162',
    color: '#FFFFFF',
    fontSize: 15,
  },

  passwordContainer: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#111C34',
    borderWidth: 1,
    borderColor: '#304162',
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    height: 54,
    paddingLeft: 16,
    paddingRight: 8,
    color: '#FFFFFF',
    fontSize: 15,
  },

  showButton: {
    height: 54,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  showText: {
    color: '#43DDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  passwordHint: {
    color: '#71809F',
    fontSize: 11,
    marginTop: -2,
  },

  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 5,
  },

  forgotText: {
    color: '#43DDF8',
    fontWeight: '800',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#251522',
    borderWidth: 1,
    borderColor: '#FF6675',
  },

  error: {
    flex: 1,
    color: '#FF6675',
    fontSize: 12,
    lineHeight: 18,
  },

  button: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#43DDF8',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  buttonText: {
    color: '#06111D',
    fontSize: 14,
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.45,
  },

  switchText: {
    color: '#8996B3',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 12,
  },

  link: {
    color: '#43DDF8',
    fontWeight: '900',
  },
});