import { Suspense } from "react";
import ResultsContent from "./results-content";

export default function ResultsPageWrapper() {
  return (
    <Suspense fallback={<p className="text-center mt-12">Loading results…</p>}>
      <ResultsContent />
    </Suspense>
  );
}
