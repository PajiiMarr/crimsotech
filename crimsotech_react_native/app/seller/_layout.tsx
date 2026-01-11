// app/seller/_layout.tsx
import { Stack } from 'expo-router';
import RoleGuard from '../guards/RoleGuard';

export default function SellerLayout() {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <Stack>
        <Stack.Screen 
          name="home" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="products" 
          options={{ 
            title: 'Manage Products',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="orders" 
          options={{ 
            title: 'View Orders',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="analytics" 
          options={{ 
            title: 'Analytics',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="promotions" 
          options={{ 
            title: 'Promotions',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Shop Settings',
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </RoleGuard>
  );
}