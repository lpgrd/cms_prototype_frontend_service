import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Spinner } from "@/components/ui";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // The shell reads the pathname (a request-time value), so it streams in behind a Suspense boundary.
  return (
    <Suspense fallback={<Spinner />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
