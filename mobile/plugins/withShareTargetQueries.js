const { withAndroidManifest } = require('@expo/config-plugins');

// Android 11 (API 30)+ package visibility: unless an app is declared under
// <queries> in the manifest, PackageManager hides it from this app's
// queries (Linking.canOpenURL, intent resolution) even if it's installed.
// PostDetailScreen's per-app share buttons need to detect whether
// WhatsApp/Telegram/Facebook/LinkedIn are installed and deep-link into
// them, so this plugin declares both their custom URL schemes and their
// package names. Native-manifest change — requires `expo prebuild` to
// regenerate android/, and the release APK must be rebuilt for it to take
// effect there (Expo Go's own manifest already queries a broad set of
// packages, so behavior there may differ from a standalone build).
const SHARE_TARGET_SCHEMES = ['whatsapp', 'tg', 'fb', 'linkedin'];
const SHARE_TARGET_PACKAGES = [
  'com.whatsapp',
  'com.whatsapp.w4b',
  'org.telegram.messenger',
  'com.facebook.katana',
  'com.linkedin.android',
];

function withShareTargetQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!Array.isArray(manifest.queries)) {
      manifest.queries = [{}];
    }
    // Merge into the first <queries> block (Expo's template already emits
    // one for generic https browsable links) rather than adding a second
    // sibling block.
    const queries = manifest.queries[0] ?? {};

    const existingIntents = Array.isArray(queries.intent) ? queries.intent : [];
    const schemeIntents = SHARE_TARGET_SCHEMES.map((scheme) => ({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      data: [{ $: { 'android:scheme': scheme } }],
    }));

    const existingPackages = Array.isArray(queries.package) ? queries.package : [];
    const packageEntries = SHARE_TARGET_PACKAGES.map((name) => ({
      $: { 'android:name': name },
    }));

    queries.intent = [...existingIntents, ...schemeIntents];
    queries.package = [...existingPackages, ...packageEntries];
    manifest.queries[0] = queries;

    return config;
  });
}

module.exports = withShareTargetQueries;
