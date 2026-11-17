"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, Hourglass, KeyRound, Landmark, Megaphone, QrCode, SlidersHorizontal, TrendingUp, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LedgerTable, PayoutsTable } from "@/components/points-tables";
import { QrShareModal } from "@/components/qr-share-modal";
import { Alert, Badge, Button, Card, DefinitionList, Empty, ErrorState, Field, HIDE_BELOW, Input, Modal, PageHeader, PageSkeleton, PasswordInput, RequiredNote, SecretValue, Stat, StatusBadge, Table, Td, Th } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { date, inr, inrShort, mobile, number, partnerTypeLabel } from "@/lib/format";
import type { InfluencerDetail } from "@/lib/types";
import { useCan } from "@/providers/auth";
import { PartnerFormButton } from "../partner-form";

type CampaignRow = InfluencerDetail["campaigns"][number];
type Dialog = "login" | "adjust" | "payout" | null;

export function InfluencerView() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [qrFor, setQrFor] = useState<CampaignRow | null>(null);

  const key = ["influencer", id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get<InfluencerDetail>(`/influencers/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["influencers"] });
    qc.invalidateQueries({ queryKey: ["payouts"] });
  };

  if (isLoading) return <PageSkeleton stats={4} kind="detail" />;
  if (error || !data) {
    return (
      <>
        <PageHeader backHref="/partners" title={"Couldn't load this page"} />
        <ErrorState error={error} />
      </>
    );
  }
  const { influencer: inf, campaigns, payouts, login } = data;
  const totals = campaigns.reduce(
    (acc, c) => ({ customers: acc.customers + c.stats.redemptions, revenue: acc.revenue + c.stats.revenue }),
    { customers: 0, revenue: 0 },
  );

  return (
    <>
      <PageHeader
        backHref="/partners"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {inf.name} <Badge>{partnerTypeLabel(inf.type)}</Badge> <StatusBadge status={inf.status} />
          </span>
        }
        description={[inf.contactPerson && `Contact: ${inf.contactPerson}`, mobile(inf.mobile), inf.instagramHandle && `@${inf.instagramHandle}`, inf.followerCount && `${number(inf.followerCount)} followers`]
          .filter(Boolean)
          .join(", ")}
        actions={
          <>
            {can("influencers.manage") && <PartnerFormButton influencer={inf} />}
            {can("points.adjust") && (
              <Button variant="secondary" icon={<SlidersHorizontal className="size-4" />} onClick={() => setDialog("adjust")}>Adjust points</Button>
            )}
            {can("payouts.manage") && (
              <Button icon={<Wallet className="size-4" />} disabled={inf.pointsBalance <= 0} onClick={() => setDialog("payout")}>Pay out</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Coins} label="Points balance" value={number(inf.pointsBalance)} sub={`Worth ${inr(data.pointsValue)}`} accent />
        <Stat icon={Hourglass} label="On hold" value={number(inf.pendingPoints)} sub="Payable after the return window" />
        <Stat icon={Users} label="Customers brought" value={totals.customers} sub={`${number(inf.lifetimePointsEarned)} points earned in total`} />
        <Stat icon={TrendingUp} label="Revenue driven" value={inrShort(totals.revenue)} />
      </div>
      {!inf.panNumber && inf.pointsBalance > 0 && (
        <div className="mt-4">
          <Alert tone="warning">Add this partner&apos;s PAN (Edit) before paying out. TDS is deducted against it.</Alert>
        </div>
      )}
      {inf.pointsBalance < 0 && (
        <div className="mt-4">
          <Alert tone="warning">Negative balance: points were reversed for a cancelled bill after they had been paid out. It will be recovered from future earnings.</Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Campaigns & codes" icon={QrCode} padded={false}>
            {campaigns.length === 0 ? (
              <Empty icon={Megaphone} title="Not in any campaign" description="Add this partner to a campaign to generate their QR code." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Campaign</Th>
                    <Th className={HIDE_BELOW.sm}>Code</Th>
                    <Th className="text-right">Customers</Th>
                    <Th className="text-right">Points</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <Td>
                        <Link href={`/campaigns/${c.campaignId}`} className="font-medium hover:text-primary">{c.campaign.name}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <StatusBadge status={c.campaign.effectiveStatus ?? c.campaign.status} />
                          {!c.isActive && <Badge tone="danger">Code disabled</Badge>}
                          {c.offer}
                        </div>
                        <div className="mt-1 font-mono text-xs sm:hidden">{c.code}</div>
                      </Td>
                      <Td className={cn(HIDE_BELOW.sm, "font-mono text-xs")}>{c.code}</Td>
                      <Td className="tabular text-right">{c.stats.redemptions}</Td>
                      <Td className="tabular text-right">{number(c.stats.pointsAwarded)}</Td>
                      <Td className="text-right">
                        <Button size="sm" variant="ghost" icon={<QrCode className="size-4" />} onClick={() => setQrFor(c)}>QR</Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Points history" icon={History} padded={false}>
            <LedgerTable endpoint={`/influencers/${id}/ledger`} />
          </Card>

          <Card title="Payouts" icon={Wallet} padded={false}>
            <PayoutsTable payouts={payouts} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Partner login" icon={KeyRound} actions={!login && can("influencers.manage") && <Button size="sm" variant="secondary" icon={<KeyRound className="size-4" />} onClick={() => setDialog("login")}>Create</Button>}>
            {login ? (
              <DefinitionList
                items={[
                  ["Email", login.email],
                  ["Status", login.isActive ? "Active" : "Disabled"],
                  ["Last sign-in", date(login.lastLoginAt)],
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No login yet. Create one so they can see their QR codes, points and request payouts.</p>
            )}
          </Card>
          <Card title="Payout details" icon={Landmark}>
            <DefinitionList
              items={[
                ["UPI", inf.upiId && <SecretValue value={inf.upiId} kind="upi" />],
                ["PAN", inf.panNumber && <SecretValue value={inf.panNumber} kind="pan" />],
                ["Account holder", inf.bankAccountName],
                ["Account number", inf.bankAccountNumber && <SecretValue value={inf.bankAccountNumber} kind="account" />],
                ["IFSC", inf.bankIfsc],
                ["Email", inf.email],
              ]}
            />
            {inf.notes && <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm text-muted-foreground">{inf.notes}</p>}
          </Card>
        </div>
      </div>

      {qrFor && (
        <QrShareModal
          open
          onClose={() => setQrFor(null)}
          endpoint={`/campaigns/${qrFor.campaignId}/influencers/${qrFor.id}/qr`}
          title={`${qrFor.campaign.name} QR for ${inf.name}`}
          fileName={`${qrFor.campaign.name}-${inf.name}-${qrFor.code}`.replace(/\s+/g, "-")}
        />
      )}
      <LoginDialog open={dialog === "login"} onClose={() => setDialog(null)} influencerId={id} defaultEmail={inf.email ?? ""} onDone={refresh} />
      <AdjustDialog open={dialog === "adjust"} onClose={() => setDialog(null)} influencerId={id} onDone={refresh} />
      <PayoutDialog open={dialog === "payout"} onClose={() => setDialog(null)} influencerId={id} balance={inf.pointsBalance} onDone={refresh} />
    </>
  );
}

function LoginDialog({ open, onClose, influencerId, defaultEmail, onDone }: { open: boolean; onClose: () => void; influencerId: string; defaultEmail: string; onDone: () => void }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const create = useMutation({
    mutationFn: () => api.post(`/influencers/${influencerId}/login`, { email, password }),
    onSuccess: () => (onDone(), onClose(), toast.success("Login created. Share the email and password with the partner.")),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create partner login"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} disabled={!email || password.length < 8} onClick={() => create.mutate()}>Create login</Button>
        </>
      }
    >
      <div className="space-y-4">
        {create.isError && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
        <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Temporary password" required hint="At least 8 characters. Share it with them privately; they can change it after signing in.">
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} onGenerate={setPassword} />
        </Field>
        <RequiredNote />
      </div>
    </Modal>
  );
}

function AdjustDialog({ open, onClose, influencerId, onDone }: { open: boolean; onClose: () => void; influencerId: string; onDone: () => void }) {
  const [pts, setPts] = useState("");
  const [note, setNote] = useState("");
  const adjust = useMutation({
    mutationFn: () => api.post(`/influencers/${influencerId}/points/adjust`, { points: Number(pts), note }),
    onSuccess: () => (onDone(), onClose(), setPts(""), setNote(""), toast.success("Points adjusted")),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust points"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={adjust.isPending} disabled={!Number(pts) || note.trim().length < 3} onClick={() => adjust.mutate()}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {adjust.isError && <Alert tone="danger">{errorMessage(adjust.error)}</Alert>}
        <Field label="Points" required hint="Positive to add (e.g. a bonus), negative to deduct."><Input type="number" step="0.01" value={pts} onChange={(e) => setPts(e.target.value)} /></Field>
        <Field label="Reason" required hint="Recorded in the points history."><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function PayoutDialog({ open, onClose, influencerId, balance, onDone }: { open: boolean; onClose: () => void; influencerId: string; balance: number; onDone: () => void }) {
  const [pts, setPts] = useState("");
  const create = useMutation({
    mutationFn: () => api.post(`/payouts`, { influencerId, points: Number(pts) }),
    onSuccess: () => (onDone(), onClose(), setPts(""), toast.success("Payout created. Approve it and mark it paid from Payouts.")),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create payout"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} disabled={!(Number(pts) > 0)} onClick={() => create.mutate()}>Create payout</Button>
        </>
      }
    >
      <div className="space-y-4">
        {create.isError && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
        <Field label="Points to pay out" required hint={`Available: ${number(balance)} points`}>
          <Input type="number" min="0" step="0.01" value={pts} onChange={(e) => setPts(e.target.value)} />
        </Field>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPts(String(balance))}>Use full balance</Button>
      </div>
    </Modal>
  );
}
