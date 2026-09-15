import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Slot } from "expo-router";
import {
  ClerkProvider,
  ClerkLoaded,
  ClerkLoading,
} from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function StartupLoading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#43DDF8" />
    </View>
  );
}

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <StartupLoading />;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoading>
        <StartupLoading />
      </ClerkLoading>

      <ClerkLoaded>
        <Slot />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050A17",
    alignItems: "center",
    justifyContent: "center",
  },
});