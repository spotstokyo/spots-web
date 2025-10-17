import { redirect } from "next/navigation";
import LandingHero from "./landing-hero";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();

  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      redirect("/profile");
    }
  } catch (error) {
    if ((error as { name?: string })?.name !== "AuthSessionMissingError") {
      throw error;
    }
  }

  return <LandingHero />;
}
