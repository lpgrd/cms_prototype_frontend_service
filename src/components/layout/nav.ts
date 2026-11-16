import { BadgePercent, FileBarChart, Handshake, KeyRound, LayoutDashboard, Receipt, ScanLine, ScrollText, Settings, Sparkles, Users, Wallet, type LucideIcon } from "lucide-react";
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
}

export const NAV: NavItem[] = [
  { group: "Store", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, anyOf: ["dashboard.view"] },
  { group: "Store", href: "/billing", label: "New bill", icon: ScanLine, anyOf: ["billing.create"] },
  { group: "Store", href: "/transactions", label: "Bills", icon: Receipt, anyOf: ["bills.view"] },
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
  if (item.partner) return me.accountType === "PARTNER";
  if (me.accountType !== "INTERNAL") return false;
  return me.isSuperadmin || (item.anyOf ?? []).some((p) => me.permissions.includes(p));
}

/** Pages outside the nav (account, bill detail via list, …) follow their section's rule; unknown paths are allowed. */
export const canAccess = (me: Viewer, pathname: string) => {
  const item = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return !item || canSee(me, item);
};

export const firstAccessibleHref = (me: Viewer) => NAV.find((n) => canSee(me, n))?.href ?? "/account";
