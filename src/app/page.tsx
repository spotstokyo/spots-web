import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import LandingHero from "./landing-hero";
import PageContainer from "@/components/PageContainer";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/feed");
  }

  return (
    <PageContainer centerY size="lg" className="pb-16">
      <LandingHero />
    </PageContainer>
  );
}
