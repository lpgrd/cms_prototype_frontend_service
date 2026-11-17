"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Pause,
  Percent,
  Play,
  QrCode,
  Settings2,
  Sparkles,
  CircleStop,
  TicketCheck,
  TrendingUp,
  UserPlus,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { QrShareModal } from "@/components/qr-share-modal";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Empty,
  ErrorState,
  Field,
  HIDE_BELOW,
  Input,
  Modal,
  PageHeader,
  PageSkeleton,
  SelectInput,
  Stat,
  StatusBadge,
  Table,
  TableSkeleton,
  Td,
  Th,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dateTime, inrShort, number, points } from "@/lib/format";
import type { CampaignDetail, CampaignStatus, Enrollment, Influencer, Paginated, ValueType } from "@/lib/types";
import { CampaignForm, CampaignFormValues, toPayload } from "../campaign-form";
import { useCan } from "@/providers/auth";
import { describeOffer, describeReward } from "../describe";

type Row = CampaignDetail["influencers"][number];

export function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [qrFor, setQrFor] = useState<Row | null>(null);
  const [overridesFor, setOverridesFor] = useState<Row | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const key = ["campaign", id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get<CampaignDetail>(`/campaigns/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const setStatus = useMutation({
    mutationFn: (status: CampaignStatus) => api.post(`/campaigns/${id}/status`, { status }),
    onSuccess: () => (refresh(), setConfirmEnd(false), toast.success("Campaign updated")),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const update = useMutation({
    mutationFn: (v: CampaignFormValues) => api.patch(`/campaigns/${id}`, toPayload(v)),
    onSuccess: () => (refresh(), setEditing(false), toast.success("Campaign saved")),
  });
  const [disableCode, setDisableCode] = useState<Row | null>(null);
  const toggleEnrollment = useMutation({
    mutationFn: (row: Row) => api.patch(`/campaigns/${id}/influencers/${row.id}`, { isActive: !row.isActive }),
    onSuccess: (_, row) => (
      refresh(),
      setDisableCode(null),
      toast.success(row.isActive ? `${row.code} disabled` : `${row.code} works again`)
    ),
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <PageSkeleton stats={4} kind="detail" />;
  if (error || !data) {
    return (
      <>
        <PageHeader backHref="/campaigns" title={"Couldn't load this page"} />
        <ErrorState error={error} />
      </>
    );
  }
  const { campaign: c, influencers, totals } = data;
  const ended = c.status === "ENDED";
  // Editing actions need campaigns.manage, and nothing can change once a campaign has ended.
  const manage = can("campaigns.manage") && !ended;

  return (
    <>
      <PageHeader
        backHref="/campaigns"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.name} <StatusBadge status={c.effectiveStatus ?? c.status} />
          </span>
        }
        description={`${describeOffer(c)}. ${describeReward(c)}.`}
        actions={
          manage && (
            <>
              <Button variant="secondary" icon={<Settings2 className="size-4" />} onClick={() => setEditing((e) => !e)}>
                {editing ? "Close editor" : "Edit"}
              </Button>
              {c.status === "ACTIVE" ? (
                <Button
                  variant="secondary"
                  icon={<Pause className="size-4" />}
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate("PAUSED")}
                >
                  Pause
                </Button>
              ) : (
                <Button icon={<Play className="size-4" />} loading={setStatus.isPending} onClick={() => setStatus.mutate("ACTIVE")}>
                  {c.status === "PAUSED" ? "Resume" : "Activate"}
                </Button>
              )}
              <Button variant="danger" icon={<CircleStop className="size-4" />} onClick={() => setConfirmEnd(true)}>
                End
              </Button>
            </>
          )
        }
      />

      {c.effectiveStatus === "SCHEDULED" && (
        <div className="mb-4">
          <Alert tone="info">Active, starts {dateTime(c.startsAt)}. Codes will be accepted from then.</Alert>
        </div>
      )}
      {c.effectiveStatus === "EXPIRED" && (
        <div className="mb-4">
          <Alert tone="warning">The end date ({dateTime(c.endsAt)}) has passed, so codes are no longer accepted.</Alert>
        </div>
      )}
      {c.status === "DRAFT" && (
        <div className="mb-4">
          <Alert tone="info">
            Draft: add partners and share their QR codes, then activate the campaign. Codes are only accepted while it is active.
          </Alert>
        </div>
      )}

      {editing && (
        <div className="mb-8">
          <CampaignForm
            campaign={c}
            onSubmit={(v) => update.mutate(v)}
            submitting={update.isPending}
            error={update.error}
            submitLabel="Save changes"
            secondaryAction={
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={TicketCheck} label="Redemptions" value={number(totals.redemptions)} />
        <Stat icon={TrendingUp} label="Revenue from offers" value={inrShort(totals.revenue)} accent />
        <Stat icon={Percent} label="Discount given" value={inrShort(totals.discountGiven)} />
        <Stat icon={Coins} label="Points awarded" value={points(totals.pointsAwarded)} />
      </div>

      <Card
        className="mt-6"
        title={`Partners (${influencers.length})`}
        icon={Sparkles}
        padded={false}
        actions={
          manage && (
            <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setEnrollOpen(true)}>
              Add partner
            </Button>
          )
        }
      >
        {influencers.length === 0 ? (
          <Empty icon={Sparkles} title="No partners yet" description="Add partners to generate their unique QR codes." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Partner</Th>
                <Th className={HIDE_BELOW.md}>Code</Th>
                <Th className={cn(HIDE_BELOW.sm, "text-right")}>Customers</Th>
                <Th className="text-right">Revenue</Th>
                <Th className={cn(HIDE_BELOW.lg, "text-right")}>Points</Th>
                <Th className={HIDE_BELOW.md}>Code status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {influencers.map((row) => {
                const overridden = row.discountValueOverride !== null || row.rewardValueOverride !== null;
                return (
                  <tr key={row.id}>
                    <Td>
                      <Link href={`/partners/${row.influencerId}`} className="font-medium hover:text-primary">
                        {row.influencer.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {row.influencer.instagramHandle ? `@${row.influencer.instagramHandle}` : ""}
                        {overridden && <Badge tone="info">Custom rates</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                        <span className="font-mono text-xs">{row.code}</span>
                        {!row.isActive && <StatusBadge status="INACTIVE" />}
                      </div>
                    </Td>
                    <Td className={cn(HIDE_BELOW.md, "font-mono text-xs")}>{row.code}</Td>
                    <Td className={cn(HIDE_BELOW.sm, "tabular text-right")}>{row.stats.redemptions}</Td>
                    <Td className="tabular text-right whitespace-nowrap">{inrShort(row.stats.revenue)}</Td>
                    <Td className={cn(HIDE_BELOW.lg, "tabular text-right")}>{number(row.stats.pointsAwarded)}</Td>
                    <Td className={HIDE_BELOW.md}>
                      <button
                        disabled={!manage || toggleEnrollment.isPending}
                        onClick={() => (row.isActive ? setDisableCode(row) : toggleEnrollment.mutate(row))}
                        title={row.isActive ? "Click to disable this code" : "Click to re-enable this code"}
                      >
                        <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
                      </button>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" icon={<QrCode className="size-4" />} onClick={() => setQrFor(row)}>
                          QR
                        </Button>
                        {manage && (
                          <Button size="sm" variant="ghost" onClick={() => setOverridesFor(row)}>
                            Rates
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <EnrollModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        campaignId={id}
        enrolled={new Set(influencers.map((i) => i.influencerId))}
        onDone={refresh}
      />
      {qrFor && (
        <QrShareModal
          open
          onClose={() => setQrFor(null)}
          endpoint={`/campaigns/${id}/influencers/${qrFor.id}/qr`}
          title={`${c.name} QR for ${qrFor.influencer.name}`}
          fileName={`${c.name}-${qrFor.influencer.name}-${qrFor.code}`.replace(/\s+/g, "-")}
        />
      )}
      {overridesFor && <OverridesModal row={overridesFor} campaignId={id} onClose={() => setOverridesFor(null)} onDone={refresh} />}
      <ConfirmDialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this campaign?"
        description="All codes stop working immediately. Ending is permanent. Use Pause if you might restart it. Past bills and earned points are not affected."
        confirmLabel="End campaign"
        icon={<CircleStop className="size-4" />}
        loading={setStatus.isPending}
        onConfirm={() => setStatus.mutate("ENDED")}
      />
      <ConfirmDialog
        open={!!disableCode}
        onClose={() => setDisableCode(null)}
        title={`Disable ${disableCode?.influencer.name}'s code?`}
        description={`Customers can no longer use ${disableCode?.code}. You can turn it back on any time; past bills and points stay as they are.`}
        confirmLabel="Disable code"
        icon={<UserX className="size-4" />}
        loading={toggleEnrollment.isPending}
        onConfirm={() => disableCode && toggleEnrollment.mutate(disableCode)}
      />
    </>
  );
}

