// app/rider/_layout.tsx
import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoleGuard from '../guards/RoleGuard';
import RiderBottomTab from './includes/bottomTab';

export default function RiderLayout() {
  return (
    <RoleGuard allowedRoles={['rider']}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Tabs
          tabBar={(props) => <RiderBottomTab {...(props as any)} />}
          screenOptions={{
            tabBarShowLabel: false,
            tabBarStyle: {
              display: 'none',
            },
          }}
        >
          <Tabs.Screen 
            name="home" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Tabs.Screen 
            name="orders" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Tabs.Screen 
            name="schedule" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Tabs.Screen 
            name="earnings" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Tabs.Screen 
            name="message" 
            options={{ 
              headerShown: false,
            }} 
          />
        </Tabs>
      </SafeAreaView>
    </RoleGuard>
  );
}