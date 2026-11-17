import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { InfluencerView } from "./partner-view";

export default function InfluencerPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="detail" />}>
      <InfluencerView />
    </Suspense>
  );
}
