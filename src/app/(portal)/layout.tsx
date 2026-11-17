import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/ui";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // The shell reads the pathname (a request-time value), so it streams in behind a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
