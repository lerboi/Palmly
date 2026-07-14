import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * The Supabase client. Session persists in AsyncStorage so a relaunch reuses the same
 * anonymous UUID (Backend §5.1). Only the client-safe publishable key ships in the bundle.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY missing — see app/.env');
}

// GoTrue loads the persisted session from `storage` at construction. During the Expo web STATIC
// export (node SSR) there is no window/AsyncStorage, which throws and breaks `expo export` — the
// device-free UI screenshot path. Use a no-op store in that one environment; browser + native keep
// AsyncStorage so sessions persist normally.
const noopStore = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: isServerRender ? noopStore : AsyncStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
});
