export type RewardedAdResult = {
  shown: boolean;
  rewardEarned: boolean;
  message: string;
};

/**
 * Expo Go-safe rewarded-ad boundary. It never simulates playback and never
 * grants a reward. A native AdMob adapter can replace these methods later.
 */
export const RewardedAdService = {
  async loadRewardedAd(): Promise<boolean> {
    return false;
  },

  isRewardedAdReady(): boolean {
    return false;
  },

  async showRewardedAd(): Promise<RewardedAdResult> {
    return {
      shown: false,
      rewardEarned: false,
      message: "Rewarded ads are available in the production build.",
    };
  },

  onRewardEarned(callback: () => void): void {
    if (this.isRewardedAdReady()) callback();
  },
};