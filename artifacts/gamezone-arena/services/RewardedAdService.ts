export type RewardedAdResult = {
  shown: boolean;
  rewardEarned: boolean;
  message: string;
};

type AvailabilityListener = (available: boolean) => void;

const listeners = new Set<AvailabilityListener>();

export const RewardedAdService = {
  loadRewardedAd(): void {
    // AdMob temporarily disabled for Android startup-crash isolation.
    for (const listener of listeners) {
      listener(false);
    }
  },

  isRewardedAdReady(): boolean {
    return false;
  },

  subscribeToAvailability(listener: AvailabilityListener): () => void {
    listeners.add(listener);
    listener(false);

    return () => {
      listeners.delete(listener);
    };
  },

  async showRewardedAd(): Promise<RewardedAdResult> {
    return {
      shown: false,
      rewardEarned: false,
      message: "Rewarded ads are temporarily unavailable. Please try again later.",
    };
  },
};
