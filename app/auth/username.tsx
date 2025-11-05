import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function UsernameScreen() {
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (text: string): boolean => {
    if (!USERNAME_REGEX.test(text)) {
      setError('Use 3–20 chars: letters, numbers, _.');
      return false;
    }
    setError('');
    return true;
  };

  // make the word filter NON-blocking
  const maybeCheckWordFilter = async (text: string): Promise<boolean> => {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // if we don't have the function or envs, just allow
    if (!baseUrl || !anon) return true;

    try {
      const resp = await fetch(`${baseUrl}/functions/v1/word-filter`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anon}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, type: 'username' }),
      });

      // if the function returns nonsense, don't block
      if (!resp.ok) return true;

      const data = await resp.json();

      // ONLY block if it explicitly says not valid
      if (data && data.valid === false) {
        setError(data.reason || 'Username not allowed');
        return false;
      }

      return true;
    } catch (e) {
      // network / function missing -> do not block
      console.warn('word-filter unavailable, allowing username');
      return true;
    }
  };

  const handleSubmit = async () => {
    const trimmed = username.trim();

    if (!validateUsername(trimmed)) return;

    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // soft word filter
      const ok = await maybeCheckWordFilter(trimmed);
      if (!ok) {
        // this is the ONLY case we show "username not allowed" now
        return;
      }

      // check if someone else already uses it
      const { data: existing, error: existingErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed.toLowerCase())
        .maybeSingle();

      if (existingErr) {
        console.warn('profiles lookup error', existingErr);
      }

      if (existing && existing.id !== user.id) {
        setError('Username already taken');
        return;
      }

      // upsert your own profile
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            username: trimmed.toLowerCase(),
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        // most likely RLS or unique constraint
        setError(upsertError.message);
        return;
      }

      // refresh any cached profile in your context
      await refreshProfile?.();

      // move on
      router.replace('/auth/tour');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose a username</Text>
        <Text style={styles.subtitle}>
          3–20 characters. Letters, numbers, and underscores only.
        </Text>

        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (error) validateUsername(text);
          }}
          placeholder="rat_artist_01"
          placeholderTextColor="#666666"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (!username || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!username || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#999999', marginBottom: 32, lineHeight: 22 },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 14, marginBottom: 16 },
  button: {
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
