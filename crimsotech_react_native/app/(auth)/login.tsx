// app/(auth)/login.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

type LoginData = {
  username: string;
  password: string;
};

type ServerError = {
  general?: string;
  username?: string;
  password?: string;
  errorType?: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const {
    userId,
    shopId,
    userRole,
    registrationStage,
    loading: authLoading,
    setAuthData,
    updateShopId,
    clearAuthData,
  } = useAuth();

  const [formData, setFormData] = useState<LoginData>({
    username: "",
    password: "",
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginData>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginData>>({});
  const [serverError, setServerError] = useState<ServerError>({});
  const [showPassword, setShowPassword] = useState(false);

  // Clear field errors when user starts typing
  useEffect(() => {
    if (fieldErrors.username && formData.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
    if (fieldErrors.password && formData.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (serverError.general) {
      setServerError({});
    }
  }, [formData.username, formData.password]);

  // Check if user is already logged in
  useEffect(() => {
    if (userId && !authLoading && registrationStage === 4) {
      if (userRole === "customer") {
        router.replace("/customer/home");
      } else if (userRole === "rider") {
        router.replace("/rider/home");
      }
    }
  }, [userId, userRole, registrationStage, authLoading]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginData> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (error: any): { message: string; field?: string } => {
    if (error.response?.data) {
      const serverData = error.response.data;

      // Check for field-specific errors
      if (serverData.username) {
        return { message: serverData.username, field: "username" };
      }
      if (serverData.password) {
        return { message: serverData.password, field: "password" };
      }
      if (serverData.non_field_errors) {
        return { message: serverData.non_field_errors[0], field: "general" };
      }
      if (typeof serverData === "string")
        return { message: serverData, field: "general" };
      if (serverData.error)
        return { message: serverData.error, field: "general" };
      if (serverData.message)
        return { message: serverData.message, field: "general" };
      if (serverData.detail)
        return { message: serverData.detail, field: "general" };
    }

    if (error.message === "Network Error") {
      return {
        message: "Network error. Please check your internet connection.",
        field: "general",
      };
    }

    if (error.code === "ECONNABORTED") {
      return {
        message: "Request timed out. Please try again.",
        field: "general",
      };
    }

    return {
      message: "Invalid username or password. Please try again.",
      field: "general",
    };
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoginLoading(true);
    setServerError({});
    setFieldErrors({});

    try {
      const { username, password } = formData;
      const response = await AxiosInstance.post(
        `/login/`,
        { username, password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        },
      );

      const data = response.data;
      const userRole = data.is_rider ? "rider" : "customer";
      const registrationStage = data.registration_stage || 4;
      const shopId = data.shop_id || data.profile?.shop?.id || null;

      await setAuthData(
        data.user_id || data.id,
        userRole,
        data.username,
        data.email,
        shopId,
        registrationStage,
      );

      // Fetch profile for shop info if needed
      try {
        const profileRes = await AxiosInstance.get("/profile/", {
          headers: {
            "X-User-Id": data.user_id || data.id,
            "Content-Type": "application/json",
          },
        });
        if (profileRes.data?.success && profileRes.data.profile?.shop) {
          const foundShopId = profileRes.data.profile.shop.id;
          if (foundShopId) {
            await updateShopId(foundShopId);
          }
        }
      } catch (profileErr) {
        // Silent fail - not critical
      }

      // Handle navigation based on role and registration stage
      if (userRole === "rider") {
        if (registrationStage === 1) {
          router.replace("/(auth)/signup");
        } else if (registrationStage === 2) {
          router.replace("/(auth)/setup-account");
        } else if (registrationStage === 3) {
          router.replace("/(auth)/verify-phone");
        } else {
          router.replace("/rider/home");
        }
      } else {
        if (registrationStage === 1) {
          router.replace("/(auth)/setup-account");
        } else if (registrationStage === 2) {
          router.replace("/(auth)/verify-phone");
        } else {
          router.replace("/customer/home");
        }
      }
    } catch (error: any) {
      const { message, field } = getErrorMessage(error);
      const statusCode = error.response?.status;

      let userFriendlyMessage = message;
      let errorType = "general";

      if (statusCode === 401) {
        userFriendlyMessage = "Invalid username or password. Please try again.";
        errorType = "credentials";
        // Set field-specific error based on what's likely wrong
        if (!formData.username.trim()) {
          setFieldErrors({ username: "Username is required" });
        } else if (!formData.password) {
          setFieldErrors({ password: "Password is required" });
        } else {
          setFieldErrors({
            username: "Invalid username",
            password: "Invalid password",
          });
        }
      } else if (statusCode === 403) {
        userFriendlyMessage =
          "Your account has been suspended. Please contact support.";
        errorType = "suspended";
        setFieldErrors({ username: userFriendlyMessage });
      } else if (statusCode === 404) {
        userFriendlyMessage = "Account not found. Please check your username.";
        errorType = "not-found";
        setFieldErrors({ username: userFriendlyMessage });
      } else if (statusCode === 429) {
        userFriendlyMessage =
          "Too many login attempts. Please wait a moment and try again.";
        errorType = "rate-limit";
      } else if (statusCode >= 500) {
        userFriendlyMessage = "Server error. Please try again later.";
        errorType = "server";
      } else if (field === "username") {
        setFieldErrors({ username: userFriendlyMessage });
      } else if (field === "password") {
        setFieldErrors({ password: userFriendlyMessage });
      } else {
        setServerError({ general: userFriendlyMessage, errorType });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClearAuth = async () => {
    try {
      await clearAuthData();
      Alert.alert("Success", "Auth data cleared!");
    } catch (error) {
      Alert.alert("Error", "Failed to clear auth data");
    }
  };

  // Show loading while checking initial auth state
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6d0b" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  // Helper to render error message with appropriate styling
  const renderErrorMessage = () => {
    if (!serverError.general) return null;

    const errorType = serverError.errorType;
    let bgColor = "#FEF2F2";
    let borderColor = "#FECACA";
    let textColor = "#991B1B";
    let iconName: keyof typeof MaterialIcons.glyphMap = "error-outline";

    if (errorType === "rate-limit") {
      bgColor = "#FEFCE8";
      borderColor = "#FEF08A";
      textColor = "#854D0E";
      iconName = "access-time";
    } else if (errorType === "suspended") {
      bgColor = "#FEF2F2";
      borderColor = "#FECACA";
      textColor = "#991B1B";
      iconName = "gavel";
    } else if (errorType === "server") {
      bgColor = "#EFF6FF";
      borderColor = "#BFDBFE";
      textColor = "#1E40AF";
      iconName = "computer";
    }

    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: bgColor, borderColor: borderColor },
        ]}
      >
        <MaterialIcons name={iconName} size={20} color={textColor} />
        <View style={styles.errorTextContainer}>
          <Text style={[styles.errorTitle, { color: textColor }]}>
            Login Failed
          </Text>
          <Text style={[styles.errorMessageText, { color: textColor }]}>
            {serverError.general}
          </Text>
          {errorType === "rate-limit" && (
            <Text style={[styles.errorHint, { color: textColor }]}>
              Wait a few minutes before trying again.
            </Text>
          )}
          {errorType === "suspended" && (
            <Text style={[styles.errorHint, { color: textColor }]}>
              Contact customer support for assistance.
            </Text>
          )}
          {errorType === "server" && (
            <Text style={[styles.errorHint, { color: textColor }]}>
              Our team has been notified. Please try again shortly.
            </Text>
          )}
          {(!errorType ||
            errorType === "general" ||
            errorType === "credentials" ||
            errorType === "not-found") && (
            <Text style={[styles.errorHint, { color: textColor }]}>
              Check your credentials and try again.
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Helper to render field error message below input
  const renderFieldError = (field: "username" | "password") => {
    const errorMessage = fieldErrors[field] || errors[field];
    if (!errorMessage) return null;

    return (
      <View style={styles.fieldErrorContainer}>
        <MaterialIcons name="error-outline" size={14} color="#EF4444" />
        <Text style={styles.fieldErrorText}>{errorMessage}</Text>
      </View>
    );
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
        {/* Header with Logo and CrimsoTech */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/crimsotechlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>CrimsoTech</Text>
        </View>

        <View style={styles.content}>
          {/* Login Title */}
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Log in to your account</Text>

          {/* Server Error Message */}
          {renderErrorMessage()}

          {/* Username Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[
                styles.input,
                (errors.username || fieldErrors.username) && styles.inputError,
              ]}
              placeholder="Enter your username"
              placeholderTextColor="#9CA3AF"
              value={formData.username}
              onChangeText={(text) => {
                setFormData({ ...formData, username: text });
                if (errors.username)
                  setErrors({ ...errors, username: undefined });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loginLoading}
            />
            {renderFieldError("username")}
          </View>

          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  (errors.password || fieldErrors.password) &&
                    styles.inputError,
                ]}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(text) => {
                  setFormData({ ...formData, password: text });
                  if (errors.password)
                    setErrors({ ...errors, password: undefined });
                }}
                secureTextEntry={!showPassword}
                editable={!loginLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {renderFieldError("password")}
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              loginLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.signupLink}>Sign up</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
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
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  fieldErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  fieldErrorText: {
    fontSize: 11,
    color: "#EF4444",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  errorMessageText: {
    fontSize: 13,
    marginBottom: 4,
  },
  errorHint: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: "#1a1a1a",
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#ff6d0b",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#ff6d0b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#ff9d6b",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  signupText: {
    fontSize: 13,
    color: "#666",
  },
  signupLink: {
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
  debugContainer: {
    marginTop: 20,
    gap: 10,
  },
  debugButton: {
    backgroundColor: "#5856D6",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  debugButtonText: {
    color: "#FFF",
    fontSize: 14,
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#FFF",
    fontSize: 14,
  },
});
