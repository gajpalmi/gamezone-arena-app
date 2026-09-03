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

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

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
    password.length > 0 &&
    !busy;

  async function submit() {
    if (!canSubmit) {
      return;
    }

    setLocalError('');

    const { error } =
      await signIn.password({
        emailAddress:
          email.trim(),
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
      const { error: finalizeError } =
        await signIn.finalize({
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
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.back}
        >
          <Feather
            name="arrow-left"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

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

          <Text style={styles.label}>
            PASSWORD
          </Text>

          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setLocalError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            autoComplete="password"
            placeholder="Enter your password"
            placeholderTextColor="#71809F"
            style={styles.input}
            editable={!busy}
            onSubmitEditing={submit}
          />

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
                <Text style={styles.buttonText}>
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