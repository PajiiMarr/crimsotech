// app/_layout.tsx
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ShopProvider } from '@/contexts/ShopContext';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Wrapper component to handle auth state and navigation
function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  // If still loading auth status, show nothing (or implement a splash screen)
  if (isLoading) {
    return null; // This will show a blank screen while checking auth status
  }

  // If user is not authenticated, show auth screens
  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(auth)/login"
          options={{
            headerShown: false,
            title: 'Login'
          }}
        />
        <Stack.Screen
          name="(auth)/signup"
          options={{
            headerShown: false,
            title: 'Sign Up'
          }}
        />
        <Stack.Screen
          name="(auth)/setup-account"
          options={{
            headerShown: false,
            title: 'Setup Account'
          }}
        />
        <Stack.Screen
          name="(auth)/verify-phone"
          options={{
            headerShown: false,
            title: 'Verify Phone'
          }}
        />
      </Stack>
    );
  }

  // If registration not complete, expose profiling steps even if authenticated
  if ((user as any)?.registration_stage && (user as any).registration_stage < 4) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(auth)/setup-account"
          options={{ headerShown: false, title: 'Setup Account' }}
        />
        <Stack.Screen
          name="(auth)/verify-phone"
          options={{ headerShown: false, title: 'Verify Phone' }}
        />
      </Stack>
    );
  }

  // If user is a rider (and not a customer), restrict to rider-only UI like web
  if ((user as any)?.is_rider && !(user as any)?.is_customer) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="rider"
          options={{ headerShown: false, title: 'Rider' }}
        />
      </Stack>
    );
  }

  // Otherwise (customers, or multi-role), show the customer app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="main"
        options={{ headerShown: false, title: 'Main' }}
      />
      {/* Only register the group; its children live in pages/_layout.tsx */}
      <Stack.Screen
        name="pages"
        options={{ headerShown: false, title: 'Pages' }}
      />
      {/* Include rider group only if needed later for multi-role; keep minimal now */}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ShopProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <RootLayoutNav />
        </SafeAreaProvider>
      </AuthProvider>
    </ShopProvider>
  );
}