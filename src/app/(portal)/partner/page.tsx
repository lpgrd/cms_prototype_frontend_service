"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, Hourglass, IndianRupee, Megaphone, QrCode, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LedgerTable, PayoutsTable } from "@/components/points-tables";
import { QrShareModal } from "@/components/qr-share-modal";
import { Alert, Button, Card, Empty, ErrorState, Field, Input, Modal, PageHeader, PageSkeleton, Stat, StatusBadge, TableSkeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { date, inr, inrShort, number, plural } from "@/lib/format";
import type { InfluencerSelf, Paginated, Payout } from "@/lib/types";

type CampaignRow = InfluencerSelf["campaigns"][number];

export default function PartnerPage() {
  const qc = useQueryClient();
  const [qrFor, setQrFor] = useState<CampaignRow | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["me-influencer"], queryFn: () => api.get<InfluencerSelf>("/me/influencer") });
  const payouts = useQuery({ queryKey: ["me-payouts"], queryFn: () => api.get<Paginated<Payout>>("/me/influencer/payouts", { limit: 20 }) });

  if (isLoading) return <PageSkeleton stats={3} kind="detail" />;
  if (error || !data) return <ErrorState error={error} />;
  const { influencer: me, campaigns, pointValue, minPayoutPoints } = data;
  const customers = campaigns.reduce((s, c) => s + c.stats.redemptions, 0);

  return (
    <>
      <PageHeader
        title={`Hi, ${me.name.split(" ")[0]}`}
        description="Share your QR codes. Every customer who shops with your code earns you points you can cash out."
        actions={
          <Button icon={<Wallet className="size-4" />} disabled={me.pointsBalance <= 0} onClick={() => setPayoutOpen(true)}>
            Request payout
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Coins} label="Points balance" value={number(me.pointsBalance)} sub={`Worth ${inr(me.pointsBalance * pointValue)}`} accent />
        <Stat icon={Hourglass} label="On hold" value={number(me.pendingPoints)} sub="Becomes payable after the return window" />
        <Stat icon={Users} label="Customers brought" value={customers} />
        <Stat icon={IndianRupee} label="1 point" value={inr(pointValue)} sub={minPayoutPoints ? `Minimum payout ${number(minPayoutPoints)} pts` : undefined} />
      </div>

      <h2 className="mb-3 mt-8 font-heading text-2xl font-semibold">Your campaigns</h2>
      {campaigns.length === 0 ? (
        <Card><Empty icon={Megaphone} title="No campaigns yet" description="The store will add you to a campaign and your QR code will appear here." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const live = c.isActive && (c.campaign.effectiveStatus ?? c.campaign.status) === "ACTIVE";
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-heading text-xl font-semibold">{c.campaign.name}</div>
                  <StatusBadge status={!c.isActive ? "INACTIVE" : c.campaign.effectiveStatus ?? c.campaign.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.offer}</p>
                {c.campaign.endsAt && <p className="mt-1 text-xs text-muted-foreground">Valid until {date(c.campaign.endsAt)}</p>}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="font-mono text-lg font-semibold tracking-widest">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{plural(c.stats.redemptions, "customer")}, {inrShort(c.stats.revenue)} in sales, {number(c.stats.pointsAwarded)} points</div>
                  </div>
                  <Button size="sm" variant={live ? "primary" : "secondary"} icon={<QrCode className="size-4" />} onClick={() => setQrFor(c)}>
                    QR
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Points history" icon={History} padded={false}>
          <LedgerTable endpoint="/me/influencer/ledger" />
        </Card>
        <Card title="Payouts" icon={Wallet} padded={false}>
          {payouts.isLoading ? <TableSkeleton /> : <PayoutsTable payouts={payouts.data?.items ?? []} />}
        </Card>
      </div>

      {qrFor && (
        <QrShareModal
          open
          onClose={() => setQrFor(null)}
          endpoint={`/me/influencer/campaigns/${qrFor.id}/qr`}
          title={qrFor.campaign.name}
          fileName={`${qrFor.campaign.name}-${qrFor.code}`.replace(/\s+/g, "-")}
        />
      )}
      <RequestPayout
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        balance={me.pointsBalance}
        pointValue={pointValue}
        minPoints={minPayoutPoints}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["me-influencer"] });
          qc.invalidateQueries({ queryKey: ["me-payouts"] });
          qc.invalidateQueries({ queryKey: ["ledger"] });
        }}
      />
    </>
  );
}

function RequestPayout({
  open,
  onClose,
  balance,
  pointValue,
  minPoints,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  pointValue: number;
  minPoints: number;
  onDone: () => void;
}) {
  const [pts, setPts] = useState("");
  const request = useMutation({
    mutationFn: () => api.post("/me/influencer/payouts", { points: Number(pts) }),
    onSuccess: () => (onDone(), onClose(), setPts(""), toast.success("Payout requested. The store will review it.")),
  });
  const value = Number(pts) || 0;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request payout"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={request.isPending} disabled={value <= 0 || value > balance} onClick={() => request.mutate()}>Request {inr(value * pointValue)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {request.isError && <Alert tone="danger">{errorMessage(request.error)}</Alert>}
        <Field label="Points" hint={`${number(balance)} available.${minPoints ? ` Minimum payout is ${number(minPoints)}.` : ""}`}>
          <Input type="number" min="0" step="0.01" value={pts} onChange={(e) => setPts(e.target.value)} />
        </Field>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPts(String(balance))}>Use full balance</Button>
        <p className="text-xs text-muted-foreground">Make sure your UPI or bank details are with the store. Points are held while the request is reviewed.</p>
      </div>
    </Modal>
  );
}
