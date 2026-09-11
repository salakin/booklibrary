import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Posts' }} />
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={({ route }) => ({ title: route.params?.post?.title ?? 'Post' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
