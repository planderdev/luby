import { cache } from "react";
import { createClient } from "./server";
import type { Database } from "@/lib/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * React cache() dedupes within a single request. Layout + page + nested
 * server components all share one DB roundtrip per request.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, role, name, phone, avatar_url, email_prefs, onboarding_done, referred_by, approved, approved_at, approved_by, created_at, updated_at"
    )
    .eq("id", user.id)
    .single();

  return profile;
});

export async function requireRole(role: UserRole | UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(profile.role)) return null;
  return profile;
}
