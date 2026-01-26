// app/(auth)/login.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

type LoginData = {
  username: string;
  password: string;
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
    clearAuthData 
  } = useAuth();
  
  const [formData, setFormData] = useState<LoginData>({
    username: '',
    password: '',
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginData>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    console.log('🔄 Login screen - Auth state:', { 
      userId, 
      shopId,
      userRole,
      registrationStage,
      authLoading 
    });

    // Only auto-redirect to home if registration is fully complete (stage === 4)
    if (userId && !authLoading && registrationStage === 4) {
      console.log('✅ User already logged in and fully registered, redirecting to home...');
      if (userRole === 'customer') {
        router.replace('/customer/home');
      } else if (userRole === 'rider') {
        router.replace('/rider/home');
      }
    }
  }, [userId, userRole, registrationStage, authLoading]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoginLoading(true);
    try {
      const { username, password } = formData;
      const response = await AxiosInstance.post(`/login/`,{ username, password },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const data = response.data;
      console.log('✅ Login response:', data);

      // ✅ Determine user role based on response
      const userRole = data.is_rider ? 'rider' : 'customer';
      
      // ✅ Get shop ID if available
      const shopId = data.shop_id || data.profile?.shop?.id || null;

      // ✅ Save auth data using new context
      await setAuthData(
        data.user_id || data.id, // user ID
        userRole, // user role
        data.username, // username
        data.email, // email
        shopId, // shop ID (optional)
        data.registration_stage // registration stage (optional)
      );

      // Try to fetch full profile immediately to obtain shop information if server didn't include it in login response
      try {
        const profileRes = await AxiosInstance.get('/profile/', {
          headers: { 'X-User-Id': data.user_id || data.id, 'Content-Type': 'application/json' },
        });
        if (profileRes.data?.success && profileRes.data.profile?.shop) {
          const foundShopId = profileRes.data.profile.shop.id;
          if (foundShopId) {
            await updateShopId(foundShopId);
            console.log('🚀 Shop ID updated from profile after login:', foundShopId);
          }
        }
      } catch (profileErr) {
        console.log('No shop info available immediately after login or failed to fetch profile:', profileErr?.message || profileErr);
      }

      console.log('📊 Registration stage:', data.registration_stage, 'Role:', userRole);

      // Handle registration stages
      const registrationStage = data.registration_stage || 1;
      
      if (userRole === 'rider') {
        // Rider flow
        if (registrationStage === 1) {
          router.replace('/(auth)/signup');
          return;
        } else if (registrationStage === 2) {
          router.replace('/(auth)/setup-account');
          return;
        } else if (registrationStage === 3) {
          router.replace('/(auth)/verify-phone');
          return;
        } else if (registrationStage === 4) {
          router.replace('/rider/home');
          return;
        }
      } else {
        // Customer flow
        if (registrationStage === 1) {
          router.replace('/(auth)/setup-account');
          return;
        } else if (registrationStage === 2) {
          router.replace('/(auth)/verify-phone');
          return;
        } else if (registrationStage === 4) {
          // Only navigate to home when fully completed (stage 4)
          router.replace('/customer/home');
          return;
        }
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Please check your credentials and try again.';
      
      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'Invalid username or password.';
        } else if (status === 403) {
          errorMessage = 'Account is suspended or inactive.';
        } else if (status === 404) {
          errorMessage = 'Account not found.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // No response received
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Login failed', errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDebugAuth = async () => {
    console.log('🔍 Current Auth Context:');
    console.log('User ID:', userId);
    console.log('Shop ID:', shopId);
    console.log('User Role:', userRole);
    
    Alert.alert(
      'Auth Debug',
      `User ID: ${userId || 'null'}\nShop ID: ${shopId || 'null'}\nRole: ${userRole || 'null'}`
    );
  };

  const handleClearAuth = async () => {
    try {
      await clearAuthData();
      Alert.alert('Success', 'Auth data cleared!');
    } catch (error) {
      console.error('Clear error:', error);
      Alert.alert('Error', 'Failed to clear auth data');
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with CrimsoTech */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>CrimsoTech</Text>
        </View>

        <View style={styles.content}>
          {/* Login Title */}
          <Text style={styles.title}>Login to your account</Text>

          {/* Username Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder="Enter your username"
              value={formData.username}
              onChangeText={(text) => {
                setFormData({ ...formData, username: text });
                if (errors.username) setErrors({ ...errors, username: undefined });
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text) => {
                  setFormData({ ...formData, password: text });
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                secureTextEntry={!showPassword}
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
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, loginLoading && styles.loginButtonDisabled]}
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
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
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
            <TouchableOpacity onPress={() => router.push('/(auth)/rider-apply')}>
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
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
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 40,
    paddingTop: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  inputError: {
    borderColor: '#ff6d0b',
  },
  errorText: {
    color: '#ff6d0b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#ff6d0b',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#ff9d6b',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  riderLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  riderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  riderLink: {
    fontSize: 14,
    color: '#ff6d0b',
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 20,
    gap: 10,
  },
  debugButton: {
    backgroundColor: '#5856D6',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
});