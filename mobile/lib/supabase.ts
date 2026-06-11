import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Use localStorage on web, AsyncStorage on native
let storageAdapter: any;
if (Platform.OS === 'web') {
  storageAdapter = {
    getItem: (key: string) => {
      try {
        return Promise.resolve(window.localStorage.getItem(key));
      } catch {
        return Promise.resolve(null);
      }
    },
    setItem: (key: string, value: string) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return Promise.resolve();
    },
  };
} else {
  // Lazy require to avoid importing AsyncStorage on web
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storageAdapter = AsyncStorage;
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
