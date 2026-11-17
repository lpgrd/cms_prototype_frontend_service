import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { CustomerView } from "./customer-view";

export default function CustomerPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="detail" />}>
      <CustomerView />
    </Suspense>
  );
}
