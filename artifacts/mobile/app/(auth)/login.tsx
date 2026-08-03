import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const { login, signup } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.error('[Auth Error]', msg);
    } else {
      Alert.alert('Authentication Error', msg);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      showError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(cleanEmail, cleanPassword);
      } else {
        if (!name.trim()) {
          showError('Please enter your name.');
          setLoading(false);
          return;
        }
        await signup(cleanEmail, cleanPassword, name.trim());
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[Auth Exception]', err);
      const rawMsg = err?.message || '';
      let userFriendlyMsg = rawMsg;

      if (rawMsg.includes('Invalid credentials') || rawMsg.includes('user_invalid_credentials')) {
        userFriendlyMsg = 'Invalid email or password. If you haven\'t created an account yet, tap "Sign up" below to register.';
      } else if (rawMsg.includes('session is active')) {
        userFriendlyMsg = 'A session is already active. Redirecting...';
        router.replace('/(tabs)');
        return;
      } else if (rawMsg.includes('Network Error') || rawMsg.includes('Failed to fetch')) {
        userFriendlyMsg = 'Network error. Please check your internet connection or Appwrite backend.';
      }

      showError(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Immersive background circle */}
      <View style={[styles.bgCircle, { backgroundColor: colors.accent + '20' }]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          
          <View style={styles.header}>
            <Image 
              source={require('@/assets/images/icon.png')} 
              style={styles.logo}
              contentFit="cover"
            />
            <Text style={[styles.title, { color: colors.foreground }]}>DaySync</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {isLogin ? 'Welcome back. Ready to focus?' : 'Start your journey to better habits.'}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            {!isLogin && (
              <View style={[styles.inputWrapper, { borderBottomColor: colors.border }]}>
                <Feather name="user" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="What should we call you?"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={[styles.inputWrapper, { borderBottomColor: colors.border }]}>
              <Feather name="mail" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Your email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputWrapper, { borderBottomColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Your secure password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
                  {isLogin ? 'Enter' : 'Begin'}
                </Text>
              )}
              {!loading && (
                <Feather name="arrow-right" size={20} color={colors.primaryForeground} style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {isLogin ? 'Sign up' : 'Log in'}
              </Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    top: -200,
    right: -200,
    opacity: 0.6,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 36,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 50,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  formContainer: {
    gap: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Inter_500Medium',
    padding: 0, // Remove default padding
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 100, // Pill shape
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
});
