export type AdPlacement = "home" | "games" | "ludo";

/**
 * Expo Go-safe advertising boundary. A native AdMob adapter can replace this
 * implementation in a development/production build without changing screens.
 */
export const AdService = {
  async showBanner(_placement: AdPlacement): Promise<boolean> {
    return false;
  },

  async showInterstitial(_placement: AdPlacement): Promise<boolean> {
    return false;
  },

  async showRewarded(_placement: AdPlacement): Promise<{
    shown: boolean;
    rewardGranted: boolean;
  }> {
    return { shown: false, rewardGranted: false };
  },
};