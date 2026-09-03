import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isPlaceholderUrl =
  !SUPABASE_URL ||
  SUPABASE_URL.includes("YOUR_PROJECT_ID") ||
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL);

const isPlaceholderKey =
  !SUPABASE_ANON_KEY ||
  SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY";

if (isPlaceholderUrl || isPlaceholderKey) {
  console.warn(
    "Supabase is not configured with a valid project URL and anon key. Online Ludo is disabled."
  );
}

export const supabase =
  !isPlaceholderUrl && !isPlaceholderKey
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;