import {
  BadgePercent,
  FileBarChart,
  Handshake,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  Receipt,
  ReceiptIndianRupee,
  ScanLine,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { FULL_BILLING } from "@/lib/features";
import type { Me, Permission } from "@/lib/types";

export type NavGroup = "Store" | "Growth" | "Admin" | "Partner";

export interface NavItem {
  group: NavGroup;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visible to internal users holding any of these permissions. */
  anyOf?: Permission[];
  /** Visible only to partner logins. */
  partner?: true;
  /** Switched off for everyone (see lib/features.ts); its pages are not reachable either. */
  off?: boolean;
}

export const NAV: NavItem[] = [
  { group: "Store", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, anyOf: ["dashboard.view"] },
  // Listed before /sales so its own permission applies to it (see canAccess).
  { group: "Store", href: "/sales/new", label: "Partner sale", icon: HandCoins, anyOf: ["billing.create"] },
  { group: "Store", href: "/sales", label: "Sales", icon: ReceiptIndianRupee, anyOf: ["bills.view"] },
  { group: "Store", href: "/billing", label: "New bill", icon: ScanLine, anyOf: ["billing.create"], off: !FULL_BILLING },
  { group: "Store", href: "/transactions", label: "Bills", icon: Receipt, anyOf: ["bills.view"], off: !FULL_BILLING },
  { group: "Store", href: "/customers", label: "Customers", icon: Users, anyOf: ["customers.view", "customers.edit"] },
  { group: "Growth", href: "/campaigns", label: "Campaigns", icon: BadgePercent, anyOf: ["campaigns.view", "campaigns.manage"] },
  { group: "Growth", href: "/partners", label: "Partners", icon: Handshake, anyOf: ["influencers.view", "influencers.manage"] },
  { group: "Growth", href: "/payouts", label: "Payouts", icon: Wallet, anyOf: ["payouts.view", "payouts.manage"] },
  { group: "Admin", href: "/reports", label: "Reports", icon: FileBarChart, anyOf: ["reports.view"] },
  { group: "Admin", href: "/audit", label: "Audit log", icon: ScrollText, anyOf: ["audit.view"] },
  { group: "Admin", href: "/roles", label: "Roles & access", icon: KeyRound, anyOf: ["users.manage"] },
  { group: "Admin", href: "/settings", label: "Settings", icon: Settings, anyOf: ["settings.manage", "users.manage"] },
  { group: "Partner", href: "/partner", label: "My campaigns", icon: Sparkles, partner: true },
];

export const NAV_GROUPS: NavGroup[] = ["Store", "Growth", "Admin", "Partner"];

type Viewer = Pick<Me, "accountType" | "isSuperadmin" | "permissions">;

export function canSee(me: Viewer, item: NavItem) {
  if (item.off) return false;
  if (item.partner) return me.accountType === "PARTNER";
  if (me.accountType !== "INTERNAL") return false;
  return me.isSuperadmin || (item.anyOf ?? []).some((p) => me.permissions.includes(p));
}

/** Pages outside the nav (account, bill detail via list, …) follow their section's rule; unknown paths are allowed. */
export const canAccess = (me: Viewer, pathname: string) => {
  const item = navItemFor(pathname);
  return !item || canSee(me, item);
};

/** The nav entry a page belongs to: the first whose path it is in, so /sales/new is "Partner sale", not "Sales". */
export const navItemFor = (pathname: string) => NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));

export const firstAccessibleHref = (me: Viewer) => NAV.find((n) => canSee(me, n))?.href ?? "/account";
