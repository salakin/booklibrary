import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import WelcomeScreen from './src/screens/WelcomeScreen';
import BookListScreen from './src/screens/BookListScreen';
import LatestScreen from './src/screens/LatestScreen';
import SearchScreen from './src/screens/SearchScreen';
import SavedScreen from './src/screens/SavedScreen';
import HomeScreen from './src/screens/HomeScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import { colors, fonts } from './src/theme';

const Stack = createNativeStackNavigator();

// Keep the native splash screen up until fonts are loaded, instead of
// flashing system-font text before the app font is ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Neon Arcade - Light nav theme: light-lavender background/surfaces so
// screen transitions/background flashes (e.g. during native-stack push
// animations) stay on-theme.
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.surfaceBorder,
    primary: colors.accent,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 17 },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="BookList"
          component={BookListScreen}
          options={{
            title: 'BOOKS',
            headerTitleAlign: 'center',
            // Same color as the hero banner below it, so the two read as one block.
            headerStyle: { backgroundColor: colors.hero },
            headerTintColor: colors.white,
            headerTitleStyle: { color: colors.white, fontFamily: fonts.headingBold, fontSize: 17 },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ route }) => ({ title: (route.params?.bookTitle ?? 'Posts').toUpperCase() })}
        />
        <Stack.Screen name="Latest" component={LatestScreen} options={{ title: 'LATEST' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'SEARCH' }} />
        <Stack.Screen name="Saved" component={SavedScreen} options={{ title: 'SAVED' }} />
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={({ route }) => ({ title: route.params?.post?.title ?? 'Post' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
