import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { InvoiceView } from "./invoice-view";

export default function TransactionPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <InvoiceView />
    </Suspense>
  );
}
