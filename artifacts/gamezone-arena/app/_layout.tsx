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
  useAuth,
} from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

import { Slot } from 'expo-router';

import {
  AppSessionProvider,
} from '@/context/AppSessionContext';
import { setBaseUrl } from '@workspace/api-client-react';
import { BusinessQueryProvider } from '@/components/BusinessQueryProvider';
import { PreferencesProvider } from '@/context/PreferencesContext';
import {
  setSupabaseAccessTokenGetter,
} from '@/lib/supabase';

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const CLERK_PROXY_URL =
  process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

const API_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
setBaseUrl(API_DOMAIN ? `https://${API_DOMAIN.replace(/^https?:\/\//, '')}` : null);

function SupabaseAuthBridge({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    getToken,
    isLoaded,
    isSignedIn,
  } = useAuth();

  React.useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setSupabaseAccessTokenGetter(null);
      return;
    }

    setSupabaseAccessTokenGetter(
      async (options) => {
        try {
          return await getToken(options);
        } catch (error) {
          console.error(
            'Clerk token error for Supabase:',
            error,
          );
          return null;
        }
      },
    );

    return () => {
      setSupabaseAccessTokenGetter(null);
    };
  }, [
    getToken,
    isLoaded,
    isSignedIn,
  ]);

  return <>{children}</>;
}

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
        <SupabaseAuthBridge>
          <AppSessionProvider>
            <PreferencesProvider>
              <BusinessQueryProvider>
                <Slot />
              </BusinessQueryProvider>
            </PreferencesProvider>
          </AppSessionProvider>
        </SupabaseAuthBridge>
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