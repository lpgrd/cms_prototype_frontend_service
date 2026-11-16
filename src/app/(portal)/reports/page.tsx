"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarRange, Download, FileBarChart } from "lucide-react";
import { useState } from "react";
import { Button, Card, DatePicker, Empty, ErrorState, PageHeader, SelectInput, Spinner, Table, Td, Th } from "@/components/ui";
import { api } from "@/lib/api";
import { number } from "@/lib/format";
import type { Report, ReportType } from "@/lib/types";

const REPORTS: { value: ReportType; label: string; description: string }[] = [
  { value: "sales", label: "Sales register (GST)", description: "Invoice-wise taxable value, CGST/SGST, PAN and payment mode, for GSTR-1." },
  { value: "hsn", label: "HSN summary", description: "Taxable value and tax by HSN code (discount apportioned to lines)." },
  { value: "metals", label: "Sales by metal", description: "Pieces, net weight and value by metal and purity." },
  { value: "campaigns", label: "Campaign performance", description: "Customers, revenue, discount and points per partner code." },
  { value: "tds", label: "TDS register", description: "Paid partner payouts with PAN and TDS deducted, for TDS returns." },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function ReportsPage() {
  const today = new Date();
  const [type, setType] = useState<ReportType>("sales");
  const [from, setFrom] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(ymd(today));
  const meta = REPORTS.find((r) => r.value === type)!;
  const valid = !!from && !!to && from <= to;

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", type, from, to],
    queryFn: () => api.get<Report>(`/reports/${type}`, { from, to }),
    enabled: valid,
    placeholderData: keepPreviousData,
  });

  const csvHref = `/api/reports/${type}?${new URLSearchParams({ from, to, format: "csv" })}`;

  return (
    <>
      <PageHeader title="Reports" description="Statutory and business reports. Download as CSV for your accountant." />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <SelectInput value={type} onValueChange={(v) => setType(v as ReportType)} options={REPORTS} />
          <DatePicker value={from} onChange={setFrom} placeholder="From" fromYear={2020} />
          <DatePicker value={to} onChange={setTo} placeholder="To" fromYear={2020} />
          <Button variant="secondary" icon={<Download className="size-4" />} disabled={!valid} onClick={() => window.open(csvHref, "_blank")}>
            CSV
          </Button>
        </div>
        <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{meta.description}</p>
        {!valid ? (
          <Empty icon={CalendarRange} title="Pick a date range" description="“From” must be on or before “To”." />
        ) : isLoading ? (
          <Spinner />
        ) : error || !data ? (
          <div className="p-4">
            <ErrorState error={error} />
          </div>
        ) : data.rows.length === 0 ? (
          <Empty icon={FileBarChart} title="Nothing in this period" />
        ) : (
          <Table>
            <thead>
              <tr>
                {data.columns.map((c) => (
                  <Th key={c.key}>{c.header}</Th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {data.columns.map((c) => {
                    const v = row[c.key];
                    return (
                      <Td key={c.key} className={typeof v === "number" ? "text-right whitespace-nowrap" : "whitespace-nowrap"}>
                        {typeof v === "number" ? number(v) : (v ?? "—")}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
