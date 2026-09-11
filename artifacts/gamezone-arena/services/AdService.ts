import {
  getNativeAdsModule,
  getLatestNativeAdsModuleDiagnostic,
  usesProductionAdInventory,
} from "@/services/NativeAds";

export type AdPlacement = "home" | "games" | "ludo";

export type AdInitializationDiagnostic = {
  stage: "module" | "consent" | "configuration" | "sdk";
  message: string;
};

const PRODUCTION_BANNER_ID = "ca-app-pub-5348301935438016/9640212483";

let initialization: Promise<boolean> | null = null;
let consentAllowsAds = false;
let latestInitializationDiagnostic: AdInitializationDiagnostic | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function initializeAds(): Promise<boolean> {
  const ads = getNativeAdsModule();
  if (!ads) {
    const moduleDiagnostic = getLatestNativeAdsModuleDiagnostic();
    if (moduleDiagnostic) {
      latestInitializationDiagnostic = {
        stage: "module",
        message: moduleDiagnostic.message,
      };
    }
    return false;
  }

  let stage: AdInitializationDiagnostic["stage"] = "consent";
  try {
    const consentInfo = await ads.AdsConsent.requestInfoUpdate();
    const resolvedConsent = consentInfo.isConsentFormAvailable
      ? await ads.AdsConsent.loadAndShowConsentFormIfRequired()
      : consentInfo;
    consentAllowsAds = resolvedConsent.canRequestAds;
    if (!consentAllowsAds) return false;

    stage = "configuration";
    await ads.default().setRequestConfiguration({
      maxAdContentRating: ads.MaxAdContentRating.G,
      testDeviceIdentifiers: usesProductionAdInventory() ? [] : ["EMULATOR"],
    });
    stage = "sdk";
    await ads.default().initialize();
    latestInitializationDiagnostic = null;
    return true;
  } catch (error) {
    latestInitializationDiagnostic = {
      stage,
      message: getErrorMessage(error),
    };
    console.warn(
      "Google Mobile Ads initialization failed.",
      latestInitializationDiagnostic,
      error,
    );
    consentAllowsAds = false;
    return false;
  }
}

export const AdService = {
  initialize(): Promise<boolean> {
    initialization ??= initializeAds().then((initialized) => {
      if (!initialized) initialization = null;
      return initialized;
    });
    return initialization;
  },

  isNativeRuntime(): boolean {
    return getNativeAdsModule() !== null;
  },

  canRequestAds(): boolean {
    return consentAllowsAds;
  },

  getLatestInitializationDiagnostic(): AdInitializationDiagnostic | null {
    return latestInitializationDiagnostic;
  },

  getBannerUnitId(): string | null {
    const ads = getNativeAdsModule();
    if (!ads) return null;
    return usesProductionAdInventory()
      ? PRODUCTION_BANNER_ID
      : ads.TestIds.ADAPTIVE_BANNER;
  },

  async showBanner(_placement: AdPlacement): Promise<boolean> {
    return this.initialize();
  },

  async showPrivacyOptions(): Promise<boolean> {
    const ads = getNativeAdsModule();
    if (!ads) return false;
    try {
      const info = await ads.AdsConsent.showPrivacyOptionsForm();
      consentAllowsAds = info.canRequestAds;
      return true;
    } catch (error) {
      console.warn("Ad privacy options could not be shown.", error);
      return false;
    }
  },

  async showInterstitial(_placement: AdPlacement): Promise<boolean> {
    return false;
  },

  async showRewarded(_placement: AdPlacement): Promise<{
    shown: boolean;
    rewardGranted: boolean;
  }> {
    const { RewardedAdService } = await import("@/services/RewardedAdService");
    const result = await RewardedAdService.showRewardedAd();
    return { shown: result.shown, rewardGranted: result.rewardEarned };
  },
};