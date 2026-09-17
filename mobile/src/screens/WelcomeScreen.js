import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import { colors } from '../theme';

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
        <Image source={require('../../assets/musa.jpeg')} style={styles.image} resizeMode="contain" />
        <Text style={styles.title}>Lawbook</Text>
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
  image: { width: 220, height: 124, marginBottom: 24, borderRadius: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
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
