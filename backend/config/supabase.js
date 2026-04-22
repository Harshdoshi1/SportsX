import { createClient } from "@supabase/supabase-js";

import { env } from "./env.js";

let cachedClient = null;

export const isSupabaseConfigured = () =>
  Boolean(env.supabaseUrl && (env.supabaseServiceRoleKey || env.supabasePublishableKey));

export const usesServiceRoleKey = () => Boolean(env.supabaseServiceRoleKey);

export const isSupabaseWriteConfigured = () =>
  Boolean(env.supabaseUrl && (env.supabaseServiceRoleKey || env.supabaseAllowPublishableWrites));

export const getSupabaseAdminClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(
      env.supabaseUrl,
      env.supabaseServiceRoleKey || env.supabasePublishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return cachedClient;
};
