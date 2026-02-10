import GlassCard from "@/components/ui/GlassCard";
import PageContainer from "@/components/layout/PageContainer";
import AuthForm from "@/components/forms/AuthForm";

export default function LoginPage() {
  return (
    <PageContainer size="sm" className="mt-2 pb-16" centerY>
      <GlassCard className="bg-[rgba(255,255,255,0.55)]">
        <AuthForm mode="login" />
      </GlassCard>
    </PageContainer>
  );
}
