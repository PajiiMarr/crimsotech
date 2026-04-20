// app/rider/_layout.tsx
import { Tabs, router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import RoleGuard from "../guards/RoleGuard";
import RiderBottomTab from "./includes/bottomTab";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

export default function RiderLayout() {
  const { userId, userRole, registrationStage, loading } = useAuth();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const routeForStage = (stage?: number | null) => {
      if (stage === 1) return "/(auth)/signup";
      if (stage === 2) return "/(auth)/setup-account";
      if (stage === 3) return "/(auth)/verify-phone";
      return null;
    };

    const checkRiderVerification = async () => {
      if (loading) return;
      if (!userId || userRole !== "rider") {
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        const localStage = registrationStage ?? null;
        if (localStage && localStage < 4) {
          const target = routeForStage(localStage);
          if (target) router.replace(target as any);
          if (!cancelled) setChecking(false);
          return;
        }

        const regResponse = await AxiosInstance.get("/get-registration/", {
          headers: { "X-User-Id": userId },
        });

        const remoteStage = regResponse.data?.registration_stage;
        if (typeof remoteStage === "number" && remoteStage < 4) {
          const target = routeForStage(remoteStage);
          if (target) router.replace(target as any);
          if (!cancelled) setChecking(false);
          return;
        }

        const riderResponse = await AxiosInstance.get(
          "/admin-riders/check-verification/",
          { headers: { "X-User-Id": userId } }
        );

        const verified = Boolean(riderResponse.data?.verified);
        setIsVerified(verified);
        
        // If not verified and not already on pending-verification screen, redirect
        if (!verified && !pathname.includes("/rider/pending-verification")) {
          router.replace("/rider/pending-verification" as any);
        }
        
        // If verified and on pending-verification screen, redirect to home
        if (verified && pathname.includes("/rider/pending-verification")) {
          router.replace("/rider/home" as any);
        }
      } catch (error) {
        // On error, redirect to pending-verification if not already there
        if (!pathname.includes("/rider/pending-verification")) {
          router.replace("/rider/pending-verification" as any);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    checkRiderVerification();

    return () => {
      cancelled = true;
    };
  }, [loading, userId, userRole, registrationStage, pathname]);

  if (checking) return null;

  // Check if we're on the pending-verification screen
  const isPendingVerification = pathname.includes("/rider/pending-verification");

  return (
    <RoleGuard allowedRoles={["rider"]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Tabs
          tabBar={(props) => {
            // Only show tab bar if user is verified
            if (isVerified && !isPendingVerification) {
              return <RiderBottomTab {...(props as any)} />;
            }
            // Return null to hide tab bar on pending-verification or when not verified
            return null;
          }}
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: { display: "none" },
          }}
        >
          <Tabs.Screen name="home" options={{ headerShown: false }} />
          <Tabs.Screen name="active-orders" options={{ headerShown: false }} />
          <Tabs.Screen name="history" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="schedule" options={{ headerShown: false }} />
          <Tabs.Screen name="earnings" options={{ headerShown: false }} />
          <Tabs.Screen name="message" options={{ headerShown: false }} />
          <Tabs.Screen name="notification" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="edit-profile" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="settings" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="delivery-details" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="active-order-details" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="add-delivery-media" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="add-proof" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="withdraw" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="rider-view-order" options={{ headerShown: false, href: null }} />
          <Tabs.Screen name="pending-verification" options={{ headerShown: false }} />
          <Tabs.Screen name="pendings" options={{ headerShown: false }} />
        </Tabs>
      </SafeAreaView>
    </RoleGuard>
  );
}