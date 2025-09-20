import GlassCard from "@/components/GlassCard";
import PageContainer from "@/components/PageContainer";
import PostForm from "@/components/PostForm";

export default function PostPage() {
  return (
    <PageContainer size="lg" className="mt-2 pb-16">
      <GlassCard className="bg-[rgba(255,255,255,0.55)]">
        <PostForm />
      </GlassCard>
    </PageContainer>
  );
}
