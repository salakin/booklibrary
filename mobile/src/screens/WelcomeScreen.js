import { LinearGradient } from 'expo-linear-gradient';
import { Image, Linking, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import { colors, fonts } from '../theme';

// TODO: replace with real social media links
const SOCIAL_LINKS = {
  facebook: 'https://facebook.com',
  youtube: 'https://youtube.com',
  linkedin: 'https://linkedin.com',
};

const SOCIALS = [
  { label: 'Facebook', icon: 'facebook', color: '#1877F2', url: SOCIAL_LINKS.facebook },
  { label: 'YouTube', icon: 'youtube-play', color: '#FF0000', url: SOCIAL_LINKS.youtube },
  { label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', url: SOCIAL_LINKS.linkedin },
];

function openSocialLink(url) {
  Linking.openURL(url).catch((err) => {
    console.warn('Could not open link:', url, err);
  });
}

export default function WelcomeScreen({ navigation }) {
  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Image source={require('../../assets/musa.jpeg')} style={styles.logoImage} resizeMode="cover" />
        </View>
        <Text style={styles.title}>LAW BUSINESS</Text>
        <LinearGradient
          colors={colors.gradientUnderline}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underline}
        />
        <Text style={styles.subtitle}>Browse legal posts and reference material, all in one place.</Text>
        <Button icon="arrow-right" onPress={() => navigation.navigate('BookList')}>Get Started</Button>
      </View>

      <View style={styles.footer}>
        {SOCIALS.map((s) => (
          <TouchableOpacity
            key={s.label}
            accessibilityLabel={s.label}
            activeOpacity={0.7}
            onPress={() => openSocialLink(s.url)}
            // Brand color as a soft tinted circle (hex + 1F = ~12% opacity).
            style={[styles.iconButton, { backgroundColor: `${s.color}1F` }]}
          >
            <FontAwesome name={s.icon} size={22} color={s.color} />
          </TouchableOpacity>
        ))}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 1,
    backgroundColor: '#FAF9F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.shadowBrand,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 51,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  underline: {
    width: 64,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 32,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
