import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useSignUp,
  useUser,
} from '@clerk/expo';

import {
  Link,
  useRouter,
} from 'expo-router';

export default function SignUpScreen() {
  const router = useRouter();

  const {
    signUp,
    errors,
    fetchStatus,
  } = useSignUp();

  const {
    user,
  } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [code, setCode] = useState('');
  const [verifying, setVerifying] =
    useState(false);

  const [localError, setLocalError] =
    useState('');

  const busy =
    fetchStatus === 'fetching';

  /*
   * Clerk error message
   */
  const clerkError =
    errors?.fields?.emailAddress?.message ||
    errors?.fields?.password?.message ||
    '';

  const errorMessage =
    localError || clerkError;

  /*
   * CREATE ACCOUNT
   */
  async function createAccount() {
    setLocalError('');

    const cleanName = name.trim();
    const cleanEmail =
      email.trim().toLowerCase();

    /*
     * Basic validation
     */
    if (!cleanName) {
      setLocalError(
        'Please enter your full name.',
      );
      return;
    }

    if (!cleanEmail) {
      setLocalError(
        'Please enter your email address.',
      );
      return;
    }

    /*
     * Simple email validation
     */
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setLocalError(
        'Please enter a valid email address.',
      );
      return;
    }

    if (!password) {
      setLocalError(
        'Please create a password.',
      );
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
        'Please enter your password again.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(
        'Passwords do not match.',
      );
      return;
    }

    /*
     * IMPORTANT:
     *
     * Do NOT send firstName or lastName here.
     *
     * Current Clerk Expo API expects:
     * emailAddress
     * password
     *
     * Sending firstName here caused:
     *
     * "first_name is not a valid parameter
     * for this request."
     */
    const { error } =
      await signUp.password({
        emailAddress: cleanEmail,
        password: password,
      });

    if (error) {
      setLocalError(
        error.message ||
          'Unable to create account.',
      );
      return;
    }

    /*
     * Send email verification code
     */
    const {
      error: sendError,
    } =
      await signUp.verifications
        .sendEmailCode();

    if (sendError) {
      setLocalError(
        sendError.message ||
          'Unable to send verification code.',
      );
      return;
    }

    /*
     * Show verification screen
     */
    setVerifying(true);
  }

  /*
   * VERIFY EMAIL
   */
  async function verifyCode() {
    setLocalError('');

    const cleanCode =
      code.trim();

    if (!cleanCode) {
      setLocalError(
        'Please enter the verification code.',
      );
      return;
    }

    if (cleanCode.length < 4) {
      setLocalError(
        'Please enter the complete verification code.',
      );
      return;
    }

    /*
     * Verify email code
     */
    const {
      error,
    } =
      await signUp.verifications
        .verifyEmailCode({
          code: cleanCode,
        });

    if (error) {
      setLocalError(
        error.message ||
          'Invalid verification code.',
      );
      return;
    }

    /*
     * Finalize Clerk session
     */
    const {
      error: finalizeError,
    } =
      await signUp.finalize();

    if (finalizeError) {
      setLocalError(
        finalizeError.message ||
          'Account verification completed, but sign-in could not be completed.',
      );
      return;
    }

    /*
     * Save the user's name AFTER
     * the Clerk account/session exists.
     *
     * This avoids the:
     * "first_name is not a valid parameter"
     * error.
     */
    try {
      if (user) {
        const nameParts =
          name.trim().split(/\s+/);

        const firstName =
          nameParts.shift() || '';

        const lastName =
          nameParts.join(' ');

        await user.update({
          firstName: firstName,
          lastName:
            lastName || undefined,
        });
      }
    } catch (nameError: any) {
      /*
       * Account is already created.
       *
       * If name update fails, do not
       * tell the user that account creation
       * failed.
       */
      console.log(
        'Name update error:',
        nameError,
      );
    }

    /*
     * Go to home screen
     */
    router.replace('/');
  }

  /*
   * VERIFICATION SCREEN
   */
  if (verifying) {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>
          GAMEZONE ARENA
        </Text>

        <Text style={styles.title}>
          Verify your email
        </Text>

        <Text style={styles.body}>
          We sent a verification code to:
        </Text>

        <Text style={styles.email}>
          {email}
        </Text>

        <Text style={styles.label}>
          VERIFICATION CODE
        </Text>

        <TextInput
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setLocalError('');
          }}
          keyboardType="number-pad"
          maxLength={8}
          autoCapitalize="none"
          placeholder="Enter verification code"
          placeholderTextColor="#71809F"
          style={styles.input}
        />

        {!!errorMessage && (
          <Text style={styles.error}>
            {errorMessage}
          </Text>
        )}

        <Pressable
          onPress={verifyCode}
          disabled={busy}
          style={[
            styles.button,
            busy && styles.disabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator
              color="#06111D"
            />
          ) : (
            <Text style={styles.buttonText}>
              VERIFY EMAIL
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setVerifying(false);
            setCode('');
            setLocalError('');
          }}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            CHANGE EMAIL
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * SIGN-UP SCREEN
   */
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>
        GAMEZONE ARENA
      </Text>

      <Text style={styles.title}>
        Create account
      </Text>

      <Text style={styles.body}>
        Create your player account.
      </Text>

      <Text style={styles.label}>
        FULL NAME
      </Text>

      <TextInput
        value={name}
        onChangeText={(value) => {
          setName(value);
          setLocalError('');
        }}
        autoCapitalize="words"
        autoCorrect={false}
        placeholder="Your full name"
        placeholderTextColor="#71809F"
        style={styles.input}
      />

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
        textContentType="emailAddress"
        autoComplete="email"
        placeholder="player@gmail.com"
        placeholderTextColor="#71809F"
        style={styles.input}
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
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        placeholder="Create password"
        placeholderTextColor="#71809F"
        style={styles.input}
      />

      <Text style={styles.label}>
        CONFIRM PASSWORD
      </Text>

      <TextInput
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          setLocalError('');
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        placeholder="Enter password again"
        placeholderTextColor="#71809F"
        style={styles.input}
      />

      {/* Clerk CAPTCHA for Expo Web */}
      <View nativeID="clerk-captcha" />

      {!!errorMessage && (
        <Text style={styles.error}>
          {errorMessage}
        </Text>
      )}

      <Pressable
        onPress={createAccount}
        disabled={busy}
        style={[
          styles.button,
          busy && styles.disabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator
            color="#06111D"
          />
        ) : (
          <Text style={styles.buttonText}>
            CREATE ACCOUNT
          </Text>
        )}
      </Pressable>

      <Text style={styles.switch}>
        Already have an account?{' '}
        <Link
          href="/sign-in"
          style={styles.link}
        >
          Login
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A17',
    padding: 22,
    justifyContent: 'center',
  },

  brand: {
    color: '#43DDF8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 20,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },

  body: {
    color: '#8996B3',
    marginTop: 8,
    marginBottom: 22,
  },

  email: {
    color: '#43DDF8',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 20,
  },

  label: {
    color: '#8996B3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 6,
  },

  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#111C34',
    borderWidth: 1,
    borderColor: '#304162',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 4,
  },

  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#43DDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  buttonText: {
    color: '#06111D',
    fontWeight: '900',
    fontSize: 14,
  },

  secondary: {
    marginTop: 14,
    alignItems: 'center',
  },

  secondaryText: {
    color: '#43DDF8',
    fontWeight: '900',
  },

  error: {
    color: '#FF6675',
    marginTop: 12,
    lineHeight: 18,
  },

  switch: {
    color: '#8996B3',
    textAlign: 'center',
    marginTop: 16,
  },

  link: {
    color: '#43DDF8',
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.45,
  },
});