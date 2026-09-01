export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL);
}

export function isSignupAllowed(): boolean {
  return process.env.ALLOW_SIGNUP !== "false";
}
