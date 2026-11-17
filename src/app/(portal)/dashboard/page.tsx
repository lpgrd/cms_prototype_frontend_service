"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, Coins, IndianRupee, LayoutDashboard, Sparkles, TrendingUp, Users } from "lucide-react";
import { AnimatedNumber } from "@/components/animated-number";
import { ColumnChart } from "@/components/charts/column-chart";
import { useMe } from "@/providers/auth";
import { Card, Empty, ErrorState, PageHeader, PageSkeleton, Stat, Table, Td, Th } from "@/components/ui";
import { api } from "@/lib/api";
import { inrShort, number, plural, points } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";

/** Last six calendar months, so months with no sales still show as empty columns. */
function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
    };
  });
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  });

  if (isLoading) return <PageSkeleton stats={4} kind="detail" />;
  if (error || !data) return <ErrorState error={error} />;

  const { sales, customers, points: owed, influencers } = data;
  const nothingShared = !sales && !customers && !owed && !influencers;
  const chart = sales
    ? lastSixMonths().map(({ key, label }) => {
        const m = sales.monthly.find((row) => row.month === key);
        return {
          key,
          label,
          value: m?.revenue ?? 0,
          detail: m ? `${plural(m.bills, "sale")}, ${m.influencerBills} through partners` : "No sales",
        };
      })
    : [];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${me?.name.split(" ")[0] ?? ""}`}
        description={`It's ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}. Here's how the store is doing.`}
      />

      {nothingShared && (
        <Card>
          <Empty
            icon={LayoutDashboard}
            title="No dashboard widgets are shared with your role"
            description="Ask a superadmin to share the widgets you need under Roles & access."
          />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {sales && (
          <>
            <Stat
              label="Sales today"
              icon={IndianRupee}
              value={<AnimatedNumber value={sales.today.revenue} format={inrShort} />}
              sub={plural(sales.today.bills, "sale")}
            />
            <Stat
              label="Sales this month"
              icon={CalendarDays}
              value={<AnimatedNumber value={sales.month.revenue} format={inrShort} />}
              sub={`${plural(sales.month.bills, "sale")}, ${inrShort(sales.month.discounts)} in discounts`}
            />
          </>
        )}
        {customers && (
          <Stat
            label="Customers"
            icon={Users}
            value={<AnimatedNumber value={customers.total} format={(v) => number(Math.round(v))} />}
            sub={`${customers.newThisMonth} new this month, ${customers.acquiredViaInfluencers} through partners`}
          />
        )}
        {owed && (
          <Stat
            label="Points owed"
            icon={Coins}
            value={<AnimatedNumber value={owed.liability} format={inrShort} />}
            sub={`${points(owed.pointsOutstanding)} payable, ${points(owed.pointsOnHold)} on hold, ${plural(owed.pendingPayouts.count, "payout")} pending`}
            accent
          />
        )}
      </div>

      {(sales || influencers) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {sales && (
            <Card title="Revenue, last 6 months" icon={TrendingUp} className={influencers ? "lg:col-span-3" : "lg:col-span-5"}>
              <ColumnChart data={chart} format={inrShort} ariaLabel="Monthly revenue for the last six months" />
            </Card>
          )}

          {influencers && (
            <Card
              title="Top partners this month"
              icon={Sparkles}
              className={sales ? "lg:col-span-2" : "lg:col-span-5"}
              padded={false}
              actions={
                <Link href="/partners" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              }
            >
              {influencers.topThisMonth.length === 0 ? (
                <Empty
                  title="No redemptions yet"
                  description={`${plural(influencers.liveCampaigns, "live campaign")} and ${plural(influencers.activeInfluencers, "active partner")}`}
                />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Partner</Th>
                      <Th className="text-right">Sales</Th>
                      <Th className="text-right">Revenue</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {influencers.topThisMonth.map((i) => (
                      <tr key={i.id}>
                        <Td>
                          <Link href={`/partners/${i.id}`} className="font-medium hover:text-primary">
                            {i.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{points(i.points)}</div>
                        </Td>
                        <Td className="tabular text-right">{i.redemptions}</Td>
                        <Td className="tabular text-right">{inrShort(i.revenue)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  );
}
