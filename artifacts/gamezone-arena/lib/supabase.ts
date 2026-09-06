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

type ClerkTokenOptions = { skipCache?: boolean };
type AccessTokenGetter = (options?: ClerkTokenOptions) => Promise<string | null>;

let accessTokenGetter: AccessTokenGetter | null = null;
let nextAccessToken: string | null = null;

export function setSupabaseAccessTokenGetter(
  getter: AccessTokenGetter | null,
) {
  accessTokenGetter = getter;
  void refreshSupabaseRealtimeAuth();
}

export async function refreshSupabaseAccessToken() {
  if (!accessTokenGetter) {
    throw new Error("The Clerk session is not ready.");
  }
  const token = await accessTokenGetter({ skipCache: true });
  if (!token) {
    throw new Error("The Clerk session did not return an access token.");
  }
  nextAccessToken = token;
  supabase?.realtime.setAuth(token);
}

export const supabase =
  !isPlaceholderUrl && !isPlaceholderKey
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        accessToken: async () => {
          if (nextAccessToken) {
            const token = nextAccessToken;
            nextAccessToken = null;
            return token;
          }
          return accessTokenGetter?.() ?? null;
        },
      })
    : null;

// Public reference data must never inherit an incompatible signed-in token.
// This client intentionally uses only the Supabase anon key and public SELECT RLS.
export const publicSupabase =
  !isPlaceholderUrl && !isPlaceholderKey
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

export async function refreshSupabaseRealtimeAuth() {
  if (!supabase) return;
  const token = await accessTokenGetter?.();
  supabase.realtime.setAuth(token ?? SUPABASE_ANON_KEY);
}