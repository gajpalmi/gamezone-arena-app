import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdService } from "@/services/AdService";
import { getNativeAdsModule } from "@/services/NativeAds";

type AdBannerPlaceholderProps = {
  placement: "home" | "games" | "ludo";
};

// Let the login/home UI render before lazily initializing native ads.
const AD_START_DELAY_MS = 1600;

export function AdBannerPlaceholder({
  placement,
}: AdBannerPlaceholderProps) {
  const [ads, setAds] = useState<ReturnType<typeof getNativeAdsModule>>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const nativeAds = getNativeAdsModule();
      if (!active) return;

      setAds(nativeAds);
      if (!nativeAds) return;

      void AdService.showBanner(placement)
        .then((initialized) => {
          if (active) setReady(initialized);
        })
        .catch((error) => {
          console.warn(`Banner ad initialization failed at ${placement}.`, error);
          if (active) setFailed(true);
        });
    }, AD_START_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [placement]);

  const unitId = ads ? AdService.getBannerUnitId() : null;
  if (ads && ready && unitId && !failed) {
    return (
      <View
        accessibilityLabel={`Advertisement on ${placement}`}
        style={styles.adContainer}
      >
        <ads.BannerAd
          unitId={unitId}
          size={ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(error) => {
            console.warn(`Banner ad failed at ${placement}.`, error);
            setFailed(true);
          }}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Advertisement area on ${placement}`}
      style={styles.container}
    >
      <Text style={styles.label}>ADVERTISEMENT</Text>
      <Text style={styles.caption}>
        {ads
          ? failed
            ? "Ad unavailable"
            : "Loading ad…"
          : "Native ads appear in Android development and release builds"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adContainer: {
    minHeight: 54,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  container: {
    minHeight: 54,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#293A5C",
    backgroundColor: "#0D1427",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  label: {
    color: "#687895",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  caption: {
    color: "#465570",
    fontSize: 7,
    marginTop: 3,
    textAlign: "center",
  },
});