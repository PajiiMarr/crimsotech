// app/(auth)/signup.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AxiosInstance from "../../contexts/axios";
import * as SecureStore from "expo-secure-store";

export default function SignupScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {
      username: "",
      password: "",
      confirmPassword: "",
    };

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username should be at least 3 characters";
    } else if (username.length > 100) {
      newErrors.username = "Username should be at most 100 characters";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 3) {
      newErrors.password = "Password should be at least 3 characters";
    } else if (password.length > 100) {
      newErrors.password = "Password should be at most 100 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return (
      !newErrors.username && !newErrors.password && !newErrors.confirmPassword
    );
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        username,
        password,
        registration_stage: 1,
        is_customer: true,
      };

      console.log("🚀 Sending signup request:", payload);

      const response = await AxiosInstance.post("/register/", payload);

      console.log("✅ Signup API Response:", response.data);

      if (response.data && response.data.user_id) {
        const userId = response.data.user_id;

        // Save user ID to SecureStore for next stages
        await SecureStore.setItemAsync("temp_user_id", userId.toString()); // Also save a minimal user object so setup-account can detect the session
        const userObj = {
          user_id: userId,
          registration_stage: 1,
          is_rider: false,
          username: username,
        };
        await SecureStore.setItemAsync("user", JSON.stringify(userObj));
        // Navigate to profiling stage (Stage 1 for customers, Stage 2 for riders)
        Alert.alert(
          "Success",
          "Account created successfully! Please complete your profile.",
          [
            {
              text: "Continue",
              onPress: () => {
                router.replace("/(auth)/setup-account");
              },
            },
          ],
        );
      }
    } catch (error: any) {
      console.error("❌ Signup error:", error.response?.data || error.message);

      if (error.response?.status === 400) {
        const errorData = error.response.data;

        if (errorData.username) {
          Alert.alert(
            "Username Taken",
            "This username is already taken. Please choose another.",
          );
        } else if (errorData.error) {
          Alert.alert("Error", errorData.error);
        } else {
          Alert.alert("Validation Error", "Please check your input");
        }
      } else if (error.request) {
        Alert.alert("Network Error", "Cannot connect to server");
      } else {
        Alert.alert("Error", "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/crimsotechlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>CrimsoTech</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Join CrimsoTech</Text>
          <Text style={styles.subtitle}>
            Create an account to start shopping
          </Text>

          {/* Username Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder="Choose a username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (text.trim() && errors.username) {
                  setErrors((prev) => ({ ...prev, username: "" }));
                }
              }}
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : null}
          </View>

          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  errors.password && styles.inputError,
                ]}
                placeholder="Create a password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (text.trim() && errors.password) {
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (text.trim() && errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Rider Sign Up Link */}
          <View style={styles.riderLinkContainer}>
            <MaterialIcons name="two-wheeler" size={20} color="#ff6d0b" />
            <Text style={styles.riderText}>Want to deliver? </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/rider-apply")}
              disabled={loading}
            >
              <Text style={styles.riderLink}>Apply as Rider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 25,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    color: "#1a1a1a",
    textAlign: "left",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 24,
    textAlign: "left",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1a1a1a",
    backgroundColor: "#f9f9f9",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 45,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 8,
  },
  inputError: {
    borderColor: "#ff6d0b",
  },
  errorText: {
    color: "#ff6d0b",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  signupButton: {
    backgroundColor: "#ff6d0b",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 10,
    shadowColor: "#ff6d0b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#ff9d6b",
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  loginText: {
    fontSize: 13,
    color: "#666",
  },
  loginLink: {
    fontSize: 13,
    color: "#1a1a1a",
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#eee",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 13,
  },
  riderLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff7f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffe8d9",
  },
  riderText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
  },
  riderLink: {
    fontSize: 13,
    color: "#ff6d0b",
    fontWeight: "700",
  },
});
