import { Stack } from 'expo-router';

export default function RiderLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Rider Dashboard' }} />
      <Stack.Screen name="deliveries" options={{ title: 'My Deliveries' }} />
    </Stack>
  );
}
