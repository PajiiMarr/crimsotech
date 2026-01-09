// app/(auth)/verify-phone.tsx
import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG } from '@/utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function VerifyPhoneScreen() {
  const { register } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (step === "otp") {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  // Resolve current user id from SecureStore or AsyncStorage
  const getUserId = async (): Promise<string | null> => {
    try {
      const storedUser = await SecureStore.getItemAsync('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.user_id || parsed.id || null;
      }
    } catch {}
    const asyncId = await AsyncStorage.getItem('userId');
    return asyncId;
  };

  const handleSendOtp = () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    if (!/^[0-9+\-\s()]{10,}$/.test(phone)) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    Alert.alert("OTP Sent", `SMS code sent to ${phone}`);
    setStep("otp");
    setTimer(60);
    setCanResend(false);
  };

  const handleOtpChange = (text: string, index: number) => {
    const numericText = text.replace(/[^0-9]/g, "");

    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    if (numericText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && numericText) {
      const otpString = newOtp.join("");
      if (otpString.length === 6) {
        verifyOtp();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const otpString = otp.join("");

    if (otpString === "123456") {
      // In a real app, you would verify the OTP with the backend
      // For now, we'll proceed to complete registration with the backend
      try {
        // Promote registration to stage 4 (complete) to match web flow
        const userId = await getUserId();
        if (userId) {
          try {
            const promoteRes = await fetch(`${API_CONFIG.BASE_URL}/api/register/`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId,
              },
              body: JSON.stringify({ registration_stage: 4 }),
            });
            const promoteData = await promoteRes.json().catch(() => null);
            if (promoteRes.ok) {
              // Re-fetch fresh user data to capture correct role flags
              try {
                const userRes = await fetch(`${API_CONFIG.BASE_URL}/api/login/`, {
                  method: 'GET',
                  headers: { 'X-User-Id': userId },
                });
                const userData = await userRes.json().catch(() => null);
                if (userRes.ok && userData) {
                  await SecureStore.setItemAsync('user', JSON.stringify(userData));
                } else {
                  // Fallback: update just the stage if GET failed
                  const stored = await SecureStore.getItemAsync('user');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    await SecureStore.setItemAsync('user', JSON.stringify({ ...parsed, registration_stage: 4 }));
                  }
                }
              } catch {}
            } else {
              console.warn('Failed to set registration_stage to 4:', promoteData);
            }
          } catch (e) {
            console.warn('Error promoting registration_stage to 4:', e);
          }
        }

        Alert.alert("Success", "Phone number verified successfully!");

        // Route based on role: riders go to Rider Dashboard, others to main home
        try {
          const storedIsRider = await AsyncStorage.getItem('is_rider');
          if (storedIsRider === 'true') {
            router.replace('/rider');
          } else {
            router.replace('/main/home');
          }
        } catch {
          router.replace('/main/home');
        }
      } catch (error: any) {
        // Handle verification error with specific messages
        if (error.response) {
          // Handle specific error responses from backend
          const errorResponse = error.response;
          let errorMessage = '';
          if (errorResponse.error) {
            errorMessage = errorResponse.error;
          } else if (errorResponse.message) {
            errorMessage = errorResponse.message;
          } else if (errorResponse.detail) {
            errorMessage = errorResponse.detail;
          } else {
            errorMessage = 'Verification failed. Please try again.';
          }

          Alert.alert("Error", errorMessage);
        } else {
          // Handle network or other errors
          console.error('Verification error:', error);
          Alert.alert("Error", "Verification failed. Please try again.");
        }
      }
    } else {
      Alert.alert("Error", "Invalid OTP. Please try again.");
    }
  };

  const resendOtp = () => {
    if (canResend) {
      setTimer(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

      Alert.alert("OTP Resent", `New SMS code sent to ${phone}`);
    }
  };

  const changePhoneNumber = () => {
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>CrimsoTech</Text>
        </View>

        <View style={styles.content}>
          {/* Step 1: Phone Number Input */}
          {step === "phone" ? (
            <>
              <Text style={styles.title}>Verify Your Phone</Text>
              <Text style={styles.subtitle}>
                Enter your phone number to receive a verification code
              </Text>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+63 912 345 6789"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <Text style={styles.hintText}>
                  We&apos;ll send a 6-digit SMS code to this number
                </Text>
              </View>

              {/* Send OTP Button */}
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendOtp}
              >
                <Text style={styles.sendButtonText}>
                  Send Verification Code
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Step 2: OTP Input */}
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to
              </Text>
              <Text style={styles.phoneNumber}>{phone}</Text>

              {/* Change Phone Link */}
              <TouchableOpacity
                onPress={changePhoneNumber}
                style={styles.changePhone}
              >
                <Text style={styles.changePhoneText}>Change phone number</Text>
              </TouchableOpacity>

              {/* OTP Inputs */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) inputRefs.current[index] = ref;
                    }}
                    style={[styles.otpInput, digit && styles.otpInputFilled]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {/* Timer */}
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {canResend ? "Code expired" : `Resend code in ${timer}s`}
                </Text>
              </View>

              {/* Verify Button */}
              <TouchableOpacity style={styles.verifyButton} onPress={verifyOtp}>
                <Text style={styles.verifyButtonText}>Verify & Continue</Text>
              </TouchableOpacity>

              {/* Resend OTP */}
              <TouchableOpacity
                style={[
                  styles.resendButton,
                  !canResend && styles.resendButtonDisabled,
                ]}
                onPress={resendOtp}
                disabled={!canResend}
              >
                <Text
                  style={[
                    styles.resendButtonText,
                    !canResend && styles.resendButtonTextDisabled,
                  ]}
                >
                  Resend SMS Code
                </Text>
              </TouchableOpacity>
            </>
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
    paddingTop: 60,
    paddingLeft: 40,
    paddingBottom: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 40,
    paddingTop: 0,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: "#ff6d0bff",
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 20,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  changePhone: {
    alignSelf: "center",
    marginBottom: 30,
  },
  changePhoneText: {
    fontSize: 14,
    color: "#ff6d0bff",
    fontWeight: "500",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 60,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 24,
    color: "#333",
    backgroundColor: "#fff",
  },
  otpInputFilled: {
    borderColor: "#ff6d0bff",
    backgroundColor: "#fffaf5",
  },
  timerContainer: {
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  verifyButton: {
    backgroundColor: "#ff6d0bff",
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 20,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ff6d0bff",
    alignSelf: "center",
  },
  resendButtonDisabled: {
    borderColor: "#ddd",
    opacity: 0.5,
  },
  resendButtonText: {
    color: "#ff6d0bff",
    fontSize: 14,
    fontWeight: "500",
  },
  resendButtonTextDisabled: {
    color: "#999",
  },
});
