import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

/** Centered card layout for the password-reset pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm space-y-5">
        {children}
        <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
