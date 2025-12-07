import { createClient } from "@supabase/supabase-js";

// NOTE: This client must ONLY be used on the server-side!
// It uses the Service Role Key to bypass RLS policies.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

// We don't throw immediately if key is missing to allow build time, 
// but we'll log a warning.
if (!supabaseServiceKey) {
  console.warn("⚠️ Missing SUPABASE_SERVICE_ROLE_KEY - Uploads may fail with RLS errors!");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
