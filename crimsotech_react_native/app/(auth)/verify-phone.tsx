import React, { useState, useEffect, useRef } from "react";
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
  TextInput as RNTextInput,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AxiosInstance from "../../contexts/axios";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../contexts/AuthContext";

export default function VerifyPhoneScreen() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRider, setIsRider] = useState(false);
  const { updateRegistrationStage, setAuthData } = useAuth();

  // Phone verification state
  const [step, setStep] = useState<"enter-phone" | "enter-otp">("enter-phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<{
    phoneNumber?: string;
    otp?: string;
    general?: string;
  }>({});

  // Create refs for OTP inputs
  const otpInputs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const loadUserData = async () => {
    try {
      const storedUserId = await SecureStore.getItemAsync("temp_user_id");
      if (storedUserId) {
        setUserId(storedUserId);

        // Prefer locally stored role first so flow is resilient to slow API calls.
        const userJson = await SecureStore.getItemAsync("user");
        if (userJson) {
          const localUser = JSON.parse(userJson);
          if (typeof localUser?.is_rider === "boolean") {
            setIsRider(localUser.is_rider);
          }
        }

        // Check if user is a rider
        const response = await AxiosInstance.get("/get-registration/", {
          headers: { "X-User-Id": storedUserId },
        });

        if (typeof response.data?.is_rider === "boolean") {
          setIsRider(response.data.is_rider);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const resolveEffectiveIsRider = async (currentUserId: string) => {
    // 1) Current state
    if (isRider) return true;

    // 2) Stored user object from previous registration steps
    try {
      const userJson = await SecureStore.getItemAsync("user");
      if (userJson) {
        const localUser = JSON.parse(userJson);
        if (typeof localUser?.is_rider === "boolean") {
          return localUser.is_rider;
        }
      }
    } catch (e) {
      console.warn("Unable to read local user role", e);
    }

    // 3) Explicit flag used in rider apply flow
    try {
      const riderFlag = await SecureStore.getItemAsync("is_rider");
      if (riderFlag === "true") return true;
      if (riderFlag === "false") return false;
    } catch (e) {
      console.warn("Unable to read is_rider flag", e);
    }

    // 4) Remote source of truth
    try {
      const response = await AxiosInstance.get("/get-registration/", {
        headers: { "X-User-Id": currentUserId },
      });
      return Boolean(response.data?.is_rider);
    } catch (e) {
      console.warn("Unable to fetch role from registration endpoint", e);
    }

    return false;
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, "");

    // If starts with 63, remove it (we'll add +63 manually)
    let cleanDigits = digits;
    if (digits.startsWith("63")) {
      cleanDigits = digits.slice(2);
    }

    // Keep only first 10 digits
    return cleanDigits.slice(0, 10);
  };

  const handlePhoneNumberChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    if (errors.phoneNumber) {
      setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    // Only allow single digit
    const digit = value.slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }

    if (errors.otp) {
      setErrors((prev) => ({ ...prev, otp: undefined }));
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    // Handle backspace to go to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const validatePhoneNumber = () => {
    if (!phoneNumber.trim()) {
      setErrors((prev) => ({
        ...prev,
        phoneNumber: "Phone number is required",
      }));
      return false;
    }

    if (!phoneNumber.startsWith("9")) {
      setErrors((prev) => ({
        ...prev,
        phoneNumber: "Philippine number must start with 9",
      }));
      return false;
    }

    if (phoneNumber.length !== 10) {
      setErrors((prev) => ({
        ...prev,
        phoneNumber: "Phone number must be 10 digits",
      }));
      return false;
    }

    return true;
  };

  const validateOtp = () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setErrors((prev) => ({
        ...prev,
        otp: "Please enter complete 6-digit OTP",
      }));
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber() || !userId) return;

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        action_type: "send_otp",
        contact_number: phoneNumber,
      };

      const response = await AxiosInstance.post(
        "/verify/verify_number/",
        payload,
        {
          headers: { "X-User-Id": userId },
        },
      );

      console.log("✅ OTP sent:", response.data);

      Alert.alert("OTP Sent", `OTP has been sent to +63${phoneNumber}`);
      setStep("enter-otp");
      setCooldown(60); // 60 seconds cooldown
      
      // Reset OTP when moving to OTP step
      setOtp(["", "", "", "", "", ""]);
    } catch (error: any) {
      console.error("❌ OTP error:", error.response?.data || error.message);

      const errorMessage =
        error.response?.data?.error || "Failed to send OTP. Please try again.";
      setErrors((prev) => ({ ...prev, general: errorMessage }));
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOtp() || !userId) return;

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        action_type: "verify_otp",
        contact_number: phoneNumber,
        otp_code: otp.join(""),
      };

      const response = await AxiosInstance.post(
        "/verify/verify_number/",
        payload,
        {
          headers: { "X-User-Id": userId },
        },
      );

      console.log("✅ OTP verified:", response.data);

      const effectiveIsRider = await resolveEffectiveIsRider(userId);

      // UPDATED: Set registration_stage to 3 for customers (completed)
      // For riders: stage 3 → stage 4 (completed)
      // For customers: stage 2 → stage 3 (completed)
      const newRegistrationStage = effectiveIsRider ? 4 : 3;

      await AxiosInstance.put(
        "/profiling/",
        {
          registration_stage: newRegistrationStage,
        },
        {
          headers: { "X-User-Id": userId },
        },
      );

      // Update user data in storage
      const userJson = await SecureStore.getItemAsync("user");
      if (userJson) {
        const user = JSON.parse(userJson);
        user.registration_stage = newRegistrationStage;
        user.is_rider = effectiveIsRider;
        await SecureStore.setItemAsync("user", JSON.stringify(user));
      }

      await SecureStore.setItemAsync("is_rider", effectiveIsRider ? "true" : "false");
      await SecureStore.setItemAsync("registration_stage", String(newRegistrationStage));

      try {
        await setAuthData(
          userId,
          effectiveIsRider ? "rider" : "customer",
          undefined,
          undefined,
          undefined,
          newRegistrationStage,
        );
      } catch (e) {
        console.warn("Failed to persist auth role before redirect", e);
      }

      // Update context registration stage
      try {
        updateRegistrationStage(newRegistrationStage);
      } catch (e) {
        console.warn("Failed to update registration stage in context", e);
      }

      // Clear temporary storage
      await SecureStore.deleteItemAsync("temp_user_id");

      const debugSummary = `role=${effectiveIsRider ? "rider" : "customer"}, stage=${newRegistrationStage}`;
      console.log("🔎 OTP redirect debug:", debugSummary);

      const successMessage = __DEV__
        ? `Phone number verified successfully!\n\nDebug: ${debugSummary}`
        : "Phone number verified successfully!";

      Alert.alert("Success", successMessage, [
        {
          text: "Continue",
          onPress: () => {
            // Navigate based on user role and completion stage.
            // Rider completes at stage 4, customer completes at stage 3.
            if (effectiveIsRider) {
              if (newRegistrationStage >= 4) {
                router.replace("/rider/home");
              } else {
                // Stay on flow or redirect to login to continue later
                router.replace("/(auth)/login");
              }
            } else {
              if (newRegistrationStage >= 3) {
                router.replace("/customer/home");
              } else {
                // If not complete, continue via auth flow
                router.replace("/(auth)/login");
              }
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error(
        "❌ Verification error:",
        error.response?.data || error.message,
      );

      const errorMessage =
        error.response?.data?.error || "Invalid OTP. Please try again.";
      setErrors((prev) => ({ ...prev, general: errorMessage }));
      Alert.alert("Error", errorMessage);
      
      // Clear OTP on error to allow re-entry
      setOtp(["", "", "", "", "", ""]);
      // Focus the first input
      setTimeout(() => otpInputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    try {
      const payload = {
        action_type: "send_otp",
        contact_number: phoneNumber,
      };

      const response = await AxiosInstance.post(
        "/verify/verify_number/",
        payload,
        {
          headers: { "X-User-Id": userId },
        },
      );

      console.log("✅ OTP resent:", response.data);
      Alert.alert("OTP Resent", `New OTP has been sent to +63${phoneNumber}`);
      setCooldown(60);
      
      // Clear OTP and focus first input
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpInputs.current[0]?.focus(), 100);
    } catch (error: any) {
      console.error("❌ Resend error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getOtpInputs = () => {
    return (
      <View style={styles.otpContainer}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              otpInputs.current[index] = ref;
            }}
            style={[styles.otpInput, errors.otp && styles.inputError]}
            value={otp[index]}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={(e) => handleOtpKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!loading}
            selectTextOnFocus
          />
        ))}
      </View>
    );
  };

  // Focus first OTP input when OTP screen appears
  useEffect(() => {
    if (step === "enter-otp") {
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

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
          <Text style={styles.title}>Phone Verification</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number to receive a verification code and complete
            your registration.
          </Text>

          {step === "enter-phone" ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.countryCode}>+63</Text>
                  <TextInput
                    style={[
                      styles.phoneInput,
                      errors.phoneNumber && styles.inputError,
                    ]}
                    placeholder="9XXXXXXXXX"
                    value={phoneNumber}
                    onChangeText={handlePhoneNumberChange}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
                {errors.phoneNumber && (
                  <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                )}
                <Text style={styles.helperText}>
                  Enter your 10-digit Philippine mobile number starting with 9
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Enter OTP</Text>
                <Text style={styles.otpInstruction}>
                  Enter the 6-digit OTP sent to +63{phoneNumber}
                </Text>

                {getOtpInputs()}

                {errors.otp && (
                  <Text style={styles.errorText}>{errors.otp}</Text>
                )}

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn&apos;t receive OTP? </Text>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={loading || cooldown > 0}
                  >
                    <Text
                      style={[
                        styles.resendButtonText,
                        (loading || cooldown > 0) && styles.resendDisabled,
                      ]}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={() => setStep("enter-phone")}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Change Number</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.join("").length !== 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {errors.general && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#ff6d0b" />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}
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
    paddingTop: Platform.OS === "ios" ? 80 : 60,
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
    paddingTop: 0,
    marginTop: 30,
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  countryCode: {
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    backgroundColor: "#f0f0f0",
    lineHeight: 48,
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  helperText: {
    fontSize: 11,
    color: "#666",
    marginTop: 6,
    marginLeft: 4,
  },
  otpInstruction: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
    textAlign: "left",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  otpInput: {
    width: "14%",
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
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
  submitButton: {
    backgroundColor: "#ff6d0b",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
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
    borderColor: "#ff9d6b",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonContainer: {
    gap: 12,
  },
  secondaryButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  resendText: {
    fontSize: 13,
    color: "#666",
  },
  resendButtonText: {
    fontSize: 13,
    color: "#1a1a1a",
    fontWeight: "700",
  },
  resendDisabled: {
    color: "#ccc",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 14,
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  generalErrorText: {
    color: "#ff6d0b",
    fontSize: 13,
    marginLeft: 8,
  },
});