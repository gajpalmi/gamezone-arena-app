import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useAuth,
  useUser,
} from '@clerk/expo';

import {
  useRouter,
} from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  const { signOut } = useAuth();
  const { user } = useUser();

  const [loggingOut, setLoggingOut] =
    useState(false);

  async function logout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      // Clerk session logout
      await signOut();

      // Logout के बाद सीधे Sign In
      router.replace('/sign-in');
    } catch (error) {
      console.error(
        'Logout error:',
        error,
      );

      setLoggingOut(false);
    }
  }

  const name =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    'PLAYER';

  const email =
    user?.primaryEmailAddress
      ?.emailAddress ||
    'No email';

  return (
    <View style={styles.container}>

      {/* BACK */}
      <Pressable
        onPress={() => router.back()}
        disabled={loggingOut}
        style={styles.back}
      >
        <Text style={styles.backText}>
          ← BACK
        </Text>
      </Pressable>

      {/* TITLE */}
      <Text style={styles.title}>
        PLAYER PROFILE
      </Text>

      {/* PROFILE CARD */}
      <View style={styles.card}>

        <Text style={styles.label}>
          NAME
        </Text>

        <Text style={styles.value}>
          {name}
        </Text>

        <Text style={styles.label}>
          EMAIL
        </Text>

        <Text style={styles.value}>
          {email}
        </Text>

        <Text style={styles.label}>
          CLERK USER ID
        </Text>

        <Text
          style={styles.id}
          selectable
        >
          {user?.id || 'No user ID'}
        </Text>

      </View>

      {/* LOGOUT */}
      <Pressable
        onPress={logout}
        disabled={loggingOut}
        style={[
          styles.logout,
          loggingOut &&
            styles.logoutDisabled,
        ]}
      >
        {loggingOut ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.logoutText}>
            LOG OUT
          </Text>
        )}
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A17',
    padding: 22,
  },

  back: {
    marginTop: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },

  backText: {
    color: '#43DDF8',
    fontWeight: '900',
    fontSize: 14,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 28,
  },

  card: {
    backgroundColor: '#111C34',
    borderWidth: 1,
    borderColor: '#304162',
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
  },

  label: {
    color: '#71809F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 12,
  },

  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },

  id: {
    color: '#43DDF8',
    fontSize: 11,
    marginTop: 5,
  },

  logout: {
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EF3340',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  logoutDisabled: {
    opacity: 0.55,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});