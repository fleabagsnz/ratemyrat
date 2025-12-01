// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ✅ Read from EXPO_PUBLIC_* env vars at build time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// 🔊 Loud logging so we always see what's going on
console.log('[Supabase] URL from env:', supabaseUrl);
console.log('[Supabase] anon key present?', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your .env at project root and EXPO_PUBLIC_ prefixes.'
  );
}

// Promise-based storage adapter that works on native + web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        // @ts-ignore
        return Promise.resolve(globalThis?.localStorage?.getItem?.(key) ?? null);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        // @ts-ignore
        globalThis?.localStorage?.setItem?.(key, value);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        // @ts-ignore
        globalThis?.localStorage?.removeItem?.(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const options: SupabaseClientOptions<'public'> = {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
};

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', options);

// 🔍 Tiny startup health check using plain fetch
if (supabaseUrl && supabaseAnonKey) {
  (async () => {
    try {
      console.log('[Supabase] Doing health check fetch…');
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
        },
      });
      console.log('[Supabase] Health check status:', res.status);
    } catch (err) {
      console.log('[Supabase] Health check fetch error:', err);
    }
  })();
}
