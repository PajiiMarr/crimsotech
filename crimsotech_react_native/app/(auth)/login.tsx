// app/(auth)/login.tsx
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    password: '',
  });

  const validateForm = () => {
    const newErrors = {
      username: '',
      password: '',
    };

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleLogin = async () => {
    if (validateForm()) {
      try {
        // Call the backend API for login
        await login(username, password);
      } catch (error: any) {
        // Handle login error with specific messages
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
            errorMessage = 'Login failed. Please check your credentials and try again.';
          }

          alert(errorMessage);
        } else {
          // Handle network or other errors
          console.error('Login failed:', error);
          alert('Login failed. Please check your credentials and try again.');
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
          {/* Login Title */}
          <Text style={styles.title}>Login to your account</Text>

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
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
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
    backgroundColor: '#ff6d0bff',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
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
});