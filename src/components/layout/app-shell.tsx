"use client";

import { Gem, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Empty } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useMe } from "@/providers/auth";
import { ActivityBar } from "./activity-bar";
import { NavigationHistoryProvider } from "./back-button";
import { canAccess, navItemFor } from "./nav";

/** Portal frame per the shadcn sidebar layout: SidebarProvider → AppSidebar + SidebarInset (with SidebarTrigger). */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) return <StartingUp />;

  return (
    <NavigationHistoryProvider>
      <SidebarProvider>
        <AppSidebar user={me} />
        {/* min-w-0 lets the page shrink beside the sidebar; wide tables scroll inside their cards instead. */}
        <SidebarInset className="min-w-0">
          <header className="no-print sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
            <Breadcrumb pathname={pathname} />
            <div className="ml-auto">
              <ModeToggle />
            </div>
            <ActivityBar />
          </header>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {canAccess(me, pathname) ? (
              children
            ) : navItemFor(pathname)?.off ? (
              <Empty title="Not in use" description="Itemised billing is switched off. Partner sales are recorded under Partner sale." />
            ) : (
              <Empty title="Not available" description="Your role does not have access to this page." />
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </NavigationHistoryProvider>
  );
}

/** "Customers" on a list page; "Customers / Details" (section linked) on its sub-pages. */
function Breadcrumb({ pathname }: { pathname: string }) {
  const section = navItemFor(pathname);
  if (!section) {
    return <span className="text-sm text-muted-foreground">{pathname.startsWith("/account") ? "Account" : null}</span>;
  }
  if (pathname === section.href) return <span className="text-sm text-muted-foreground">{section.label}</span>;
  const leaf = pathname.endsWith("/new") ? "New" : "Details";
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href={section.href} className="hover:text-foreground">
        {section.label}
      </Link>
      <span aria-hidden>/</span>
      <span className="text-foreground">{leaf}</span>
    </nav>
  );
}

/** Shown once, while the signed-in user is loaded: the mark and a quiet spinner instead of a blank screen. */
function StartingUp() {
  return (
    <div role="status" className="flex min-h-svh flex-col items-center justify-center gap-4 text-muted-foreground">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Gem className="size-6" aria-hidden />
      </span>
      <span className="inline-flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Opening GJ-CRM…
      </span>
    </div>
  );
}
