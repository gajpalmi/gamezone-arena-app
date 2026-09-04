import { AdService } from "@/services/AdService";
import {
  getNativeAdsModule,
  usesProductionAdInventory,
} from "@/services/NativeAds";

export type RewardedAdResult = {
  shown: boolean;
  rewardEarned: boolean;
  message: string;
};

const PRODUCTION_REWARDED_ID = "ca-app-pub-5348301935438016/1187736347";
const LOAD_COOLDOWN_MS = 30_000;
const SHOW_COOLDOWN_MS = 60_000;

type RewardedAd = ReturnType<
  NonNullable<ReturnType<typeof getNativeAdsModule>>["RewardedAd"]["createForAdRequest"]
>;

let rewardedAd: RewardedAd | null = null;
let rewardedReady = false;
let loadPromise: Promise<boolean> | null = null;
let lastLoadAt = 0;
let lastShowAt = 0;
const availabilityListeners = new Set<(ready: boolean) => void>();

function notifyAvailability() {
  availabilityListeners.forEach((listener) => listener(rewardedReady));
}

function scheduleReload() {
  setTimeout(() => {
    void RewardedAdService.loadRewardedAd();
  }, LOAD_COOLDOWN_MS);
}

export const RewardedAdService = {
  async loadRewardedAd(): Promise<boolean> {
    if (rewardedReady) return true;
    if (loadPromise) return loadPromise;
    if (Date.now() - lastLoadAt < LOAD_COOLDOWN_MS) return false;

    const ads = getNativeAdsModule();
    if (!ads || !(await AdService.initialize()) || !AdService.canRequestAds()) {
      return false;
    }

    lastLoadAt = Date.now();
    loadPromise = new Promise<boolean>((resolve) => {
      const unitId = usesProductionAdInventory()
        ? PRODUCTION_REWARDED_ID
        : ads.TestIds.REWARDED;
      const ad = ads.RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      rewardedAd = ad;

      const unsubscribeLoaded = ad.addAdEventListener(
        ads.RewardedAdEventType.LOADED,
        () => {
          rewardedReady = true;
          notifyAvailability();
          unsubscribeLoaded();
          unsubscribeError();
          loadPromise = null;
          resolve(true);
        },
      );
      const unsubscribeError = ad.addAdEventListener(
        ads.AdEventType.ERROR,
        (error) => {
          console.warn("Rewarded ad failed to load.", error);
          rewardedAd = null;
          rewardedReady = false;
          notifyAvailability();
          unsubscribeLoaded();
          unsubscribeError();
          loadPromise = null;
          resolve(false);
          scheduleReload();
        },
      );
      ad.load();
    });
    return loadPromise;
  },

  isRewardedAdReady(): boolean {
    return rewardedReady && rewardedAd !== null;
  },

  subscribeToAvailability(listener: (ready: boolean) => void): () => void {
    availabilityListeners.add(listener);
    listener(this.isRewardedAdReady());
    return () => {
      availabilityListeners.delete(listener);
    };
  },

  async showRewardedAd(): Promise<RewardedAdResult> {
    const ads = getNativeAdsModule();
    if (!ads) {
      return {
        shown: false,
        rewardEarned: false,
        message: "Rewarded ads require a native Android development or release build.",
      };
    }
    if (Date.now() - lastShowAt < SHOW_COOLDOWN_MS) {
      return {
        shown: false,
        rewardEarned: false,
        message: "Please wait before watching another rewarded ad.",
      };
    }
    if (!rewardedAd || !rewardedReady) {
      void this.loadRewardedAd();
      return {
        shown: false,
        rewardEarned: false,
        message: "The rewarded ad is still loading. Please try again shortly.",
      };
    }

    const ad = rewardedAd;
    rewardedReady = false;
    notifyAvailability();
    lastShowAt = Date.now();

    return new Promise<RewardedAdResult>((resolve) => {
      let earned = false;
      let settled = false;
      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        rewardedAd = null;
        scheduleReload();
        resolve(result);
      };
      const unsubscribeEarned = ad.addAdEventListener(
        ads.RewardedAdEventType.EARNED_REWARD,
        () => {
          earned = true;
        },
      );
      const unsubscribeClosed = ad.addAdEventListener(
        ads.AdEventType.CLOSED,
        () => {
          finish({
            shown: true,
            rewardEarned: earned,
            message: earned
              ? "Reward earned."
              : "Watch the full ad to earn the reroll.",
          });
        },
      );
      const unsubscribeError = ad.addAdEventListener(
        ads.AdEventType.ERROR,
        (error) => {
          console.warn("Rewarded ad could not be shown.", error);
          finish({
            shown: false,
            rewardEarned: false,
            message: "The rewarded ad could not be shown. Please try again later.",
          });
        },
      );

      void ad.show().catch((error) => {
        console.warn("Rewarded ad show failed.", error);
        finish({
          shown: false,
          rewardEarned: false,
          message: "The rewarded ad could not be shown. Please try again later.",
        });
      });
    });
  },
};