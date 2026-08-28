import { getUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }
  return { user, response: null };
}
