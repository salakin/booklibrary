import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import WelcomeScreen from './src/screens/WelcomeScreen';
import BookListScreen from './src/screens/BookListScreen';
import HomeScreen from './src/screens/HomeScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

// Light theme nav container so screen transitions/background flashes
// (e.g. during native-stack push animations) stay light/white.
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
  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BookList" component={BookListScreen} options={{ title: 'Books' }} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ route }) => ({ title: route.params?.bookTitle ?? 'Posts' })}
        />
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={({ route }) => ({ title: route.params?.post?.title ?? 'Post' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
