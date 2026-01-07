import { Stack } from 'expo-router';

export default function PagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="tracking" />
      <Stack.Screen name="purchases" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="product-detail" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="category/[id]" />
    </Stack>
  );
}

