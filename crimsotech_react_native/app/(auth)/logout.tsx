import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "expo-router";

export default function Logout() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await logout();
      } catch (err) {
        console.error("Logout failed", err);
        // Fallback to login page
        router.replace("/(auth)/login");
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ff6d0b" />
      <Text style={styles.text}>Logging out...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});