function EnrollModal({
  open,
  onClose,
  campaignId,
  enrolled,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  enrolled: Set<string>;
  onDone: () => void;
}) {
  const [influencerId, setInfluencerId] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["influencers", "active-all"],
    queryFn: () => api.get<Paginated<Influencer>>("/influencers", { status: "ACTIVE", limit: 100 }),
    enabled: open,
  });
  const options = (data?.items ?? []).filter((i) => !enrolled.has(i.id));
  const enroll = useMutation({
    mutationFn: () => api.post<Enrollment>(`/campaigns/${campaignId}/influencers`, { influencerId }),
    onSuccess: (e) => {
      onDone();
      onClose();
      setInfluencerId("");
      toast.success(`Code ${e.code} created`);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add partner"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!influencerId} loading={enroll.isPending} onClick={() => enroll.mutate()}>
            Add & create code
          </Button>
        </>
      }
    >
      {isLoading ? (
        <TableSkeleton />
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Every active partner is already in this campaign.{" "}
          <Link href="/partners" className="text-primary underline">
            Add a new partner
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="space-y-4">
          {enroll.isError && <Alert tone="danger">{errorMessage(enroll.error)}</Alert>}
          <Field label="Partner" required>
            <SelectInput
              value={influencerId}
              onValueChange={setInfluencerId}
              placeholder="Select a partner"
              options={options.map((i) => ({
                value: i.id,
                label: `${i.name}${i.instagramHandle ? ` (@${i.instagramHandle})` : ""}`,
              }))}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            A unique code and QR are generated. You can set custom rates for this partner afterwards.
          </p>
        </div>
      )}
    </Modal>
  );
}

