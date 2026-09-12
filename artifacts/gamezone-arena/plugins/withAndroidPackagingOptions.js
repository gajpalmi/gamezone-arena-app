const {
  withAndroidManifest,
  withGradleProperties,
} = require("expo/config-plugins");

const PACKAGING_EXCLUDES_KEY = "android.packagingOptions.excludes";
const DUPLICATE_JAVA_RESOURCE =
  "META-INF/versions/9/OSGI-INF/MANIFEST.MF";
const MOBILE_ADS_INIT_PROVIDER =
  "com.google.android.gms.ads.MobileAdsInitProvider";

module.exports = function withAndroidPackagingOptions(config) {
  config = withAndroidManifest(config, (manifestConfig) => {
    const manifest = manifestConfig.modResults.manifest;
    manifest.$ ??= {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const application = manifest.application?.[0];
    if (!application) {
      throw new Error(
        "Android application manifest is unavailable while disabling MobileAdsInitProvider.",
      );
    }

    application.provider ??= [];
    const existingProvider = application.provider.find(
      (provider) => provider.$?.["android:name"] === MOBILE_ADS_INIT_PROVIDER,
    );

    if (existingProvider) {
      existingProvider.$["tools:node"] = "remove";
    } else {
      application.provider.push({
        $: {
          "android:name": MOBILE_ADS_INIT_PROVIDER,
          "tools:node": "remove",
        },
      });
    }

    return manifestConfig;
  });

  return withGradleProperties(config, (gradleConfig) => {
    gradleConfig.modResults = gradleConfig.modResults.filter(
      (item) =>
        item.type !== "property" || item.key !== PACKAGING_EXCLUDES_KEY,
    );
    gradleConfig.modResults.push({
      type: "property",
      key: PACKAGING_EXCLUDES_KEY,
      value: DUPLICATE_JAVA_RESOURCE,
    });
    return gradleConfig;
  });
};