import LandingHero from "./landing-hero";
import PageContainer from "@/components/PageContainer";

export default async function LandingPage() {
  return (
    <PageContainer centerY size="lg" className="pb-16">
      <LandingHero />
    </PageContainer>
  );
}
