import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { InvoiceView } from "./invoice-view";

export default function TransactionPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="detail" />}>
      <InvoiceView />
    </Suspense>
  );
}