function OverridesModal({ row, campaignId, onClose, onDone }: { row: Row; campaignId: string; onClose: () => void; onDone: () => void }) {
  const [custom, setCustom] = useState(row.discountValueOverride !== null || row.rewardValueOverride !== null);
  const [discountType, setDiscountType] = useState<ValueType>(row.discountTypeOverride ?? "PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(row.discountValueOverride?.toString() ?? "");
  const [rewardType, setRewardType] = useState<ValueType>(row.rewardTypeOverride ?? "PERCENTAGE");
  const [rewardValue, setRewardValue] = useState(row.rewardValueOverride?.toString() ?? "");

  const save = useMutation({
    mutationFn: () => {
      const hasDiscount = custom && discountValue !== "";
      const hasReward = custom && rewardValue !== "";
      return api.patch(`/campaigns/${campaignId}/influencers/${row.id}`, {
        discountTypeOverride: hasDiscount ? discountType : null,
        discountValueOverride: hasDiscount ? Number(discountValue) : null,
        rewardTypeOverride: hasReward ? rewardType : null,
        rewardValueOverride: hasReward ? Number(rewardValue) : null,
      });
    },
    onSuccess: () => (onDone(), onClose(), toast.success("Rates saved")),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Rates for ${row.influencer.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
        <Checkbox label="Use custom rates for this partner" checked={custom} onCheckedChange={setCustom} />
        {custom && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discount type">
              <SelectInput
                value={discountType}
                onValueChange={(v) => setDiscountType(v as ValueType)}
                options={[
                  { value: "PERCENTAGE", label: "Percentage" },
                  { value: "FLAT", label: "Flat ₹" },
                ]}
              />
            </Field>
            <Field label="Discount value" hint="Empty = campaign default">
              <Input type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            </Field>
            <Field label="Reward type">
              <SelectInput
                value={rewardType}
                onValueChange={(v) => setRewardType(v as ValueType)}
                options={[
                  { value: "PERCENTAGE", label: "Percentage" },
                  { value: "FLAT", label: "Flat points" },
                ]}
              />
            </Field>
            <Field label="Reward value" hint="Empty = campaign default">
              <Input type="number" min="0" step="0.01" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} />
            </Field>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Caps, minimum bill and what the value is calculated on always follow the campaign.</p>
      </div>
    </Modal>
  );
}
