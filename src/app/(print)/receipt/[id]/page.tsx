import { Suspense } from "react";
import { ThermalReceipt } from "./thermal-receipt";

export default function ReceiptPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm">Loading…</p>}>
      <ThermalReceipt />
    </Suspense>
  );
}
