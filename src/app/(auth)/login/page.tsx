import type { Metadata } from "next";
import { BadgePercent, ReceiptText, Users } from "lucide-react";
import { HallmarkStamp } from "@/components/hallmark-stamp";
import { Suspense } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const CAPABILITIES = [
  { icon: ReceiptText, text: "Bills with GST, HUID and PAN checks built in" },
  { icon: BadgePercent, text: "Partner QR offers, verified by OTP at the counter" },
  { icon: Users, text: "Each customer's purchases, contacts and offers together" },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-primary text-primary-foreground lg:block">
        <div className="flex h-full flex-col justify-between p-12">
          <HallmarkStamp text="JEWELLER PORTAL   BILLING   CAMPAIGNS   CUSTOMERS   " />
          <div>
            <h2 className="max-w-xl text-balance font-heading text-5xl font-semibold leading-[1.1] tracking-tight">
              The counter, the ledger and your partners in one place.
            </h2>
            <ul className="mt-8 space-y-3">
              {CAPABILITIES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm opacity-90">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-foreground/10">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="absolute right-4 top-4">
          <ModeToggle />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
