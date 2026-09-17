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
        <Text style={styles.title}>LAWBOOK</Text>
        <LinearGradient
          colors={colors.gradientUnderline}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underline}
        />
        <Text style={styles.subtitle}>Browse legal posts and reference material, all in one place.</Text>
        <Button onPress={() => navigation.navigate('BookList')}>Get Started</Button>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          accessibilityLabel="Facebook"
          activeOpacity={0.7}
          onPress={() => openSocialLink(SOCIAL_LINKS.facebook)}
          style={styles.iconButton}
        >
          <FontAwesome name="facebook" size={26} color="#1877F2" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="YouTube"
          activeOpacity={0.7}
          onPress={() => openSocialLink(SOCIAL_LINKS.youtube)}
          style={styles.iconButton}
        >
          <FontAwesome name="youtube-play" size={26} color="#FF0000" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="LinkedIn"
          activeOpacity={0.7}
          onPress={() => openSocialLink(SOCIAL_LINKS.linkedin)}
          style={styles.iconButton}
        >
          <FontAwesome name="linkedin" size={26} color="#0A66C2" />
        </TouchableOpacity>
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
    shadowColor: colors.shadowMagenta,
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
    fontSize: 32,
    fontFamily: fonts.heading,
    color: colors.textPrimary,
    letterSpacing: 3,
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
    padding: 8,
  },
});
