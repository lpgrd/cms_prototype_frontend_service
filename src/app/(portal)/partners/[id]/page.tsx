import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { InfluencerView } from "./partner-view";

export default function InfluencerPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <InfluencerView />
    </Suspense>
  );
}
