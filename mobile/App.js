import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import ReaderScreen from './src/screens/ReaderScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'My Library' }} />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={({ route }) => ({ title: route.params?.book?.title ?? 'Reader' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
