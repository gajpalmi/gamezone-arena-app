import type { GoogleMobileAdsModule } from "./NativeAds";

export function getNativeAdsModule(): GoogleMobileAdsModule | null {
  return null;
}

export function usesProductionAdInventory(): boolean {
  return false;
}