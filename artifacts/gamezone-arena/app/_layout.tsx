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

import { Slot } from 'expo-router';

import {
  AppSessionProvider,
} from '@/context/AppSessionContext';

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

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