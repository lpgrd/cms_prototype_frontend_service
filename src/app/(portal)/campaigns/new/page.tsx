"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import { CampaignForm, CampaignFormValues, toPayload } from "../campaign-form";

export default function NewCampaignPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (v: CampaignFormValues) => api.post<Campaign>("/campaigns", toPayload(v)),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign saved as a draft. Add partners, then activate it.");
      router.push(`/campaigns/${c.id}`);
    },
  });

  return (
    <>
      <PageHeader
        backHref="/campaigns"
        title="New campaign"
        description="Set the customer offer and the partner reward. Each partner gets their own QR code."
      />
      <CampaignForm onSubmit={(v) => create.mutate(v)} submitting={create.isPending} error={create.error} submitLabel="Create campaign" />
    </>
  );
}
