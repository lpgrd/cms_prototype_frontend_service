"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";

/** Counts in-app page changes so Back can tell whether there is a previous portal page to return to. */
const HistoryDepth = createContext<{ current: number }>({ current: 0 });

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const depth = useRef(0);
  const last = useRef<string | null>(null);
  useEffect(() => {
    // Count real path changes only: effects can run twice for the same path (React StrictMode).
    if (last.current === pathname) return;
    last.current = pathname;
    depth.current += 1;
  }, [pathname]);
  return <HistoryDepth.Provider value={depth}>{children}</HistoryDepth.Provider>;
}

/**
 * Goes back to wherever the user came from inside the portal (e.g. a bill opened from a
 * customer returns to that customer). With no in-app history — a pasted link or a fresh
 * tab — it goes to `fallbackHref`, the page's parent list.
 */
export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  const depth = useContext(HistoryDepth);
  return (
    <button
      type="button"
      onClick={() => (depth.current > 1 ? router.back() : router.push(fallbackHref))}
      className="no-print mb-2 inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}
