import GlassCard from "@/components/ui/GlassCard";
import PageContainer from "@/components/layout/PageContainer";
import PostForm from "@/components/forms/PostForm";

export default function PostPage() {
  return (
    <PageContainer size="lg" className="mt-2 pb-16">
      <GlassCard className="bg-[rgba(255,255,255,0.55)]">
        <PostForm />
      </GlassCard>
    </PageContainer>
  );
}
