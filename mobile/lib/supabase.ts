import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Lazy storage adapter — defer window/localStorage access until runtime
// to avoid SSR/build-time crashes when window is not defined.
const storageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return Promise.resolve(null);
        return Promise.resolve(window.localStorage.getItem(key));
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.getItem(key);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        return Promise.resolve();
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.setItem(key, value);
    } catch {
      return Promise.resolve();
    }
  },
  removeItem: (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return Promise.resolve();
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.removeItem(key);
    } catch {
      return Promise.resolve();
    }
  },
};

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
