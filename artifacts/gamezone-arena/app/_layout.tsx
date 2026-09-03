import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
} from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

import { Slot } from 'expo-router';

import {
  AppSessionProvider,
} from '@/context/AppSessionContext';

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const CLERK_PROXY_URL =
  process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <View style={styles.error}>
        <ActivityIndicator
          size="large"
          color="#43DDF8"
        />
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
      proxyUrl={CLERK_PROXY_URL}
    >
      <ClerkLoading>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#43DDF8"
          />
        </View>
      </ClerkLoading>

      <ClerkLoaded>
        <AppSessionProvider>
          <Slot />
        </AppSessionProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#050A17',
    alignItems: 'center',
    justifyContent: 'center',
  },

  error: {
    flex: 1,
    backgroundColor: '#050A17',
    alignItems: 'center',
    justifyContent: 'center',
  },
});