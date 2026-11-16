import Link from "next/link";
import { ReactNode } from "react";
import { HallmarkStamp } from "@/components/hallmark-stamp";
import { ModeToggle } from "@/components/mode-toggle";

/** The GJ-CRM mark: the hallmark stamp with the name around its rim, and the name beneath. */
function Brand() {
  return (
    <div className="flex flex-col items-center gap-3 text-primary">
      <HallmarkStamp text="GJ-CRM   GJ-CRM   GJ-CRM   GJ-CRM   " className="size-24" />
      <span className="font-heading text-xl font-semibold tracking-tight text-foreground">GJ-CRM</span>
    </div>
  );
}

/**
 * Layout for the sign-in and password pages: the mark, the form, and at most one quiet link at the foot
 * (back to sign-in, or to the other sign-in page).
 */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: { href: string; label: string } }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <main className="w-full max-w-sm space-y-8">
        <Brand />
        <div className="space-y-5">{children}</div>
        {footer && (
          <Link href={footer.href} className="block text-center text-sm text-muted-foreground hover:text-foreground">
            {footer.label}
          </Link>
        )}
      </main>
    </div>
  );
}

/** Which sign-in page a person uses: owners and staff, or partners. */
export type SignInPortal = "staff" | "partner";
export const SIGN_IN_PATH: Record<SignInPortal, string> = { staff: "/login", partner: "/partner/login" };
