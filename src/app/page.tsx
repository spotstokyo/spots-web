import LandingHero from "./landing-hero";
import LandingNearby from "./landing-nearby";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <LandingHero />
      <LandingNearby />
    </div>
  );
}
