"use client";

import { Gem, LogOut, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { canSee, NAV, NAV_GROUPS, navItemFor } from "@/components/layout/nav";
import type { Me } from "@/lib/types";
import { homeFor, roleLabel, useLogout } from "@/providers/auth";

export function AppSidebar({ user }: { user: Me }) {
  const pathname = usePathname();
  const logout = useLogout();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => isMobile && setOpenMobile(false);

  const items = NAV.filter((n) => canSee(user, n));
  const groups = NAV_GROUPS.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="no-print">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={homeFor(user)} onClick={closeOnMobile} />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Gem className="size-4" />
              </span>
              <span className="font-heading text-base font-semibold">GJ-CRM</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map(({ group, items }) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={navItemFor(pathname)?.href === href}
                      tooltip={label}
                      render={<Link href={href} onClick={closeOnMobile} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{roleLabel(user)}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Account"
              isActive={pathname === "/account"}
              render={<Link href="/account" onClick={closeOnMobile} />}
            >
              <UserCog />
              <span>Account</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={logout}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
