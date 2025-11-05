// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* auth flow */}
        <Stack.Screen name="auth/signin" />
        <Stack.Screen name="auth/username" />
        <Stack.Screen name="auth/tour" />

        {/* main app */}
        <Stack.Screen name="(tabs)" />

        {/* detail screens your tabs link to */}
        <Stack.Screen name="rat/[id]" />
      </Stack>
    </AuthProvider>
  );
}
