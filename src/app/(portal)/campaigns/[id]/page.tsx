import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { CampaignView } from "./campaign-view";

export default function CampaignPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="detail" />}>
      <CampaignView />
    </Suspense>
  );
}
