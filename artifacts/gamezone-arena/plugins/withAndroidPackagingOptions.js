const { withGradleProperties } = require("expo/config-plugins");

const PACKAGING_EXCLUDES_KEY = "android.packagingOptions.excludes";
const DUPLICATE_JAVA_RESOURCE =
  "META-INF/versions/9/OSGI-INF/MANIFEST.MF";

module.exports = function withAndroidPackagingOptions(config) {
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