import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { CampaignView } from "./campaign-view";

export default function CampaignPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CampaignView />
    </Suspense>
  );
}
