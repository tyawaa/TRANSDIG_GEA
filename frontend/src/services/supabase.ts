import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const configurationSchema = z.object({
  url: z.url(),
  key: z.string().min(1),
});

export const publicConfig = configurationSchema.parse({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

// Client ini hanya memegang publishable key. Secret admin tidak boleh masuk aplikasi.
export const supabase: SupabaseClient = createClient(
  publicConfig.url,
  publicConfig.key,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
