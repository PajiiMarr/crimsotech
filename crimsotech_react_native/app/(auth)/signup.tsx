// app/(auth)/signup.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupScreen() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validateForm = () => {
    const newErrors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    };

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.email && !newErrors.password && !newErrors.confirmPassword;
  };

  const handleSignup = async () => {
    if (validateForm()) {
      try {
        // Register the user with username, email and password
        // Ensure we pass the email if provided, otherwise undefined
        await register(username, password, email || undefined);
        // After initial registration, go to setup account
        router.replace('/(auth)/setup-account');
      } catch (error: any) {
        // Handle registration error with specific validation messages
        console.error('Registration error details:', error);
        console.error('Error message:', error?.message);
        console.error('Error response:', error?.response);
        
        // Check if it's a network error
        if (error?.message?.includes('Cannot connect to server') || 
            error?.message === 'Network request failed' ||
            error?.message?.includes('Network') ||
            error?.message?.includes('Failed to fetch')) {
          alert(error.message || 'Cannot connect to server. Please check:\n1. Backend is running\n2. Your IP address is correct\n3. Both devices are on the same network');
          return;
        }
        
        // Handle backend validation errors
        if (error?.response) {
          // Handle field-specific validation errors
          const errorResponse = error.response;
          let errorMessage = '';

          if (errorResponse.username) {
            setErrors(prev => ({ ...prev, username: Array.isArray(errorResponse.username) ? errorResponse.username[0] : errorResponse.username }));
            errorMessage += (Array.isArray(errorResponse.username) ? errorResponse.username[0] : errorResponse.username) + '\n';
          }
          if (errorResponse.email) {
            setErrors(prev => ({ ...prev, email: Array.isArray(errorResponse.email) ? errorResponse.email[0] : errorResponse.email }));
            errorMessage += (Array.isArray(errorResponse.email) ? errorResponse.email[0] : errorResponse.email) + '\n';
          }
          if (errorResponse.password) {
            setErrors(prev => ({ ...prev, password: Array.isArray(errorResponse.password) ? errorResponse.password[0] : errorResponse.password }));
            errorMessage += (Array.isArray(errorResponse.password) ? errorResponse.password[0] : errorResponse.password) + '\n';
          }
          if (errorResponse.non_field_errors) {
            const nonFieldErrors = Array.isArray(errorResponse.non_field_errors) 
              ? errorResponse.non_field_errors.join('\n')
              : errorResponse.non_field_errors;
            errorMessage += nonFieldErrors;
          }

          if (!errorMessage) {
            errorMessage = 'Registration failed. Please check your information.';
          }

          alert(errorMessage);
        } else {
          // Handle other errors
          const errorMessage = error?.message || 'Registration failed. Please check your connection and try again.';
          alert(errorMessage);
        }
      }
    }
  };

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
          {/* Signup Title */}
          <Text style={styles.title}>Create your account</Text>

          {/* Username Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder=""
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (text.trim() && errors.username) {
                  setErrors(prev => ({ ...prev, username: '' }));
                }
              }}
              autoCapitalize="none"
            />
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          {/* Email Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder=""
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (text.trim() && errors.email) {
                  setErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder=""
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (text.trim() && errors.password) {
                    setErrors(prev => ({ ...prev, password: '' }));
                  }
                  if (confirmPassword && text !== confirmPassword && errors.confirmPassword === 'Passwords do not match') {
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
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

          {/* Confirm Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder=""
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (text.trim() && errors.confirmPassword) {
                    if (password && text !== password) {
                      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                    } else {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={styles.signupButton}
            onPress={handleSignup}
          >
            <Text style={styles.signupButtonText}>Sign up</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Login</Text>
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
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    paddingRight: 40, // Make space for the eye button
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  inputError: {
    borderColor: '#ff6d0bff',
  },
  errorText: {
    color: '#ff6d0bff',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  signupButton: {
    backgroundColor: '#ff6d0bff',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#333333ff',
    fontWeight: '600',
  },
});