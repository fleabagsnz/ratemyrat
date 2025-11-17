// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const root = segments[0]; // e.g. 'auth' or '(tabs)'
    const inAuthGroup = root === 'auth';
    const inTabsGroup = root === '(tabs)';

    // No session → must be in auth
    if (!session && !inAuthGroup) {
      router.replace('/auth/signin');
      return;
    }

    // Has session but no profile yet → username flow
    if (session && !profile && !inAuthGroup) {
      router.replace('/auth/username');
      return;
    }

    // Fully onboarded user but stuck in auth routes → go to tabs
    if (session && profile && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }

    // If already on tabs or rat/[id], do nothing
    // (expo-router will handle normal navigation)
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth stack */}
      <Stack.Screen name="auth/signin" />
      <Stack.Screen name="auth/username" />
      <Stack.Screen name="auth/tour" />

      {/* Main app (tabs) */}
      <Stack.Screen name="(tabs)" />

      {/* Rat detail */}
      <Stack.Screen name="rat/[id]" />

      {/* Not found */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});
