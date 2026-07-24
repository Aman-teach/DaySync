/**
 * Expo Config Plugin: withAndroidSupportExclude
 *
 * Patches android/app/build.gradle to exclude legacy com.android.support
 * packages that conflict with AndroidX. This is necessary because
 * @react-native-voice/voice hardcodes a com.android.support dependency
 * in its own build.gradle, causing "Duplicate class android.support.v4.*"
 * errors when built with Expo SDK 54+ / React Native 0.77+.
 *
 * The `enableJetifier` flag does NOT fix this — Jetifier only rewrites
 * Java import statements, not Gradle dependency declarations.
 *
 * This plugin injects a `configurations.all { exclude ... }` block into
 * the generated app/build.gradle at EAS build time.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidSupportExclude = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;

    const excludeBlock = `
    // Fix: exclude legacy Android Support Library that conflicts with AndroidX.
    // Caused by @react-native-voice/voice hardcoding com.android.support deps.
    configurations.all {
        exclude group: "com.android.support", module: "support-compat"
        exclude group: "com.android.support", module: "support-v4"
        exclude group: "com.android.support", module: "support-core-utils"
        exclude group: "com.android.support", module: "support-annotations"
        exclude group: "com.android.support", module: "appcompat-v7"
    }
`;

    // Only inject once — guard against duplicate runs
    if (contents.includes('exclude group: "com.android.support"')) {
      return mod;
    }

    // Inject right before the `dependencies {` block in app/build.gradle
    mod.modResults.contents = contents.replace(
      /^(dependencies\s*\{)/m,
      `${excludeBlock}\n$1`
    );

    return mod;
  });
};

module.exports = withAndroidSupportExclude;
