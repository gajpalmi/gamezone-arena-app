export type AdPlacement = string;

export type RewardedAdResult = {
  shown: boolean;
  rewardGranted: boolean;
};

export const AdService = {
  async initialize(): Promise<void> {
    return;
  },

  async showPrivacyOptions(): Promise<boolean> {
    return false;
  },

  async showInterstitial(_placement: AdPlacement): Promise<boolean> {
    return false;
  },

  async showBanner(_placement: AdPlacement): Promise<boolean> {
    return false;
  },

  async showRewarded(_placement: AdPlacement): Promise<RewardedAdResult> {
    const { RewardedAdService } = await import("@/services/RewardedAdService");
    const result = await RewardedAdService.showRewardedAd();

    return {
      shown: result.shown,
      rewardGranted: result.rewardEarned,
    };
  },
};
