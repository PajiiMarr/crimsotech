// app/_layout.tsx
import { useEffect } from "react";
import { Linking, Platform, Alert } from "react-native";
import { router, Slot, SplashScreen } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn("Error hiding splash screen:", e);
      }
    };

    hideSplash();

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener("url", handleDeepLinkEvent);

    // Handle deep link that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL (cold start):", url);
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLinkEvent = ({ url }: { url: string }) => {
    console.log("Deep link received (warm start):", url);
    handleDeepLink(url);
  };

  const handleDeepLink = (url: string) => {
    if (!url) return;

    try {
      console.log("Processing deep link:", url);

      // Parse the URL
      // Format: crimsotechreactnative://order-successful/ORDER_ID
      const route = url.replace(/.*?:\/\//g, "");
      console.log("Parsed route:", route);

      const [path, queryString] = route.split("?");
      const pathParts = path.split("/").filter(Boolean);

      console.log("Path parts:", pathParts);
      console.log("Query string:", queryString);

      // Handle order-successful deep link
      if (pathParts[0] === "order-successful") {
        const orderId = pathParts[1];

        if (!orderId) {
          console.error("No order ID found in deep link");
          return;
        }

        console.log("Navigating to order-successful with orderId:", orderId);

        router.replace({
          pathname: "/customer/order-successful",
          params: { orderId: orderId },
        });
        return;
      }

      // Handle pay-order deep link (for failures/cancellations)
      if (pathParts[0] === "pay-order") {
        const params = queryString ? new URLSearchParams(queryString) : null;
        const orderId = params?.get("order_id");
        const status = params?.get("status");

        if (!orderId) {
          console.error("No order ID found in pay-order deep link");
          return;
        }

        console.log("Navigating to pay-order:", orderId, status);

        if (status === "failed") {
          Alert.alert(
            "Payment Failed",
            "Your payment could not be processed. Please try again.",
            [
              {
                text: "OK",
                onPress: () =>
                  router.replace(`/customer/pay-order?order_id=${orderId}`),
              },
            ],
          );
        } else if (status === "cancelled") {
          Alert.alert(
            "Payment Cancelled",
            "You cancelled the payment. You can try again when ready.",
            [
              {
                text: "OK",
                onPress: () =>
                  router.replace(`/customer/pay-order?order_id=${orderId}`),
              },
            ],
          );
        }
        return;
      }

      console.warn("Unknown deep link path:", pathParts[0]);
    } catch (error) {
      console.error("Error handling deep link:", error);
    }
  };

  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
