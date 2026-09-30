import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Platform, ScrollView, Share, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { FontAwesome } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import { colors, fonts, radii, spacing } from '../theme';

// How long the Copy button shows its "Copied" confirmation state before
// reverting, in milliseconds.
const COPY_FEEDBACK_MS = 1500;

// Android's Share intent rides the Binder IPC transaction, which has a
// combined ~1MB budget shared with everything else the OS is doing at that
// moment (not just this string) — long legal acts can run to tens of
// thousands of characters, so the text handed to the share sheet is capped
// well under that to reliably reach WhatsApp/Messenger/Facebook instead of
// silently failing. The clipboard has no such transaction limit, so "Copy"
// always copies the post in full.
const SHARE_BODY_LIMIT = 4000;

// WhatsApp/Telegram deep links carry the message as a percent-encoded query
// string, not a plain Binder extra — and this content is Bengali, where
// each character is multiple UTF-8 bytes and each byte becomes a 3-char
// "%XX" escape, so text can balloon to ~9x its length once encoded. Keep
// the pre-encoding text small so the resulting URL stays well inside what
// Android, browsers, and WhatsApp/Telegram's own servers reliably accept.
const DEEP_LINK_BODY_LIMIT = 800;

function buildFullText(post) {
  return `${post.title}\n\n${post.description ?? ''}`.trim();
}

function truncatedBody(description, limit, note) {
  if (!description || description.length <= limit) return description ?? '';
  return `${description.slice(0, limit).trim()}…\n\n(${note})`;
}

function buildShareText(post) {
  const body = truncatedBody(
    post.description,
    SHARE_BODY_LIMIT,
    'Text truncated — open the Law Business app to read it in full.'
  );
  return `${post.title}\n\n${body}`.trim();
}

function buildDeepLinkShareText(post) {
  const body = truncatedBody(
    post.description,
    DEEP_LINK_BODY_LIMIT,
    'truncated — open the Law Business app for the full text.'
  );
  return `${post.title}\n\n${body}`.trim();
}

// WhatsApp's web fallback (wa.me) genuinely pre-fills the message text for
// anyone without the app installed, no login required — verified by hand.
// Tries the app's own URL scheme first so the message lands directly in
// its composer; if the app isn't installed, falls back to that web URL.
async function openWithTextFallback(appUrl, webUrl) {
  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch (err) {
    try {
      await Linking.openURL(webUrl);
    } catch (err2) {
      console.warn('Could not open share target:', err2);
    }
  }
}

// Copies the post to the clipboard and opens a plain web URL (home page,
// feed, etc — not a share flow) so the user can paste it themselves, with
// a toast explaining what happened.
async function copyThenOpenWeb(post, webUrl, appName) {
  await Clipboard.setStringAsync(buildFullText(post));
  if (Platform.OS === 'android') {
    ToastAndroid.show(`Post copied — paste it into ${appName}`, ToastAndroid.LONG);
  }
  try {
    await Linking.openURL(webUrl);
  } catch (err) {
    console.warn(`Could not open ${appName}:`, err);
  }
}

// Facebook and LinkedIn's share endpoints only accept a URL to scrape
// (Open Graph tags), not arbitrary prefilled text — and posts here have no
// public URL, since the content only exists behind the API/inside the app.
// Telegram's web share widget (t.me/share/url) is built around the same
// assumption — it expects a URL to attach the text to, and without one (or
// an already-logged-in Telegram Web session) it just bounces to Telegram's
// marketing homepage instead of a share dialog, so it can't be trusted to
// carry the text either. For all three, when the native app isn't
// installed, this copies the post to the clipboard and opens the app (or
// its website) so the user can paste it themselves, instead of a "share"
// that silently drops the text.
async function openAppOrCopyFallback(post, appUrl, webUrl, appName) {
  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch (err) {
    console.warn(`${appName} deep link check failed:`, err);
  }
  await copyThenOpenWeb(post, webUrl, appName);
}

export default function PostDetailScreen({ route }) {
  const { post } = route.params;
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function handleCopy() {
    await Clipboard.setStringAsync(buildFullText(post));
    if (Platform.OS === 'android') {
      ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    }
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  async function handleShare() {
    try {
      // Share.share opens the native chooser (Facebook/WhatsApp/Messenger/
      // etc all register as targets); on Android the returned promise
      // resolves once the sheet is shown rather than waiting on the user's
      // choice, so a normal cancel never reaches the catch block below —
      // only a genuine failure (e.g. no share targets installed) does.
      await Share.share({ message: buildShareText(post) });
    } catch (err) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Could not open share sheet', ToastAndroid.SHORT);
      }
      console.warn('Share failed:', err);
    }
  }

  function handleWhatsApp() {
    const text = buildDeepLinkShareText(post);
    openWithTextFallback(
      `whatsapp://send?text=${encodeURIComponent(text)}`,
      `https://wa.me/?text=${encodeURIComponent(text)}`
    );
  }

  function handleTelegram() {
    const text = buildDeepLinkShareText(post);
    openAppOrCopyFallback(
      post,
      `tg://msg?text=${encodeURIComponent(text)}`,
      'https://telegram.org/',
      'Telegram'
    );
  }

  function handleFacebook() {
    openAppOrCopyFallback(post, 'fb://', 'https://www.facebook.com/', 'Facebook');
  }

  function handleLinkedIn() {
    openAppOrCopyFallback(post, 'linkedin://', 'https://www.linkedin.com/feed/', 'LinkedIn');
  }

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title} selectable>{post.title}</Text>
        <LinearGradient
          colors={colors.gradientUnderline}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underline}
        />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied to clipboard' : 'Copy post text'}
          >
            <FontAwesome name={copied ? 'check' : 'copy'} size={16} color={copied ? colors.cyan : colors.purple} />
            <Text style={[styles.actionText, copied && styles.actionTextActive]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share post"
          >
            <FontAwesome name="share-alt" size={16} color={colors.magenta} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.shareToLabel}>Share to</Text>
        <View style={styles.brandRow}>
          <TouchableOpacity
            style={styles.brandButton}
            activeOpacity={0.7}
            onPress={handleWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="Share to WhatsApp"
          >
            <FontAwesome name="whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.brandButton}
            activeOpacity={0.7}
            onPress={handleTelegram}
            accessibilityRole="button"
            accessibilityLabel="Share to Telegram"
          >
            <FontAwesome name="telegram" size={20} color="#26A5E4" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.brandButton}
            activeOpacity={0.7}
            onPress={handleFacebook}
            accessibilityRole="button"
            accessibilityLabel="Copy post and open Facebook"
          >
            <FontAwesome name="facebook" size={20} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.brandButton}
            activeOpacity={0.7}
            onPress={handleLinkedIn}
            accessibilityRole="button"
            accessibilityLabel="Copy post and open LinkedIn"
          >
            <FontAwesome name="linkedin" size={20} color="#0A66C2" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        <Text style={styles.description} selectable>{post.description}</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontFamily: fonts.heading, color: colors.textPrimary },
  underline: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  actionText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  actionTextActive: {
    color: colors.cyan,
  },
  shareToLabel: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  brandButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.surfaceBorder, marginTop: 16, marginBottom: 16 },
  description: { fontSize: 17, fontFamily: fonts.bodyMedium, lineHeight: 25, color: colors.textPrimary },
});
