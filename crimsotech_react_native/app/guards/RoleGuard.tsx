// guards/RoleGuard.tsx
import { ReactNode, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

type RouteTo = Parameters<typeof router.replace>[0];

type Props = {
  allowedRoles: ('customer' | 'rider' | 'admin')[];
  children: ReactNode;
  redirectTo?: RouteTo;
};

export default function RoleGuard({ 
  allowedRoles, 
  children, 
  redirectTo = '/(auth)/login' 
}: Props) {
  const { userId, userRole, loading, registrationStage } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Not logged in
      if (!userId) {
        router.replace(redirectTo as RouteTo);
        return;
      }

      // Logged in but no role (shouldn't happen)
      if (!userRole) {
        console.warn('User has no role assigned');
        return;
      }

      // Check registration stage: must be 4 to access guarded routes
      if (registrationStage !== 4) {
        router.replace(`${redirectTo}?reason=registration_incomplete&stage=${registrationStage ?? 'unknown'}` as RouteTo);
        return;
      }

      // Check if user role is allowed
      const isAllowed = allowedRoles.includes(userRole);
      if (!isAllowed) {
        router.replace(`${redirectTo}?reason=unauthorized&role=${userRole}` as RouteTo);
      }
    }
  }, [userId, userRole, loading, registrationStage, allowedRoles, redirectTo]);

  // Show nothing while loading
  if (loading) return null;
  
  // Check if user is logged in and has proper role
  if (!userId || !userRole) return null;
  
  const isAllowed = allowedRoles.includes(userRole);
  if (!isAllowed) return null;

  return <>{children}</>;
}