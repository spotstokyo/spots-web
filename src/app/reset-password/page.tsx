import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <PageContainer size="sm" className="mt-2 pb-16" centerY>
      <GlassCard className="bg-[rgba(255,255,255,0.55)]">
        <ResetPasswordForm />
      </GlassCard>
    </PageContainer>
  );
}
