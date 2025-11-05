import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

// we call maybeCompleteAuthSession in root layout, so we can omit here
const redirectTo = makeRedirectUri({
  scheme: 'ratemyrat',
});

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);

  const routeAfterAuth = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) return;

      const userId = sessionData.session.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      router.replace(profile?.username ? '/(tabs)' : '/auth/username');
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign In is only available on iOS');
      return;
    }

    try {
      setLoading(true);

      // 1) make a raw nonce
      const rawNonce = Crypto.randomUUID();

      // 2) hash it for Apple
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // 3) send the HASHED nonce to Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      // 4) send the RAW nonce to Supabase so it can hash and compare
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;
      if (data?.user) await routeAfterAuth();
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Sign in error', error?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No auth URL returned from Supabase.');

      await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      await routeAfterAuth();
    } catch (error: any) {
      Alert.alert('Sign in error', error?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rate My Rat</Text>
        <Text style={styles.subtitle}>
          Draw one rat per day. Rate other rats. Earn badges.
        </Text>

        <View style={styles.buttonContainer}>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={loading}
            />
          )}

          <TouchableOpacity
            style={[styles.button, styles.googleButton, loading && { opacity: 0.7 }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#999999', textAlign: 'center', marginBottom: 48, lineHeight: 24 },
  buttonContainer: { width: '100%', maxWidth: 320, gap: 16 },
  appleButton: { width: '100%', height: 52 },
  button: { width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  googleButton: { backgroundColor: '#FFFFFF' },
  googleButtonText: { color: '#000000', fontSize: 16, fontWeight: '600' },
  terms: { marginTop: 32, fontSize: 12, color: '#666666', textAlign: 'center', maxWidth: 280, lineHeight: 16 },
});
