import type {
  GoogleMobileAdsModule,
  NativeAdsModuleDiagnostic,
} from "./NativeAds";

export function getNativeAdsModule(): GoogleMobileAdsModule | null {
  return null;
}

export function getLatestNativeAdsModuleDiagnostic(): NativeAdsModuleDiagnostic | null {
  return null;
}

export function usesProductionAdInventory(): boolean {
  return false;
}