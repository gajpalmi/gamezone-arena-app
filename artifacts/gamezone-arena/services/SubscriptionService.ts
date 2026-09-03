export type SubscriptionResult = {
  available: boolean;
  message: string;
};

export type CustomerInfo = {
  isPremium: boolean;
};

/**
 * Store-billing boundary for Expo Go. It never grants an entitlement locally.
 * A RevenueCat or direct store adapter must provide verified customer info in
 * a native development/production build.
 */
export const SubscriptionService = {
  async initialize(): Promise<void> {},

  async getCustomerInfo(): Promise<CustomerInfo> {
    return { isPremium: false };
  },

  async getSubscriptionStatus(): Promise<CustomerInfo> {
    return this.getCustomerInfo();
  },

  async isPremium(): Promise<boolean> {
    return (await this.getCustomerInfo()).isPremium;
  },

  async purchasePremium(): Promise<SubscriptionResult> {
    return {
      available: false,
      message:
        "Purchases require the production mobile billing build. No charge was made.",
    };
  },

  async purchaseMonthlySubscription(): Promise<SubscriptionResult> {
    return this.purchasePremium();
  },

  async restorePurchases(): Promise<SubscriptionResult> {
    return {
      available: false,
      message:
        "Restore purchases requires the production mobile billing build.",
    };
  },
};