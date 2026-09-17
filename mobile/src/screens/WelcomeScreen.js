import { Image, StyleSheet, Text } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import { colors } from '../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <ScreenBackground style={styles.container}>
      <Image source={require('../../assets/lawlogo.jpeg')} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>Lawbook</Text>
      <Text style={styles.subtitle}>Browse legal posts and reference material, all in one place.</Text>
      <Button onPress={() => navigation.replace('BookList')}>Get Started</Button>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  image: { width: 160, height: 160, marginBottom: 24, borderRadius: 80 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 32,
    lineHeight: 22,
  },
});
