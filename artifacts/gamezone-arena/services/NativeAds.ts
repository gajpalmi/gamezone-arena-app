import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export type GoogleMobileAdsModule =
  typeof import("react-native-google-mobile-ads");

let cachedModule: GoogleMobileAdsModule | null | undefined;

export function getNativeAdsModule(): GoogleMobileAdsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (
    Platform.OS === "web" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    cachedModule = null;
    return cachedModule;
  }

  try {
    cachedModule = require("react-native-google-mobile-ads");
  } catch (error) {
    console.info(
      "Google Mobile Ads is unavailable in this runtime. Use a native development build.",
      error,
    );
    cachedModule = null;
  }
  return cachedModule ?? null;
}

export function usesProductionAdInventory(): boolean {
  return (
    !__DEV__ &&
    process.env.EXPO_PUBLIC_ADMOB_PRODUCTION === "true" &&
    Platform.OS === "android"
  );
}