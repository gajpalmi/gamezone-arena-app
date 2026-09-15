export type NativeAdsModuleDiagnostic = {
  message: string;
};

export function getNativeAdsModule(): null {
  return null;
}

export function getLatestNativeAdsModuleDiagnostic(): NativeAdsModuleDiagnostic | null {
  return {
    message: "Google Mobile Ads is temporarily disabled for Android startup-crash isolation.",
  };
}

export function usesProductionAdInventory(): boolean {
  return false;
}
