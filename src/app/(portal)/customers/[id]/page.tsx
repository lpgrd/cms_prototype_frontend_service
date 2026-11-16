import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { CustomerView } from "./customer-view";

export default function CustomerPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CustomerView />
    </Suspense>
  );
}
