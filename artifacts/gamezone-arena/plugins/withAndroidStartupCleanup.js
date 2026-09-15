const { withAndroidManifest } = require("@expo/config-plugins");

const UPDATE_META_NAMES = new Set([
  "expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH",
  "expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS",
]);

module.exports = function withAndroidStartupCleanup(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];

    if (!application) {
      throw new Error("Android application manifest is unavailable.");
    }

    if (Array.isArray(application["meta-data"])) {
      application["meta-data"] = application["meta-data"].filter(
        (item) => !UPDATE_META_NAMES.has(item?.$?.["android:name"])
      );
    }

    return config;
  });
};
