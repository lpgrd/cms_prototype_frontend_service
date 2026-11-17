"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { dateTime, grams, inr, paymentLabel, paymentLines } from "@/lib/format";
import type { Settings, Transaction } from "@/lib/types";

/** 80 mm thermal-printer receipt; opens the print dialog once loaded. */
export function ThermalReceipt() {
  const { id } = useParams<{ id: string }>();
  const tx = useQuery({ queryKey: ["transaction", id], queryFn: () => api.get<Transaction>(`/transactions/${id}`) });
  const store = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/settings") });
  const ready = tx.data && store.data;

  useEffect(() => {
    if (ready) setTimeout(() => window.print(), 300);
  }, [ready]);

  if (tx.isError) return <p className="p-4 text-sm">Could not load this bill.</p>;
  if (!ready) return <p className="p-4 text-sm">Loading…</p>;
  const t = tx.data;
  const s = store.data;
  const half = Math.round((t.taxAmount / 2) * 100) / 100;

  return (
    <>
      {/* Thermal rolls are 80 mm wide with ~72 mm printable; let the height follow the content. */}
      <style>{`@page { size: 80mm auto; margin: 3mm; } body { background: white; }`}</style>
      <div className="mx-auto w-[72mm] py-2 font-mono text-[11px] leading-snug">
        <div className="text-center">
          <div className="text-sm font-bold">{s.storeName}</div>
          {s.storeAddress && <div className="whitespace-pre-line">{s.storeAddress}</div>}
          {s.storePhone && <div>Ph: {s.storePhone}</div>}
          {s.gstin && <div>GSTIN: {s.gstin}</div>}
          <div className="mt-1 font-bold">TAX INVOICE</div>
        </div>
        <Rule />
        <div>{t.invoiceNumber}</div>
        <div>{dateTime(t.createdAt)}</div>
        <div>
          {t.customer?.name}, {t.customer?.mobile}
        </div>
        {t.customerPan && <div>PAN: {t.customerPan}</div>}
        {t.status === "CANCELLED" && <div className="font-bold">*** CANCELLED ***</div>}
        <Rule />
        {t.items?.map((i) => (
          <div key={i.id} className="mb-1">
            <div className="font-bold">{i.description}</div>
            <div>
              {i.metalType} {i.purity} {i.huid && `HUID ${i.huid}`}
            </div>
            <Line label={`${grams(i.netWeight)} × ${inr(i.ratePerGram)}`} value={inr(i.metalValue)} />
            {i.makingCharges > 0 && <Line label="Making" value={inr(i.makingCharges)} />}
            {i.stoneCharges + i.otherCharges > 0 && <Line label="Stones/other" value={inr(i.stoneCharges + i.otherCharges)} />}
            <Line label="Item total" value={inr(i.lineTotal)} bold />
          </div>
        ))}
        <Rule />
        <Line label="Subtotal" value={inr(t.subtotal)} />
        {t.discountAmount > 0 && <Line label={`Offer ${t.appliedCode ?? ""}`} value={`-${inr(t.discountAmount)}`} />}
        <Line label="Taxable" value={inr(t.taxableAmount)} />
        <Line label={`CGST ${t.taxRate / 2}%`} value={inr(half)} />
        <Line label={`SGST ${t.taxRate / 2}%`} value={inr(t.taxAmount - half)} />
        {t.roundOff !== 0 && <Line label="Round off" value={inr(t.roundOff)} />}
        <Rule />
        <Line label="TOTAL" value={inr(t.grandTotal)} bold />
        {paymentLines(t).map((p, i) => (
          <Line
            key={i}
            label={`${i === 0 ? "Paid: " : ""}${paymentLabel(p.method)}${p.reference ? ` ${p.reference}` : ""}`}
            value={inr(p.amount)}
          />
        ))}
        <Rule />
        <div className="text-center">Thank you! Visit again.</div>
      </div>
    </>
  );
}

function Rule() {
  return <div className="my-1 border-t border-dashed border-black" />;
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
